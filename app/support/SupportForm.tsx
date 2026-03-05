'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronDown,
  Eye,
  Copy,
  Loader2,
  Mail,
  Music,
  Send,
  UserPlus,
  Wrench,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// NoBookingNotice
// ---------------------------------------------------------------------------

export function NoBookingNotice() {
  const items = [
    { icon: Ban, label: 'Booking / Management artistique' },
    { icon: Ban, label: 'Radio promotionnelle / airplay payant' },
    { icon: Ban, label: 'Édition musicale / label / distribution' },
    { icon: Ban, label: 'Listes d\'abonnés ou leads commerciaux' },
  ];

  return (
    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 md:p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 shrink-0 text-rose-400" size={18} />
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-rose-300">
            Synaura n'est pas un service de…
          </p>
          <ul className="space-y-1">
            {items.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-xs text-rose-300/80">
                <Icon size={12} className="shrink-0" />
                {label}
              </li>
            ))}
          </ul>
          <p className="pt-1 text-xs text-rose-300/70">
            Tu es artiste et tu veux partager ta musique ?{' '}
            <Link href="/publish" className="underline hover:text-rose-200 transition">
              Voir comment publier →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SupportHero
// ---------------------------------------------------------------------------

export function SupportHero() {
  const ctas = [
    {
      href: '/publish',
      icon: Music,
      label: 'Publier ma musique',
      description: 'Guide en 3 étapes',
      gradient: 'from-violet-600/20 to-indigo-600/20',
      border: 'border-violet-500/30',
      iconColor: 'text-violet-400',
    },
    {
      href: '/auth/signup',
      icon: UserPlus,
      label: 'Créer un compte',
      description: 'Rejoindre Synaura',
      gradient: 'from-indigo-600/20 to-cyan-600/20',
      border: 'border-indigo-500/30',
      iconColor: 'text-indigo-400',
    },
    {
      href: '#contact-form',
      icon: Wrench,
      label: 'Support technique',
      description: 'Signaler un problème',
      gradient: 'from-cyan-600/20 to-teal-600/20',
      border: 'border-cyan-500/30',
      iconColor: 'text-cyan-400',
      isAnchor: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {ctas.map(({ href, icon: Icon, label, description, gradient, border, iconColor, isAnchor }) => {
        const className = `group flex flex-col items-center gap-2 rounded-2xl border ${border} bg-gradient-to-br ${gradient} p-5 text-center transition hover:brightness-110 hover:-translate-y-0.5 duration-200`;
        if (isAnchor) {
          return (
            <a key={label} href={href} className={className}>
              <Icon size={22} className={iconColor} />
              <span className="text-sm font-semibold text-white">{label}</span>
              <span className="text-xs text-white/50">{description}</span>
            </a>
          );
        }
        return (
          <Link key={label} href={href} className={className}>
            <Icon size={22} className={iconColor} />
            <span className="text-sm font-semibold text-white">{label}</span>
            <span className="text-xs text-white/50">{description}</span>
          </Link>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RevealEmailButton
// The email is never present as plain text in the DOM.
// It is only assembled client-side, in JS, after the user clicks.
// ---------------------------------------------------------------------------

// Encoded: rot13 of "contact.syn@synaura.fr"
const ENCODED = 'pbagnpg.fla@flanheh.se';

function rot13(s: string) {
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

export function RevealEmailButton() {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const email = rot13(ENCODED);

  const handleReveal = useCallback(() => {
    setRevealed(true);
  }, []);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [email]);

  if (!revealed) {
    return (
      <button
        onClick={handleReveal}
        className="inline-flex items-center gap-2 rounded-xl border border-border-secondary bg-white/5 px-4 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition"
      >
        <Eye size={14} />
        Révéler l'adresse e-mail
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-xl border border-border-secondary bg-white/5 px-4 py-2 text-sm font-mono text-indigo-300 select-all">
        {/* Assembled in JS only, not in initial server HTML */}
        {email}
      </span>
      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border-secondary bg-white/5 px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-white/10 transition"
      >
        {copied ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
        {copied ? 'Copié !' : 'Copier'}
      </button>
      <a
        href={`mailto:${email}?subject=Support%20Synaura`}
        className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-600/10 px-3 py-2 text-xs text-indigo-300 hover:bg-indigo-600/20 transition"
      >
        <Mail size={13} />
        Envoyer un email
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SupportForm
// ---------------------------------------------------------------------------

const SUBJECTS = [
  'Compte / Connexion',
  'Paiement',
  'Bug',
  'Contenu / Modération',
  'Autre',
] as const;

type FormState = 'idle' | 'loading' | 'success' | 'error';

export function SupportForm() {
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [fields, setFields] = useState({
    email: '',
    subject: '' as string,
    message: '',
    url: '',
  });

  const set = useCallback((key: keyof typeof fields, value: string) => {
    setFields((f) => ({ ...f, [key]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (formState === 'loading') return;

      if (!fields.email || !fields.subject || !fields.message) {
        setErrorMsg('Merci de remplir tous les champs obligatoires.');
        setFormState('error');
        return;
      }

      setFormState('loading');
      setErrorMsg('');

      try {
        const res = await fetch('/api/support', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fields),
        });
        const data = await res.json();

        if (!res.ok) {
          setErrorMsg(data.error ?? 'Erreur serveur.');
          setFormState('error');
        } else {
          setFormState('success');
        }
      } catch {
        setErrorMsg('Impossible de joindre le serveur. Réessaie plus tard.');
        setFormState('error');
      }
    },
    [fields, formState],
  );

  if (formState === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 size={40} className="text-emerald-400" />
        <p className="text-lg font-semibold text-white">Demande envoyée !</p>
        <p className="text-sm text-white/50 max-w-sm">
          Nous avons bien reçu ta demande. Tu recevras une réponse dans les meilleurs délais.
        </p>
        <button
          onClick={() => {
            setFormState('idle');
            setFields({ email: '', subject: '', message: '', url: '' });
          }}
          className="mt-2 text-xs text-indigo-400 underline hover:text-indigo-300 transition"
        >
          Envoyer une autre demande
        </button>
      </div>
    );
  }

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition';

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-white/60">
            Email <span className="text-rose-400">*</span>
          </label>
          <input
            type="email"
            placeholder="ton@email.com"
            value={fields.email}
            onChange={(e) => set('email', e.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-white/60">
            Sujet <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <select
              value={fields.subject}
              onChange={(e) => set('subject', e.target.value)}
              className={`${inputClass} appearance-none pr-9 cursor-pointer`}
              required
            >
              <option value="" disabled>
                Choisir un sujet…
              </option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s} className="bg-[#0d0d1a]">
                  {s}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
            />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-white/60">
          Message <span className="text-rose-400">*</span>
        </label>
        <textarea
          placeholder="Décris ton problème en détail. Pour un bug, précise ton navigateur, ton appareil et l'URL exacte."
          rows={5}
          value={fields.message}
          onChange={(e) => set('message', e.target.value)}
          className={`${inputClass} resize-none`}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-white/60">
          URL concernée{' '}
          <span className="text-white/30">(optionnel)</span>
        </label>
        <input
          type="url"
          placeholder="https://synaura.fr/..."
          value={fields.url}
          onChange={(e) => set('url', e.target.value)}
          className={inputClass}
        />
      </div>

      {formState === 'error' && errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          <AlertTriangle size={14} className="shrink-0" />
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={formState === 'loading'}
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
      >
        {formState === 'loading' ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Envoi…
          </>
        ) : (
          <>
            <Send size={15} />
            Envoyer ma demande
          </>
        )}
      </button>
    </form>
  );
}
