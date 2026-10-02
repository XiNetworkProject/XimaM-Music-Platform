# Synaura App

## Entrée native 0.26.0 (83)

Lot : logo vectoriel et icônes adaptatives, splash natif + transition courte,
présentation horizontale, connexion/inscription et premiers pas, accueil Live
avec données réelles et continuité du morceau présenté. Le reste des écrans et
le moteur audio ne sont pas remplacés dans ce lot. Les préférences, sessions et
clés de stockage existantes sont conservées.

Production Android actuelle : distribution APK via
`https://media.synaura.fr/mobile-releases/latest.json` et l'écran de mise à jour
de l'application. Ce canal n'est pas une publication Play Store / App Store.
L'identifiant Android historique est `com.synaura.music`, pas `fr.synaura.app`.
Voir `SIGNING.md` et `release-identity.json` avant toute distribution.

- `node scripts/render-entry-brand.mjs` génère les PNG depuis le même maître
  vectoriel que l'interface. `--android` actualise les ressources Gradle locales.
- `npm run type-check`, `npm run check:responsive`, `npm run check:theme`.
- Build Release en `NODE_ENV=production`, avec la signature existante uniquement.
- `node scripts/verify-android-upgrade.mjs` vérifie package, version et certificat.
- Tester l'installation **par-dessus** l'APK public précédent (`adb install -r`),
  jamais après désinstallation. Publier l'APK immuable et son manifeste versionné
  avant de remplacer atomiquement `latest.json` ; conserver le manifeste précédent.

### Validation du lot (2 octobre 2026)

- Release signé 83 : package et certificat identiques à l'APK public 82 ;
  installation `-r` acceptée, date d'installation initiale conservée.
- TypeScript, contrôles thème/responsive, 36 tests natifs/Android et build Release : PASS.
- Émulateur Android : présentation horizontale, inscription sans soumission,
  clavier logiciel, connexion réelle E2E et restauration de session contrôlés.
  Le compte E2E incomplet reste au contrôle de finalisation : aucune donnée
  personnelle inventée, aucun compte créé, aucun contournement de sécurité.
- Accueil invité sur données de production, pochettes réelles et continuité
  accueil → Live contrôlés (même morceau et session média, sans redémarrage).
- La sollicitation de notifications attend désormais la fin des contrôles de
  compte, MFA et biométrie ; elle ne doit pas recouvrir l'entrée sécurisée.
- Téléphone physique, iOS, OAuth Google et parcours MFA/biométrique réels :
  non validés dans ce lot. Le fil Live interne et les autres écrans restent
  les écrans existants ; cette refonte porte sur l'entrée et l'accueil Live.

Les notes MVP ci-dessous sont historiques, pas un état actuel exhaustif.

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
https://synaura.fr
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
