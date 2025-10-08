# Configuration des Prix Stripe pour l'Offre de Lancement

## 🎉 Réductions de Lancement

Pour l'offre de lancement de Synaura, nous appliquons les réductions suivantes :

- **Plan Starter** : -60% (de 4,99€ à **1,99€/mois**)
- **Plan Pro** : -50% (de 14,99€ à **7,49€/mois**)

## 📋 Prix à Créer dans Stripe Dashboard

### 1. Accéder au Dashboard Stripe
- Aller sur https://dashboard.stripe.com/products
- Cliquer sur "Add product" pour chaque plan

### 2. Plan Starter - Prix de Lancement

#### Prix Mensuel Starter (Lancement)
- **Nom du produit** : Synaura Starter (Lancement)
- **Prix** : 1,99€ / mois
- **Type** : Récurrent
- **Intervalle** : Mensuel
- **Description** : "Plan Starter avec 60% de réduction - Offre de lancement"

#### Prix Annuel Starter (Lancement)
- **Nom du produit** : Synaura Starter (Lancement)
- **Prix** : 19,10€ / an
- **Type** : Récurrent
- **Intervalle** : Annuel
- **Description** : "Plan Starter annuel avec 60% de réduction - Offre de lancement"
- **Note** : Prix calculé = (4,99€ × 12 × 0.8 [remise annuelle] × 0.4 [prix après -60%]) = 19,16€

### 3. Plan Pro - Prix de Lancement

#### Prix Mensuel Pro (Lancement)
- **Nom du produit** : Synaura Pro (Lancement)
- **Prix** : 7,49€ / mois
- **Type** : Récurrent
- **Intervalle** : Mensuel
- **Description** : "Plan Pro avec 50% de réduction - Offre de lancement"

#### Prix Annuel Pro (Lancement)
- **Nom du produit** : Synaura Pro (Lancement)
- **Prix** : 71,90€ / an
- **Type** : Récurrent
- **Intervalle** : Annuel
- **Description** : "Plan Pro annuel avec 50% de réduction - Offre de lancement"
- **Note** : Prix calculé = (14,99€ × 12 × 0.8 [remise annuelle] × 0.5 [prix après -50%]) = 71,95€

## 🔑 Variables d'Environnement à Ajouter

Après avoir créé les prix dans Stripe, ajouter ces variables dans votre fichier `.env.local` :

```env
# Prix de lancement Stripe (avec réductions)
NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTH_LAUNCH=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEAR_LAUNCH=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTH_LAUNCH=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PRICE_PRO_YEAR_LAUNCH=price_xxxxxxxxxxxxx

# Prix normaux (à utiliser après la fin de l'offre)
NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTH=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEAR=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTH=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PRICE_PRO_YEAR=price_xxxxxxxxxxxxx
```

## 📊 Tableau Récapitulatif

| Plan | Période | Prix Normal | Prix Annuel (-20%) | Prix Lancement | Réduction | Économie/an |
|------|---------|-------------|-------------------|----------------|-----------|-------------|
| Starter | Mensuel | 4,99€/mois | - | **1,99€/mois** | -60% | 36€/an |
| Starter | Annuel | 59,88€/an | 47,90€/an | **19,16€/an** | -60% + -20% | 40,72€/an |
| Pro | Mensuel | 14,99€/mois | - | **7,49€/mois** | -50% | 89,40€/an |
| Pro | Annuel | 179,88€/an | 143,90€/an | **71,95€/an** | -50% + -20% | 107,93€/an |

## 🎯 Message Marketing

Les premiers abonnés qui souscrivent pendant l'offre de lancement **conserveront ce prix réduit à vie** grâce au système de "grandfathering" de Stripe. Même après la fin de l'offre, ils continueront à payer le prix de lancement !

## ⏰ Date de Fin de l'Offre

**7 novembre 2025** à 23:59:59

Après cette date, mettre à jour le code pour utiliser les price IDs normaux au lieu des price IDs de lancement.

## 🔄 Comment Basculer après la Fin de l'Offre

1. Dans `app/subscriptions/page.tsx`, changer :
   ```typescript
   // Actuellement
   const priceMap = useMemo(() => ({
     Starter: { 
       month: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTH_LAUNCH || '', 
       year: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEAR_LAUNCH || '' 
     },
     // ...
   }), []);
   ```

2. Remplacer par :
   ```typescript
   const priceMap = useMemo(() => ({
     Starter: { 
       month: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTH || '', 
       year: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEAR || '' 
     },
     // ...
   }), []);
   ```

3. Retirer les props `launchDiscount` des composants PlanCard
4. Retirer la bannière de lancement

---

**Important** : Les utilisateurs déjà abonnés aux prix de lancement conserveront automatiquement leur prix grâce au système de Stripe. Pas besoin de migration manuelle ! 🎁

