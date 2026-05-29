'use client';

import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  AtSign,
  Check,
  Eye,
  EyeOff,
  Headphones,
  Lock,
  Mail,
  MessageCircle,
  Mic2,
  Music2,
  Radio,
  Search,
  Share2,
  Sparkles,
  User,
  Users,
} from 'lucide-react';

type FormData = {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type UserCount = {
  userCount: number;
  maxUsers: number;
  canRegister: boolean;
  remainingSlots: number;
};

const steps = [
  {
    key: 'discover',
    eyebrow: 'Découvrir',
    title: 'Découvre un flux vivant',
    text: 'Suis des créateurs, cherche des sons, réagis aux posts.',
    formTitle: 'Ton identité',
    formText: 'Pose ton nom public et ton @.',
    icon: Search,
  },
  {
    key: 'publish',
    eyebrow: 'Publier',
    title: 'Publie et partage',
    text: 'Ajoute un son à un post, partage un profil, repost avec ou sans musique.',
    formTitle: 'Ton accès',
    formText: 'Ajoute l’email du compte.',
    icon: Share2,
  },
  {
    key: 'connect',
    eyebrow: 'Connecter',
    title: 'Reste connecté',
    text: 'Notifications, commentaires, likes et messages au même endroit.',
    formTitle: 'Sécurité',
    formText: 'Crée le mot de passe et termine.',
    icon: MessageCircle,
  },
] as const;

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

function SynauraMark({ caption = 'inscription' }: { caption?: string }) {
  return (
    <Link href="/" className="inline-flex items-center gap-3">
      <span className="grid h-14 w-14 place-items-center rounded-[1.25rem] border border-black/[0.08] bg-white shadow-[0_10px_26px_rgba(30,25,20,0.10)]">
        <Image src="/brand/2026/synaura-symbol-2026.png" alt="Synaura" width={52} height={52} className="h-12 w-12 object-contain" unoptimized priority />
      </span>
      <span>
        <span className="block text-xl font-black tracking-tight">Synaura</span>
        <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-black/40">{caption}</span>
      </span>
    </Link>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-black/48">{label}</span>
      {children}
    </label>
  );
}

function CinematicScene({
  step,
  formData,
}: {
  step: number;
  formData: FormData;
}) {
  const current = steps[step];
  const Icon = current.icon;

  return (
    <section className="relative hidden min-h-[720px] overflow-hidden rounded-[2.4rem] border border-[#d8cbb8] bg-[#fffaf2] p-7 shadow-[0_24px_80px_rgba(44,33,19,0.16)] lg:block">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(255,111,97,0.24),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(124,92,255,0.18),transparent_34%),radial-gradient(circle_at_52%_96%,rgba(0,194,203,0.14),transparent_34%)]" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(99,80,59,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(99,80,59,0.16)_1px,transparent_1px)] [background-size:32px_32px]" />

      <motion.div
        className="absolute right-8 top-28 h-52 w-52 rounded-full bg-[#ff6f61]/18 blur-3xl"
        animate={{ y: [0, 22, 0], x: [0, -14, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-6 left-16 h-64 w-64 rounded-full bg-[#00c2cb]/14 blur-3xl"
        animate={{ y: [0, -18, 0], x: [0, 16, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-center justify-between">
          <SynauraMark caption="nouveau compte" />
          <Link href="/" className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] px-3 py-2 text-xs font-black text-black/50 transition hover:bg-black hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" />
            Accueil
          </Link>
        </div>

        <div className="mt-10 max-w-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.key}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.28 }}
            >
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#e0d2bf] bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-black/44">
                <Icon className="h-3.5 w-3.5 text-[#ff6f61]" />
                {current.eyebrow}
              </p>
              <h1 className="text-6xl font-black leading-[0.92] tracking-tight text-[#171313]">{current.title}</h1>
              <p className="mt-4 max-w-md text-base font-semibold leading-relaxed text-black/54">{current.text}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="relative mt-auto h-[360px]">
          <div className="absolute inset-x-8 bottom-0 h-28 rounded-[50%] bg-black/10 blur-2xl" />

          <motion.div
            className="absolute bottom-8 left-4 w-[270px] rounded-[2rem] border border-[#dccfbb] bg-white p-4 shadow-[0_24px_70px_rgba(44,33,19,0.18)]"
            animate={{ y: [0, -14, 0], rotate: [-1.5, 0.8, -1.5] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#171313] text-white">
                <Radio className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-black">Feed social</span>
                <span className="block text-xs font-bold text-black/38">posts, sons, reposts</span>
              </span>
            </div>
            <div className="rounded-2xl bg-[#f4eadc] p-3">
              <div className="mb-3 h-2 w-4/5 rounded-full bg-black/14" />
              <div className="mb-4 h-2 w-2/3 rounded-full bg-black/10" />
              <div className="flex items-end gap-1.5">
                {[18, 32, 24, 54, 36, 46, 28, 40, 22].map((height, index) => (
                  <motion.span
                    key={index}
                    className="w-2 rounded-full bg-gradient-to-t from-[#00c2cb] via-[#7c5cff] to-[#ff6f61]"
                    animate={{ height: [height, height + (index % 3) * 8 + 8, height] }}
                    transition={{ duration: 1.6, repeat: Infinity, delay: index * 0.07 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            className="absolute bottom-16 left-[250px] w-[240px] rounded-[2rem] border border-white/12 bg-[#171313] p-4 text-white shadow-[0_30px_80px_rgba(23,19,19,0.26)]"
            animate={{ y: [0, 12, 0], rotate: [1.5, -0.5, 1.5] }}
            transition={{ duration: 6.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_22%_12%,rgba(255,111,97,0.32),transparent_36%),radial-gradient(circle_at_80%_88%,rgba(0,194,203,0.20),transparent_34%)]" />
            <div className="relative">
              <div className="mb-5 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-white/48">Profil</span>
                <Headphones className="h-4 w-4 text-white/48" />
              </div>
              <div className="mb-4 flex items-center gap-3">
                <span className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#ff6f61] via-[#a855f7] to-[#00c2cb]" />
                <span>
                  <span className="block text-sm font-black">{formData.name || 'Ton nom'}</span>
                  <span className="block text-xs text-white/42">@{formData.username || 'pseudo'}</span>
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['Sons', 'Posts', 'Fans'].map((label, index) => (
                  <div key={label} className="rounded-2xl bg-white/10 p-2 text-center">
                    <p className="text-sm font-black">{index === 0 ? '12' : index === 1 ? '48' : '2K'}</p>
                    <p className="text-[10px] text-white/38">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            className="absolute bottom-0 right-4 w-[265px] rounded-[2rem] border border-[#dccfbb] bg-white p-4 shadow-[0_24px_70px_rgba(44,33,19,0.18)]"
            animate={{ y: [0, -10, 0], rotate: [1, -1, 1] }}
            transition={{ duration: 5.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-black/36">Notifications</span>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#ff6f61]/12 text-[#ff6f61]">
                <Sparkles className="h-4 w-4" />
              </span>
            </div>
            {[
              { icon: MessageCircle, text: 'Nouveau commentaire sur ton post' },
              { icon: Share2, text: 'Ton son vient d’être repartagé' },
              { icon: Mic2, text: 'Un artiste publie un titre' },
            ].map((item, index) => (
              <motion.div
                key={item.text}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.12 }}
                className="mb-2 flex items-center gap-2 rounded-2xl bg-[#f4eadc] p-2 last:mb-0"
              >
                <item.icon className="h-4 w-4 text-[#7c5cff]" />
                <p className="text-[11px] font-bold text-black/54">{item.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {steps.map((item, index) => (
            <button
              key={item.key}
              type="button"
              className={`h-2 rounded-full transition ${index <= step ? 'bg-[#171313]' : 'bg-black/10'}`}
              aria-label={item.title}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function SignUpContent() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = useMemo(() => safeCallbackUrl(params.get('callbackUrl')), [params]);

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [userCount, setUserCount] = useState<UserCount | null>(null);

  useEffect(() => {
    fetch('/api/auth/count-users').then(r => r.json()).then(setUserCount).catch(() => {});
  }, []);

  const passwordScore = useMemo(() => {
    const password = formData.password;
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return Math.min(score, 5);
  }, [formData.password]);

  const progress = ((step + 1) / steps.length) * 100;
  const current = steps[step];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'username' ? value.replace(/\s/g, '').toLowerCase() : value }));
    if (error) setError('');
  };

  const validateStep = (targetStep = step) => {
    if (targetStep === 0) {
      if (!formData.name.trim()) return 'Ajoute ton nom affiché.';
      if (!formData.username.trim() || formData.username.length < 3) return "Ton nom d'utilisateur doit contenir au moins 3 caractères.";
    }
    if (targetStep === 1) {
      if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) return 'Ajoute un email valide.';
    }
    if (targetStep === 2) {
      if (formData.password.length < 6) return 'Le mot de passe doit contenir au moins 6 caractères.';
      if (formData.password !== formData.confirmPassword) return 'Les deux mots de passe ne correspondent pas.';
    }
    return '';
  };

  const goNext = () => {
    const message = validateStep(step);
    if (message) {
      setError(message);
      return;
    }
    setDirection(1);
    setError('');
    setStep(value => Math.min(value + 1, steps.length - 1));
  };

  const goBack = () => {
    setDirection(-1);
    setError('');
    setStep(value => Math.max(value - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < steps.length - 1) {
      goNext();
      return;
    }
    if (userCount && !userCount.canRegister) {
      setError('Les inscriptions sont fermées pour le moment.');
      return;
    }
    const message = validateStep(2);
    if (message) {
      setError(message);
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const referralCode = typeof window !== 'undefined' ? localStorage.getItem('synaura_referral_code') || undefined : undefined;
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          username: formData.username.trim().toLowerCase(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          referralCode,
        }),
      });
      if (response.ok && referralCode) localStorage.removeItem('synaura_referral_code');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erreur lors de l'inscription");

      const next = new URLSearchParams({ message: 'Compte créé. Connecte-toi pour continuer.' });
      if (callbackUrl !== '/') next.set('callbackUrl', callbackUrl);
      router.push(`/auth/signin?${next.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="grid w-full max-w-7xl gap-4 lg:grid-cols-[1.25fr_0.75fr]">
      <CinematicScene step={step} formData={formData} />

      <motion.section
        initial={{ opacity: 0, y: 16, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-[2.2rem] border border-[#d8cbb8] bg-[#fff7ec] p-5 text-[#171313] shadow-[0_24px_80px_rgba(44,33,19,0.16)] sm:p-7 lg:min-h-[720px] lg:p-8"
      >
        <div className="pointer-events-none absolute -right-16 -top-14 h-44 w-44 rounded-full bg-[#ff6f61]/14 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-[#00c2cb]/10 blur-3xl" />

        <div className="relative z-10 flex min-h-full flex-col">
          <div className="mb-6 flex items-center justify-between gap-3 lg:hidden">
            <SynauraMark caption="inscription" />
            <Link href="/" className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] px-3 py-2 text-xs font-black text-black/50 transition hover:bg-black hover:text-white">
              <ArrowLeft className="h-3.5 w-3.5" />
              Accueil
            </Link>
          </div>

          <div className="mb-6">
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-black/10">
              <motion.div className="h-full rounded-full bg-[#171313]" animate={{ width: `${progress}%` }} transition={{ duration: 0.35 }} />
            </div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#ff6f61]">{current.eyebrow}</p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{current.formTitle}</h2>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-black/52">{current.formText}</p>
          </div>

          <AnimatePresence initial={false}>
            {userCount && !userCount.canRegister ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-bold text-red-700"
              >
                <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Inscriptions fermées ({userCount.maxUsers} comptes max atteints)</span>
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

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
            <div className="min-h-[280px]">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 28 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -28 }}
                  transition={{ duration: 0.24, ease: 'easeOut' }}
                  className="space-y-4"
                >
                  {step === 0 ? (
                    <>
                      <Field label="Nom affiché">
                        <span className="relative block">
                          <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/32" />
                          <input name="name" value={formData.name} onChange={handleInputChange} className={`${INPUT} pl-11`} placeholder="Maxime" disabled={isLoading} />
                        </span>
                      </Field>
                      <Field label="Nom d'utilisateur">
                        <span className="relative block">
                          <AtSign className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/32" />
                          <input name="username" value={formData.username} onChange={handleInputChange} className={`${INPUT} pl-11`} placeholder="maxmusic" disabled={isLoading} />
                        </span>
                      </Field>
                      <div className="rounded-2xl border border-[#dccfbb] bg-white/72 p-3 text-xs font-bold leading-relaxed text-black/48">
                        Ce pseudo sera utilisé sur ton profil public. Tu pourras ajouter avatar, bio et liens ensuite.
                      </div>
                    </>
                  ) : null}

                  {step === 1 ? (
                    <>
                      <Field label="Email">
                        <span className="relative block">
                          <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/32" />
                          <input type="email" name="email" value={formData.email} onChange={handleInputChange} className={`${INPUT} pl-11`} placeholder="vous@example.com" disabled={isLoading} />
                        </span>
                      </Field>
                      <button
                        type="button"
                        onClick={() => signIn('google', { callbackUrl })}
                        className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-[#dccfbb] bg-white text-sm font-black text-[#171313] shadow-[0_10px_24px_rgba(44,33,19,0.06)] transition hover:-translate-y-0.5"
                      >
                        <GoogleMark />
                        Continuer avec Google
                      </button>
                      <div className="rounded-2xl border border-[#dccfbb] bg-white/72 p-3">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-black/36">Pourquoi l’email ?</p>
                        <p className="mt-1 text-xs font-bold leading-relaxed text-black/48">Il sert à sécuriser ton accès, récupérer ton compte et recevoir les notifications importantes.</p>
                      </div>
                    </>
                  ) : null}

                  {step === 2 ? (
                    <>
                      <Field label="Mot de passe">
                        <span className="relative block">
                          <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/32" />
                          <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleInputChange} className={`${INPUT} pl-11 pr-12`} placeholder="6 caractères minimum" disabled={isLoading} />
                          <button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-black/36 transition hover:text-black/70" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </span>
                      </Field>
                      <div className="flex gap-1.5">
                        {[0, 1, 2, 3, 4].map(index => (
                          <span key={index} className={`h-2 flex-1 rounded-full ${index < passwordScore ? 'bg-[#171313]' : 'bg-black/10'}`} />
                        ))}
                      </div>
                      <Field label="Confirmation">
                        <span className="relative block">
                          <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/32" />
                          <input type={showConfirm ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} className={`${INPUT} pl-11 pr-12`} placeholder="Répète le mot de passe" disabled={isLoading} />
                          <button type="button" onClick={() => setShowConfirm(value => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-black/36 transition hover:text-black/70" aria-label={showConfirm ? 'Masquer la confirmation' : 'Afficher la confirmation'}>
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </span>
                      </Field>
                      <div className="rounded-2xl border border-[#dccfbb] bg-white/72 p-3">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-black/36">Résumé</p>
                        <p className="mt-1 text-sm font-black text-[#171313]">{formData.name || 'Nom'} · @{formData.username || 'pseudo'}</p>
                        <p className="text-xs font-bold text-black/46">{formData.email || 'email'}</p>
                      </div>
                    </>
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-auto space-y-4 pt-5">
              {userCount && userCount.remainingSlots > 0 && userCount.canRegister ? (
                <div className="flex items-center gap-2 rounded-2xl bg-black/[0.04] px-3 py-2 text-xs font-bold text-black/46">
                  <Users className="h-3.5 w-3.5" />
                  {userCount.remainingSlots} places restantes sur {userCount.maxUsers}
                </div>
              ) : null}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={step === 0 || isLoading}
                  className="h-12 rounded-2xl bg-black/[0.05] px-5 text-sm font-black text-black/48 transition hover:bg-black hover:text-white disabled:pointer-events-none disabled:opacity-35"
                >
                  Retour
                </button>
                <motion.button
                  whileTap={{ scale: 0.985 }}
                  type="submit"
                  disabled={isLoading || userCount?.canRegister === false}
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#171313] px-5 text-sm font-black text-white shadow-[0_16px_34px_rgba(23,19,19,0.20)] transition hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {isLoading ? 'Création...' : step === steps.length - 1 ? 'Créer mon compte' : 'Continuer'}
                  {!isLoading ? <ArrowRight className="h-4 w-4" /> : null}
                </motion.button>
              </div>

              <p className="text-center text-[13px] font-semibold text-black/46">
                Déjà un compte ?{' '}
                <Link href={`/auth/signin${callbackUrl !== '/' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`} className="font-black text-[#7c5cff] transition hover:text-[#5f46df]">
                  Se connecter
                </Link>
              </p>
              <p className="text-center text-[11px] font-semibold leading-relaxed text-black/38">
                En créant un compte, tu acceptes les{' '}
                <Link href="/legal/cgv" className="font-black hover:text-[#ff6f61]">CGV</Link>
                {' '}et la{' '}
                <Link href="/legal/confidentialite" className="font-black hover:text-[#ff6f61]">politique de confidentialité</Link>.
              </p>
            </div>
          </form>
        </div>
      </motion.section>
    </main>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-black/30 border-t-transparent" />
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  );
}
