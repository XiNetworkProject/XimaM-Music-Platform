# Synaura App

Nouveau socle mobile natif pour Synaura.

Objectif du MVP :

- UI fidele a la version web Synaura.
- Moteur audio natif avec `react-native-track-player`.
- Notification media, lock screen, boutons casque.
- Android installable via APK, puis Play Store.
- iOS via TestFlight / App Store.

## Fonctionnel maintenant

- Accueil "Pour toi" branche aux APIs web Synaura.
- Decouvrir avec tendances, nouveautes et populaires.
- Recherche de titres.
- Bibliotheque locale avec favoris et historique d'ecoute.
- Mini-player global.
- Lecteur plein ecran.
- Queue native et controles casque/lock screen via TrackPlayer.
- Page profil/statut app.

## Demarrage

```bash
cd synaura-app
npm install
npm run android
```

## Configuration API

Par defaut l'app pointe vers :

```txt
https://xima-m-music-platform.vercel.app
```

Tu peux surcharger avec :

```bash
EXPO_PUBLIC_API_BASE_URL=https://ton-domaine.fr npm run android
```

## Build Android APK

Le plus simple pour un APK testable :

```bash
cd synaura-app
npm install
npx expo prebuild --platform android
npx expo run:android
```

Prerequis local :

- Android Studio installe.
- Android SDK installe.
- `ANDROID_HOME` pointe vers le SDK, souvent `C:\Users\<toi>\AppData\Local\Android\Sdk`.
- `adb` disponible dans le `PATH`.

Pour un vrai APK/AAB de distribution, on passera ensuite par EAS Build ou Gradle release.

## A brancher ensuite

- Auth mobile reelle.
- Likes serveur au lieu des favoris locaux.
- Playlists serveur.
- Profil utilisateur complet.
- Messages et notifications push sociales.
- Studio IA mobile.
