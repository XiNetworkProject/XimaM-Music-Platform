'use client';

import Link from 'next/link';
import { AlertTriangle, Mail } from 'lucide-react';
import { SHUTDOWN_END_DATE_LABEL } from '@/lib/synauraShutdown';

export default function ArretPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 text-white bg-[#0a0a0e]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-10%] left-[-5%] w-[50vw] h-[50vw] rounded-full opacity-[0.08] blur-[130px]"
          style={{ background: 'radial-gradient(circle, #dc2626 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center space-y-6">
        <div className="inline-flex p-4 rounded-2xl bg-red-500/10 border border-red-500/25">
          <AlertTriangle className="w-12 h-12 text-red-400" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
          Synaura n&apos;est plus accessible
        </h1>

        <p className="text-white/55 leading-relaxed">
          Le service a été arrêté définitivement le{' '}
          <strong className="text-white">{SHUTDOWN_END_DATE_LABEL}</strong>. Comptes, contenus, messagerie,
          studio IA et toutes les fonctionnalités ont été coupés.
        </p>

        <p className="text-sm text-white/40 leading-relaxed">
          Pour des raisons économiques, la plateforme ne pouvait plus être maintenue. Une éventuelle relance
          future n&apos;est pas promise.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/fermeture"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-sm font-semibold transition"
          >
            Lire l&apos;annonce de fermeture
          </Link>
          <a
            href="mailto:contact.syn@synaura.fr"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-red-600/80 hover:bg-red-500 text-sm font-bold transition"
          >
            <Mail className="w-4 h-4" />
            Nous contacter
          </a>
        </div>

        <p className="text-xs text-white/25 pt-4">
          Maxime VERMEULEN — synaura.fr —{' '}
          <Link href="/legal" className="underline hover:text-white/50">
            Mentions légales
          </Link>
        </p>
      </div>
    </div>
  );
}
