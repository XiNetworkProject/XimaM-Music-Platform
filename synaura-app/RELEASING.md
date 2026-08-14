# Publier Synaura Android

## Nouvelle version

1. Modifier `version` et `android.versionCode` dans `app.json`.
2. Mettre a jour le titre, les notes et la version minimale dans `release.json`.
3. Construire puis publier depuis la racine du projet :

```powershell
cd synaura-app
npm run build:release
cd ..
npm run publish:android
```

La commande de publication :

- copie l'APK signe sur le SSD dans `mobile-releases/<version>/synaura.apk` ;
- calcule son SHA-256 en streaming ;
- publie atomiquement `latest.json` et l'historique sous
  `/mnt/Synaura-SSD/apps/synaura/media/mobile-releases`.

L'application lit d'abord l'API web, puis utilise directement le manifeste
public `https://media.synaura.fr/mobile-releases/latest.json` si le site n'est
pas encore deploye.

## Signature

Ne jamais regenerer la cle pour une mise a jour. Sauvegarder hors de cette
machine les deux fichiers listes dans `SIGNING.md`.

## Site web

La page `/download` et l'invite Android lisent le meme manifeste. Elles sont
publiees avec le prochain deploiement Vercel du site.
