# 🚀 Guide de Configuration XimaM

## 📋 Prérequis

- Node.js 18+ installé
- MongoDB (local ou Atlas)
- Compte Google Cloud (pour OAuth)
- Compte Cloudinary (pour l'upload)

## 🔧 Configuration des Variables d'Environnement

### 1. Créer le fichier .env.local

Le fichier `.env.local` a été créé automatiquement. Vous devez maintenant le compléter :

```bash
# Ouvrir le fichier .env.local et remplacer les valeurs
```

### 2. Configuration MongoDB

**Option A : MongoDB Local**
```bash
# Installer MongoDB localement
# Puis utiliser :
MONGODB_URI=mongodb://localhost:27017/ximam
```

**Option B : MongoDB Atlas**
1. Aller sur [MongoDB Atlas](https://cloud.mongodb.com)
2. Créer un cluster gratuit
3. Cliquer sur "Connect"
4. Choisir "Connect your application"
5. Copier l'URI qui ressemble à :
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ximam
```

### 3. Configuration Google OAuth

1. Aller sur [Google Cloud Console](https://console.cloud.google.com)
2. Créer un projet ou sélectionner un existant
3. Activer l'API Google+ 
4. Créer des identifiants OAuth 2.0
5. Ajouter les URIs de redirection :
   - `http://localhost:3000/api/auth/callback/google`
   - `http://localhost:3000/auth/signin`
6. Copier Client ID et Client Secret

### 4. Configuration Cloudinary

1. Aller sur [Cloudinary](https://cloudinary.com)
2. Créer un compte gratuit
3. Dans le Dashboard, copier :
   - Cloud Name
   - API Key
   - API Secret

### 5. Variables à remplir dans .env.local

```bash
# Google OAuth (remplacer par vos valeurs)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Cloudinary (remplacer par vos valeurs)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# MongoDB (remplacer par votre URI)
MONGODB_URI=mongodb://localhost:27017/ximam
# ou
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ximam
```

## 🚀 Lancement de l'Application

### 1. Installer les dépendances
```bash
npm install
```

### 2. Lancer en mode développement
```bash
npm run dev
```

### 3. Ouvrir dans le navigateur
```
http://localhost:3000
```

## 📱 Génération de l'APK Android

### 1. Build pour production
```bash
npm run build
```

### 2. Synchroniser avec Capacitor
```bash
npx cap sync
```

### 3. Ouvrir dans Android Studio
```bash
npx cap open android
```

### 4. Générer l'APK
- Dans Android Studio : Build > Build Bundle(s) / APK(s) > Build APK(s)

## 🔄 Système de Mise à Jour

### Configuration du serveur de mise à jour

L'API de mise à jour est déjà configurée à :
```
http://localhost:3000/api/updates/check
```

### Variables d'environnement pour les mises à jour

```bash
# URL du serveur de mise à jour
UPDATE_SERVER_URL=http://localhost:3000/api/updates

# Intervalle de vérification (1 heure)
UPDATE_CHECK_INTERVAL=3600000
```

## 🛠️ Dépannage

### Erreur MongoDB
- Vérifier que MongoDB est démarré
- Vérifier l'URI de connexion
- Vérifier les permissions

### Erreur Google OAuth
- Vérifier les URIs de redirection
- Vérifier que l'API Google+ est activée
- Vérifier les identifiants

### Erreur Cloudinary
- Vérifier les clés API
- Vérifier les permissions du compte
- Vérifier les limites de stockage

## 📞 Support

En cas de problème :
1. Vérifier les logs dans la console
2. Vérifier la configuration des variables d'environnement
3. Redémarrer le serveur de développement 