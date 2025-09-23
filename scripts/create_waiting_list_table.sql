-- Créer la table waiting_list pour gérer la liste d'attente
CREATE TABLE IF NOT EXISTS public.waiting_list (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'invited', 'accepted')),
    invited_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE
);

-- Créer un index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_waiting_list_email ON public.waiting_list(email);
CREATE INDEX IF NOT EXISTS idx_waiting_list_status ON public.waiting_list(status);
CREATE INDEX IF NOT EXISTS idx_waiting_list_created_at ON public.waiting_list(created_at);

-- Activer RLS
ALTER TABLE public.waiting_list ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture publique (pour compter)
CREATE POLICY "Allow public read access" ON public.waiting_list
    FOR SELECT USING (true);

-- Politique pour permettre l'insertion publique (pour s'inscrire)
CREATE POLICY "Allow public insert" ON public.waiting_list
    FOR INSERT WITH CHECK (true);

-- Commentaire sur la table
COMMENT ON TABLE public.waiting_list IS 'Liste d''attente pour l''accès anticipé à Synaura';
COMMENT ON COLUMN public.waiting_list.status IS 'Statut: waiting, invited, accepted';
