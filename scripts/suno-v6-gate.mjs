import { spawn } from 'node:child_process';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const mode = process.argv[2] || 'tests';
const out = path.resolve('artifacts/suno-v6');
await mkdir(out, { recursive: true });
const tests = (await readdir('tests')).filter(file => file.endsWith('.test.mjs')).map(file => `tests/${file}`);
const commands = {
  tests: [process.execPath, ['--experimental-strip-types', '--test', '--test-concurrency=2', '--test-reporter=spec', ...tests]],
  types: [process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit']],
  build: [process.execPath, ['node_modules/next/dist/bin/next', 'build']],
};
if (!commands[mode]) throw new Error('Use tests, types or build');
const [exe, args] = commands[mode];
const started = new Date().toISOString();
const child = spawn(exe, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
child.stdout.on('data', data => { output += data.toString(); });
child.stderr.on('data', data => { output += data.toString(); });
const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
await writeFile(path.join(out, `${mode}.log`), output);
await writeFile(path.join(out, `${mode}.json`), JSON.stringify({ started, finished: new Date().toISOString(), mode, exitCode: code }, null, 2));
console.log(`${mode}: exit ${code}`);
const lines = output.split(/\r?\n/);
if (mode === 'tests') {
  console.log(lines.filter(line => /^(✖|ℹ)|^test at /.test(line)).join('\n'));
} else {
  console.log(lines.slice(-45).join('\n'));
}
console.log(`Full log: artifacts/suno-v6/${mode}.log`);
process.exitCode = code || 0;
