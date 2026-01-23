'use client';

import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ExternalLink, X } from 'lucide-react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onMarkSeen: () => void;
};

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

export default function UpdatesDialog({ isOpen, onClose, onMarkSeen }: Props) {
  const content = useMemo(
    () => [
      {
        title: 'TikTokPlayer',
        items: [
          'Scroll vertical stable + autoplay fiable',
          'Radio: métadonnées “now playing” + actions désactivées (like/comment/download)',
          'Commentaires modernisés + modération créateur',
        ],
      },
      {
        title: 'À suivre (liste d’attente)',
        items: [
          '3 accès: bulle globale, pill dans le player, onglet Bibliothèque',
          'Lecture stricte: si activé, la fin de piste joue la prochaine musique de ta liste (dans l’ordre)',
          'Ajouter depuis le mini-player et le TikTokPlayer',
        ],
      },
      {
        title: 'Bibliothèque',
        items: ['Refonte UI + filtres/tri', 'Actions pistes & dossiers', 'Modales centrées (PC + mobile)'],
      },
    ],
    [],
  );

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[270] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.18 }}
          className="w-[92vw] max-w-[700px] rounded-3xl border border-border-secondary bg-background-tertiary shadow-2xl overflow-hidden"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="p-4 border-b border-border-secondary/60 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground-primary">Nouveautés & guide rapide</div>
              <div className="text-xs text-foreground-tertiary">
                Résumé des dernières mises à jour + comment utiliser les nouvelles fonctions.
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition grid place-items-center"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {content.map((section) => (
              <div key={section.title} className="rounded-2xl border border-border-secondary bg-background-fog-thin p-3">
                <div className="text-sm font-semibold text-foreground-primary">{section.title}</div>
                <ul className="mt-2 space-y-1.5">
                  {section.items.map((it) => (
                    <li key={it} className="flex items-start gap-2 text-sm text-foreground-secondary">
                      <span className="mt-0.5 h-5 w-5 rounded-full bg-overlay-on-primary/30 grid place-items-center flex-shrink-0">
                        <Check className="h-3.5 w-3.5 text-foreground-primary" />
                      </span>
                      <span className="min-w-0">{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="rounded-2xl border border-border-secondary bg-background-fog-thin p-3">
              <div className="text-sm font-semibold text-foreground-primary">Fonctionnement “À suivre”</div>
              <div className="mt-2 text-sm text-foreground-secondary space-y-2">
                <p>
                  - Ajoute des musiques via le bouton “Ajouter à la liste d’attente” (mini-player ou TikTokPlayer).
                </p>
                <p>- Active/désactive “À suivre” dans la fenêtre “À suivre”.</p>
                <p>- Quand c’est activé, la fin de piste lance la prochaine musique de ta liste (ordre respecté).</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border-secondary bg-background-fog-thin p-3">
              <div className="text-sm font-semibold text-foreground-primary">Liens utiles</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  href="/library"
                  className={cx(
                    'inline-flex items-center gap-2 rounded-full border border-border-secondary bg-background-tertiary px-3 py-2 text-xs text-foreground-secondary hover:bg-overlay-on-primary transition',
                  )}
                >
                  Ouvrir Bibliothèque <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border-secondary/60 flex gap-2">
            <button
              type="button"
              onClick={() => {
                onMarkSeen();
                onClose();
              }}
              className="flex-1 h-11 rounded-2xl bg-overlay-on-primary text-foreground-primary hover:opacity-90 transition"
            >
              J’ai compris
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

