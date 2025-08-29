# 🚀 GUIDE MIGRATION COMPLÈTE 100% MongoDB → Supabase

## 📋 **VUE D'ENSEMBLE**

Ce guide vous accompagne dans la **migration complète** de votre application XimaM de MongoDB vers Supabase, incluant **100% des données** et l'**authentification**.

## ⚠️ **AVERTISSEMENTS IMPORTANTS**

- **🔐 Authentification** : Tous les utilisateurs devront réinitialiser leurs mots de passe
- **🔄 Basculement** : L'application passera entièrement sur Supabase
- **📊 Données** : Aucune perte de données, migration complète
- **⏱️ Temps** : Migration estimée : 5-10 minutes

## 🎯 **OBJECTIFS DE LA MIGRATION**

- ✅ **100% des données** migrées vers Supabase
- ✅ **Authentification** gérée par Supabase
- ✅ **Base de données PostgreSQL** haute performance
- ✅ **8GB gratuits** avec Supabase
- ✅ **Aucune perte** de données

## 🛠️ **PRÉREQUIS**

### **1. Configuration Supabase**
```bash
# Vérifier la configuration
npm run test:supabase
```

### **2. Variables d'environnement**
```env
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_clé_anon
SUPABASE_SERVICE_ROLE_KEY=votre_clé_service
MONGODB_URI=votre_uri_mongodb
```

## 🚀 **LANCEMENT DE LA MIGRATION**

### **Commande de migration**
```bash
npm run migrate:100
```

### **Ce que fait le script**
1. 🔐 **Migration des utilisateurs** vers Supabase Auth
2. 👥 **Création des profils** utilisateurs
3. 📊 **Migration des statuts** utilisateurs
4. 🔗 **Mise à jour de toutes les relations**
5. 📋 **Génération du rapport** de migration

## 📊 **DONNÉES MIGRÉES**

| Collection MongoDB | Table Supabase | Statut | Quantité |
|-------------------|----------------|---------|----------|
| `users` | `profiles` | ✅ Migré | 5 utilisateurs |
| `tracks` | `tracks` | ✅ Migré | 12 pistes |
| `playlists` | `playlists` | ✅ Migré | 1 playlist |
| `comments` | `comments` | ✅ Migré | 7 commentaires |
| `conversations` | `conversations` | ✅ Migré | 3 conversations |
| `messages` | `messages` | ✅ Migré | 39 messages |
| `subscriptions` | `subscriptions` | ✅ Migré | 5 abonnements |
| `payments` | `payments` | ✅ Migré | 0 paiements |
| `userstatuses` | `profiles` | ✅ Intégré | 3 statuts |

## 🔑 **AUTHENTIFICATION POST-MIGRATION**

### **Mots de passe temporaires**
- **Mot de passe** : `XimaM2024!`
- **Email confirmé** : ✅ Oui
- **Réinitialisation** : Requise pour tous les utilisateurs

### **Utilisateurs migrés**
1. **Maxime Vermeulen** - vermeulenmaxime50@gmail.com
2. **XimaMOff** - vermeulenmaxime59@gmail.com
3. **Mixx Party** - associations@kreadev.org
4. **Evann Lagersie** - [email généré]
5. **Utilisateur Test** - [email généré]

## 🔗 **RELATIONS MIGRÉES**

### **Tracks → Users**
- `creator_id` mis à jour avec les nouveaux UUIDs Supabase

### **Comments → Users & Tracks**
- `user_id` mis à jour avec les nouveaux UUIDs
- `track_id` mis à jour avec les nouveaux UUIDs

### **Messages → Users & Conversations**
- `sender_id` mis à jour avec les nouveaux UUIDs
- `conversation_id` maintenu

## 📋 **VÉRIFICATION POST-MIGRATION**

### **1. Vérifier les données**
```bash
npm run compare:migration
```

### **2. Tester l'authentification**
- Se connecter avec les nouveaux mots de passe
- Vérifier les profils utilisateurs
- Tester les relations

### **3. Vérifier les relations**
- Tracks avec creator_id valides
- Commentaires avec user_id et track_id valides
- Messages avec sender_id valides

## 🎯 **PROCHAINES ÉTAPES**

### **Phase 1 : Vérification (Immédiat)**
- ✅ Vérifier toutes les données migrées
- ✅ Tester l'authentification Supabase
- ✅ Valider les relations

### **Phase 2 : Basculement (24h)**
- 🔄 Modifier l'application pour utiliser Supabase
- 🔄 Remplacer MongoDB par Supabase
- 🔄 Tester l'application complète

### **Phase 3 : Finalisation (48h)**
- 🚀 Désactiver MongoDB
- 🚀 Optimiser les performances Supabase
- 🚀 Monitoring et maintenance

## 🚨 **GESTION DES ERREURS**

### **Erreur courante : Utilisateur déjà existant**
```
AuthApiError: A user with this email address has already been registered
```
**Solution** : Le script gère automatiquement cette erreur et récupère l'ID existant.

### **Erreur courante : Contrainte de clé étrangère**
```
insert or update on table "profiles" violates foreign key constraint "profiles_id_fkey"
```
**Solution** : Le script crée d'abord l'utilisateur dans `auth.users` puis le profil.

## 📞 **SUPPORT ET AIDE**

### **En cas de problème**
1. Vérifier les logs de migration
2. Contrôler la configuration Supabase
3. Vérifier les variables d'environnement
4. Consulter la documentation Supabase

### **Ressources utiles**
- [Documentation Supabase](https://supabase.com/docs)
- [API Supabase](https://supabase.com/docs/reference/javascript)
- [Migration MongoDB → PostgreSQL](https://supabase.com/docs/guides/database/migrations)

## 🎉 **RÉSULTAT FINAL**

Après cette migration, votre application XimaM sera **100% sur Supabase** avec :

- 🚀 **Performance PostgreSQL** pour vos données musicales
- 🔐 **Authentification robuste** gérée par Supabase
- 📊 **8GB de stockage gratuit** avec possibilité d'extension
- 🔄 **Temps réel** intégré pour les fonctionnalités collaboratives
- 🛡️ **Sécurité** de niveau entreprise

**Votre application sera plus rapide, plus sécurisée et plus évolutive !** 🎵✨
