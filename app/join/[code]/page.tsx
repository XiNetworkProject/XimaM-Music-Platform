'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Gift, Headphones, Loader2, MessageCircle, Music2, Share2, Sparkles, UserPlus, Users } from 'lucide-react';
import { SynauraAppShell, SynauraPanel } from '@/components/synaura/SynauraShell';

export default function JoinReferralPage() {
  const { code } = useParams<{ code: string }>();
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    if (!code) return;

    (async () => {
      try {
        const res = await fetch(`/api/referral/validate?code=${encodeURIComponent(code)}`);
        if (res.ok) {
          const data = await res.json();
          setReferrerName(data.referrerName || null);
          setValid(true);
        }
      } catch {
        // Le code reste utilisable visuellement, mais sans parrain validé.
      } finally {
        setLoading(false);
      }
    })();

    if (typeof window !== 'undefined') {
      localStorage.setItem('synaura_referral_code', code);
    }
  }, [code]);

  const signupHref = code ? `/auth/signup?callbackUrl=${encodeURIComponent('/')}` : '/auth/signup';
  const signinHref = code ? `/auth/signin?callbackUrl=${encodeURIComponent('/')}` : '/auth/signin';

  if (loading) {
    return (
      <SynauraAppShell contentClassName="flex min-h-screen items-center justify-center">
        <div className="rounded-[2rem] border border-[#dccfbb] bg-[#fff7ec] p-8 text-center shadow-[0_24px_80px_rgba(44,33,19,0.16)]">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#171313]" />
          <p className="mt-3 text-sm font-black text-black/48">Vérification de l'invitation...</p>
        </div>
      </SynauraAppShell>
    );
  }

  return (
    <SynauraAppShell contentClassName="max-w-7xl">
      <main className="grid min-h-[calc(100vh-2rem)] items-center gap-4 py-3 lg:grid-cols-[1.08fr_0.92fr] lg:py-8">
        <motion.section
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="relative min-h-[620px] overflow-hidden rounded-[2.4rem] border border-[#d8cbb8] bg-[#fffaf2] p-6 shadow-[0_24px_80px_rgba(44,33,19,0.16)] sm:p-8"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(255,111,97,0.24),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(124,92,255,0.18),transparent_34%),radial-gradient(circle_at_52%_96%,rgba(0,194,203,0.14),transparent_34%)]" />
          <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(99,80,59,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(99,80,59,0.16)_1px,transparent_1px)] [background-size:32px_32px]" />

          <motion.div
            className="absolute right-8 top-20 h-56 w-56 rounded-full bg-[#ff6f61]/18 blur-3xl"
            animate={{ y: [0, 22, 0], x: [0, -12, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-8 left-14 h-64 w-64 rounded-full bg-[#00c2cb]/14 blur-3xl"
            animate={{ y: [0, -18, 0], x: [0, 16, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative z-10 flex min-h-[560px] flex-col">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" className="inline-flex items-center gap-3">
                <span className="grid h-14 w-14 place-items-center rounded-[1.25rem] border border-black/[0.08] bg-white shadow-[0_10px_26px_rgba(30,25,20,0.10)]">
                  <Image src="/brand/2026/synaura-symbol-2026.png" alt="Synaura" width={52} height={52} className="h-12 w-12 object-contain" unoptimized priority />
                </span>
                <span>
                  <span className="block text-xl font-black tracking-tight text-[#171313]">Synaura</span>
                  <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-black/40">invitation</span>
                </span>
              </Link>
              <Link href="/" className="hidden rounded-full bg-black/[0.05] px-4 py-2 text-xs font-black text-black/50 transition hover:bg-black hover:text-white sm:inline-flex">
                Accueil
              </Link>
            </div>

            <div className="mt-12 max-w-2xl">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e0d2bf] bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#ff6f61]">
                <Gift className="h-3.5 w-3.5" />
                {valid ? 'Invitation validée' : 'Invitation Synaura'}
              </p>
              <h1 className="text-5xl font-black leading-[0.92] tracking-tight text-[#171313] sm:text-6xl">
                {valid ? 'Quelqu’un t’attend déjà sur Synaura.' : 'Rejoins Synaura avec ce lien.'}
              </h1>
              <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-black/56">
                {valid && referrerName ? (
                  <>
                    <span className="font-black text-[#171313]">{referrerName}</span> t’invite à créer ton compte pour publier,
                    suivre des artistes, commenter et partager des sons.
                  </>
                ) : (
                  <>
                    Crée ton compte pour entrer dans le feed, publier tes créations et retrouver tes interactions au même endroit.
                  </>
                )}
              </p>
            </div>

            <div className="relative mt-auto h-[260px]">
              <div className="absolute inset-x-8 bottom-2 h-24 rounded-[50%] bg-black/10 blur-2xl" />
              <motion.div
                className="absolute bottom-6 left-0 w-[260px] rounded-[2rem] border border-[#dccfbb] bg-white p-4 shadow-[0_24px_70px_rgba(44,33,19,0.18)]"
                animate={{ y: [0, -12, 0], rotate: [-1.2, 0.6, -1.2] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#171313] text-white">
                    <Music2 className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-black">Publier</span>
                    <span className="block text-xs font-bold text-black/38">son, post, image</span>
                  </span>
                </div>
                <div className="flex items-end gap-1.5 rounded-2xl bg-[#f4eadc] p-3">
                  {[18, 32, 24, 54, 36, 46, 28, 40].map((height, index) => (
                    <motion.span
                      key={index}
                      className="w-2 rounded-full bg-gradient-to-t from-[#00c2cb] via-[#7c5cff] to-[#ff6f61]"
                      animate={{ height: [height, height + 12, height] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.07 }}
                    />
                  ))}
                </div>
              </motion.div>

              <motion.div
                className="absolute bottom-12 left-[230px] hidden w-[245px] rounded-[2rem] border border-white/12 bg-[#171313] p-4 text-white shadow-[0_30px_80px_rgba(23,19,19,0.26)] sm:block"
                animate={{ y: [0, 10, 0], rotate: [1.2, -0.6, 1.2] }}
                transition={{ duration: 6.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_22%_12%,rgba(255,111,97,0.32),transparent_36%),radial-gradient(circle_at_80%_88%,rgba(0,194,203,0.20),transparent_34%)]" />
                <div className="relative">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-white/42">Communauté</p>
                  <div className="mt-4 space-y-2">
                    {['Un nouveau commentaire', 'Un son reposté', 'Un profil à suivre'].map((text) => (
                      <div key={text} className="flex items-center gap-2 rounded-2xl bg-white/10 p-2">
                        <MessageCircle className="h-4 w-4 text-white/60" />
                        <p className="text-xs font-bold text-white/62">{text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        <motion.aside
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: 0.05 }}
        >
          <SynauraPanel className="border-[#d8cbb8] bg-[#fff7ec] p-5 shadow-[0_24px_80px_rgba(44,33,19,0.14)] sm:p-7">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-[1.5rem] bg-[#171313] text-white shadow-[0_16px_34px_rgba(23,19,19,0.20)]">
              <Gift className="h-8 w-8" />
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff6f61]">Bonus parrainage</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-[#171313]">+50 crédits offerts</h2>
              <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-6 text-black/56">
                Crée ton compte avec ce lien et reçois 50 crédits bonus pour démarrer sur Synaura.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              {[
                { icon: Headphones, label: 'Écouter' },
                { icon: Share2, label: 'Partager' },
                { icon: Users, label: 'Suivre' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-[#dccfbb] bg-white/70 p-3 text-center">
                  <item.icon className="mx-auto mb-2 h-5 w-5 text-[#7c5cff]" />
                  <span className="text-xs font-black text-black/56">{item.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[1.35rem] border border-[#dccfbb] bg-white/72 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-[#ff6f61]/12 text-[#ff6f61]">
                  <Check className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-black text-[#171313]">Code enregistré</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-black/48">
                    Le code est gardé pour l'inscription. Tu peux créer ton compte maintenant.
                  </p>
                  {code ? (
                    <p className="mt-2 rounded-full bg-[#efe4d4] px-3 py-1 font-mono text-[11px] font-black text-black/46">
                      {String(code)}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Link
                href={signupHref}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#171313] px-5 text-sm font-black text-white shadow-[0_16px_34px_rgba(23,19,19,0.20)] transition hover:-translate-y-0.5 hover:bg-black"
              >
                <UserPlus className="h-4 w-4" />
                Créer mon compte
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={signinHref}
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-white px-5 text-sm font-black text-black/60 transition hover:bg-black hover:text-white"
              >
                Déjà un compte ? Connexion
              </Link>
            </div>

            {!valid ? (
              <p className="mt-5 text-center text-xs font-semibold leading-5 text-black/38">
                Si le code n'est plus valide, tu peux quand même créer un compte Synaura normalement.
              </p>
            ) : null}
          </SynauraPanel>
        </motion.aside>
      </main>
    </SynauraAppShell>
  );
}
