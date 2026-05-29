'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, Check, Eye, EyeOff, Lock, Mail, MessageCircle, Music2, Radio, Share2 } from 'lucide-react';

const INPUT =
  'h-12 w-full rounded-2xl border border-[#dccfbb] bg-[#fffdf8] px-4 text-sm font-semibold text-[#171313] outline-none transition placeholder:text-black/28 focus:border-[#ff6f61] focus:ring-4 focus:ring-[#ff6f61]/14';

function safeCallbackUrl(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.94.46 3.77 1.18 5.27l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function SynauraMark({ label = 'Connexion' }: { label?: string }) {
  return (
    <Link href="/" className="inline-flex items-center gap-3">
      <span className="grid h-14 w-14 place-items-center rounded-[1.25rem] border border-black/[0.08] bg-white shadow-[0_10px_26px_rgba(30,25,20,0.10)]">
        <Image src="/brand/2026/synaura-symbol-2026.png" alt="Synaura" width={52} height={52} className="h-12 w-12 object-contain" unoptimized priority />
      </span>
      <span>
        <span className="block text-xl font-black tracking-tight">Synaura</span>
        <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-black/40">{label}</span>
      </span>
    </Link>
  );
}

function ShowcasePanel() {
  const cards = [
    { icon: Music2, title: 'Écouter', text: 'Retrouve tes sons et playlists.' },
    { icon: Share2, title: 'Partager', text: 'Reposte un titre, une idée, un moment.' },
    { icon: MessageCircle, title: 'Réagir', text: 'Commentaires, likes et notifications.' },
  ];

  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative hidden min-h-[620px] overflow-hidden rounded-[2.2rem] border border-[#d8cbb8] bg-[#fffaf2] p-7 shadow-[0_24px_80px_rgba(44,33,19,0.16)] lg:block"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(255,111,97,0.20),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(124,92,255,0.16),transparent_34%),radial-gradient(circle_at_60%_90%,rgba(0,194,203,0.14),transparent_34%)]" />
      <motion.div
        className="absolute right-10 top-20 h-44 w-44 rounded-full bg-[#ff6f61]/18 blur-3xl"
        animate={{ y: [0, 18, 0], x: [0, -10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 flex h-full flex-col justify-between">
        <SynauraMark label="retour" />

        <div className="space-y-7">
          <div>
            <p className="mb-3 inline-flex rounded-full border border-[#e3d4c1] bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-black/44">
              Compte Synaura
            </p>
            <h1 className="max-w-md text-5xl font-black leading-[0.95] tracking-tight text-[#171313]">
              Reviens là où tes sons circulent.
            </h1>
            <p className="mt-4 max-w-md text-sm font-semibold leading-relaxed text-black/52">
              Connexion rapide à ton profil, ton feed, tes notifications et tes créations.
            </p>
          </div>

          <div className="relative h-56 overflow-hidden rounded-[1.8rem] border border-[#dccfbb] bg-[#171313] p-4 text-white shadow-[0_22px_60px_rgba(23,19,19,0.20)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,111,97,0.34),transparent_35%),radial-gradient(circle_at_78%_18%,rgba(124,92,255,0.30),transparent_34%),radial-gradient(circle_at_45%_92%,rgba(0,194,203,0.24),transparent_38%)]" />
            <motion.div
              className="relative z-10 ml-auto w-[72%] rounded-[1.4rem] border border-white/12 bg-white/10 p-4 backdrop-blur"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="h-10 w-10 rounded-full bg-gradient-to-br from-[#ff6f61] via-[#a855f7] to-[#00c2cb]" />
                <span>
                  <span className="block text-sm font-black">Nouveau post</span>
                  <span className="block text-xs text-white/45">un son vient d’être partagé</span>
                </span>
              </div>
              <div className="h-20 rounded-2xl bg-white/12 p-3">
                <div className="mb-3 h-2 w-2/3 rounded-full bg-white/45" />
                <div className="flex items-end gap-1">
                  {[18, 32, 24, 54, 36, 46, 28, 40].map((height, index) => (
                    <motion.span
                      key={index}
                      className="w-2 rounded-full bg-white"
                      animate={{ height: [height, height + 12, height] }}
                      transition={{ duration: 1.4, repeat: Infinity, delay: index * 0.08 }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {cards.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.08 }}
              className="rounded-2xl border border-[#dccfbb] bg-white/72 p-3"
            >
              <item.icon className="mb-2 h-4 w-4 text-[#ff6f61]" />
              <p className="text-xs font-black text-[#171313]">{item.title}</p>
              <p className="mt-1 text-[11px] font-semibold leading-snug text-black/42">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.aside>
  );
}

function SignInContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(() => safeCallbackUrl(searchParams.get('callbackUrl')), [searchParams]);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const message = searchParams.get('message');
    if (message) setSuccessMessage(message);
  }, [searchParams]);

  useEffect(() => {
    if (status === 'authenticated' && session) router.push(callbackUrl);
  }, [status, session, router, callbackUrl]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.password.trim()) {
      setError('Remplis ton email et ton mot de passe.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const result = await signIn('credentials', {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        redirect: false,
      });
      if (result?.error) setError('Email ou mot de passe incorrect.');
      else router.push(callbackUrl);
    } catch {
      setError('Connexion impossible pour le moment.');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-black/30 border-t-transparent" />
        <p className="mt-3 text-sm font-semibold text-black/55">{status === 'authenticated' ? 'Redirection...' : 'Chargement...'}</p>
      </div>
    );
  }

  return (
    <main className="grid w-full max-w-6xl gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <ShowcasePanel />

      <motion.section
        initial={{ opacity: 0, y: 16, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-[2.2rem] border border-[#d8cbb8] bg-[#fff7ec] p-5 text-[#171313] shadow-[0_24px_80px_rgba(44,33,19,0.16)] sm:p-7 lg:p-8"
      >
        <div className="pointer-events-none absolute -right-16 -top-14 h-44 w-44 rounded-full bg-[#ff6f61]/14 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-[#00c2cb]/10 blur-3xl" />

        <div className="relative z-10">
          <div className="mb-7 flex items-center justify-between gap-3">
            <SynauraMark />
            <Link href="/" className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] px-3 py-2 text-xs font-black text-black/50 transition hover:bg-black hover:text-white">
              <ArrowLeft className="h-3.5 w-3.5" />
              Accueil
            </Link>
          </div>

          <div className="mb-7">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#ff6f61]">Connexion</p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Ravi de te revoir.</h2>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-black/52">
              Retrouve tes posts, tes sons, tes messages et tes notifications.
            </p>
          </div>

          <AnimatePresence initial={false}>
            {successMessage ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-700"
              >
                <span className="flex items-center gap-2"><Check className="h-4 w-4" /> {successMessage}</span>
              </motion.div>
            ) : null}
            {error ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-bold text-red-700"
              >
                <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</span>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <button
            type="button"
            onClick={() => signIn('google', { callbackUrl })}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-[#dccfbb] bg-white text-sm font-black text-[#171313] shadow-[0_10px_24px_rgba(44,33,19,0.06)] transition hover:-translate-y-0.5"
          >
            <GoogleMark />
            Continuer avec Google
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-black/[0.08]" /></div>
            <div className="relative flex justify-center"><span className="bg-[#fff7ec] px-3 text-[11px] font-black uppercase tracking-[0.18em] text-black/32">ou avec email</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-black/48">Email</span>
              <span className="relative block">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/32" />
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} className={`${INPUT} pl-11`} placeholder="vous@example.com" disabled={isLoading} />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-black/48">Mot de passe</span>
              <span className="relative block">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/32" />
                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleInputChange} className={`${INPUT} pl-11 pr-12`} placeholder="Votre mot de passe" disabled={isLoading} />
                <button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-black/36 transition hover:text-black/70" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>

            <div className="flex items-center justify-between gap-3">
              <Link href="/auth/forgot-password" className="text-xs font-black text-black/42 transition hover:text-[#ff6f61]">
                Mot de passe oublié ?
              </Link>
              <Link href={`/auth/signup${callbackUrl !== '/' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`} className="text-xs font-black text-[#7c5cff] transition hover:text-[#5f46df]">
                Créer un compte
              </Link>
            </div>

            <motion.button
              whileTap={{ scale: 0.985 }}
              type="submit"
              disabled={isLoading}
              className="h-12 w-full rounded-2xl bg-[#171313] text-sm font-black text-white shadow-[0_16px_34px_rgba(23,19,19,0.20)] transition hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-[11px] font-semibold leading-relaxed text-black/38">
            En te connectant, tu acceptes les{' '}
            <Link href="/legal/cgv" className="font-black hover:text-[#ff6f61]">CGV</Link>
            {' '}et la{' '}
            <Link href="/legal/confidentialite" className="font-black hover:text-[#ff6f61]">politique de confidentialité</Link>.
          </p>
        </div>
      </motion.section>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-black/30 border-t-transparent" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
