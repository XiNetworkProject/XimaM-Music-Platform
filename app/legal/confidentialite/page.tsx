'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Mail, Database, Eye, Trash2, Download } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen w-full px-2 sm:px-4 md:px-6 pt-6 sm:pt-10 pb-24 text-[var(--text)]">
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
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour au centre légal
            </Link>
            
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 bg-purple-500/10 border-purple-500/20 border">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Politique de confidentialité</h1>
                <p className="text-white/60">Protection de vos données personnelles</p>
              </div>
            </div>
          </motion.div>

          {/* Contenu */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="panel-suno border border-[var(--border)] rounded-2xl p-6 [background:radial-gradient(120%_60%_at_20%_0%,rgba(124,58,237,0.10),transparent),_radial-gradient(120%_60%_at_80%_100%,rgba(34,211,238,0.08),transparent)]"
          >
            <div className="prose prose-invert max-w-none">
              <h2 className="text-xl font-semibold text-white/90 mb-4">1. Collecte des données</h2>
              <p className="text-sm text-white/70 mb-4">
                Synaura collecte les données personnelles suivantes :
              </p>
              <ul className="text-sm text-white/70 space-y-2 mb-6">
                <li>• <strong>Données d'identification :</strong> nom, prénom, adresse email, nom d'utilisateur</li>
                <li>• <strong>Données de profil :</strong> photo de profil, biographie, préférences musicales</li>
                <li>• <strong>Données d'usage :</strong> historique d'écoute, playlists, interactions</li>
                <li>• <strong>Données techniques :</strong> adresse IP, type de navigateur, système d'exploitation</li>
                <li>• <strong>Données de paiement :</strong> informations de facturation (via Stripe)</li>
              </ul>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">2. Finalités du traitement</h2>
              <p className="text-sm text-white/70 mb-4">
                Vos données sont utilisées pour :
              </p>
              <ul className="text-sm text-white/70 space-y-2 mb-6">
                <li>• Fournir et améliorer nos services</li>
                <li>• Personnaliser votre expérience musicale</li>
                <li>• Traiter les paiements et abonnements</li>
                <li>• Communiquer avec vous (support, notifications)</li>
                <li>• Analyser l'utilisation de la plateforme</li>
                <li>• Respecter nos obligations légales</li>
              </ul>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">3. Base légale</h2>
              <p className="text-sm text-white/70 mb-4">
                Le traitement de vos données repose sur :
              </p>
              <ul className="text-sm text-white/70 space-y-2 mb-6">
                <li>• <strong>Consentement :</strong> pour les données optionnelles et les communications marketing</li>
                <li>• <strong>Exécution du contrat :</strong> pour la fourniture des services</li>
                <li>• <strong>Intérêt légitime :</strong> pour l'amélioration des services et la sécurité</li>
                <li>• <strong>Obligation légale :</strong> pour la conservation des données de facturation</li>
              </ul>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">4. Partage des données</h2>
              <p className="text-sm text-white/70 mb-4">
                Vos données peuvent être partagées avec :
              </p>
              <ul className="text-sm text-white/70 space-y-2 mb-6">
                <li>• <strong>Prestataires de services :</strong> Stripe (paiements), Supabase (base de données), Cloudinary (stockage)</li>
                <li>• <strong>Autorités compétentes :</strong> en cas d'obligation légale</li>
                <li>• <strong>Partenaires commerciaux :</strong> uniquement avec votre consentement explicite</li>
              </ul>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">5. Vos droits</h2>
              <p className="text-sm text-white/70 mb-4">
                Conformément au RGPD, vous disposez des droits suivants :
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                  <Eye className="w-5 h-5 text-purple-400 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-white/90">Droit d'accès</h3>
                    <p className="text-xs text-white/60">Consulter vos données personnelles</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                  <Database className="w-5 h-5 text-purple-400 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-white/90">Droit de rectification</h3>
                    <p className="text-xs text-white/60">Corriger vos données inexactes</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                  <Trash2 className="w-5 h-5 text-purple-400 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-white/90">Droit d'effacement</h3>
                    <p className="text-xs text-white/60">Supprimer vos données</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                  <Download className="w-5 h-5 text-purple-400 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-white/90">Droit à la portabilité</h3>
                    <p className="text-xs text-white/60">Récupérer vos données</p>
                  </div>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">6. Conservation des données</h2>
              <p className="text-sm text-white/70 mb-4">
                Vos données sont conservées :
              </p>
              <ul className="text-sm text-white/70 space-y-2 mb-6">
                <li>• <strong>Données de compte :</strong> jusqu'à la suppression du compte</li>
                <li>• <strong>Données de facturation :</strong> 10 ans (obligation légale)</li>
                <li>• <strong>Données d'usage :</strong> 3 ans maximum</li>
                <li>• <strong>Cookies :</strong> 13 mois maximum</li>
              </ul>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">7. Sécurité</h2>
              <p className="text-sm text-white/70 mb-4">
                Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger 
                vos données contre la perte, l'utilisation abusive, l'accès non autorisé, la divulgation, 
                l'altération ou la destruction.
              </p>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">8. Contact</h2>
              <p className="text-sm text-white/70 mb-4">
                Pour exercer vos droits ou pour toute question relative à cette politique de confidentialité :
              </p>
              <div className="flex items-center gap-2 mb-4">
                <Mail className="w-4 h-4 text-purple-400" />
                <a href="mailto:privacy@synaura.fr" className="text-purple-400 hover:text-purple-300 transition-colors">
                  privacy@synaura.fr
                </a>
              </div>

              <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10">
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
