-- =============================================================
-- Schema complet du systeme de notifications Synaura
-- =============================================================

-- 1. Table notifications (enrichie)
-- Remplace l'ancienne table notifications si elle existe
ALTER TABLE IF EXISTS notifications
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS icon_url TEXT,
  ADD COLUMN IF NOT EXISTS action_url TEXT,
  ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_id TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);

-- 2. Preferences de notification par utilisateur
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Canaux
  push_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT FALSE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  -- Types de notifications
  new_follower BOOLEAN DEFAULT TRUE,
  new_like BOOLEAN DEFAULT TRUE,
  like_milestone BOOLEAN DEFAULT TRUE,
  new_comment BOOLEAN DEFAULT TRUE,
  new_message BOOLEAN DEFAULT TRUE,
  new_track_followed BOOLEAN DEFAULT TRUE,
  view_milestone BOOLEAN DEFAULT TRUE,
  boost_reminder BOOLEAN DEFAULT TRUE,
  admin_broadcast BOOLEAN DEFAULT TRUE,
  weekly_recap BOOLEAN DEFAULT FALSE,
  -- Meta
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. Table pour les broadcasts admin
CREATE TABLE IF NOT EXISTS admin_broadcasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT DEFAULT 'announcement',
  target TEXT DEFAULT 'all',
  target_data JSONB DEFAULT '{}',
  sent_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences" ON notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON notification_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role full access prefs" ON notification_preferences FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access broadcasts" ON admin_broadcasts FOR ALL USING (auth.role() = 'service_role');
