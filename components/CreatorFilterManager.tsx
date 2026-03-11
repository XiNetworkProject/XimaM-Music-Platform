'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Filter, Plus, X, Trash2, Shield, AlertTriangle, 
  CheckCircle, EyeOff 
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { UModal, UModalBody, UButton } from '@/components/ui/UnifiedUI';

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
        className={`flex items-center gap-2 px-3 py-2 rounded-full border border-white/[0.08] bg-white/[0.04] text-white/50 hover:text-white/70 hover:bg-white/[0.06] transition ${className}`}
        title="Gérer les filtres personnalisés"
      >
        <Filter className="w-4 h-4" />
        <span className="text-sm">Filtres</span>
        {filters.length > 0 && (
          <span className="bg-white/[0.06] border border-white/[0.08] text-white/50 text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {filters.length}
          </span>
        )}
      </motion.button>

      {/* Modal de gestion des filtres */}
      <UModal open={isOpen} onClose={() => setIsOpen(false)} zClass="z-[230]" size="md" showClose={false}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-violet-400" />
            <h2 className="text-lg font-semibold text-white">Filtres</h2>
          </div>
          <UButton variant="secondary" size="icon" onClick={() => setIsOpen(false)}>
            <X className="w-5 h-5" />
          </UButton>
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
        <UModalBody className="space-y-4">
          <div className="text-sm text-white/40">
            <p>Ajoutez des mots ou phrases que vous souhaitez filtrer automatiquement dans les commentaires de vos créations.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-white">
              Ajouter un filtre
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFilter}
                onChange={(e) => setNewFilter(e.target.value)}
                placeholder="Mot ou phrase à filtrer..."
                className="flex-1 px-3 py-2 border border-white/[0.08] rounded-xl bg-white/[0.04] text-white placeholder:text-white/20 outline-none focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.08] transition"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addFilter();
                  }
                }}
              />
              <UButton
                variant="secondary"
                size="md"
                onClick={addFilter}
                disabled={!newFilter.trim() || isLoading}
              >
                <Plus className="w-4 h-4" />
                {isLoading ? '...' : 'Ajouter'}
              </UButton>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-white">
              Filtres actifs ({filters.length})
            </label>
            {filters.length === 0 ? (
              <div className="text-center py-8 text-white/30">
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
                    className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl"
                  >
                    <div className="flex items-center gap-2">
                      <EyeOff className="w-4 h-4 text-white/30" />
                      <span className="text-sm font-medium text-white/70">{filter}</span>
                    </div>
                    <UButton
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeFilter(filter)}
                      disabled={isLoading}
                      className="!text-red-400 hover:!bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </UButton>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="text-xs text-white/30 bg-white/[0.03] border border-white/[0.06] p-3 rounded-xl">
            <p><strong>Note :</strong> Ces filtres s'appliquent uniquement à vos créations et masquent automatiquement les commentaires contenant ces mots.</p>
          </div>
        </UModalBody>
      </UModal>
    </>
  );
}
