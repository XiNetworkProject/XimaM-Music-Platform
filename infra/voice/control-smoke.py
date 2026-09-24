#!/usr/bin/env python3
"""Run on the voice host with sudo. No DB/user access; no credentials printed.

Creates one ephemeral infrastructure-only room and always deletes it.
Checks real local authenticated control, public HTTPS/WSS, and no auto-creation.
This does not publish a microphone or validate two-device audio.
"""
import base64
import hashlib
import hmac
import http.client
import json
import secrets
import socket
import ssl
import time
import urllib.parse
import uuid
from pathlib import Path


def check(condition, label):
    if not condition:
        raise RuntimeError(label)
    print('PASS: ' + label, flush=True)


key, secret = Path('/etc/synaura-voice/keys.yaml').read_text().strip().split(': ', 1)


def encoded(value):
    return base64.urlsafe_b64encode(json.dumps(value, separators=(',', ':')).encode()).rstrip(b'=')


def token(grant):
    now = int(time.time())
    body = encoded({'alg': 'HS256', 'typ': 'JWT'}) + b'.' + encoded({
        'iss': key, 'sub': 'isolated-infrastructure-smoke', 'nbf': now - 2,
        'exp': now + 60, 'video': grant,
    })
    return (body + b'.' + base64.urlsafe_b64encode(hmac.new(secret.encode(), body, hashlib.sha256).digest()).rstrip(b'=')).decode()


def request(path, payload=None, bearer=None, public=False):
    conn = http.client.HTTPSConnection('voice.synaura.fr', timeout=10) if public else http.client.HTTPConnection('127.0.0.1', 7880, timeout=5)
    headers = {'Content-Type': 'application/json'}
    if bearer:
        headers['Authorization'] = 'Bearer ' + bearer
    try:
        conn.request('POST' if payload is not None else 'GET', path,
                     json.dumps(payload) if payload is not None else None, headers)
        response = conn.getresponse()
        return response.status, response.read()
    finally:
        conn.close()


prefix = '/twirp/livekit.RoomService/'
room = 'synaura-call-infra-smoke-' + str(uuid.uuid4())
admin = token({'roomCreate': True, 'roomList': True, 'roomAdmin': True, 'room': room})
join = token({'roomJoin': True, 'room': room, 'canPublish': True,
              'canSubscribe': True, 'canPublishSources': ['microphone'], 'canPublishData': False})
ws = None
try:
    check(request(prefix + 'ListRooms', {})[0] == 401, 'anonymous local administration denied')
    check(request(prefix + 'ListRooms', {}, join)[0] in (401, 403), 'participant cannot administer rooms')
    check(request(prefix + 'ListRooms', {}, admin, public=True)[0] == 404, 'administration not routed over public HTTPS')
    check(request('/healthz', public=True)[0] == 200, 'public HTTPS health and certificate')
    validate = '/rtc/validate?' + urllib.parse.urlencode({'access_token': join})
    check(request(validate, public=True)[0] == 404, 'missing room is NOT auto-created by a join token')
    check(request(prefix + 'CreateRoom', {'name': room, 'maxParticipants': 8, 'emptyTimeout': 60}, admin)[0] == 200, 'authenticated creation of isolated room')
    status, body = request(prefix + 'ListRooms', {'names': [room]}, admin)
    check(status == 200 and len(json.loads(body).get('rooms', [])) == 1, 'isolated room exists')
    check(request(validate, public=True)[0] == 200, 'valid microphone participant accepted for existing room')
    ws = ssl.create_default_context().wrap_socket(socket.create_connection(('voice.synaura.fr', 443), timeout=10), server_hostname='voice.synaura.fr')
    ws_key = base64.b64encode(secrets.token_bytes(16)).decode()
    query = urllib.parse.urlencode({'access_token': join, 'auto_subscribe': '1', 'protocol': '15'})
    wire = f'GET /rtc?{query} HTTP/1.1\r\nHost: voice.synaura.fr\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {ws_key}\r\nSec-WebSocket-Version: 13\r\n\r\n'
    ws.sendall(wire.encode())
    response = b''
    while b'\r\n\r\n' not in response and len(response) < 16384:
        part = ws.recv(4096)
        if not part:
            break
        response += part
    expected = base64.b64encode(hashlib.sha1((ws_key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').encode()).digest())
    check(response.startswith(b'HTTP/1.1 101') and expected in response.split(b'\r\n\r\n')[0], 'authenticated WSS upgrade succeeds')
finally:
    if ws:
        ws.close()
    code, _ = request(prefix + 'DeleteRoom', {'room': room}, admin)
    check(code in (200, 404), 'isolated room cleanup completed')
    code, body = request(prefix + 'ListRooms', {'names': [room]}, admin)
    check(code == 200 and not json.loads(body).get('rooms'), 'no smoke room remains')

print('NOT TESTED: two-device voice, microphone capture, external cellular transport, TURN/TLS.')
