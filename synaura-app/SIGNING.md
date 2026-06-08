# Signature Android Synaura

Les APK publics Synaura doivent toujours etre signes avec la meme cle.

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
