const crypto = require('crypto');
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

const BUCKET = 'mobile-releases';
const APK_MIME = 'application/vnd.android.package-archive';
const root = process.cwd();
const appDir = path.join(root, 'synaura-app');
const appConfig = JSON.parse(fs.readFileSync(path.join(appDir, 'app.json'), 'utf8')).expo;
const releaseConfig = JSON.parse(fs.readFileSync(path.join(appDir, 'release.json'), 'utf8'));
const apkPath = path.join(appDir, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} manquant`);
  return value;
}

function githubCredentials() {
  const explicitToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (explicitToken) return explicitToken;

  try {
    const result = childProcess.execFileSync('git', ['credential', 'fill'], {
      cwd: root,
      input: 'protocol=https\nhost=github.com\n\n',
      encoding: 'utf8',
      windowsHide: true,
    });
    const password = result.split(/\r?\n/).find((line) => line.startsWith('password='));
    return password ? password.slice('password='.length) : '';
  } catch {
    return '';
  }
}

function githubRepository() {
  if (process.env.SYNAURA_ANDROID_GITHUB_REPOSITORY) return process.env.SYNAURA_ANDROID_GITHUB_REPOSITORY;
  try {
    const remote = childProcess.execFileSync('git', ['remote', 'get-url', 'origin'], {
      cwd: root,
      encoding: 'utf8',
      windowsHide: true,
    }).trim();
    const match = remote.match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?$/i);
    return match ? `${match[1]}/${match[2]}` : '';
  } catch {
    return '';
  }
}

async function githubRequest(url, token, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'synaura-android-publisher',
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.message || `GitHub API ${response.status}`);
  return payload;
}

async function publishGithubApk(apk, versionName, versionCode) {
  const token = githubCredentials();
  const repository = githubRepository();
  if (!token || !repository) return null;

  const tag = `android-v${versionName}-${versionCode}`;
  const api = `https://api.github.com/repos/${repository}`;
  let release;
  try {
    release = await githubRequest(`${api}/releases/tags/${encodeURIComponent(tag)}`, token);
  } catch {
    release = await githubRequest(`${api}/releases`, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag_name: tag,
        target_commitish: process.env.SYNAURA_ANDROID_GITHUB_BRANCH || 'main',
        name: `Synaura Android ${versionName}`,
        body: releaseConfig.releaseNotes.map((note) => `- ${note}`).join('\n'),
        draft: false,
        prerelease: false,
      }),
    });
  }

  const assetName = `synaura-${versionName}-${versionCode}.apk`;
  const existing = Array.isArray(release.assets) ? release.assets.find((asset) => asset.name === assetName) : null;
  if (existing) {
    await githubRequest(`${api}/releases/assets/${existing.id}`, token, { method: 'DELETE' });
  }

  const uploaded = await githubRequest(
    `https://uploads.github.com/repos/${repository}/releases/${release.id}/assets?name=${encodeURIComponent(assetName)}`,
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': APK_MIME, 'Content-Length': String(apk.length) },
      body: apk,
    },
  );
  return uploaded.browser_download_url;
}

async function main() {
  if (!fs.existsSync(apkPath)) {
    throw new Error(`APK introuvable: ${apkPath}. Lance d'abord le build release.`);
  }

  const supabase = createClient(required('NEXT_PUBLIC_SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const apk = fs.readFileSync(apkPath);
  const sha256 = crypto.createHash('sha256').update(apk).digest('hex');
  const versionName = String(appConfig.version);
  const versionCode = Number(appConfig.android.versionCode);
  const apkUrl = process.env.SYNAURA_ANDROID_APK_URL || await publishGithubApk(apk, versionName, versionCode);
  if (!apkUrl) {
    throw new Error('Aucun hebergement APK disponible. Configure GITHUB_TOKEN ou SYNAURA_ANDROID_APK_URL.');
  }

  const { error: bucketError } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ['application/json'],
  });
  if (bucketError && !/already exists|duplicate/i.test(bucketError.message)) throw bucketError;
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
    sizeBytes: apk.length,
    publishedAt: new Date().toISOString(),
  };
  const manifestBody = Buffer.from(JSON.stringify(manifest, null, 2));

  for (const objectPath of ['latest.json', `manifests/${versionName}-${versionCode}.json`]) {
    const { error } = await supabase.storage.from(BUCKET).upload(objectPath, manifestBody, {
      contentType: 'application/json',
      upsert: true,
      cacheControl: objectPath === 'latest.json' ? '60' : '31536000',
    });
    if (error) throw error;
  }

  console.log(`Synaura Android ${versionName} (${versionCode}) publiee.`);
  console.log(apkUrl);
  console.log(`SHA-256: ${sha256}`);
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
