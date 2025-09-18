# 🎵 Guide Configuration Webhook Suno API

## 📋 Vue d'ensemble

Ce guide explique comment configurer le système de webhook pour recevoir automatiquement les notifications de génération de musique de Suno API.

## 🔧 Configuration Requise

### 1. **Variables d'Environnement**

Assurez-vous d'avoir ces variables dans votre `.env.local` :

```env
SUNO_API_KEY=votre_cle_api_suno
NEXTAUTH_URL=https://votre-domaine.com
```

### 2. **Base de Données**

Exécutez le script de migration pour ajouter le champ `task_id` :

```sql
-- Exécuter dans Supabase SQL Editor
\i scripts/add_task_id_to_ai_generations.sql
```

## 🌐 Configuration Webhook

### **URL de Callback**

L'URL de callback est automatiquement configurée dans l'API :
```
https://votre-domaine.com/api/ai/webhook
```

### **Structure du Webhook**

Le webhook reçoit les données selon la [documentation officielle Suno](https://docs.sunoapi.org/suno-api/generate-music-callbacks) :

```json
{
  "code": 200,
  "msg": "All generated successfully.",
  "data": {
    "callbackType": "complete",
    "task_id": "2fac****9f72",
    "data": [
      {
        "id": "8551****662c",
        "audio_url": "https://example.cn/****.mp3",
        "title": "Iron Man",
        "duration": 198.44
      }
    ]
  }
}
```

## 🔄 Types de Callbacks

### **1. Text Generation (`text`)**
- Génération de texte terminée
- Première étape du processus

### **2. First Track (`first`)**
- Première piste audio terminée
- Streaming disponible en 30-40 secondes

### **3. Complete (`complete`)**
- Toutes les pistes terminées
- Téléchargement disponible en 2-3 minutes

### **4. Error (`error`)**
- Erreur lors de la génération
- Code d'erreur dans `msg`

## ⚡ Avantages du Webhook

### **✅ Avantages**
- **Temps réel** : Notifications instantanées
- **Efficacité** : Pas de polling constant
- **Fiabilité** : Retry automatique en cas d'échec
- **Performance** : Moins de requêtes API

### **⚠️ Limitations**
- **URL publique** : Doit être accessible depuis Internet
- **Timeout** : 15 secondes max pour répondre
- **Retry** : 3 tentatives maximum

## 🚀 Test du Webhook

### **1. Test Local avec ngrok**

```bash
# Installer ngrok
npm install -g ngrok

# Exposer le port local
ngrok http 3000

# Utiliser l'URL ngrok dans NEXTAUTH_URL
NEXTAUTH_URL=https://abc123.ngrok.io
```

### **2. Test de Connectivité**

```bash
# Tester l'endpoint webhook
curl -X POST https://votre-domaine.com/api/ai/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'
```

## 🔍 Monitoring

### **Logs de Debug**

Les webhooks sont loggés dans la console :

```javascript
// Logs d'exemple
🎵 Webhook Suno reçu: {...}
📊 Callback Suno pour taskId: {...}
✅ Génération Suno terminée pour taskId
✅ Base de données mise à jour pour taskId
```

### **Statuts de Base de Données**

- `pending` : Génération en cours
- `completed` : Génération terminée
- `failed` : Génération échouée

## 🛠️ Dépannage

### **Problème : Webhook non reçu**

1. **Vérifier l'URL** : Assurez-vous que l'URL est publique
2. **Vérifier les logs** : Consultez les logs du serveur
3. **Tester la connectivité** : Utilisez curl ou Postman
4. **Vérifier le firewall** : Assurez-vous que le port 443 est ouvert

### **Problème : Timeout**

1. **Optimiser le code** : Réduire le temps de traitement
2. **Traitement asynchrone** : Déplacer le traitement lourd
3. **Réponse rapide** : Répondre immédiatement avec 200

### **Problème : Erreur de base de données**

1. **Vérifier la connexion** : Testez la connexion Supabase
2. **Vérifier les permissions** : Assurez-vous que les RLS sont corrects
3. **Vérifier la structure** : Exécutez le script de migration

## 📊 Métriques

### **Suivi des Performances**

- **Temps de génération** : Moyenne 2-3 minutes
- **Taux de succès** : >95% avec Suno API
- **Temps de réponse webhook** : <1 seconde

### **Alertes**

- **Webhook non reçu** : Vérifier après 5 minutes
- **Erreur de génération** : Log automatique
- **Timeout** : Retry automatique

## 🔐 Sécurité

### **Validation des Webhooks**

- **Vérifier l'origine** : Seulement depuis Suno API
- **Validation des données** : Vérifier la structure JSON
- **Gestion des erreurs** : Logs détaillés

### **Bonnes Pratiques**

1. **HTTPS obligatoire** : Pour la production
2. **Validation des données** : Toujours valider les entrées
3. **Logs sécurisés** : Ne pas logger les clés API
4. **Rate limiting** : Protéger contre le spam

## 📚 Ressources

- [Documentation Suno API](https://docs.sunoapi.org/)
- [Guide des Callbacks](https://docs.sunoapi.org/suno-api/generate-music-callbacks)
- [Exemples de Code](https://docs.sunoapi.org/suno-api/generate-music-callbacks#callback-reception-examples)

---

**🎵 Votre système de webhook Suno est maintenant configuré pour des générations ultra-rapides et fiables !**
