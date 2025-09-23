'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Scale, CreditCard, Receipt, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';

export default function CGVPage() {
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
                <h1 className="text-3xl font-bold text-white mb-2">Conditions générales de vente</h1>
                <p className="text-white/60">Conditions d'achat des abonnements Synaura</p>
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
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                  <h3 className="text-sm font-semibold text-blue-300">Vendeur</h3>
                </div>
                <p className="text-sm text-blue-200">
                  Maxime VERMEULEN - Auto-entrepreneur<br />
                  SIRET : 991635194<br />
                  Email : billing@synaura.fr
                </p>
              </div>

              <h2 className="text-xl font-semibold text-white/90 mb-4">1. Objet</h2>
              <p className="text-sm text-white/70 mb-4">
                Les présentes conditions générales de vente (CGV) régissent la vente d'abonnements 
                à la plateforme Synaura, service de streaming musical développé par Maxime VERMEULEN.
              </p>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">2. Produits et services</h2>
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">2.1 Plans d'abonnement</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="p-3 bg-white/5 rounded-lg">
                      <h4 className="font-medium text-white/90">Starter</h4>
                      <p className="text-white/70">4,99€/mois</p>
                      <p className="text-xs text-white/60">Accès limité</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg">
                      <h4 className="font-medium text-white/90">Pro</h4>
                      <p className="text-white/70">14,99€/mois</p>
                      <p className="text-xs text-white/60">Accès complet</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg">
                      <h4 className="font-medium text-white/90">Enterprise</h4>
                      <p className="text-white/70">59,99€/mois</p>
                      <p className="text-xs text-white/60">Accès illimité</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">2.2 Réductions</h3>
                  <p className="text-sm text-white/70">
                    Une réduction de 20% est appliquée sur les abonnements annuels par rapport 
                    aux tarifs mensuels.
                  </p>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">3. Commande</h2>
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">3.1 Processus de commande</h3>
                  <ol className="text-sm text-white/70 space-y-1 list-decimal list-inside">
                    <li>Sélection du plan d'abonnement</li>
                    <li>Saisie des informations de paiement</li>
                    <li>Validation de la commande</li>
                    <li>Activation immédiate de l'abonnement</li>
                  </ol>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">3.2 Confirmation</h3>
                  <p className="text-sm text-white/70">
                    Une confirmation de commande est envoyée par email. Cette confirmation 
                    vaut acceptation de la commande.
                  </p>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">4. Prix et paiement</h2>
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">4.1 Prix</h3>
                  <p className="text-sm text-white/70">
                    Les prix sont indiqués en euros TTC. Ils comprennent toutes les taxes applicables. 
                    Les prix peuvent être modifiés avec un préavis de 30 jours.
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">4.2 Moyens de paiement</h3>
                  <ul className="text-sm text-white/70 space-y-1">
                    <li>• Cartes bancaires (Visa, Mastercard, American Express)</li>
                    <li>• Paiement sécurisé via Stripe</li>
                    <li>• Prélèvement automatique mensuel ou annuel</li>
                  </ul>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">4.3 Facturation</h3>
                  <p className="text-sm text-white/70">
                    Les factures sont émises automatiquement et envoyées par email. 
                    Elles sont disponibles dans votre espace client.
                  </p>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">5. Droit de rétractation</h2>
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-sm font-semibold text-yellow-300">Important</h3>
                </div>
                <p className="text-sm text-yellow-200">
                  Conformément à l'article L. 221-28 du Code de la consommation, le droit de rétractation 
                  ne s'applique pas aux contrats de fourniture de services pleinement exécutés avant 
                  la fin du délai de rétractation et dont l'exécution a commencé après accord préalable 
                  exprès du consommateur et renoncement exprès à son droit de rétractation.
                </p>
              </div>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">6. Résiliation</h2>
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">6.1 Résiliation par le client</h3>
                  <p className="text-sm text-white/70">
                    Vous pouvez résilier votre abonnement à tout moment depuis votre espace client. 
                    La résiliation prend effet à la fin de la période de facturation en cours.
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">6.2 Résiliation par Synaura</h3>
                  <p className="text-sm text-white/70">
                    Synaura peut résilier votre abonnement en cas de non-paiement ou de violation 
                    des conditions d'utilisation.
                  </p>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">7. Remboursements</h2>
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">7.1 Politique de remboursement</h3>
                  <p className="text-sm text-white/70">
                    Les remboursements sont accordés uniquement en cas d'erreur technique de notre part 
                    ou de problème de paiement non imputable au client.
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">7.2 Modalités</h3>
                  <p className="text-sm text-white/70">
                    Les remboursements sont effectués sous 14 jours ouvrés sur le moyen de paiement 
                    utilisé lors de la commande.
                  </p>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">8. Disponibilité du service</h2>
              <p className="text-sm text-white/70 mb-4">
                Synaura s'efforce de maintenir la disponibilité du service 24h/24 et 7j/7. 
                Cependant, des interruptions peuvent survenir pour maintenance ou en cas de force majeure.
              </p>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">9. Responsabilité</h2>
              <p className="text-sm text-white/70 mb-4">
                La responsabilité de Synaura est limitée au montant des sommes payées pour l'abonnement. 
                En aucun cas, Synaura ne pourra être tenu responsable de dommages indirects.
              </p>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">10. Droit applicable</h2>
              <p className="text-sm text-white/70 mb-4">
                Les présentes CGV sont soumises au droit français. En cas de litige, les tribunaux 
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
