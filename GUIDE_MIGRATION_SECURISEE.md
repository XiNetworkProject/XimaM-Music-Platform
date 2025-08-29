# 🛡️ Guide de Migration Sécurisée MongoDB → Supabase

## ⚠️ **IMPORTANT : Migration SANS Interférence Utilisateurs**

Ce guide vous permet de migrer vos données MongoDB vers Supabase **SANS** toucher aux utilisateurs existants. Les utilisateurs continueront à fonctionner normalement pendant la migration.

## 🚀 **Étapes de Migration**

### **1. Vérification de la Configuration**

Avant de commencer, vérifiez que tout est configuré :

```bash
npm run check:migration
```

Cette commande vérifie :
- ✅ Connexion MongoDB
- ✅ Connexion Supabase  
- ✅ Variables d'environnement
- ✅ Structure des tables

### **2. Migration des Données (Sécurisée)**

Lancez la migration des données uniquement :

```bash
npm run migrate:data
```

**Ce qui est migré :**
- 📁 **Pistes audio** (tracks)
- 📁 **Playlists** 
- 📁 **Commentaires**
- 📁 **Statistiques** (plays, likes)

**Ce qui N'EST PAS migré :**
- 👤 **Utilisateurs** (gardent leurs comptes MongoDB)
- 🔐 **Authentification** (NextAuth continue avec MongoDB)
- 💳 **Abonnements** (Stripe continue avec MongoDB)

### **3. Vérification Post-Migration**

Après la migration, vérifiez dans Supabase :
- Tables créées correctement
- Données migrées
- Index et contraintes

### **4. Test de l'Application**

Testez que l'application fonctionne toujours :
- ✅ Utilisateurs peuvent se connecter
- ✅ Pistes audio fonctionnent
- ✅ Playlists accessibles
- ✅ Commentaires visibles

## 🔄 **Migration Progressive**

### **Phase 1 : Données en Lecture Seule**
- Supabase contient les données
- MongoDB reste la source principale
- Application lit depuis MongoDB

### **Phase 2 : Double Écriture**
- Nouvelles données écrites dans MongoDB ET Supabase
- Synchronisation bidirectionnelle

### **Phase 3 : Basculement Complet**
- Supabase devient la source principale
- MongoDB en lecture seule
- Suppression progressive de MongoDB

## 🛡️ **Sécurité et Sauvegarde**

### **Avant la Migration**
```bash
# Sauvegarde MongoDB
mongodump --db ximam --out ./backup-mongodb

# Vérification des données
npm run check:migration
```

### **Pendant la Migration**
- ✅ Application continue de fonctionner
- ✅ Utilisateurs non impactés
- ✅ Données sauvegardées

### **Après la Migration**
- ✅ Vérification des données
- ✅ Test complet de l'application
- ✅ Rollback possible si problème

## 📋 **Commandes Utiles**

```bash
# Vérifier la configuration
npm run check:migration

# Lancer la migration des données
npm run migrate:data

# Tester la connexion Supabase
npm run test:supabase

# Migration complète (si nécessaire)
npm run migrate:supabase
```

## 🚨 **En Cas de Problème**

### **Rollback Immédiat**
1. Arrêter la migration
2. Vérifier les données MongoDB
3. Corriger le problème
4. Relancer la migration

### **Support**
- Vérifiez les logs de migration
- Consultez la documentation Supabase
- Testez avec un petit dataset d'abord

## 🎯 **Avantages de cette Approche**

✅ **Zéro interruption** pour les utilisateurs  
✅ **Migration progressive** et contrôlée  
✅ **Rollback facile** en cas de problème  
✅ **Test complet** avant basculement  
✅ **Sauvegarde** automatique des données  

## 🚀 **Prochaines Étapes**

1. **Exécuter** `npm run check:migration`
2. **Lancer** `npm run migrate:data`
3. **Vérifier** les données migrées
4. **Tester** l'application
5. **Planifier** la migration des utilisateurs (optionnel)

---

**🎉 Votre application XimaM continuera de fonctionner normalement pendant toute la migration !**
