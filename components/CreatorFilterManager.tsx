'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Filter, Plus, X, Trash2, Shield, AlertTriangle, 
  CheckCircle, Settings, Eye, EyeOff 
} from 'lucide-react';
import { useSession } from 'next-auth/react';

interface CreatorFilterManagerProps {
  className?: string;
}

export default function CreatorFilterManager({ className = '' }: CreatorFilterManagerProps) {
  const { data: session } = useSession();
  const [filters, setFilters] = useState<string[]>([]);
  const [newFilter, setNewFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Charger les filtres existants
  const loadFilters = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/creator/filters');
      if (response.ok) {
        const data = await response.json();
        setFilters(data.filters || []);
      }
    } catch (error) {
      console.error('Erreur chargement filtres:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFilters();
    }
  }, [isOpen, session]);

  // Ajouter un filtre
  const addFilter = async () => {
    if (!newFilter.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/creator/filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: newFilter.trim() }),
      });

      if (response.ok) {
        setFilters(prev => [...prev, newFilter.trim()]);
        setNewFilter('');
        setMessage({ type: 'success', text: 'Filtre ajouté avec succès' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Erreur lors de l\'ajout' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error('Erreur ajout filtre:', error);
      setMessage({ type: 'error', text: 'Erreur lors de l\'ajout du filtre' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Supprimer un filtre
  const removeFilter = async (word: string) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/creator/filters?word=${encodeURIComponent(word)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setFilters(prev => prev.filter(f => f !== word));
        setMessage({ type: 'success', text: 'Filtre supprimé avec succès' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Erreur lors de la suppression' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error('Erreur suppression filtre:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la suppression du filtre' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  if (!session?.user?.id) {
    return null;
  }

  return (
    <>
      {/* Bouton d'ouverture */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-3 py-2 rounded-full border border-border-secondary bg-background-fog-thin text-foreground-secondary hover:text-foreground-primary hover:bg-overlay-on-primary transition ${className}`}
        title="Gérer les filtres personnalisés"
      >
        <Filter className="w-4 h-4" />
        <span className="text-sm">Filtres</span>
        {filters.length > 0 && (
          <span className="bg-background-tertiary border border-border-secondary text-foreground-secondary text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {filters.length}
          </span>
        )}
      </motion.button>

      {/* Modal de gestion des filtres */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/55 backdrop-blur-[2px] flex items-center justify-center z-[230] p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-tertiary rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden border border-border-secondary"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border-secondary/60">
                <div className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-[var(--accent-brand)]" />
                  <h2 className="text-lg font-semibold text-foreground-primary">Filtres</h2>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Message de feedback */}
              <AnimatePresence>
                {message && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`mx-5 mt-4 p-3 rounded-xl border flex items-center gap-2 ${
                      message.type === 'success' 
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200' 
                        : 'bg-red-500/10 border-red-500/25 text-red-200'
                    }`}
                  >
                    {message.type === 'success' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                    <span className="text-sm">{message.text}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Contenu */}
              <div className="p-5 space-y-4">
                {/* Description */}
                <div className="text-sm text-foreground-secondary">
                  <p>Ajoutez des mots ou phrases que vous souhaitez filtrer automatiquement dans les commentaires de vos créations.</p>
                </div>

                {/* Ajout de filtre */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground-primary">
                    Ajouter un filtre
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFilter}
                      onChange={(e) => setNewFilter(e.target.value)}
                      placeholder="Mot ou phrase à filtrer..."
                      className="flex-1 px-3 py-2 border border-border-secondary rounded-xl bg-background-fog-thin text-foreground-primary outline-none focus:border-border-primary"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addFilter();
                        }
                      }}
                    />
                    <button
                      onClick={addFilter}
                      disabled={!newFilter.trim() || isLoading}
                      className="px-4 py-2 rounded-xl border border-border-secondary bg-background-tertiary hover:bg-overlay-on-primary disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2 text-sm font-semibold"
                    >
                      <Plus className="w-4 h-4" />
                      {isLoading ? '...' : 'Ajouter'}
                    </button>
                  </div>
                </div>

                {/* Liste des filtres */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground-primary">
                    Filtres actifs ({filters.length})
                  </label>
                  {filters.length === 0 ? (
                    <div className="text-center py-8 text-foreground-inactive">
                      <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Aucun filtre personnalisé</p>
                      <p className="text-xs">Ajoutez des mots pour commencer à filtrer</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {filters.map((filter, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="flex items-center justify-between p-3 bg-background-fog-thin border border-border-secondary/60 rounded-xl"
                        >
                          <div className="flex items-center gap-2">
                            <EyeOff className="w-4 h-4 text-foreground-inactive" />
                            <span className="text-sm font-medium">{filter}</span>
                          </div>
                          <button
                            onClick={() => removeFilter(filter)}
                            disabled={isLoading}
                            className="p-1 rounded-lg hover:bg-red-500/10 text-red-300 transition"
                            title="Supprimer ce filtre"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Informations */}
                <div className="text-xs text-foreground-inactive bg-background-fog-thin border border-border-secondary/60 p-3 rounded-xl">
                  <p><strong>Note :</strong> Ces filtres s'appliquent uniquement à vos créations et masquent automatiquement les commentaires contenant ces mots.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
} 