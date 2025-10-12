'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { 
  Cloud, 
  Upload, 
  Image as ImageIcon, 
  FileText, 
  Calendar,
  LogOut,
  Save,
  Trash2,
  Eye,
  AlertCircle
} from 'lucide-react';
import { notify } from '@/components/NotificationCenter';

interface MeteoDashboardClientProps {
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

interface Bulletin {
  id: string;
  title?: string;
  content?: string;
  image_url: string;
  image_public_id: string;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export default function MeteoDashboardClient({ user }: MeteoDashboardClientProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentBulletin, setCurrentBulletin] = useState<Bulletin | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Charger le bulletin actuel au montage
  useEffect(() => {
    const fetchCurrentBulletin = async () => {
      try {
        const response = await fetch('/api/meteo/bulletin');
        const data = await response.json();
        
        if (response.ok && data.bulletin) {
          setCurrentBulletin(data.bulletin);
        }
      } catch (error) {
        console.error('Erreur chargement bulletin:', error);
      }
    };

    fetchCurrentBulletin();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      notify.error('Veuillez sélectionner une image');
      return;
    }

    // Vérifier la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      notify.error('L\'image ne doit pas dépasser 10MB');
      return;
    }

    setSelectedFile(file);
    
    // Créer une preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      notify.error('Veuillez sélectionner une image');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      formData.append('image', selectedFile);

      const response = await fetch('/api/meteo/bulletin', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la publication');
      }

      notify.success('Bulletin publié avec succès !');
      
      // Reset form
      setTitle('');
      setContent('');
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Mettre à jour le bulletin courant
      setCurrentBulletin(data.bulletin);

    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Erreur lors de la publication');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/meteo/login');
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <div className="bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl">
                <Cloud className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)]">Alertemps</h1>
                <p className="text-sm text-[var(--text-muted)]">Dashboard Météo</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-[var(--text-muted)]">
                Connecté en tant que {user.name || user.email}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 rounded-lg transition-all"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Bulletin actuel */}
        {currentBulletin && (
          <div className="mb-8">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Bulletin actuel</h2>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                  Publié
                </span>
              </div>
              
              <div className="flex gap-6">
                <div className="w-32 h-32 bg-[var(--surface-2)] rounded-xl overflow-hidden flex-shrink-0">
                  <img 
                    src={currentBulletin.image_url} 
                    alt="Bulletin météo"
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex-1">
                  {currentBulletin.title && (
                    <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                      {currentBulletin.title}
                    </h3>
                  )}
                  {currentBulletin.content && (
                    <p className="text-[var(--text-secondary)] mb-3">
                      {currentBulletin.content}
                    </p>
                  )}
                  <p className="text-xs text-[var(--text-muted)]">
                    Publié le {new Date(currentBulletin.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Formulaire de publication */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Publier un nouveau bulletin</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Upload d'image */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
                Image du bulletin <span className="text-red-400">*</span>
              </label>
              
              <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center hover:border-blue-400/50 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {previewUrl ? (
                  <div className="space-y-4">
                    <div className="w-48 h-48 mx-auto bg-[var(--surface-2)] rounded-xl overflow-hidden">
                      <img 
                        src={previewUrl} 
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {selectedFile?.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Supprimer
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--surface-2)] rounded-xl">
                      <ImageIcon className="w-8 h-8 text-blue-400" />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Cliquer pour sélectionner une image
                      </button>
                      <p className="text-sm text-[var(--text-muted)] mt-1">
                        PNG, JPG, GIF jusqu'à 10MB
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Titre */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Titre (optionnel)
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 transition-all"
                placeholder="Ex: Bulletin météo du 15 octobre"
              />
            </div>

            {/* Contenu */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Contenu (optionnel)
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 transition-all resize-none"
                placeholder="Description détaillée du bulletin météo..."
              />
            </div>

            {/* Note importante */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-200">
                  <p className="font-medium mb-1">Important</p>
                  <p>
                    La publication d'un nouveau bulletin remplacera automatiquement 
                    le bulletin précédent. L'ancienne image sera supprimée.
                  </p>
                </div>
              </div>
            </div>

            {/* Bouton de publication */}
            <button
              type="submit"
              disabled={loading || !selectedFile}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {loading ? 'Publication en cours...' : 'Publier le bulletin'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
