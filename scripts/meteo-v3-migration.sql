-- ============================================
-- METEO V3 MIGRATION
-- ============================================

-- 1. Nouvelles colonnes sur meteo_bulletins
ALTER TABLE meteo_bulletins ADD COLUMN IF NOT EXISTS author_name TEXT;
ALTER TABLE meteo_bulletins ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'prevision';
ALTER TABLE meteo_bulletins ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE meteo_bulletins ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN DEFAULT true;
ALTER TABLE meteo_bulletins ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;
ALTER TABLE meteo_bulletins ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
ALTER TABLE meteo_bulletins ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false;

-- 2. Table equipe meteo
CREATE TABLE IF NOT EXISTS meteo_team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'contributor' CHECK (role IN ('admin', 'moderator', 'contributor')),
    display_name TEXT,
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'revoked')),
    UNIQUE(user_id)
);
CREATE INDEX IF NOT EXISTS idx_meteo_team_user ON meteo_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_meteo_team_status ON meteo_team_members(status);

-- 3. Table commentaires
CREATE TABLE IF NOT EXISTS meteo_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bulletin_id UUID NOT NULL REFERENCES meteo_bulletins(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES meteo_comments(id) ON DELETE CASCADE,
    is_hidden BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_meteo_comments_bulletin ON meteo_comments(bulletin_id);
CREATE INDEX IF NOT EXISTS idx_meteo_comments_user ON meteo_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_meteo_comments_parent ON meteo_comments(parent_id);

-- 4. Table reactions
CREATE TABLE IF NOT EXISTS meteo_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bulletin_id UUID NOT NULL REFERENCES meteo_bulletins(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('like', 'useful', 'share')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bulletin_id, user_id, type)
);
CREATE INDEX IF NOT EXISTS idx_meteo_reactions_bulletin ON meteo_reactions(bulletin_id);
CREATE INDEX IF NOT EXISTS idx_meteo_reactions_user ON meteo_reactions(user_id);

-- 5. Table alertes meteo
CREATE TABLE IF NOT EXISTS meteo_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'danger', 'critical')),
    regions TEXT[] DEFAULT '{}',
    sent_by UUID REFERENCES meteo_team_members(id),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_meteo_alerts_active ON meteo_alerts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_meteo_alerts_expires ON meteo_alerts(expires_at);

-- 6. Table parametres meteo
CREATE TABLE IF NOT EXISTS meteo_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL DEFAULT 'false',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- 7. Inserer le premier admin (alertempsfrance@gmail.com)
INSERT INTO meteo_team_members (user_id, role, display_name, status, accepted_at)
SELECT id, 'admin', 'Alertemps', 'active', NOW()
FROM auth.users WHERE email = 'alertempsfrance@gmail.com'
ON CONFLICT (user_id) DO NOTHING;
