# 🎵 Guide de Configuration Suno API

## 📋 Prérequis

1. **Compte Suno API** : Créez un compte sur [sunoapi.org](https://sunoapi.org)
2. **Clé API** : Obtenez votre clé API dans les paramètres de votre compte

## ⚙️ Configuration

### 1. Variables d'Environnement

Ajoutez cette ligne à votre fichier `.env.local` :

```bash
SUNO_API_KEY=votre_cle_api_suno_ici
```

### 2. Obtenir votre Clé API Suno

1. Allez sur [sunoapi.org](https://sunoapi.org)
2. Connectez-vous à votre compte
3. Allez dans **Dashboard** → **API Keys**
4. Cliquez sur **Create New API Key**
5. Copiez la clé générée

### 3. Plans et Prix Suno API

| Plan | Prix | Générations/mois | Limites |
|------|------|------------------|---------|
| **Gratuit** | $0 | 50 | 4 min max |
| **Pro** | $10/mois | 500 | 4 min max |
| **Ultra** | $25/mois | 2000 | 8 min max |

## 🚀 Test de Configuration

### 1. Test Rapide

```bash
# Vérifiez que la clé est bien configurée
echo $SUNO_API_KEY
```

### 2. Test API

```bash
# Testez l'API Suno directement
curl -X POST https://api.sunoapi.org/api/v1/generate \
  -H "Authorization: Bearer $SUNO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Une mélodie pop joyeuse",
    "duration": 30,
    "model": "v4"
  }'
```

## 🎵 Utilisation dans l'App

### Génération de Musique

1. **Allez sur** `/ai-generator`
2. **Décrivez** votre musique
3. **Choisissez** un style
4. **Cliquez** sur "Générer"
5. **Attendez** 30-60 secondes
6. **Écoutez** votre création !

### Styles Disponibles

- 🎵 **Pop** : Mélodies accrocheuses et modernes
- 🎸 **Rock** : Guitares électriques et énergie
- 🎷 **Jazz** : Saxophone et piano sophistiqués
- 🎼 **Classical** : Orchestre élégant et intemporel
- 🎹 **Electronic** : Synthétiseurs et beats futuristes
- 🌟 **Ambient** : Musique atmosphérique et relaxante
- 🎤 **Hip Hop** : Beats urbains et rythmiques
- 🪕 **Country** : Guitare acoustique et chaleur
- 🌴 **Reggae** : Rythmes caribéens et tropicaux
- 🎸 **Blues** : Guitare soul et émotionnelle

## 🔧 Dépannage

### Erreur "Configuration Suno manquante"

```bash
# Vérifiez que la variable est définie
echo $SUNO_API_KEY

# Si vide, ajoutez-la à .env.local
echo "SUNO_API_KEY=votre_cle" >> .env.local
```

### Erreur "Quota dépassé"

- **Vérifiez** votre plan Suno
- **Attendez** le renouvellement mensuel
- **Upgradez** vers un plan supérieur

### Erreur "Timeout génération"

- **Vérifiez** votre connexion internet
- **Réessayez** la génération
- **Contactez** le support Suno si persistant

## 💡 Conseils d'Optimisation

### Prompts Efficaces

✅ **Bons exemples :**
- "Une mélodie pop joyeuse avec des guitares acoustiques"
- "Musique électronique futuriste avec des beats puissants"
- "Jazz smooth avec saxophone et piano"

❌ **À éviter :**
- "Fais une chanson" (trop vague)
- "Musique triste" (pas assez descriptif)
- "Comme Taylor Swift" (copyright)

### Durée Optimale

- **30 secondes** : Test rapide
- **2 minutes** : Équilibre qualité/temps
- **4 minutes** : Qualité maximale (gratuit/pro)
- **8 minutes** : Qualité ultra (plan ultra)

## 🔒 Sécurité

### Protection de la Clé API

- ✅ **Jamais** commiter la clé dans Git
- ✅ **Utilisez** `.env.local` (ignoré par Git)
- ✅ **Limitez** l'accès à votre équipe
- ✅ **Surveillez** l'usage dans votre dashboard Suno

### Limites de Rate

- **Gratuit** : 10 requêtes/minute
- **Pro** : 50 requêtes/minute
- **Ultra** : 100 requêtes/minute

## 📞 Support

### Ressources Officielles

- 📖 **Documentation** : [docs.sunoapi.org](https://docs.sunoapi.org)
- 🎵 **Dashboard** : [sunoapi.org](https://sunoapi.org)
- 💬 **Support** : support@sunoapi.org

### Contact Support

- 📧 **Email** : support@sunoapi.org
- 🌐 **Site** : [sunoapi.org](https://sunoapi.org)
- 📖 **Documentation** : [docs.sunoapi.org](https://docs.sunoapi.org)

---

## ✅ Configuration Terminée !

Votre générateur de musique IA est maintenant configuré avec Suno API !

**Prochaines étapes :**
1. Testez une génération sur `/ai-generator`
2. Ajustez vos prompts selon vos besoins
3. Surveillez votre usage dans le dashboard Suno API
4. Profitez de vos créations musicales ! 🎵✨
