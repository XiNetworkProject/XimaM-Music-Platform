# Integration Synaura Android sur Le Registre Pro

Ce document explique comment afficher sur `leregistrepro.fr` un bouton, une carte ou une banniere "Telecharger Synaura Android" qui se met a jour automatiquement quand une nouvelle version de l'application Synaura est publiee.

Objectif : Le Registre Pro ne doit pas avoir a modifier son code a chaque nouvelle APK. Le site lit simplement le manifest public Synaura, puis affiche toujours le dernier lien de telechargement disponible.

## 1. Principe general

Synaura publie un fichier public `latest.json` apres chaque nouvelle version Android.

URL du manifest :

```txt
https://ekddunxvtatdvxbszcsh.supabase.co/storage/v1/object/public/mobile-releases/latest.json
```

Ce fichier contient notamment :

```json
{
  "platform": "android",
  "versionName": "0.9.8",
  "versionCode": 23,
  "title": "Synaura mobile 0.9.8",
  "releaseNotes": [
    "Collections officielles mises en avant dans l'accueil et Decouvrir",
    "Pages collection premium avec ambiance basee sur la banniere",
    "Gestion admin complete des collections, images, visibilite et titres"
  ],
  "mandatory": false,
  "apkUrl": "https://github.com/XiNetworkProject/XimaM-Music-Platform/releases/download/android-v0.9.8-23/synaura-0.9.8-23.apk",
  "sha256": "995855cc6d0ba396704ef2ba9ce59736802bfb0a3eb18b1d36abf35d99424ab0",
  "sizeBytes": 71682698,
  "publishedAt": "2026-06-27T00:31:37.369Z"
}
```

Quand Synaura publie une nouvelle version :

1. Le manifest est mis a jour.
2. Le Registre Pro relit ce manifest.
3. Le bouton pointe automatiquement vers la nouvelle APK.
4. Aucune intervention manuelle n'est necessaire.

## 2. Integration conseillee pour Le Registre Pro

Le site Le Registre Pro affiche deja une fiche Synaura dans "Tout juste referencés" et possede des emplacements naturels pour une mise en avant :

- une carte sur la fiche entreprise Synaura ;
- un bloc "Applications" ;
- un bandeau partenaire ;
- un encart dans "Tout juste referencés" ;
- une page dediee "Application Synaura Android".

La meilleure version pour commencer :

```txt
Fiche Synaura
  -> bloc "Application Android"
  -> bouton "Telecharger Synaura Android"
  -> version + taille + date
  -> notes de version
```

Puis, si besoin :

```txt
Accueil Le Registre Pro
  -> mini-banniere "Synaura Android disponible"
  -> bouton vers la fiche Synaura ou vers l'APK
```

## 3. Methode simple : integration HTML + JavaScript

Cette solution marche sur un site classique, sans framework.

Ajouter ce HTML a l'endroit ou afficher le bloc :

```html
<section class="synaura-android-card" id="synauraAndroidCard">
  <div>
    <p class="synaura-eyebrow">Application Android</p>
    <h2>Synaura</h2>
    <p class="synaura-desc">
      Ecoutez, decouvrez et creez de la musique avec Synaura sur Android.
    </p>
    <p class="synaura-meta" id="synauraAndroidMeta">Recherche de la derniere version...</p>
  </div>

  <a class="synaura-download" id="synauraAndroidDownload" href="#" rel="noopener" target="_blank">
    Telecharger
  </a>
</section>

<ul class="synaura-release-notes" id="synauraReleaseNotes"></ul>
```

Ajouter ce CSS :

```css
.synaura-android-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px;
  border-radius: 28px;
  background:
    radial-gradient(circle at 10% 10%, rgba(236, 72, 153, 0.20), transparent 36%),
    radial-gradient(circle at 90% 30%, rgba(34, 211, 238, 0.22), transparent 34%),
    linear-gradient(135deg, #fff7ed, #f5f3ff);
  border: 1px solid rgba(23, 19, 19, 0.08);
  box-shadow: 0 18px 50px rgba(23, 19, 19, 0.10);
}

.synaura-eyebrow {
  margin: 0 0 6px;
  color: #8b5cf6;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.synaura-android-card h2 {
  margin: 0;
  color: #171313;
  font-size: 32px;
  line-height: 1;
}

.synaura-desc {
  margin: 8px 0 0;
  max-width: 520px;
  color: rgba(23, 19, 19, 0.68);
  font-weight: 700;
}

.synaura-meta {
  margin: 10px 0 0;
  color: rgba(23, 19, 19, 0.52);
  font-size: 14px;
  font-weight: 800;
}

.synaura-download {
  display: inline-flex;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0 22px;
  background: #171313;
  color: white;
  font-weight: 900;
  text-decoration: none;
  white-space: nowrap;
}

.synaura-download[aria-disabled="true"] {
  opacity: 0.5;
  pointer-events: none;
}

.synaura-release-notes {
  margin: 14px 0 0;
  padding-left: 18px;
  color: rgba(23, 19, 19, 0.66);
  font-size: 14px;
  font-weight: 700;
}

@media (max-width: 640px) {
  .synaura-android-card {
    align-items: flex-start;
    flex-direction: column;
  }

  .synaura-download {
    width: 100%;
  }
}
```

Ajouter ce JavaScript :

```html
<script>
  const SYNAURA_MANIFEST_URL =
    'https://ekddunxvtatdvxbszcsh.supabase.co/storage/v1/object/public/mobile-releases/latest.json';

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return '';
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  }

  function formatDate(value) {
    if (!value) return '';
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  }

  async function loadSynauraAndroidRelease() {
    const download = document.getElementById('synauraAndroidDownload');
    const meta = document.getElementById('synauraAndroidMeta');
    const notes = document.getElementById('synauraReleaseNotes');

    try {
      const response = await fetch(SYNAURA_MANIFEST_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);

      const release = await response.json();
      if (!release.apkUrl || release.platform !== 'android') {
        throw new Error('Manifest Synaura invalide');
      }

      download.href = release.apkUrl;
      download.textContent = `Telecharger v${release.versionName}`;
      download.removeAttribute('aria-disabled');

      meta.textContent = [
        `Version ${release.versionName}`,
        formatBytes(release.sizeBytes),
        formatDate(release.publishedAt),
      ].filter(Boolean).join(' · ');

      notes.innerHTML = '';
      (release.releaseNotes || []).slice(0, 3).forEach((note) => {
        const item = document.createElement('li');
        item.textContent = note;
        notes.appendChild(item);
      });
    } catch (error) {
      console.error(error);
      download.href = 'https://www.synaura.fr/android';
      download.textContent = 'Voir Synaura Android';
      meta.textContent = 'Impossible de verifier la derniere version pour le moment.';
    }
  }

  loadSynauraAndroidRelease();
</script>
```

Avantage : le bloc se met a jour automatiquement au chargement de la page.

## 4. Version Next.js / React

Si Le Registre Pro utilise Next.js, voici un composant serveur simple.

```tsx
const SYNAURA_MANIFEST_URL =
  'https://ekddunxvtatdvxbszcsh.supabase.co/storage/v1/object/public/mobile-releases/latest.json';

type SynauraRelease = {
  platform: 'android';
  versionName: string;
  versionCode: number;
  title: string;
  releaseNotes: string[];
  apkUrl: string;
  sha256: string;
  sizeBytes: number;
  publishedAt: string;
};

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

export async function SynauraAndroidCard() {
  const release = await fetch(SYNAURA_MANIFEST_URL, {
    next: { revalidate: 300 },
  })
    .then((response) => {
      if (!response.ok) throw new Error('Manifest Synaura indisponible');
      return response.json() as Promise<SynauraRelease>;
    })
    .catch(() => null);

  return (
    <section className="rounded-[28px] border border-black/10 bg-gradient-to-br from-rose-50 via-violet-50 to-cyan-50 p-6 shadow-xl">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
        Application Android
      </p>
      <h2 className="mt-2 text-3xl font-black text-neutral-950">Synaura</h2>
      <p className="mt-2 max-w-xl font-bold text-neutral-600">
        Ecoutez, decouvrez et creez de la musique avec Synaura sur Android.
      </p>

      {release ? (
        <>
          <p className="mt-3 text-sm font-extrabold text-neutral-500">
            Version {release.versionName} · {formatBytes(release.sizeBytes)}
          </p>
          <a
            href={release.apkUrl}
            className="mt-5 inline-flex rounded-full bg-neutral-950 px-6 py-3 font-black text-white"
            rel="noopener"
          >
            Telecharger Synaura Android
          </a>
          <ul className="mt-4 list-disc pl-5 text-sm font-bold text-neutral-600">
            {release.releaseNotes.slice(0, 3).map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </>
      ) : (
        <a
          href="https://www.synaura.fr/android"
          className="mt-5 inline-flex rounded-full bg-neutral-950 px-6 py-3 font-black text-white"
        >
          Voir la page Synaura Android
        </a>
      )}
    </section>
  );
}
```

Revalidation conseillee :

- `300` secondes si on veut une mise a jour rapide ;
- `3600` secondes si on veut limiter les appels ;
- `no-store` si on veut toujours relire le manifest en direct.

## 5. Version PHP / WordPress

Si Le Registre Pro utilise WordPress ou PHP, creer un shortcode :

```php
function lrp_synaura_android_card() {
  $manifest_url = 'https://ekddunxvtatdvxbszcsh.supabase.co/storage/v1/object/public/mobile-releases/latest.json';
  $cache_key = 'synaura_android_manifest';
  $release = get_transient($cache_key);

  if (!$release) {
    $response = wp_remote_get($manifest_url, array('timeout' => 8));

    if (!is_wp_error($response)) {
      $body = wp_remote_retrieve_body($response);
      $release = json_decode($body, true);

      if (is_array($release) && !empty($release['apkUrl'])) {
        set_transient($cache_key, $release, 5 * MINUTE_IN_SECONDS);
      }
    }
  }

  $apk_url = !empty($release['apkUrl']) ? esc_url($release['apkUrl']) : 'https://www.synaura.fr/android';
  $version = !empty($release['versionName']) ? esc_html($release['versionName']) : '';
  $size = !empty($release['sizeBytes']) ? round(((int) $release['sizeBytes']) / 1024 / 1024, 1) . ' Mo' : '';

  ob_start();
  ?>
    <section class="synaura-android-card">
      <p class="synaura-eyebrow">Application Android</p>
      <h2>Synaura</h2>
      <p>Ecoutez, decouvrez et creez de la musique avec Synaura sur Android.</p>
      <?php if ($version): ?>
        <p>Version <?php echo $version; ?><?php echo $size ? ' · ' . esc_html($size) : ''; ?></p>
      <?php endif; ?>
      <a href="<?php echo $apk_url; ?>" rel="noopener">Telecharger Synaura Android</a>
    </section>
  <?php
  return ob_get_clean();
}

add_shortcode('synaura_android', 'lrp_synaura_android_card');
```

Dans une page WordPress :

```txt
[synaura_android]
```

## 6. Option avancee : miroir automatique sur Le Registre Pro

Par defaut, Le Registre Pro pointe vers l'APK publiee par Synaura sur GitHub.

Si son site veut servir l'APK depuis son propre domaine, il peut mettre en place un miroir automatique. Ce n'est pas obligatoire.

Principe :

1. Un cron lit `latest.json`.
2. Il compare `versionCode` avec la derniere version locale.
3. Si une nouvelle version existe, il telecharge l'APK.
4. Il verifie le SHA-256.
5. Il place le fichier dans `/public/downloads/synaura-android.apk`.
6. Il met a jour un JSON local.

Script Node.js exemple :

```js
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const MANIFEST_URL =
  'https://ekddunxvtatdvxbszcsh.supabase.co/storage/v1/object/public/mobile-releases/latest.json';

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'downloads');
const APK_OUTPUT = path.join(OUTPUT_DIR, 'synaura-android.apk');
const LOCAL_MANIFEST = path.join(OUTPUT_DIR, 'synaura-latest.json');

async function readLocalManifest() {
  try {
    return JSON.parse(await fs.readFile(LOCAL_MANIFEST, 'utf8'));
  } catch {
    return null;
  }
}

async function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const remote = await fetch(MANIFEST_URL).then((response) => response.json());
  const local = await readLocalManifest();

  if (local && Number(local.versionCode) >= Number(remote.versionCode)) {
    console.log('Synaura Android deja a jour.');
    return;
  }

  const apkResponse = await fetch(remote.apkUrl);
  if (!apkResponse.ok) throw new Error(`APK HTTP ${apkResponse.status}`);

  const apkBuffer = Buffer.from(await apkResponse.arrayBuffer());
  const digest = await sha256(apkBuffer);

  if (digest !== remote.sha256) {
    throw new Error('SHA-256 invalide. APK non enregistree.');
  }

  await fs.writeFile(APK_OUTPUT, apkBuffer);
  await fs.writeFile(
    LOCAL_MANIFEST,
    JSON.stringify(
      {
        ...remote,
        mirroredApkUrl: '/downloads/synaura-android.apk',
        mirroredAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  console.log(`Synaura Android ${remote.versionName} miroir OK.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

Cron Linux exemple :

```bash
*/30 * * * * cd /var/www/leregistrepro && node scripts/sync-synaura-android.mjs >> logs/synaura-sync.log 2>&1
```

GitHub Action exemple :

```yaml
name: Sync Synaura Android

on:
  schedule:
    - cron: '*/30 * * * *'
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: node scripts/sync-synaura-android.mjs
      - run: |
          git config user.name "synaura-bot"
          git config user.email "bot@synaura.fr"
          git add public/downloads/synaura-android.apk public/downloads/synaura-latest.json
          git diff --cached --quiet || git commit -m "Update Synaura Android APK"
          git push
```

Attention : cette option ajoute un fichier APK de plus de 70 Mo dans le repo ou dans le serveur. Le plus simple reste de ne pas mirrorer, et de pointer vers `apkUrl`.

## 7. Securite et bonnes pratiques

Important :

- Ne jamais utiliser la cle Supabase service role sur Le Registre Pro.
- Le manifest public suffit.
- Ne jamais permettre une installation silencieuse de l'APK. Android demandera toujours une confirmation utilisateur.
- Toujours afficher clairement que le fichier est une APK Android.
- Ajouter une phrase d'aide : "Sur Android, si l'installation hors Play Store est bloquee, autorisez l'installation depuis votre navigateur."
- Si le site mirror l'APK, verifier `sha256` avant de servir le fichier.
- Ouvrir le lien dans le meme onglet ou un nouvel onglet selon l'UX du site, mais toujours avec `rel="noopener"` si `target="_blank"`.

Texte legal conseille :

```txt
Application Android fournie par Synaura. Le telechargement ouvre un fichier APK hors Google Play. Android peut demander une autorisation d'installation depuis le navigateur.
```

## 8. Texte pret a utiliser

Titre court :

```txt
Synaura Android est disponible
```

Description :

```txt
Decouvrez l'application Synaura sur Android : ecoutez, explorez, commentez et creez de la musique IA depuis votre telephone.
```

Bouton :

```txt
Telecharger l'application
```

Meta :

```txt
Derniere version Android · APK officiel Synaura · Mise a jour automatique
```

## 9. Checklist de mise en production

Avant de publier sur Le Registre Pro :

- [ ] Le bloc charge bien `latest.json`.
- [ ] Le bouton pointe vers `apkUrl`.
- [ ] La version affiche `versionName`.
- [ ] La taille affiche `sizeBytes`.
- [ ] En cas d'erreur reseau, le bouton renvoie vers `https://www.synaura.fr/android`.
- [ ] Le design est lisible mobile.
- [ ] Le bouton n'est pas cache par un header ou footer sticky.
- [ ] Le lien APK marche sur Android.
- [ ] Le lien reste comprehensible sur desktop.
- [ ] Aucun secret n'est expose cote client.

## 10. Verification rapide

Commande pour tester le manifest :

```bash
curl https://ekddunxvtatdvxbszcsh.supabase.co/storage/v1/object/public/mobile-releases/latest.json
```

Resultat attendu :

- `platform` vaut `android` ;
- `versionName` est present ;
- `versionCode` est present ;
- `apkUrl` pointe vers une APK ;
- `sha256` est present.

## 11. Recommandation finale

Pour Le Registre Pro, commencer avec la methode simple :

```txt
Manifest public Synaura -> carte dynamique sur la fiche Synaura -> bouton APK toujours a jour
```

Puis ajouter plus tard :

```txt
Banniere accueil -> page Apps -> miroir local optionnel
```

Cette approche est la plus fiable : Synaura garde le controle des releases, et Le Registre Pro affiche automatiquement la derniere version sans maintenance.
