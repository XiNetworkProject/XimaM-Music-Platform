import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = name => readFileSync(new URL(`../infra/voice/${name}`, import.meta.url), 'utf8');

test('voice infrastructure keeps administration local and implicit rooms disabled', () => {
  const config = source('livekit.freebox.yaml');
  assert.match(config, /port: 7880\nbind_addresses:\n  - 127\.0\.0\.1/);
  assert.match(config, /key_file: \/etc\/synaura-voice\/keys\.yaml/);
  assert.match(config, /auto_create: false/);
  assert.match(config, /tls_port: 0/);
  assert.match(config, /udp_port: 3478/);
  assert.doesNotMatch(config, /^keys:|^redis:|port_range_start:/m);
});

test('public voice proxy exposes only signaling and health, without token access logs', () => {
  const config = source('nginx-voice.conf');
  const exact = Array.from(config.matchAll(/location = (\S+) \{/g), match => match[1]);
  assert.deepEqual(exact, ['/healthz', '/rtc', '/rtc/validate']);
  assert.match(config, /location \/ \{ return 404; \}/);
  assert.doesNotMatch(config, /access_log\s+[^o\s]|listen\s+7880|server_name\s+synaura\.fr/);
  assert.match(config, /proxy_set_header X-Forwarded-For \$remote_addr/);
});

test('voice service is unprivileged and resource bounded', () => {
  const unit = source('synaura-voice.service');
  for (const setting of ['User=synaura-voice', 'NoNewPrivileges=true', 'ProtectSystem=strict', 'MemoryMax=384M', 'MemorySwapMax=0', 'CPUQuota=75%', 'TasksMax=128']) {
    assert.ok(unit.includes(setting), setting);
  }
  assert.doesNotMatch(unit, /EnvironmentFile=.*synaura\.env|User=root/);
});

test('installer pins the binary and refuses existing installations without touching app environment', () => {
  const script = source('install-stage-one.sh');
  assert.match(script, /expected=[a-f0-9]{64}/);
  assert.match(script, /sha256sum --check --strict/);
  assert.match(script, /Refusing existing target/);
  assert.match(script, /chmod 0640 \/etc\/synaura-voice\/keys\.yaml/);
  assert.doesNotMatch(script, /\/etc\/synaura\/synaura\.env|systemctl restart nginx|systemctl restart synaura\s/);
});

test('certificate renewal hook only reloads for the voice certificate after syntax validation', () => {
  const hook = source('renew-voice-certificate.sh');
  assert.match(hook, /RENEWED_LINEAGE/);
  assert.match(hook, /synaura-voice \] \|\| exit 0/);
  assert.ok(hook.indexOf('nginx -t') < hook.indexOf('systemctl reload nginx'));
});
