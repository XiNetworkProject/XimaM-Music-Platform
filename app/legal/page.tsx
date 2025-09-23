'use client';

import { motion } from 'framer-motion';
import { FileText, Shield, Cookie, Scale, Users, Globe, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';

const legalPages = [
  {
    id: 'mentions-legales',
    title: 'Mentions légales',
    description: 'Informations légales sur Synaura',
    icon: FileText,
    href: '/legal/mentions-legales'
  },
  {
    id: 'confidentialite',
    title: 'Politique de confidentialité',
    description: 'Protection de vos données personnelles',
    icon: Shield,
    href: '/legal/confidentialite'
  },
  {
    id: 'cgu',
    title: 'Conditions générales d\'utilisation',
    description: 'Règles d\'utilisation de la plateforme',
    icon: Scale,
    href: '/legal/cgu'
  },
  {
    id: 'cgv',
    title: 'Conditions générales de vente',
    description: 'Conditions d\'achat des abonnements',
    icon: Scale,
    href: '/legal/cgv'
  },
  {
    id: 'cookies',
    title: 'Politique des cookies',
    description: 'Utilisation des cookies et technologies similaires',
    icon: Cookie,
    href: '/legal/cookies'
  },
  {
    id: 'rgpd',
    title: 'Conformité RGPD',
    description: 'Droits et protection des données',
    icon: Users,
    href: '/legal/rgpd'
  }
];

export default function LegalPage() {
  return (
    <div className="min-h-screen w-full px-2 sm:px-4 md:px-6 pt-6 sm:pt-10 pb-24 text-[var(--text)]">
      <div className="relative z-10 w-full p-0 sm:p-2">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8 text-center"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 bg-purple-500/10 border-purple-500/20 border">
                <Scale className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Centre légal</h1>
            <p className="text-white/60">Documents légaux et informations importantes</p>
          </motion.div>

          {/* Informations entreprise */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="panel-suno border border-[var(--border)] rounded-2xl p-6 mb-6 [background:radial-gradient(120%_60%_at_20%_0%,rgba(124,58,237,0.10),transparent),_radial-gradient(120%_60%_at_80%_100%,rgba(34,211,238,0.08),transparent)]"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                <Globe className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-white/90">Informations entreprise</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-white/60">Raison sociale :</span>
                <span className="text-white/90 ml-2">Maxime VERMEULEN</span>
              </div>
              <div>
                <span className="text-white/60">Statut :</span>
                <span className="text-white/90 ml-2">Auto-entrepreneur</span>
              </div>
              <div>
                <span className="text-white/60">SIRET :</span>
                <span className="text-white/90 ml-2">991635194</span>
              </div>
              <div>
                <span className="text-white/60">Activité :</span>
                <span className="text-white/90 ml-2">Développement d'applications</span>
              </div>
              <div>
                <span className="text-white/60">Site web :</span>
                <span className="text-white/90 ml-2">synaura.fr</span>
              </div>
              <div>
                <span className="text-white/60">Contact :</span>
                <span className="text-white/90 ml-2">legal@synaura.fr</span>
              </div>
            </div>
          </motion.div>

          {/* Pages légales */}
          <div className="space-y-4">
            {legalPages.map((page, index) => (
              <motion.div
                key={page.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                className="panel-suno border border-[var(--border)] rounded-2xl overflow-hidden [background:radial-gradient(120%_60%_at_20%_0%,rgba(124,58,237,0.10),transparent),_radial-gradient(120%_60%_at_80%_100%,rgba(34,211,238,0.08),transparent)]"
              >
                <Link
                  href={page.href}
                  className="block p-6 hover:bg-white/5 transition-colors duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                        <page.icon className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white/90 group-hover:text-white transition-colors">
                          {page.title}
                        </h3>
                        <p className="text-sm text-white/60 mt-1">
                          {page.description}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-8 text-center text-sm text-white/50"
          >
            <p>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
            <p className="mt-2">
              Pour toute question légale :{' '}
              <a href="mailto:legal@synaura.fr" className="text-purple-400 hover:text-purple-300 transition-colors">
                legal@synaura.fr
              </a>
            </p>
          </motion.div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
