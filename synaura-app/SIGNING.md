# Signature Android Synaura

Les APK publics Synaura doivent toujours etre signes avec la meme cle.

L'APK public 0.25.11 (82), vérifié le 2 octobre 2026, porte l'identifiant
**com.synaura.music**. Ne pas le remplacer par `fr.synaura.app` : ce serait
une autre application et non une mise à jour. Identité et certificat public
de référence : `release-identity.json` (aucune clé privée).

Avant toute publication, définir `SYNAURA_ANDROID_BUILD_TOOLS` vers le SDK
Android local puis lancer `node scripts/verify-android-upgrade.mjs` depuis
`synaura-app`. Vérifier aussi que le code est supérieur au manifeste public
actuel et installer avec `adb install -r` par-dessus l'APK précédent.
Ne pas désinstaller ni effacer les données pour faire passer ce test.

Fichiers locaux a sauvegarder ensemble hors du projet :

- `android/app/synaura-release.keystore`
- `android/keystore.properties`

Sans cette cle et ses mots de passe, Android refusera toutes les futures mises
a jour par-dessus une version deja installee.

Le build release echoue volontairement si aucune signature de production
n'est configuree. En CI, les memes valeurs peuvent etre fournies avec :

- `SYNAURA_UPLOAD_STORE_FILE`
- `SYNAURA_UPLOAD_STORE_PASSWORD`
- `SYNAURA_UPLOAD_KEY_ALIAS`
- `SYNAURA_UPLOAD_KEY_PASSWORD`
