// Canonical-site read smoke, own E2E session only. No call/message/media write.
import dotenv from 'dotenv';
import assert from 'node:assert/strict';
dotenv.config({path:'.env.local',quiet:true});
const base='https://synaura.fr';
const jar=new Map();
let signedIn=false;
let stage='public pages';
async function request(route, init={}, session=false) {
  const headers=new Headers(init.headers);
  if (session) headers.set('cookie',[...jar].map(([k,v])=>`${k}=${v}`).join('; '));
  const response=await fetch(base+route,{...init,headers,redirect:'manual',signal:AbortSignal.timeout(30000)});
  if (session) for (const cookie of response.headers.getSetCookie()) {
    const pair=cookie.split(';')[0], i=pair.indexOf('='); jar.set(pair.slice(0,i),pair.slice(i+1));
  }
  return response;
}
try {
  for (const route of ['/live','/discover','/profile/ximamoff','/auth/signin']) {
    assert.equal((await request(route)).status,200,route);
    console.log(`PASS public ${route}`);
  }
  for (const route of ['/api/messages/calls','/api/messages/conversations']) assert.equal((await request(route)).status,401);
  console.log('PASS anonymous private API access refused');
  stage='E2E authentication';
  const csrf=await (await request('/api/auth/csrf',{},true)).json();
  const login=await request('/api/auth/callback/credentials',{method:'POST',headers:{origin:base,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:process.env.SYNAURA_E2E_EMAIL||'',password:process.env.SYNAURA_E2E_PASSWORD||'',csrfToken:csrf.csrfToken,callbackUrl:base+'/messages',json:'true'})},true);
  assert.equal(login.status,200);
  const session=await (await request('/api/auth/session',{},true)).json();
  assert.equal(session.user?.username?.toLowerCase(),'test2'); signedIn=true;
  for (const route of ['/studio','/library','/messages','/messages?tab=contacts']) assert.equal((await request(route,{},true)).status,200,route);
  console.log('PASS authenticated Studio, library, messages and contacts');
  stage='private pilot and existing conversation';
  const voice=await request('/api/messages/calls',{},true);
  assert.equal(voice.status,200);
  const status=await voice.json();
  assert.equal(status.enabled,true); assert.ok(Array.isArray(status.calls));
  const inbox=await request('/api/messages/conversations',{},true);
  assert.equal(inbox.status,200);
  const payload=await inbox.json();
  const conversation=payload.conversations?.find(c=>c.otherUser?.username?.toLowerCase()==='ximamoff');
  assert.ok(conversation?.id || conversation?._id);
  const id=encodeURIComponent(conversation.id||conversation._id);
  assert.equal((await request(`/api/messages/${id}`,{},true)).status,200);
  assert.equal((await request(`/messages/${id}`,{},true)).status,200);
  console.log('PASS test2 private call availability and existing approved conversation; no call or message created');
} catch {
  console.error(`Production smoke FAIL: ${stage}. No private data displayed.`); process.exitCode=1;
} finally {
  if (signedIn) try {
    const csrf=await (await request('/api/auth/csrf',{},true)).json();
    await request('/api/auth/signout',{method:'POST',headers:{origin:base,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrfToken:csrf.csrfToken,callbackUrl:base+'/auth/signin',json:'true'})},true);
  } catch { console.log('Smoke session discarded locally.'); }
  jar.clear();
}
