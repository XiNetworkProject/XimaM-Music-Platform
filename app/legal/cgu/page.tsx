'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Scale, AlertTriangle, Users, Shield, Music } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';

export default function CGUPage() {
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
                <Scale className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Conditions générales d'utilisation</h1>
                <p className="text-white/60">Règles d'utilisation de la plateforme Synaura</p>
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
              <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-sm font-semibold text-yellow-300">Important</h3>
                </div>
                <p className="text-sm text-yellow-200">
                  En utilisant Synaura, vous acceptez sans réserve les présentes conditions générales d'utilisation. 
                  Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.
                </p>
              </div>

              <h2 className="text-xl font-semibold text-white/90 mb-4">1. Objet</h2>
              <p className="text-sm text-white/70 mb-4">
                Les présentes conditions générales d'utilisation (CGU) régissent l'utilisation de la plateforme 
                Synaura, service de streaming musical et de partage de créations musicales développé par Maxime VERMEULEN.
              </p>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">2. Définitions</h2>
              <ul className="text-sm text-white/70 space-y-2 mb-6">
                <li>• <strong>"Plateforme" :</strong> le site web synaura.fr et ses fonctionnalités</li>
                <li>• <strong>"Utilisateur" :</strong> toute personne utilisant la plateforme</li>
                <li>• <strong>"Créateur" :</strong> utilisateur publiant du contenu musical</li>
                <li>• <strong>"Contenu" :</strong> musiques, images, textes publiés sur la plateforme</li>
                <li>• <strong>"Abonnement" :</strong> service payant proposé par Synaura</li>
              </ul>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">3. Acceptation des conditions</h2>
              <p className="text-sm text-white/70 mb-4">
                L'utilisation de Synaura implique l'acceptation pleine et entière des présentes CGU. 
                Ces conditions s'appliquent à tous les utilisateurs de la plateforme.
              </p>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">4. Inscription et compte</h2>
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">4.1 Création de compte</h3>
                  <p className="text-sm text-white/70">
                    Pour utiliser Synaura, vous devez créer un compte en fournissant des informations exactes et à jour. 
                    Vous êtes responsable de la confidentialité de vos identifiants.
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">4.2 Âge minimum</h3>
                  <p className="text-sm text-white/70">
                    Vous devez avoir au moins 13 ans pour créer un compte. Les mineurs de moins de 16 ans doivent 
                    obtenir l'autorisation de leurs parents ou tuteurs légaux.
                  </p>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">5. Utilisation de la plateforme</h2>
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">5.1 Utilisation autorisée</h3>
                  <ul className="text-sm text-white/70 space-y-1">
                    <li>• Écouter de la musique légalement</li>
                    <li>• Créer et partager vos propres créations musicales</li>
                    <li>• Interagir avec la communauté (likes, commentaires)</li>
                    <li>• Créer des playlists personnelles</li>
                  </ul>
                </div>
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <h3 className="text-sm font-medium text-red-300 mb-2">5.2 Utilisations interdites</h3>
                  <ul className="text-sm text-red-200 space-y-1">
                    <li>• Publier du contenu illégal ou offensant</li>
                    <li>• Violer les droits d'auteur</li>
                    <li>• Tenter de contourner les mesures de sécurité</li>
                    <li>• Utiliser la plateforme à des fins commerciales non autorisées</li>
                    <li>• Harceler ou menacer d'autres utilisateurs</li>
                  </ul>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">6. Contenu utilisateur</h2>
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">6.1 Responsabilité</h3>
                  <p className="text-sm text-white/70">
                    Vous êtes seul responsable du contenu que vous publiez sur Synaura. Vous garantissez 
                    détenir tous les droits nécessaires sur ce contenu.
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">6.2 Modération</h3>
                  <p className="text-sm text-white/70">
                    Synaura se réserve le droit de modérer, suspendre ou supprimer tout contenu 
                    contraire aux présentes CGU ou à la législation en vigueur.
                  </p>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">7. Propriété intellectuelle</h2>
              <p className="text-sm text-white/70 mb-4">
                En publiant du contenu sur Synaura, vous accordez à la plateforme une licence non exclusive 
                pour l'héberger, l'afficher et le distribuer dans le cadre du service. Vous conservez 
                tous vos droits de propriété intellectuelle.
              </p>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">8. Abonnements et paiements</h2>
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">8.1 Tarification</h3>
                  <p className="text-sm text-white/70">
                    Les tarifs des abonnements sont indiqués en euros TTC. Les prix peuvent être modifiés 
                    avec un préavis de 30 jours.
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">8.2 Paiement</h3>
                  <p className="text-sm text-white/70">
                    Les paiements sont traités par Stripe. En cas de problème de paiement, 
                    votre accès peut être suspendu.
                  </p>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">9. Responsabilité</h2>
              <p className="text-sm text-white/70 mb-4">
                Synaura ne peut être tenu responsable des dommages indirects résultant de l'utilisation 
                de la plateforme. Notre responsabilité est limitée au montant des sommes payées 
                pour l'utilisation du service.
              </p>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">10. Suspension et résiliation</h2>
              <p className="text-sm text-white/70 mb-4">
                Synaura se réserve le droit de suspendre ou résilier votre compte en cas de violation 
                des présentes CGU. Vous pouvez résilier votre compte à tout moment depuis les paramètres.
              </p>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">11. Modification des CGU</h2>
              <p className="text-sm text-white/70 mb-4">
                Ces conditions peuvent être modifiées à tout moment. Les modifications prendront effet 
                dès leur publication sur la plateforme. Votre utilisation continue constitue 
                votre acceptation des nouvelles conditions.
              </p>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">12. Droit applicable</h2>
              <p className="text-sm text-white/70 mb-4">
                Les présentes CGU sont soumises au droit français. En cas de litige, les tribunaux 
                français seront seuls compétents.
              </p>

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
