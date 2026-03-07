-- Table pour les demandes de messages entre utilisateurs
-- A executer dans l'editeur SQL de Supabase

CREATE TABLE IF NOT EXISTS message_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  target_id UUID NOT NULL,
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, target_id, status)
);

CREATE INDEX IF NOT EXISTS idx_message_requests_requester ON message_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_message_requests_target ON message_requests(target_id);
CREATE INDEX IF NOT EXISTS idx_message_requests_status ON message_requests(status);

ALTER TABLE message_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voir ses demandes" ON message_requests
  FOR SELECT USING (requester_id = auth.uid() OR target_id = auth.uid());

CREATE POLICY "Creer des demandes" ON message_requests
  FOR INSERT WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Modifier ses demandes recues" ON message_requests
  FOR UPDATE USING (target_id = auth.uid());
