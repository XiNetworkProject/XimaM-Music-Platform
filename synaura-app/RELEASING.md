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

- depose l'APK signe dans une GitHub Release ;
- calcule son SHA-256 ;
- publie `latest.json` et son historique dans le bucket Supabase
  `mobile-releases`.

L'application lit d'abord l'API web, puis utilise directement le manifeste
public Supabase si le site n'est pas encore deploye.

## Signature

Ne jamais regenerer la cle pour une mise a jour. Sauvegarder hors de cette
machine les deux fichiers listes dans `SIGNING.md`.

## Site web

La page `/download` et l'invite Android lisent le meme manifeste. Elles sont
publiees avec le prochain deploiement Vercel du site.
