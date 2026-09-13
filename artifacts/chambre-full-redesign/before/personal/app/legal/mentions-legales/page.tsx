'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Mail, Phone, MapPin } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen w-full px-2 sm:px-4 md:px-6 pt-6 sm:pt-10 pb-24 text-white">
      <div className="relative z-10 w-full p-0 sm:p-2">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <Link 
              href="/legal" 
              className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour au centre légal
            </Link>
            
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-white/[0.06] border border-white/[0.06]">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Mentions légales</h1>
                <p className="text-white/60">Informations légales sur Synaura</p>
              </div>
            </div>
          </motion.div>

          {/* Contenu */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6"
          >
            <div className="prose prose-invert max-w-none">
              <h2 className="text-xl font-semibold text-white mb-4">1. Éditeur du site</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-white/60">Raison sociale :</span>
                  <span className="text-white">Maxime VERMEULEN</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/60">Statut :</span>
                  <span className="text-white">Auto-entrepreneur</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/60">SIRET :</span>
                  <span className="text-white">991635194</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/60">Code APE :</span>
                  <span className="text-white">6201Z - Programmation informatique</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/60">Site web :</span>
                  <span className="text-white">synaura.fr</span>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white mb-4 mt-8">2. Contact</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-white/60" />
                  <span className="text-white/60">Email :</span>
                  <a href="mailto:contact.syn@synaura.fr" className="text-white/60 hover:text-white transition-colors">
                    contact.syn@synaura.fr
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-white/60" />
                  <span className="text-white/60">Support légal :</span>
                  <a href="mailto:contact.syn@synaura.fr" className="text-white/60 hover:text-white transition-colors">
                    contact.syn@synaura.fr
                  </a>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white mb-4 mt-8">3. Hébergement</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-white/60">Hébergeur :</span>
                  <span className="text-white">Vercel Inc.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/60">Adresse :</span>
                  <span className="text-white">340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/60">Site web :</span>
                  <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors">
                    vercel.com
                  </a>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white mb-4 mt-8">4. Propriété intellectuelle</h2>
              <p className="text-sm text-white/60 mb-4">
                L'ensemble du contenu du site synaura.fr (textes, images, vidéos, logos, icônes, sons, logiciels, etc.) 
                est la propriété exclusive de Maxime VERMEULEN ou de ses partenaires. Toute reproduction, représentation, 
                modification, publication, adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le 
                procédé utilisé, est interdite, sauf autorisation écrite préalable.
              </p>

              <h2 className="text-xl font-semibold text-white mb-4 mt-8">5. Responsabilité</h2>
              <p className="text-sm text-white/60 mb-4">
                Les informations contenues sur ce site sont aussi précises que possible et le site remis à jour à 
                différentes périodes de l'année, mais peut toutefois contenir des inexactitudes ou des omissions. 
                Si vous constatez une lacune, erreur ou ce qui parait être un dysfonctionnement, merci de bien vouloir 
                le signaler par email à contact.syn@synaura.fr, en décrivant le problème de la manière la plus précise possible.
              </p>

              <h2 className="text-xl font-semibold text-white mb-4 mt-8">6. Droit applicable</h2>
              <p className="text-sm text-white/60 mb-4">
                Le présent site et les présentes mentions légales sont soumis au droit français. En cas de litige, 
                les tribunaux français seront seuls compétents.
              </p>

              <div className="mt-8 p-4 bg-white/[0.04] rounded-xl border border-white/[0.06]">
                <p className="text-xs text-white/60">
                  <strong>Dernière mise à jour :</strong> {new Date().toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
