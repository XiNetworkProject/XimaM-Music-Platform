'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Clock, Mail, Scale, FileWarning } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import SynauraShutdownBanner from '@/components/SynauraShutdownBanner';
import {
  SHUTDOWN_END_DATE_LABEL,
  SHUTDOWN_ANNOUNCEMENT_LABEL,
  isPastShutdownEnd,
} from '@/lib/synauraShutdown';

export default function FermeturePage() {
  const closed = isPastShutdownEnd();

  return (
    <div className="min-h-screen w-full px-2 sm:px-4 md:px-6 pt-6 sm:pt-10 pb-24 text-white">
      <div className="relative z-10 w-full max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          {!closed && (
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à l&apos;accueil
            </Link>
          )}

          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 shrink-0">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-red-300 mb-1">
                Annonce officielle — {SHUTDOWN_ANNOUNCEMENT_LABEL}
              </p>
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
                Fermeture et arrêt définitif de Synaura
              </h1>
              <p className="text-white/50 text-sm sm:text-base">
                Information légale relative à l&apos;interruption du service synaura.fr
              </p>
            </div>
          </div>
        </motion.div>

        {!closed && (
          <div className="mb-8">
            <SynauraShutdownBanner variant="compact" />
          </div>
        )}

        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 sm:p-8 space-y-8"
        >
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25">
            <div className="flex items-center gap-2 mb-2">
              <FileWarning className="w-5 h-5 text-red-300" />
              <h2 className="text-sm font-bold text-red-200 uppercase tracking-wide">Résumé</h2>
            </div>
            <p className="text-sm text-white/70 leading-relaxed">
              La plateforme <strong className="text-white">Synaura</strong> cessera définitivement toute activité
              le <strong className="text-red-200">{SHUTDOWN_END_DATE_LABEL} à 23h59</strong> (heure de Paris).
              D&apos;ici cette date, un délai d&apos;un mois vous est accordé pour consulter vos contenus et
              effectuer les démarches utiles. Au-delà, <strong className="text-white">aucun accès</strong> ne
              sera possible.
            </p>
          </div>

          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Scale className="w-5 h-5 text-white/50" />
              1. Éditeur et objet
            </h2>
            <div className="text-sm text-white/60 space-y-3 leading-relaxed">
              <p>
                Le présent avis est émis par <strong className="text-white/80">Maxime VERMEULEN</strong>,
                auto-entrepreneur (SIRET : 991635194), éditeur du site et de l&apos;application{' '}
                <strong className="text-white/80">Synaura</strong> (synaura.fr), ci-après « l&apos;Éditeur » ou « nous ».
              </p>
              <p>
                Il informe l&apos;ensemble des utilisateurs, créateurs et visiteurs de la décision d&apos;arrêt
                définitif de la plateforme et des conséquences qui en découlent.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">2. Motif de l&apos;arrêt</h2>
            <div className="text-sm text-white/60 space-y-3 leading-relaxed">
              <p>
                Synaura a été développé et maintenu à titre personnel. Malgré les efforts déployés, la
                plateforme ne parvient plus à :
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>couvrir les <strong className="text-white/75">frais d&apos;exploitation</strong> engagés (hébergement, bande passante, stockage média, services tiers, APIs d&apos;intelligence artificielle, maintenance technique) ;</li>
                <li>atteindre une <strong className="text-white/75">base d&apos;utilisateurs</strong> suffisante pour assurer la pérennité économique du service.</li>
              </ul>
              <p>
                Pour ces raisons, et en l&apos;absence de perspective de viabilité à court ou moyen terme,
                l&apos;Éditeur est <strong className="text-white/80">contraint d&apos;interrompre définitivement</strong> le
                service. Cette décision relève du droit de l&apos;entrepreneur individuel de cesser une activité
                non rentable et ne constitue pas une faute contractuelle au sens des CGU lorsque le service
                ne peut plus être maintenu pour des motifs économiques objectifs.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-white/50" />
              3. Calendrier
            </h2>
            <div className="text-sm text-white/60 space-y-3 leading-relaxed">
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span className="shrink-0 font-mono text-xs text-red-300 bg-red-500/10 px-2 py-1 rounded">Aujourd&apos;hui</span>
                  <span>
                    <strong className="text-white/80">{SHUTDOWN_ANNOUNCEMENT_LABEL}</strong> — Publication de la
                    présente annonce. Le service reste accessible pendant la période de préavis.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 font-mono text-xs text-red-300 bg-red-500/10 px-2 py-1 rounded">Fin</span>
                  <span>
                    <strong className="text-red-200">{SHUTDOWN_END_DATE_LABEL} à 23h59</strong> (heure de Paris) —
                    Coupure totale et définitive de l&apos;accès à la plateforme, à l&apos;application et à l&apos;ensemble
                    des fonctionnalités (écoute, publication, messagerie, studio IA, abonnements, crédits, etc.).
                  </span>
                </li>
              </ul>
              <p>
                Le délai d&apos;un mois entre l&apos;annonce et la coupure a pour seul objet de vous permettre
                d&apos;être informés et, le cas échéant, de sauvegarder vos contenus ou d&apos;exercer vos droits.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">4. Conséquences pour les utilisateurs</h2>
            <div className="text-sm text-white/60 space-y-3 leading-relaxed">
              <p>Après le {SHUTDOWN_END_DATE_LABEL} :</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>aucune connexion au compte ne sera possible ;</li>
                <li>les contenus publiés (musiques, playlists, messages, profils) ne seront plus consultables ni téléchargeables via la plateforme ;</li>
                <li>les abonnements et crédits non consommés ne pourront plus être utilisés — voir section 5 ;</li>
                <li>les liens publics, embeds et partages cesseront de fonctionner.</li>
              </ul>
              <p>
                Pendant le mois de préavis, nous vous invitons à sauvegarder localement tout contenu dont
                vous souhaitez conserver une copie. L&apos;Éditeur ne garantit pas la conservation des données
                au-delà de la date de coupure.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">5. Abonnements, paiements et crédits</h2>
            <div className="text-sm text-white/60 space-y-3 leading-relaxed">
              <p>
                Les abonnements en cours prendront fin à la date de coupure. Aucun nouveau paiement récurrent
                ne sera prélevé après l&apos;arrêt du service. Pour toute question relative à un paiement récent
                ou à un remboursement au titre des CGV, contactez-nous à l&apos;adresse ci-dessous dans les
                meilleurs délais, en joignant les éléments de preuve (date, montant, e-mail du compte).
              </p>
              <p>
                Les crédits, boosters ou avantages virtuels non utilisés à la date de fermeture seront perdus
                sans indemnisation, conformément aux conditions générales acceptées lors de l&apos;utilisation du service.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">6. Données personnelles (RGPD)</h2>
            <div className="text-sm text-white/60 space-y-3 leading-relaxed">
              <p>
                Conformément au Règlement (UE) 2016/679 et à la loi « Informatique et Libertés », vos données
                personnelles seront supprimées ou anonymisées dans un délai raisonnable après la fermeture,
                sauf obligation légale de conservation (comptabilité, litiges).
              </p>
              <p>
                Vous pouvez exercer vos droits d&apos;accès, de rectification, d&apos;effacement et d&apos;opposition
                en écrivant à{' '}
                <a href="mailto:contact.syn@synaura.fr" className="text-white/80 hover:text-white underline">
                  contact.syn@synaura.fr
                </a>{' '}
                avant la date de coupure. Consultez également notre{' '}
                <Link href="/legal/confidentialite" className="text-white/80 hover:text-white underline">
                  politique de confidentialité
                </Link>.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">7. Absence de promesse de relance</h2>
            <div className="text-sm text-white/60 space-y-3 leading-relaxed">
              <p>
                Une relance de Synaura, sous cette forme ou une autre, pourrait éventuellement être envisagée
                à l&apos;avenir. <strong className="text-white/80">Aucune promesse, engagement ou obligation</strong> de
                relance n&apos;est faite. En l&apos;absence d&apos;annonce ultérieure officielle sur synaura.fr ou par
                e-mail, considérez le service comme définitivement clos.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">8. Limitation de responsabilité</h2>
            <div className="text-sm text-white/60 space-y-3 leading-relaxed">
              <p>
                L&apos;Éditeur ne saurait être tenu responsable des dommages indirects liés à l&apos;arrêt du service
                (perte de données non sauvegardées, manque à gagner, interruption d&apos;activité des créateurs),
                dans les limites autorisées par la loi et les CGU acceptées par les utilisateurs.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">9. Contact</h2>
            <div className="text-sm text-white/60 space-y-3 leading-relaxed">
              <p>Pour toute question relative à cette fermeture :</p>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <Mail className="w-4 h-4 text-white/40 shrink-0" />
                <a href="mailto:contact.syn@synaura.fr" className="text-white/80 hover:text-white">
                  contact.syn@synaura.fr
                </a>
              </div>
              <p className="text-xs text-white/30">
                Maxime VERMEULEN — Auto-entrepreneur — SIRET 991635194 — synaura.fr
              </p>
            </div>
          </section>

          <p className="text-xs text-white/25 pt-4 border-t border-white/[0.06]">
            Document publié le {SHUTDOWN_ANNOUNCEMENT_LABEL}. Dernière mise à jour : {SHUTDOWN_ANNOUNCEMENT_LABEL}.
          </p>
        </motion.article>

        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <Link href="/legal" className="text-sm text-white/50 hover:text-white transition">
            Centre légal
          </Link>
          {!closed && (
            <Link href="/" className="text-sm text-white/50 hover:text-white transition">
              Retour à l&apos;accueil
            </Link>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
