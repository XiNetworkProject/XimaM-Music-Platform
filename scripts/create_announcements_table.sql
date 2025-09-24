-- Table pour les annonces/carrousel de l'accueil
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  background_image_url TEXT,
  background_color TEXT DEFAULT '#6366f1', -- Couleur de fallback
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_order ON announcements(order_index);

-- RLS (Row Level Security)
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Politique : lecture publique pour les annonces actives
CREATE POLICY "Public can view active announcements" ON announcements
  FOR SELECT USING (is_active = true);

-- Politique : admin peut tout faire (basé sur l'email)
CREATE POLICY "Admin can manage announcements" ON announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'vermeulenmaxime59@gmail.com'
    )
  );

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcements_updated_at();

-- Insérer quelques annonces d'exemple
INSERT INTO announcements (title, description, background_image_url, background_color, order_index) VALUES
('Bienvenue sur Synaura', 'Découvrez la nouvelle plateforme musicale qui révolutionne l''écoute et la création', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800', '#6366f1', 1),
('Génération IA Disponible', 'Créez de la musique unique avec notre IA avancée. Disponible en preview limitée', 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800', '#8b5cf6', 2),
('Nouveaux Plans Disponibles', 'Découvrez nos plans Pro et Enterprise avec des fonctionnalités exclusives', 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800', '#f59e0b', 3);
