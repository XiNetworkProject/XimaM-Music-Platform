import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Download, Headphones, ShieldCheck } from 'lucide-react';

export default function SynauraAndroidHomeBanner() {
  return (
    <section className="relative mb-4 min-h-[245px] overflow-hidden rounded-[1.55rem] bg-[#171313] text-[#fffaf2] shadow-[0_20px_60px_rgba(23,19,19,0.18)] sm:min-h-[280px] sm:rounded-[2rem]">
      <div className="absolute inset-y-0 right-0 flex w-[46%] items-start justify-end gap-2 overflow-hidden pr-2 pt-5 opacity-[0.48] sm:w-[58%] sm:justify-center sm:gap-4 sm:pr-8 sm:opacity-[0.64]">
        <div className="hidden w-[115px] rotate-[-7deg] overflow-hidden rounded-[1.15rem] border-[3px] border-white/12 bg-black shadow-2xl sm:block sm:w-[165px]">
          <Image src="/mobile/android/home.webp" alt="" width={360} height={880} className="h-auto w-full" />
        </div>
        <div className="mt-7 w-[135px] rotate-[5deg] overflow-hidden rounded-[1.15rem] border-[3px] border-white/12 bg-black shadow-2xl sm:w-[175px]">
          <Image src="/mobile/android/swipe.webp" alt="" width={360} height={880} className="h-auto w-full" />
        </div>
        <div className="mt-2 hidden w-[165px] rotate-[-2deg] overflow-hidden rounded-[1.15rem] border-[3px] border-white/12 bg-black shadow-2xl md:block">
          <Image src="/mobile/android/player.webp" alt="" width={360} height={880} className="h-auto w-full" />
        </div>
      </div>
      <div className="absolute inset-0 bg-black/62 sm:bg-black/52" />

      <div className="relative flex min-h-[245px] max-w-[760px] flex-col justify-center p-5 sm:min-h-[280px] sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ff8d82]">Nouveau · application officielle</p>
        <h2 className="mt-2 max-w-[470px] text-3xl font-black leading-[0.98] text-[#fffaf2] sm:text-4xl">Synaura continue même quand ton écran s’éteint.</h2>
        <p className="mt-3 max-w-[430px] text-[11px] font-bold leading-5 text-white/56 sm:text-xs">
          Player Android, Swipe, upload, communauté et mises à jour directes.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/download" className="inline-flex h-10 items-center gap-2 rounded-full bg-[#fffaf2] px-4 text-xs font-black text-[#171313] transition hover:scale-[1.02]">
            Découvrir l’app <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link href="/download#download" className="inline-flex h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-xs font-black text-white backdrop-blur-xl transition hover:bg-white/16">
            <Download className="h-3.5 w-3.5" /> Installer
          </Link>
        </div>
        <div className="mt-4 hidden gap-3 text-[9px] font-black uppercase tracking-[0.12em] text-white/40 sm:flex">
          <span className="inline-flex items-center gap-1.5"><Headphones className="h-3 w-3" /> Audio système</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> APK signé</span>
        </div>
      </div>
    </section>
  );
}
