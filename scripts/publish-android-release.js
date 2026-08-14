const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

const root = process.cwd();
const appDir = path.join(root, 'synaura-app');
const appConfig = JSON.parse(fs.readFileSync(path.join(appDir, 'app.json'), 'utf8')).expo;
const releaseConfig = JSON.parse(fs.readFileSync(path.join(appDir, 'release.json'), 'utf8'));
const apkPath = path.join(appDir, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const mediaRoot = path.resolve(process.env.SYNAURA_MEDIA_ROOT || '/mnt/Synaura-SSD/apps/synaura/media');
const mediaBaseUrl = (process.env.MEDIA_BASE_URL || 'https://media.synaura.fr').replace(/\/+$/, '');

function safeVersion(value) {
  const normalized = String(value || '').trim();
  if (!normalized || !/^[0-9A-Za-z._-]+$/.test(normalized)) throw new Error('Version Android invalide');
  return normalized;
}

async function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

async function atomicCopy(source, destination) {
  const temporary = `${destination}.${process.pid}.part`;
  await fs.promises.copyFile(source, temporary);
  await fs.promises.rename(temporary, destination);
}

async function atomicJson(destination, value) {
  const temporary = `${destination}.${process.pid}.part`;
  await fs.promises.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o644 });
  await fs.promises.rename(temporary, destination);
}

async function main() {
  if (!fs.existsSync(apkPath)) throw new Error(`APK introuvable: ${apkPath}. Lance d'abord le build release.`);

  const versionName = safeVersion(appConfig.version);
  const versionCode = Number(appConfig.android.versionCode);
  if (!Number.isInteger(versionCode) || versionCode <= 0) throw new Error('versionCode Android invalide');

  const releaseRoot = path.resolve(mediaRoot, 'mobile-releases');
  const apkDirectory = path.resolve(releaseRoot, 'apks');
  const manifestDirectory = path.resolve(releaseRoot, 'manifests');
  if (!releaseRoot.startsWith(`${mediaRoot}${path.sep}`)) throw new Error('Dossier de publication invalide');
  await Promise.all([
    fs.promises.mkdir(apkDirectory, { recursive: true }),
    fs.promises.mkdir(manifestDirectory, { recursive: true }),
  ]);

  const apkName = `synaura-${versionName}-${versionCode}.apk`;
  const apkDestination = path.join(apkDirectory, apkName);
  await atomicCopy(apkPath, apkDestination);
  const [sha256, stats] = await Promise.all([sha256File(apkDestination), fs.promises.stat(apkDestination)]);
  const apkUrl = `${mediaBaseUrl}/mobile-releases/apks/${encodeURIComponent(apkName)}`;
  const manifest = {
    platform: 'android',
    versionName,
    versionCode,
    minimumVersionCode: Number(releaseConfig.minimumVersionCode || versionCode),
    title: releaseConfig.title || 'Nouvelle version Synaura',
    releaseNotes: Array.isArray(releaseConfig.releaseNotes) ? releaseConfig.releaseNotes : [],
    mandatory: Boolean(releaseConfig.mandatory),
    apkUrl,
    sha256,
    sizeBytes: stats.size,
    publishedAt: new Date().toISOString(),
  };
  await Promise.all([
    atomicJson(path.join(releaseRoot, 'latest.json'), manifest),
    atomicJson(path.join(manifestDirectory, `${versionName}-${versionCode}.json`), manifest),
  ]);
  console.log(`Synaura Android ${versionName} (${versionCode}) publiee sur le stockage local.`);
  console.log(apkUrl);
  console.log(`SHA-256: ${sha256}`);
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
