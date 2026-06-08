import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowLeft,
  BellRing,
  Check,
  Download,
  Headphones,
  Library,
  MessageCircle,
  Music2,
  Radio,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Upload,
  Users,
} from 'lucide-react';
import AndroidDownloadCard from '@/components/mobile/AndroidDownloadCard';
import { SynauraAppShell, SynauraTopBar } from '@/components/synaura/SynauraShell';

export const metadata: Metadata = {
  title: 'Synaura Android - Télécharger l’application officielle',
  description: 'Découvre et télécharge Synaura Android : audio en arrière-plan, player système, Swipe, communauté, upload et mises à jour directes.',
};

const screenshots = [
  { src: '/mobile/android/home.webp', label: 'Accueil', text: 'Ton mix, tes tendances et la communauté.' },
  { src: '/mobile/android/player.webp', label: 'Player', text: 'File, paroles et commandes complètes.' },
  { src: '/mobile/android/swipe.webp', label: 'Swipe', text: 'Un flux musical plein écran.' },
  { src: '/mobile/android/discover.webp', label: 'Découvrir', text: 'Explore les titres, artistes et genres.' },
  { src: '/mobile/android/library.webp', label: 'Bibliothèque', text: 'Favoris et historique toujours à portée.' },
  { src: '/mobile/android/community.webp', label: 'Communauté', text: 'Publie, commente et partage tes sons.' },
  { src: '/mobile/android/upload.webp', label: 'Upload', text: 'Prépare et publie une sortie sur mobile.' },
  { src: '/mobile/android/profile.webp', label: 'Profil', text: 'Retrouve tes statistiques et créations.' },
  { src: '/mobile/android/notifications.webp', label: 'Notifications', text: 'Toute ton activité dans une modale rapide.' },
  { src: '/mobile/android/queue.webp', label: 'File d’attente', text: 'Réorganise la lecture sans interrompre le son.' },
  { src: '/mobile/android/lyrics.webp', label: 'Paroles', text: 'Lis les paroles pendant l’écoute.' },
  { src: '/mobile/android/comments.webp', label: 'Commentaires', text: 'Échange sans quitter ce que tu regardes.' },
] as const;

const featureCards = [
  { icon: Headphones, title: 'Audio qui reste vivant', text: 'La lecture continue écran verrouillé, avec les commandes Android et une vraie file d’attente.' },
  { icon: Radio, title: 'Swipe connecté au player', text: 'Chaque geste fait avancer le flux et le player ensemble, sans relancer ni casser l’écoute.' },
  { icon: Upload, title: 'Publier depuis le téléphone', text: 'Importe ton audio, complète les métadonnées et prépare ta sortie sans revenir sur ordinateur.' },
  { icon: Users, title: 'Toute la communauté', text: 'Profils, follows, commentaires, posts, notifications et partages sont directement intégrés.' },
  { icon: RefreshCw, title: 'Mises à jour directes', text: 'Synaura vérifie les nouvelles versions et ouvre l’installation Android depuis l’application.' },
  { icon: ShieldCheck, title: 'APK officiel signé', text: 'Chaque version publique utilise la même signature Synaura pour garantir les futures mises à jour.' },
] as const;

function PhoneShot({
  src,
  alt,
  className = '',
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-[2rem] border-[5px] border-[#171313] bg-[#171313] shadow-[0_24px_70px_rgba(23,19,19,0.24)] ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={720}
        height={1760}
        className="h-auto w-full"
        sizes="(max-width: 640px) 55vw, 280px"
        priority={priority}
      />
    </div>
  );
}

export default function DownloadPage() {
  return (
    <SynauraAppShell contentClassName="max-w-none px-0 py-0 pb-[var(--synaura-mobile-player-space)] sm:px-0 sm:py-0">
      <div className="mx-auto max-w-[1480px] px-2 pt-2.5 sm:px-5 sm:pt-3 lg:px-8 lg:pt-5">
        <SynauraTopBar compact />
      </div>

      <main className="pb-10">
        <section className="relative min-h-[690px] overflow-hidden bg-[#171313] text-[#fffaf2] sm:min-h-[760px]">
          <div className="absolute inset-0 flex items-start justify-center gap-3 overflow-hidden px-3 pt-10 opacity-50 sm:gap-6 sm:pt-14">
            <PhoneShot src="/mobile/android/home.webp" alt="" className="mt-20 w-[185px] -rotate-6 sm:w-[250px]" priority />
            <PhoneShot src="/mobile/android/swipe.webp" alt="" className="w-[205px] rotate-3 sm:w-[285px]" priority />
            <PhoneShot src="/mobile/android/player.webp" alt="" className="mt-28 hidden w-[250px] -rotate-2 sm:block" priority />
            <PhoneShot src="/mobile/android/community.webp" alt="" className="mt-10 hidden w-[230px] rotate-6 lg:block" priority />
          </div>
          <div className="absolute inset-0 bg-black/64" />

          <div className="relative mx-auto flex min-h-[690px] max-w-[1480px] flex-col justify-between px-5 py-6 sm:min-h-[760px] sm:px-8 sm:py-10 lg:px-14">
            <Link href="/" className="inline-flex h-10 w-fit items-center gap-2 rounded-full bg-white/10 px-4 text-xs font-black text-white/72 backdrop-blur-xl transition hover:bg-white hover:text-[#171313]">
              <ArrowLeft className="h-4 w-4" /> Retour à Synaura
            </Link>

            <div className="max-w-3xl py-12 sm:py-20">
              <div className="flex items-center gap-3">
                <Image src="/brand/2026/synaura-symbol-2026-white.png" alt="" width={72} height={72} className="h-14 w-14 object-contain sm:h-16 sm:w-16" priority unoptimized />
                <Image src="/mobile/android/android-logo.png" alt="Android" width={196} height={30} className="h-5 w-auto brightness-0 invert sm:h-6" />
              </div>
              <p className="mt-8 text-[11px] font-black uppercase tracking-[0.2em] text-[#ff8d82]">L’application officielle est disponible</p>
              <h1 className="mt-3 max-w-3xl text-5xl font-black leading-[0.94] text-[#fffaf2] sm:text-7xl lg:text-8xl">Synaura Android</h1>
              <p className="mt-5 max-w-2xl text-sm font-bold leading-6 text-white/68 sm:text-lg sm:leading-8">
                Écoute, découvre, publie et reste connecté à la communauté dans une application fidèle à Synaura, pensée pour continuer quand le navigateur s’arrête.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                <a href="#download" className="inline-flex h-12 items-center gap-2 rounded-full bg-[#fffaf2] px-5 text-sm font-black text-[#171313] transition hover:scale-[1.02]">
                  <Download className="h-4 w-4" /> Télécharger l’APK
                </a>
                <a href="#screens" className="inline-flex h-12 items-center gap-2 rounded-full bg-white/10 px-5 text-sm font-black text-white backdrop-blur-xl transition hover:bg-white/16">
                  Voir l’application <ArrowDown className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="grid gap-2 border-t border-white/12 pt-5 sm:grid-cols-3">
              {[
                ['Android 7+', 'Compatible avec la majorité des téléphones'],
                ['Audio système', 'Lecture en arrière-plan et écran verrouillé'],
                ['Version 0.2.0', 'Mises à jour directes depuis Synaura'],
              ].map(([title, text]) => (
                <div key={title} className="min-w-0">
                  <p className="text-sm font-black text-white">{title}</p>
                  <p className="mt-1 text-[11px] font-bold leading-5 text-white/44">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1480px] px-5 py-16 sm:px-8 sm:py-20 lg:px-14" id="screens">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#7c5cff]">L’expérience Synaura, dans ta poche</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#171313] sm:text-5xl">Une vraie application. Pas juste le site emballé.</h2>
            <p className="mt-4 text-sm font-bold leading-6 text-black/52 sm:text-base">
              Les écrans, interactions et services ont été adaptés au téléphone : navigation persistante, modales tactiles, player natif et parcours plus rapides.
            </p>
          </div>

          <div className="synaura-no-scrollbar -mx-5 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-8 sm:-mx-8 sm:gap-6 sm:px-8 lg:-mx-14 lg:px-14">
            {screenshots.map((shot, index) => (
              <figure key={shot.src} className="w-[58vw] max-w-[280px] shrink-0 snap-center sm:w-[260px]">
                <PhoneShot src={shot.src} alt={`Synaura Android - ${shot.label}`} className="w-full" priority={index < 3} />
                <figcaption className="mt-4 px-1">
                  <p className="text-sm font-black text-[#171313]">{shot.label}</p>
                  <p className="mt-1 text-[11px] font-bold leading-5 text-black/44">{shot.text}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="border-y border-black/[0.08] bg-[#fffaf2]/72">
          <div className="mx-auto grid max-w-[1480px] gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(460px,0.9fr)] lg:items-center lg:px-14">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#ff6f61]">Le son d’abord</p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-[#171313] sm:text-5xl">Le player ne s’arrête plus avec ton écran.</h2>
              <p className="mt-4 max-w-xl text-sm font-bold leading-6 text-black/52 sm:text-base">
                Synaura Android utilise un vrai service audio mobile. Verrouille ton téléphone, change d’application ou ouvre une autre page : la lecture et la file continuent.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {[
                  'Commandes depuis les notifications Android',
                  'Player complet avec paroles et partage',
                  'File d’attente réorganisable',
                  'Swipe synchronisé avec la lecture',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5 border-t border-black/[0.08] pt-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#7c5cff]" />
                    <p className="text-xs font-black leading-5 text-black/62">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-end justify-center gap-3 sm:gap-5">
              <PhoneShot src="/mobile/android/player.webp" alt="Player complet Synaura Android" className="w-[44%] max-w-[265px] -rotate-3" />
              <PhoneShot src="/mobile/android/swipe.webp" alt="Swipe Synaura Android" className="w-[44%] max-w-[265px] rotate-3" />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1480px] px-5 py-16 sm:px-8 sm:py-20 lg:px-14">
          <div className="text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#7c5cff]">Tout Synaura</p>
            <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-black leading-tight text-[#171313] sm:text-5xl">Écouter, créer et participer sans compromis.</h2>
          </div>
          <div className="mt-10 grid gap-px overflow-hidden border-y border-black/[0.08] bg-black/[0.08] sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map(({ icon: Icon, title, text }) => (
              <article key={title} className="bg-[#f4efe6] px-5 py-7 sm:px-7 sm:py-8">
                <div className="grid h-11 w-11 place-items-center rounded-[1rem] bg-[#171313] text-[#fffaf2]"><Icon className="h-5 w-5" /></div>
                <h3 className="mt-5 text-lg font-black text-[#171313]">{title}</h3>
                <p className="mt-2 text-xs font-bold leading-5 text-black/48">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-black/[0.08] bg-[#dff7f1]">
          <div className="mx-auto grid max-w-[1480px] gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.9fr_minmax(0,1fr)] lg:items-center lg:px-14">
            <div className="flex items-end justify-center gap-3 sm:gap-5">
              <PhoneShot src="/mobile/android/community.webp" alt="Communauté Synaura Android" className="w-[44%] max-w-[255px] -rotate-3" />
              <PhoneShot src="/mobile/android/upload.webp" alt="Upload Synaura Android" className="w-[44%] max-w-[255px] rotate-3" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#087f72]">Plus qu’un lecteur</p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-[#171313] sm:text-5xl">La communauté et le studio voyagent avec toi.</h2>
              <p className="mt-4 max-w-xl text-sm font-bold leading-6 text-black/52 sm:text-base">
                Partage un son, publie un post, réponds aux commentaires, suis un artiste et prépare une sortie depuis la même application.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                {[
                  [MessageCircle, 'Commentaires'],
                  [Users, 'Profils & follows'],
                  [Upload, 'Publication'],
                  [Library, 'Bibliothèque'],
                  [BellRing, 'Notifications'],
                  [Sparkles, 'Studio IA'],
                ].map(([Icon, label]) => {
                  const FeatureIcon = Icon as typeof Smartphone;
                  return <span key={label as string} className="inline-flex h-10 items-center gap-2 rounded-full bg-white/68 px-3 text-[11px] font-black text-black/60"><FeatureIcon className="h-3.5 w-3.5" />{label as string}</span>;
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="download" className="bg-[#171313] text-[#fffaf2]">
          <div className="mx-auto grid max-w-[1480px] gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-center lg:px-14">
            <div>
              <Image src="/mobile/android/android-logo.png" alt="Android" width={220} height={34} className="h-7 w-auto brightness-0 invert" />
              <h2 className="mt-6 max-w-3xl text-4xl font-black leading-tight text-[#fffaf2] sm:text-6xl">Installe Synaura Android.</h2>
              <p className="mt-4 max-w-2xl text-sm font-bold leading-6 text-white/54 sm:text-base">
                L’application est distribuée directement par Synaura. Android te demandera simplement de confirmer la première installation.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  ['01', 'Télécharge', 'Récupère l’APK officiel.'],
                  ['02', 'Autorise', 'Confirme cette source dans Android.'],
                  ['03', 'Installe', 'Les futures versions seront proposées dans l’app.'],
                ].map(([number, title, text]) => (
                  <div key={number} className="border-t border-white/14 pt-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ff8d82]">{number}</p>
                    <p className="mt-2 text-sm font-black text-white">{title}</p>
                    <p className="mt-1 text-[11px] font-bold leading-5 text-white/42">{text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[1.5rem] bg-[#fffaf2] p-5 text-[#171313] shadow-[0_24px_80px_rgba(0,0,0,0.26)]">
              <AndroidDownloadCard />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-20">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#7c5cff]">Questions fréquentes</p>
          <h2 className="mt-3 text-3xl font-black text-[#171313] sm:text-4xl">Avant de l’installer</h2>
          <div className="mt-8 divide-y divide-black/[0.08] border-y border-black/[0.08]">
            {[
              ['Pourquoi l’application n’est-elle pas sur Google Play ?', 'Synaura distribue actuellement son APK directement. Cela permet de publier les améliorations plus rapidement sans perdre la signature Android officielle.'],
              ['Est-ce que les mises à jour sont automatiques ?', 'L’application vérifie les nouvelles versions, télécharge l’APK et ouvre l’installation. Android te demande toujours de confirmer la mise à jour.'],
              ['L’audio continue-t-il vraiment écran verrouillé ?', 'Oui. L’application utilise un service audio Android avec notification média et commandes système.'],
              ['Dois-je créer un nouveau compte ?', 'Non. Tu utilises le même compte Synaura que sur la version web.'],
            ].map(([question, answer]) => (
              <details key={question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black text-[#171313]">
                  {question}
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black/[0.055] text-lg font-black transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 max-w-3xl text-xs font-bold leading-6 text-black/50">{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </SynauraAppShell>
  );
}
