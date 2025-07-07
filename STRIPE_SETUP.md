# 🏗️ Configuration Stripe pour XimaM

Ce guide vous accompagne dans la configuration de Stripe pour les paiements d'abonnement sur XimaM.

## 📋 Prérequis

1. **Compte Stripe** : Créez un compte sur [stripe.com](https://stripe.com)
2. **Clés API** : Récupérez vos clés depuis le dashboard Stripe
3. **Webhook** : Configurez un endpoint webhook pour les événements

## 🔑 Configuration des clés API

### 1. Récupérer les clés Stripe

1. Connectez-vous à votre [dashboard Stripe](https://dashboard.stripe.com)
2. Allez dans **Developers > API keys**
3. Copiez vos clés :
   - **Publishable key** (commence par `pk_test_` ou `pk_live_`)
   - **Secret key** (commence par `sk_test_` ou `sk_live_`)

### 2. Ajouter les variables d'environnement

Ajoutez ces variables à votre fichier `.env.local` :

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_votre_cle_secrete
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_votre_cle_publique
STRIPE_WEBHOOK_SECRET=whsec_votre_webhook_secret
```

## 🌐 Configuration du Webhook

### 1. Créer l'endpoint webhook

1. Dans votre dashboard Stripe, allez dans **Developers > Webhooks**
2. Cliquez sur **Add endpoint**
3. URL : `https://votre-domaine.com/api/webhooks/stripe`
4. Événements à écouter :
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 2. Récupérer le secret webhook

1. Après avoir créé le webhook, cliquez sur **Reveal** pour voir le secret
2. Copiez le secret (commence par `whsec_`)
3. Ajoutez-le à vos variables d'environnement

## 🚀 Initialisation des produits Stripe

### 1. Installer les dépendances

```bash
npm install stripe @stripe/stripe-js
```

### 2. Exécuter le script de configuration

```bash
node scripts/setup-stripe.js
```

Ce script va :
- Se connecter à votre base de données MongoDB
- Récupérer tous les abonnements existants
- Créer les produits et prix correspondants dans Stripe
- Mettre à jour les abonnements avec les IDs Stripe

## 🧪 Test en mode développement

### 1. Cartes de test Stripe

Utilisez ces cartes pour tester les paiements :

- **Succès** : `4242 4242 4242 4242`
- **Échec** : `4000 0000 0000 0002`
- **3D Secure** : `4000 0025 0000 3155`

### 2. Tester le flux complet

1. Allez sur `/subscriptions`
2. Choisissez un plan payant
3. Cliquez sur "S'abonner"
4. Utilisez une carte de test
5. Vérifiez que l'abonnement est créé

## 🔧 Configuration Vercel

### 1. Variables d'environnement

Ajoutez vos variables Stripe dans les paramètres Vercel :

1. Allez dans votre projet Vercel
2. **Settings > Environment Variables**
3. Ajoutez :
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`

### 2. Webhook en production

1. Mettez à jour l'URL du webhook dans Stripe
2. Utilisez votre domaine de production
3. Testez avec l'outil de test Stripe

## 📊 Monitoring et logs

### 1. Dashboard Stripe

- **Payments** : Suivez tous les paiements
- **Subscriptions** : Gérez les abonnements
- **Customers** : Consultez les clients
- **Logs** : Vérifiez les événements webhook

### 2. Logs de l'application

Les événements Stripe sont loggés dans la console :
- Paiements réussis/échoués
- Création d'abonnements
- Annulations
- Erreurs webhook

## 🛡️ Sécurité

### 1. Bonnes pratiques

- ✅ Utilisez toujours HTTPS en production
- ✅ Validez les signatures webhook
- ✅ Ne stockez jamais les cartes de crédit
- ✅ Utilisez les clés de test pour le développement

### 2. Gestion des erreurs

- Gestion gracieuse des échecs de paiement
- Retry automatique pour les webhooks
- Notifications utilisateur appropriées

## 🔄 Migration vers la production

### 1. Changer vers les clés live

1. Remplacez `sk_test_` par `sk_live_`
2. Remplacez `pk_test_` par `pk_live_`
3. Mettez à jour l'URL du webhook

### 2. Tests finaux

1. Testez avec de vraies cartes
2. Vérifiez les webhooks
3. Testez les annulations
4. Vérifiez les remboursements

## 📞 Support

- **Documentation Stripe** : [stripe.com/docs](https://stripe.com/docs)
- **Support Stripe** : [support.stripe.com](https://support.stripe.com)
- **Issues GitHub** : Créez une issue pour les problèmes spécifiques à XimaM

## 🎯 Prochaines étapes

Une fois Stripe configuré, vous pouvez :

1. **Analytics avancés** : Suivi des revenus
2. **Gestion des remboursements** : Interface admin
3. **Facturation** : Génération de factures
4. **Taxes** : Calcul automatique des taxes
5. **Paiements internationaux** : Support multi-devises

---

**Note** : Ce guide couvre la configuration de base. Pour des fonctionnalités avancées, consultez la documentation Stripe complète. 