# 🚨 Dépannage Rapide - Système IA Synaura

## ❌ Erreur 404 sur `/api/ai/quota`

### **Problème**
```
api/ai/quota:1 Failed to load resource: the server responded with a status of 404 (Not Found)
```

### **Solutions**

#### **1. Vérifier que l'application est lancée**
```bash
# Dans le terminal, à la racine du projet
npm run dev
```

**Attendre que vous voyiez :**
```
✓ Ready in 2.3s
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000
```

#### **2. Vérifier les variables d'environnement**
Créer ou modifier le fichier `.env.local` à la racine :

```env
# Supabase (OBLIGATOIRE)
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_clé_anon_supabase
SUPABASE_SERVICE_ROLE_KEY=votre_clé_service_supabase

# NextAuth (OBLIGATOIRE)
NEXTAUTH_SECRET=votre_secret_nextauth
NEXTAUTH_URL=http://localhost:3000
```

#### **3. Redémarrer l'application**
```bash
# Arrêter avec Ctrl+C
# Puis relancer
npm run dev
```

#### **4. Tester l'endpoint manuellement**
```bash
# Dans un nouveau terminal
node scripts/test-quota-endpoint.js
```

## ❌ Erreur "Table ai_generations does not exist"

### **Solution : Créer la table**

#### **Option A : Via l'interface Supabase**
1. Aller sur https://supabase.com
2. Ouvrir votre projet
3. Aller dans "SQL Editor"
4. Copier et exécuter :

```sql
-- Table pour les générations IA
CREATE TABLE IF NOT EXISTS ai_generations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    audio_url TEXT NOT NULL,
    prompt TEXT NOT NULL,
    duration INTEGER NOT NULL DEFAULT 30,
    model VARCHAR(50) NOT NULL DEFAULT 'audiocraft',
    style VARCHAR(50),
    quality VARCHAR(20) DEFAULT '256kbps',
    status VARCHAR(20) DEFAULT 'pending',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_ai_generations_user_id ON ai_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_created_at ON ai_generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_generations_status ON ai_generations(status);

-- RLS (Row Level Security)
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

-- Politiques
CREATE POLICY "Users can view own ai generations" ON ai_generations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own ai generations" ON ai_generations
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### **Option B : Via le script automatique**
```bash
# Installer les dépendances si nécessaire
npm install

# Exécuter la migration
node scripts/run-ai-migration.js
```

## ❌ Erreur d'authentification

### **Problème**
```
{ error: 'Non authentifié' }
```

### **Solutions**

#### **1. Vérifier la session**
- Aller sur http://localhost:3000
- Se connecter avec un compte
- Vérifier que vous êtes bien connecté

#### **2. Vérifier NextAuth**
Dans `.env.local` :
```env
NEXTAUTH_SECRET=un_secret_très_long_et_aléatoire
NEXTAUTH_URL=http://localhost:3000
```

#### **3. Redémarrer après modification des variables**
```bash
# Arrêter (Ctrl+C) et relancer
npm run dev
```

## ❌ Erreur de connexion Supabase

### **Problème**
```
{ error: 'Erreur interne du serveur' }
```

### **Solutions**

#### **1. Vérifier les clés Supabase**
Dans `.env.local` :
```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### **2. Tester la connexion**
```bash
node scripts/test-ai-system.js
```

#### **3. Vérifier le projet Supabase**
- Aller sur https://supabase.com
- Vérifier que le projet est actif
- Vérifier les clés dans "Settings > API"

## ✅ Test Complet

### **Script de test automatique**
```bash
# Tester tout le système
node scripts/test-ai-system.js
```

### **Test manuel**
1. Lancer l'application : `npm run dev`
2. Aller sur : http://localhost:3000/ai-generator
3. Se connecter
4. Vérifier que les quotas s'affichent
5. Tester une génération

## 🔧 Debug Avancé

### **Logs détaillés**
Dans le terminal où `npm run dev` tourne, vous devriez voir :
```
🎵 Initialisation AudioCraft Service...
✅ AudioCraft Service initialisé
📊 DB Query: { userId: "...", plan: "free", usage: 0 }
```

### **Vérifier les fichiers**
```bash
# Vérifier que les fichiers existent
ls app/api/ai/quota/route.ts
ls hooks/useAIQuota.ts
ls app/ai-generator/page.tsx
```

### **Vérifier les imports**
Dans `app/api/ai/quota/route.ts`, vérifier :
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabase } from '@/lib/supabase';
```

## 📞 Support

### **Si rien ne fonctionne**
1. Vérifier que tous les fichiers sont présents
2. Vérifier les variables d'environnement
3. Redémarrer complètement l'application
4. Vérifier les logs dans le terminal

### **Logs utiles**
- **Terminal** : Logs de l'application
- **Console navigateur** : Erreurs JavaScript
- **Network** : Requêtes API échouées

---

**💡 Conseil :** Commencez toujours par vérifier que l'application est lancée avec `npm run dev` !
