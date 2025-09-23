'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Cookie, Settings, Eye, Shield } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';

export default function CookiesPage() {
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
                <Cookie className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Politique des cookies</h1>
                <p className="text-white/60">Utilisation des cookies et technologies similaires</p>
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
              <h2 className="text-xl font-semibold text-white/90 mb-4">1. Qu'est-ce qu'un cookie ?</h2>
              <p className="text-sm text-white/70 mb-4">
                Un cookie est un petit fichier texte stocké sur votre ordinateur, tablette ou smartphone 
                lorsque vous visitez un site web. Les cookies permettent au site de reconnaître votre 
                appareil et de mémoriser certaines informations sur vos préférences ou actions passées.
              </p>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">2. Types de cookies utilisés</h2>
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="w-5 h-5 text-purple-400" />
                    <h3 className="text-sm font-medium text-white/90">Cookies essentiels</h3>
                  </div>
                  <p className="text-sm text-white/70 mb-2">
                    Ces cookies sont nécessaires au fonctionnement de Synaura :
                  </p>
                  <ul className="text-sm text-white/70 space-y-1">
                    <li>• Cookies de session pour maintenir votre connexion</li>
                    <li>• Cookies de sécurité pour protéger contre les attaques</li>
                    <li>• Cookies de préférences de base (langue, thème)</li>
                  </ul>
                </div>

                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm font-medium text-white/90">Cookies analytiques</h3>
                  </div>
                  <p className="text-sm text-white/70 mb-2">
                    Ces cookies nous aident à comprendre comment vous utilisez Synaura :
                  </p>
                  <ul className="text-sm text-white/70 space-y-1">
                    <li>• Statistiques d'utilisation de la plateforme</li>
                    <li>• Pages les plus visitées</li>
                    <li>• Temps passé sur le site</li>
                    <li>• Sources de trafic</li>
                  </ul>
                </div>

                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-green-400" />
                    <h3 className="text-sm font-medium text-white/90">Cookies de fonctionnalité</h3>
                  </div>
                  <p className="text-sm text-white/70 mb-2">
                    Ces cookies améliorent votre expérience utilisateur :
                  </p>
                  <ul className="text-sm text-white/70 space-y-1">
                    <li>• Préférences de lecture (volume, qualité)</li>
                    <li>• Historique de navigation</li>
                    <li>• Paramètres d'affichage personnalisés</li>
                    <li>• Géolocalisation pour les recommandations</li>
                  </ul>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">3. Cookies tiers</h2>
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">3.1 Stripe (Paiements)</h3>
                  <p className="text-sm text-white/70">
                    Utilisé pour traiter les paiements sécurisés. Ces cookies sont essentiels 
                    pour le fonctionnement des abonnements.
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">3.2 Supabase (Base de données)</h3>
                  <p className="text-sm text-white/70">
                    Utilisé pour la gestion des données utilisateur et la synchronisation 
                    en temps réel.
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">3.3 Cloudinary (Médias)</h3>
                  <p className="text-sm text-white/70">
                    Utilisé pour l'hébergement et l'optimisation des fichiers audio et images.
                  </p>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">4. Durée de conservation</h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-sm text-white/70">Cookies de session</span>
                  <span className="text-sm text-white/90">Supprimés à la fermeture du navigateur</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-sm text-white/70">Cookies de préférences</span>
                  <span className="text-sm text-white/90">13 mois maximum</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-sm text-white/70">Cookies analytiques</span>
                  <span className="text-sm text-white/90">24 mois maximum</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-sm text-white/70">Cookies de sécurité</span>
                  <span className="text-sm text-white/90">12 mois maximum</span>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">5. Gestion des cookies</h2>
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">5.1 Paramètres du navigateur</h3>
                  <p className="text-sm text-white/70 mb-2">
                    Vous pouvez gérer les cookies directement dans votre navigateur :
                  </p>
                  <ul className="text-sm text-white/70 space-y-1">
                    <li>• <strong>Chrome :</strong> Paramètres > Confidentialité et sécurité > Cookies</li>
                    <li>• <strong>Firefox :</strong> Options > Vie privée et sécurité > Cookies</li>
                    <li>• <strong>Safari :</strong> Préférences > Confidentialité > Cookies</li>
                    <li>• <strong>Edge :</strong> Paramètres > Cookies et autorisations de site</li>
                  </ul>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">5.2 Bannière de consentement</h3>
                  <p className="text-sm text-white/70">
                    Lors de votre première visite, une bannière vous permet de choisir 
                    quels cookies accepter. Vous pouvez modifier vos préférences à tout moment 
                    dans les paramètres de votre compte.
                  </p>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">6. Conséquences du refus</h2>
              <p className="text-sm text-white/70 mb-4">
                Le refus de certains cookies peut limiter votre expérience sur Synaura :
              </p>
              <ul className="text-sm text-white/70 space-y-2 mb-6">
                <li>• <strong>Cookies essentiels :</strong> Impossibilité d'utiliser la plateforme</li>
                <li>• <strong>Cookies de fonctionnalité :</strong> Perte des préférences personnalisées</li>
                <li>• <strong>Cookies analytiques :</strong> Aucun impact sur votre utilisation</li>
                <li>• <strong>Cookies de paiement :</strong> Impossibilité de souscrire un abonnement</li>
              </ul>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">7. Cookies et données personnelles</h2>
              <p className="text-sm text-white/70 mb-4">
                Certains cookies peuvent contenir des données personnelles. Ces données sont traitées 
                conformément à notre politique de confidentialité et au RGPD. Vous disposez des mêmes 
                droits sur ces données que sur vos autres données personnelles.
              </p>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">8. Mise à jour de cette politique</h2>
              <p className="text-sm text-white/70 mb-4">
                Cette politique des cookies peut être mise à jour pour refléter les changements 
                dans nos pratiques ou pour d'autres raisons opérationnelles, légales ou réglementaires. 
                Nous vous informerons de tout changement significatif.
              </p>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">9. Contact</h2>
              <p className="text-sm text-white/70 mb-4">
                Pour toute question concernant notre utilisation des cookies :
              </p>
              <div className="flex items-center gap-2 mb-4">
                <Cookie className="w-4 h-4 text-purple-400" />
                <a href="mailto:cookies@synaura.fr" className="text-purple-400 hover:text-purple-300 transition-colors">
                  cookies@synaura.fr
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
