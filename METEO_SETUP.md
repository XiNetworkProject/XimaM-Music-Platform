# Configuration de l'espace météo Alertemps

## 1. Créer la table dans Supabase

Exécuter ce SQL dans l'interface Supabase (SQL Editor) :

```sql
-- Table pour les bulletins météo
CREATE TABLE IF NOT EXISTS meteo_bulletins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT,
    content TEXT,
    image_url TEXT NOT NULL,
    image_public_id TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_meteo_bulletins_author_id ON meteo_bulletins(author_id);
CREATE INDEX IF NOT EXISTS idx_meteo_bulletins_is_current ON meteo_bulletins(is_current);
CREATE INDEX IF NOT EXISTS idx_meteo_bulletins_created_at ON meteo_bulletins(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE meteo_bulletins ENABLE ROW LEVEL SECURITY;

-- Politique : seuls les utilisateurs avec email alertempsfrance@gmail.com peuvent voir/créer/modifier
CREATE POLICY "meteo_bulletins_policy" ON meteo_bulletins
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = meteo_bulletins.author_id 
            AND auth.users.email = 'alertempsfrance@gmail.com'
        )
    );

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_meteo_bulletins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER meteo_bulletins_updated_at
    BEFORE UPDATE ON meteo_bulletins
    FOR EACH ROW
    EXECUTE FUNCTION update_meteo_bulletins_updated_at();
```

## 2. Utilisateur créé

- **Email** : `alertempsfrance@gmail.com`
- **Mot de passe** : `Alertemps2024!`
- **Rôle** : Utilisateur standard (pas de colonne role dans profiles)

## 3. Routes disponibles

- **Login** : `/meteo/login`
- **Dashboard** : `/meteo/dashboard` (accès protégé)

## 4. Fonctionnalités

### Dashboard météo
- Upload d'image obligatoire (max 10MB)
- Titre et contenu optionnels
- Remplacement automatique du bulletin précédent
- Suppression automatique de l'ancienne image
- Interface responsive avec design Alertemps

### Sécurité
- Guard server-side sur `/meteo/dashboard`
- Vérification email `alertempsfrance@gmail.com`
- RLS activé sur la table `meteo_bulletins`
- Politique restrictive par email

## 5. API

- **POST** `/api/meteo/bulletin` : Publier un bulletin
- **GET** `/api/meteo/bulletin` : Récupérer le bulletin actuel
- La suppression de l'image locale est effectuée automatiquement avec le bulletin.

## 6. Configuration du stockage média

Assurez-vous que ces variables sont définies dans `.env.local` :

```
SYNAURA_MEDIA_ROOT=/mnt/Synaura-SSD/apps/synaura/media
MEDIA_BASE_URL=https://media.synaura.fr
NEXT_PUBLIC_MEDIA_BASE_URL=https://media.synaura.fr
MEDIA_STORAGE_SECRET=replace_with_a_long_random_secret
```

## 7. Test

1. Aller sur `/meteo/login`
2. Se connecter avec `alertempsfrance@gmail.com` / `Alertemps2024!`
3. Accéder au dashboard `/meteo/dashboard`
4. Publier un bulletin avec une image
5. Vérifier que l'ancien bulletin est remplacé
