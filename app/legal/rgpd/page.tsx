'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Users, Shield, Database, Eye, Trash2, Download, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';

export default function RGPDPage() {
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
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Conformité RGPD</h1>
                <p className="text-white/60">Droits et protection des données personnelles</p>
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
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-green-400" />
                  <h3 className="text-sm font-semibold text-green-300">Responsable du traitement</h3>
                </div>
                <p className="text-sm text-green-200">
                  Maxime VERMEULEN - Auto-entrepreneur<br />
                  SIRET : 991635194<br />
                  Email : dpo@synaura.fr
                </p>
              </div>

              <h2 className="text-xl font-semibold text-white/90 mb-4">1. Qu'est-ce que le RGPD ?</h2>
              <p className="text-sm text-white/70 mb-4">
                Le Règlement Général sur la Protection des Données (RGPD) est un règlement européen 
                qui renforce et unifie la protection des données personnelles des personnes physiques. 
                Il s'applique depuis le 25 mai 2018.
              </p>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">2. Vos droits</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-5 h-5 text-purple-400" />
                    <h3 className="text-sm font-medium text-white/90">Droit d'accès</h3>
                  </div>
                  <p className="text-xs text-white/70">
                    Vous pouvez demander quelles données personnelles nous traitons à votre sujet 
                    et obtenir une copie de ces données.
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm font-medium text-white/90">Droit de rectification</h3>
                  </div>
                  <p className="text-xs text-white/70">
                    Vous pouvez demander la correction de données inexactes ou incomplètes 
                    nous concernant.
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Trash2 className="w-5 h-5 text-red-400" />
                    <h3 className="text-sm font-medium text-white/90">Droit à l'effacement</h3>
                  </div>
                  <p className="text-xs text-white/70">
                    Vous pouvez demander la suppression de vos données personnelles dans 
                    certaines circonstances.
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Download className="w-5 h-5 text-green-400" />
                    <h3 className="text-sm font-medium text-white/90">Droit à la portabilité</h3>
                  </div>
                  <p className="text-xs text-white/70">
                    Vous pouvez recevoir vos données dans un format structuré et les transférer 
                    à un autre responsable de traitement.
                  </p>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">3. Comment exercer vos droits</h2>
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">3.1 Via votre compte</h3>
                  <p className="text-sm text-white/70">
                    La plupart de vos droits peuvent être exercés directement depuis votre espace client :
                  </p>
                  <ul className="text-sm text-white/70 space-y-1 mt-2">
                    <li>• Modifier vos informations personnelles</li>
                    <li>• Télécharger vos données</li>
                    <li>• Supprimer votre compte</li>
                    <li>• Gérer vos préférences de communication</li>
                  </ul>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">3.2 Par email</h3>
                  <p className="text-sm text-white/70">
                    Pour des demandes spécifiques, contactez-nous à :{' '}
                    <a href="mailto:dpo@synaura.fr" className="text-purple-400 hover:text-purple-300 transition-colors">
                      dpo@synaura.fr
                    </a>
                  </p>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">4. Délais de réponse</h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-sm text-white/70">Droit d'accès</span>
                  <span className="text-sm text-white/90">1 mois</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-sm text-white/70">Droit de rectification</span>
                  <span className="text-sm text-white/90">1 mois</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-sm text-white/70">Droit à l'effacement</span>
                  <span className="text-sm text-white/90">1 mois</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-sm text-white/70">Droit à la portabilité</span>
                  <span className="text-sm text-white/90">1 mois</span>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">5. Base légale du traitement</h2>
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">5.1 Consentement</h3>
                  <p className="text-sm text-white/70">
                    Pour les communications marketing et les données optionnelles. 
                    Vous pouvez retirer votre consentement à tout moment.
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">5.2 Exécution du contrat</h3>
                  <p className="text-sm text-white/70">
                    Pour la fourniture des services Synaura (compte, streaming, abonnements).
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">5.3 Intérêt légitime</h3>
                  <p className="text-sm text-white/70">
                    Pour l'amélioration des services, la sécurité et la prévention de la fraude.
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-white/90 mb-2">5.4 Obligation légale</h3>
                  <p className="text-sm text-white/70">
                    Pour la conservation des données de facturation (10 ans).
                  </p>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">6. Transferts internationaux</h2>
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-sm font-semibold text-yellow-300">Informations importantes</h3>
                </div>
                <p className="text-sm text-yellow-200">
                  Certains de nos prestataires (Stripe, Vercel, Supabase) sont situés en dehors de l'UE. 
                  Nous nous assurons que ces transferts sont effectués avec des garanties appropriées 
                  (clauses contractuelles types, décision d'adéquation).
                </p>
              </div>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">7. Sécurité des données</h2>
              <p className="text-sm text-white/70 mb-4">
                Nous mettons en œuvre des mesures techniques et organisationnelles appropriées :
              </p>
              <ul className="text-sm text-white/70 space-y-2 mb-6">
                <li>• Chiffrement des données en transit et au repos</li>
                <li>• Authentification forte et contrôle d'accès</li>
                <li>• Surveillance continue et détection d'intrusions</li>
                <li>• Sauvegardes régulières et plan de continuité</li>
                <li>• Formation du personnel à la protection des données</li>
              </ul>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">8. Violation de données</h2>
              <p className="text-sm text-white/70 mb-4">
                En cas de violation de données personnelles susceptible d'engendrer un risque élevé 
                pour vos droits et libertés, nous vous informerons dans les meilleurs délais et, 
                au plus tard, dans les 72 heures après en avoir pris connaissance.
              </p>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">9. Réclamations</h2>
              <p className="text-sm text-white/70 mb-4">
                Si vous estimez que vos droits ne sont pas respectés, vous pouvez :
              </p>
              <ul className="text-sm text-white/70 space-y-2 mb-6">
                <li>• Nous contacter directement à dpo@synaura.fr</li>
                <li>• Introduire une réclamation auprès de la CNIL :{' '}
                  <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 transition-colors">
                    www.cnil.fr
                  </a>
                </li>
                <li>• Saisir le tribunal compétent</li>
              </ul>

              <h2 className="text-xl font-semibold text-white/90 mb-4 mt-8">10. Contact DPO</h2>
              <div className="p-4 bg-white/5 rounded-lg">
                <p className="text-sm text-white/70 mb-2">
                  Pour toute question relative à la protection de vos données :
                </p>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  <a href="mailto:dpo@synaura.fr" className="text-purple-400 hover:text-purple-300 transition-colors">
                    dpo@synaura.fr
                  </a>
                </div>
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
