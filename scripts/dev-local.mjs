// Canonical LOCAL preview. Reuses the existing authorized SSH connection;
// no remote configuration changes and no database credential written to disk.
import dotenv from 'dotenv';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { pathToFileURL } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const remote = 'synaura@192.168.1.43';
const tunnelPort = 15433;
const previewPort = 3000;

export function remoteDatabaseUrl(raw) {
  let url;
  try { url = new URL(dotenv.parse(raw).DATABASE_URL); }
  catch { throw new Error('Configuration PostgreSQL distante indisponible.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['127.0.0.1', 'localhost'].includes(url.hostname)) {
    throw new Error('La cible PostgreSQL distante doit rester sur loopback.');
  }
  return url;
}

export function operationalLine(input, secrets = []) {
  let line = input.replace(/\x1b\[[0-9;]*m/g, '').trim();
  // No session bodies, SQL, credentials or stack traces in preview logs.
  if (!/^(?:[✓○▲]|(?:GET|POST|PUT|PATCH|DELETE|HEAD) \/)/.test(line)) return null;
  line = line.replace(/^(GET|POST|PUT|PATCH|DELETE|HEAD) (\S+)/, (_match, method, target) => `${method} ${target.split('?')[0].split('#')[0]}`);
  for (const secret of secrets.filter(Boolean)) line = line.split(secret).join('[redacted]');
  return line;
}

export async function portOpen(port) {
  return new Promise(resolve => {
    const socket = net.createConnection({ host:'127.0.0.1', port });
    const finish = value => { socket.destroy(); resolve(value); };
    socket.setTimeout(500, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

async function main() {
  let tunnel;
  let preview;
  let stopping = false;
  function stop(code = 0) {
    if (stopping) return;
    stopping = true;
    if (preview?.pid && preview.exitCode === null) {
      if (process.platform === 'win32') {
        try { execFileSync('taskkill', ['/PID',String(preview.pid),'/T','/F'], {stdio:'ignore',windowsHide:true,timeout:10000}); }
        catch { preview.kill(); }
      } else preview.kill();
    }
    tunnel?.kill();
    process.exitCode = code;
  }
  process.on('SIGINT', () => stop());
  process.on('SIGTERM', () => stop());
  try {
    dotenv.config({path:'.env.local',quiet:true});
    dotenv.config({path:'.env',quiet:true});
    const sshArgs = ['-i',path.join(os.homedir(),'.ssh/id_ed25519_weyra'),'-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=8'];
    const hasConfiguredDatabase = Boolean(process.env.DATABASE_URL?.trim());
    let url;
    if (hasConfiguredDatabase) {
      url = new URL(process.env.DATABASE_URL);
      if (!['postgres:','postgresql:'].includes(url.protocol)) throw new Error('Invalid database protocol');
    } else {
      const raw = execFileSync('ssh', [...sshArgs,remote,"sudo -n sed -n '/^DATABASE_URL=/p' /etc/synaura/synaura.env"], {encoding:'utf8',timeout:20000,stdio:['ignore','pipe','pipe'],windowsHide:true});
      url = remoteDatabaseUrl(raw);
    }
    if (process.argv.includes('--check')) {
      console.log(hasConfiguredDatabase ? 'Configuration DATABASE_URL locale presente.' : 'SSH et configuration PostgreSQL disponibles. Aucun secret affiche.');
      return;
    }
    if (await portOpen(previewPort)) throw new Error('Port 3000 occupe');
    if (!hasConfiguredDatabase) {
      if (await portOpen(tunnelPort)) throw new Error('Port du tunnel occupe');
      tunnel = spawn('ssh',[...sshArgs,'-N','-o','ExitOnForwardFailure=yes','-o','ServerAliveInterval=30','-o','ServerAliveCountMax=3','-L',`127.0.0.1:${tunnelPort}:${url.hostname}:${url.port || '5432'}`,remote],{stdio:'ignore',windowsHide:true});
      tunnel.on('error', () => { console.error('Le tunnel SSH ne peut pas demarrer.'); stop(1); });
      tunnel.on('exit', code => { if (!stopping) { console.error('Tunnel SSH ferme : apercu arrete pour eviter les erreurs de session. Relancer npm run dev.'); stop(code || 1); } });
      let ready = false;
      for (let attempt=0; attempt<30 && !stopping; attempt++) {
        if (await portOpen(tunnelPort)) { ready=true; break; }
        await delay(250);
      }
      if (!ready || stopping) throw new Error('Tunnel indisponible');
      url.hostname='127.0.0.1'; url.port=String(tunnelPort);
    }
    const childEnv = {...process.env,DATABASE_URL:url.toString(),DATABASE_POOL_MAX:'4',NODE_ENV:'development',NEXTAUTH_URL:'http://127.0.0.1:3000',NEXTAUTH_URL_INTERNAL:'http://127.0.0.1:3000'};
    const secrets = [childEnv.DATABASE_URL,decodeURIComponent(url.password),childEnv.SYNAURA_E2E_EMAIL,childEnv.SYNAURA_E2E_PASSWORD,childEnv.NEXTAUTH_SECRET];
    function log(stream) {
      let buffer=''; stream.setEncoding('utf8');
      stream.on('data',chunk => {
        buffer+=chunk; const lines=buffer.split('\n'); buffer=lines.pop()||'';
        for (const input of lines) { const line=operationalLine(input,secrets); if(line) console.log(line); }
      });
    }
    preview=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','-p',String(previewPort)],{env:childEnv,stdio:['ignore','pipe','pipe'],windowsHide:true});
    log(preview.stdout); log(preview.stderr);
    preview.on('error', () => { console.error('Le serveur local ne peut pas demarrer.'); stop(1); });
    preview.on('exit', code => { if(!stopping) stop(code||0); });
    console.log('Apercu connecte : http://127.0.0.1:3000');
    console.log(hasConfiguredDatabase ? 'Base fournie par votre environnement local.' : 'Donnees reelles via SSH. Les actions de compte portent sur les donnees reelles. Aucun deploiement.');
  } catch {
    console.error('Demarrage connecte impossible : verifier le reseau Synaura, la cle SSH et les ports 3000/15433.');
    console.error('Aucun secret affiche. Pour un apercu sans connexion ni donnees : npm run dev:offline');
    stop(1);
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await main();
