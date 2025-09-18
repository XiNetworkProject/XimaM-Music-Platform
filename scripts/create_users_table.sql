-- Création de la table users pour Synaura
-- Cette table stocke les informations des utilisateurs et leurs plans d'abonnement

-- 1. Créer la table users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    subscription_plan VARCHAR(20) DEFAULT 'free' CHECK (subscription_plan IN ('free', 'starter', 'creator', 'pro', 'enterprise')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Créer les index pour les performances
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscription_plan ON public.users(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON public.users(stripe_customer_id);

-- 3. Créer le trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- 4. Activer RLS (Row Level Security)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 5. Créer les politiques RLS
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 6. Synchroniser les utilisateurs existants depuis auth.users
INSERT INTO public.users (id, email, subscription_plan, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    'free' as subscription_plan,
    au.created_at,
    au.updated_at
FROM auth.users au
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = EXCLUDED.updated_at;

-- 7. Créer le trigger de synchronisation automatique
CREATE OR REPLACE FUNCTION sync_user_to_table()
RETURNS TRIGGER AS $$
BEGIN
    -- Si c'est un nouvel utilisateur (INSERT)
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.users (id, email, subscription_plan, created_at, updated_at)
        VALUES (
            NEW.id,
            NEW.email,
            'free', -- Plan par défaut
            NEW.created_at,
            NEW.updated_at
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            updated_at = EXCLUDED.updated_at;
        
        RETURN NEW;
    END IF;
    
    -- Si c'est une mise à jour (UPDATE)
    IF TG_OP = 'UPDATE' THEN
        UPDATE public.users 
        SET 
            email = NEW.email,
            updated_at = NEW.updated_at
        WHERE id = NEW.id;
        
        RETURN NEW;
    END IF;
    
    -- Si c'est une suppression (DELETE)
    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.users WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Créer le trigger sur auth.users
DROP TRIGGER IF EXISTS sync_user_trigger ON auth.users;
CREATE TRIGGER sync_user_trigger
    AFTER INSERT OR UPDATE OR DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION sync_user_to_table();

-- 9. Vérifier la création
SELECT 
    'Table users créée avec succès' as status,
    COUNT(*) as user_count
FROM public.users;
