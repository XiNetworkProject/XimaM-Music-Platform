'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Trash2, Filter, Eye, EyeOff, Crown, 
  MoreVertical, AlertTriangle, CheckCircle, X 
} from 'lucide-react';
import { useSession } from 'next-auth/react';

interface CreatorModerationActionsProps {
  commentId: string;
  trackId: string;
  isCreator: boolean;
  isCreatorFavorite: boolean;
  isDeleted: boolean;
  isFiltered: boolean;
  onAction: (action: string, data?: any) => Promise<void>;
  className?: string;
}

export default function CreatorModerationActions({
  commentId,
  trackId,
  isCreator,
  isCreatorFavorite,
  isDeleted,
  isFiltered,
  onAction,
  className = ''
}: CreatorModerationActionsProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterReason, setFilterReason] = useState('');

  const handleAction = async (action: string, data?: any) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await onAction(action, { commentId, ...data });
      setIsOpen(false);
      setShowFilterModal(false);
    } catch (error) {
      console.error('Erreur action modération:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilter = async () => {
    if (!filterReason.trim()) return;
    await handleAction('filter', { reason: filterReason.trim() });
    setFilterReason('');
  };

  if (!isCreator) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Bouton principal */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
        title="Actions de modération"
      >
        <Crown className="w-4 h-4 text-amber-500" />
      </motion.button>

      {/* Menu déroulant */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
          >
            <div className="p-2 space-y-1">
              {/* Adorer le commentaire */}
              <button
                onClick={() => handleAction('favorite')}
                disabled={isLoading}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isCreatorFavorite
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Heart className={`w-4 h-4 ${isCreatorFavorite ? 'fill-current' : ''}`} />
                <span className="text-sm">
                  {isCreatorFavorite ? 'Retirer l\'adoration' : 'Adorer ce commentaire'}
                </span>
              </button>

              {/* Filtrer le commentaire */}
              <button
                onClick={() => setShowFilterModal(true)}
                disabled={isLoading || isFiltered}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isFiltered
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm">
                  {isFiltered ? 'Commentaire filtré' : 'Filtrer ce commentaire'}
                </span>
              </button>

              {/* Défiltrer le commentaire */}
              {isFiltered && (
                <button
                  onClick={() => handleAction('unfilter')}
                  disabled={isLoading}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">Défiltrer ce commentaire</span>
                </button>
              )}

              {/* Supprimer le commentaire */}
              <button
                onClick={() => handleAction('delete', { reason: 'creator' })}
                disabled={isLoading || isDeleted}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isDeleted
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                    : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm">
                  {isDeleted ? 'Commentaire supprimé' : 'Supprimer ce commentaire'}
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de filtrage */}
      <AnimatePresence>
        {showFilterModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowFilterModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-semibold">Filtrer le commentaire</h3>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Ce commentaire sera masqué pour tous les utilisateurs. Seuls les créateurs pourront le voir.
              </p>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Raison du filtrage
                </label>
                <select
                  value={filterReason}
                  onChange={(e) => setFilterReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner une raison</option>
                  <option value="spam">Spam</option>
                  <option value="inappropriate">Contenu inapproprié</option>
                  <option value="offensive">Contenu offensant</option>
                  <option value="irrelevant">Hors sujet</option>
                  <option value="duplicate">Commentaire en double</option>
                  <option value="other">Autre</option>
                </select>

                {filterReason === 'other' && (
                  <input
                    type="text"
                    placeholder="Précisez la raison..."
                    value={filterReason === 'other' ? '' : filterReason}
                    onChange={(e) => setFilterReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleFilter}
                  disabled={!filterReason.trim() || isLoading}
                  className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Filtrage...' : 'Filtrer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Indicateurs visuels */}
      <div className="flex items-center gap-1 mt-1">
        {isCreatorFavorite && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-2 h-2 bg-red-500 rounded-full"
            title="Commentaire adoré par le créateur"
          />
        )}
        {isFiltered && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-2 h-2 bg-yellow-500 rounded-full"
            title="Commentaire filtré"
          />
        )}
        {isDeleted && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-2 h-2 bg-gray-500 rounded-full"
            title="Commentaire supprimé"
          />
        )}
      </div>
    </div>
  );
} 