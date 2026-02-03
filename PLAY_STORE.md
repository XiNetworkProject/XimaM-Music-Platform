# Publier Synaura sur le Google Play Store

Ce guide décrit les étapes pour publier l’app Android Synaura sur le Play Store.

---

## 1. Prérequis techniques (déjà en place)

- **Package** : `com.synaura.music`
- **Version** : 1.1.0 (`versionCode` 2 dans `android/app/build.gradle`)
- **targetSdkVersion** : 35 (conforme aux exigences Play Store)
- **Permissions** : INTERNET, notifications, lecture en arrière-plan (justifiées pour une app musique)

---

## 2. Créer la clé de signature (release)

Pour publier sur le Play Store, l’app doit être signée avec une clé de release.

### Créer un keystore (une seule fois)

Depuis le dossier **android/** du projet, utiliser le format **JKS** (évite l’erreur « tag type 35 » avec Gradle) :

```bash
keytool -genkey -v -keystore synaura-release.keystore -alias synaura -keyalg RSA -keysize 2048 -validity 10000 -storetype JKS
```

- Répondre aux questions (nom, organisation, ville, pays).
- **Mot de passe** : à retenir et à conserver en lieu sûr. En cas de perte, tu ne pourras plus mettre à jour l’app sur le Play Store.
- Si tu as déjà créé un keystore et que tu vois « toDerInputStream rejects tag type 35 », supprime l’ancien fichier `.keystore` et recrée-le avec la commande ci-dessus (avec `-storetype JKS`).

### Configurer Gradle

1. Copier le fichier d’exemple :
   ```bash
   cd android
   cp keystore.properties.example keystore.properties
   ```

2. Éditer **keystore.properties** (ne jamais le committer) :
   ```properties
   storeFile=synaura-release.keystore
   storePassword=TON_MOT_DE_PASSE_STORE
   keyAlias=synaura
   keyPassword=TON_MOT_DE_PASSE_KEY
   ```

3. Si le keystore est dans un autre dossier, adapter `storeFile` (chemin relatif au dossier **android/**).

Après ça, le build **release** signera automatiquement l’app avec cette clé.

---

## 3. Build release (AAB pour le Play Store)

Le Play Store demande un **Android App Bundle** (.aab), pas un APK.

```bash
# 1. Build du site et sync Capacitor
npm run build:android

# 2. Depuis Android Studio : Build > Generate Signed Bundle / APK > Android App Bundle
#    Ou en ligne de commande depuis android/ :
cd android
./gradlew bundleRelease   # Mac/Linux
gradlew.bat bundleRelease # Windows
```

Le fichier signé se trouve ici :  
`android/app/build/outputs/bundle/release/app-release.aab`

Tu uploades **ce fichier** dans la Play Console.

---

## 4. Compte Google Play et fiche Play Store

### Créer un compte développeur

- Aller sur [Google Play Console](https://play.google.com/console).
- S’inscrire (frais uniques, environ 25 €).

### Créer l’application

- Dans la console : **Créer une application**.
- Renseigner nom, langue par défaut, type (Application), etc.

### Fiche Play Store (obligatoire)

À remplir dans la Play Console pour chaque version publiée :

| Élément | À préparer |
|--------|------------|
| **Titre** | Synaura (max 30 caractères) |
| **Description courte** | 80 caractères max |
| **Description longue** | Présentation de l’app (fonctions, musique, communauté, etc.) |
| **Icône** | 512 x 512 px, PNG 32 bits |
| **Image de présentation** | 1024 x 500 px (optionnel mais recommandé) |
| **Captures d’écran** | Au moins 2 (téléphone 16:9 ou 9:16), optionnel tablette |

### Politique de confidentialité

- Le Play Store exige une **URL de politique de confidentialité**.
- L’app a déjà une page : **https://xima-m-music-platform.vercel.app/legal/confidentialite** — à indiquer dans la fiche Play Store.

### Classement du contenu

- Dans la console : **Stratégie** > **Classement du contenu**.
- Remplir le questionnaire (âge, contenu, publicité, etc.). Pour une app musique sans contenu choquant, le classement reste en général bas (ex. 3+ ou 12+ selon les réponses).

### Sécurité des données

- **Sécurité des données** (obligatoire) : décrire quelles données sont collectées (compte, email, lecture, etc.) et à quoi elles servent.
- Pour Synaura : compte (email, nom), écoutes, likes, commentaires, abonnement si applicable. Indiquer si les données sont partagées avec des tiers (analytics, Stripe, etc.).

---

## 5. Mise en production

1. **Uploader** le fichier **app-release.aab** dans la section **Version** > **Production** (ou **Tests internes** pour commencer).
2. Remplir **Fiche Play Store**, **Politique de confidentialité**, **Classement du contenu**, **Sécurité des données** si ce n’est pas déjà fait.
3. Soumettre pour **examen**. Le délai est en général de quelques heures à quelques jours.
4. Après validation, l’app sera disponible sur le Play Store (ou uniquement en test si tu as choisi tests internes/fermés).

---

## 6. Mises à jour ultérieures

À chaque nouvelle version :

1. Incrémenter **versionCode** dans `android/app/build.gradle` (ex. 3, 4, 5…).
2. Mettre à jour **versionName** (ex. `"1.2.0"`).
3. Refaire un build : `npm run build:android` puis `./gradlew bundleRelease` dans **android/**.
4. Uploader le nouveau **app-release.aab** dans la Play Console (même chemin de version).

---

## Résumé des fichiers modifiés pour la release

| Fichier | Rôle |
|--------|------|
| `android/app/build.gradle` | versionCode, versionName, signingConfig release |
| `android/keystore.properties` | Mots de passe et chemin du keystore (à créer, ne pas committer) |
| `android/keystore.properties.example` | Exemple pour créer `keystore.properties` |
| `android/.gitignore` | Ignore `keystore.properties` |

Une fois le keystore créé et `keystore.properties` rempli, tu peux générer l’AAB signé et le publier sur le Play Store en suivant les étapes ci-dessus.
