'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Bell,
  Camera,
  Check,
  Copy,
  Crown,
  ExternalLink,
  FileText,
  Gift,
  Loader2,
  LogOut,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  User,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import SubscriptionLimits from '@/components/SubscriptionLimits';
import { notify } from '@/components/NotificationCenter';
import { useAudioPlayer } from '@/app/providers';
import { UModal, UModalBody } from '@/components/ui/UnifiedUI';
import { SynauraAppShell, SynauraInkPanel, SynauraPanel, SynauraTopBar } from '@/components/synaura/SynauraShell';
import { registerPushSubscription, unregisterPushSubscription } from '@/lib/pushClient';

type SettingsTab = 'profil' | 'compte' | 'parrainage' | 'preferences' | 'securite' | 'legal';

type ProfileForm = {
  name: string;
  bio: string;
  location: string;
  website: string;
  isArtist: boolean;
  artistName: string;
  genreText: string;
  avatar?: string | null;
  banner?: string | null;
};

type LocalPrefs = {
  autoplay: boolean;
  highQuality: boolean;
  activityVisible: boolean;
};

const PREFS_KEY = 'ui.settings.v1';

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

function safeTrim(s: unknown) {
  return typeof s === 'string' ? s.trim() : '';
}

function parseGenres(text: string) {
  return text
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function SettingsNavItem({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: any;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'w-full text-left rounded-[1rem] border px-3 py-3 transition',
        active
          ? 'border-transparent bg-[#171313] text-white shadow-[0_16px_36px_rgba(30,25,20,0.18)]'
          : 'border-[#d8ccb8] bg-[#f5ecde] text-[#5f5650] hover:border-[#cbbca5] hover:bg-[#efe4d3] hover:text-[#171313]'
      )}
    >
      <span className="flex items-center gap-2">
        <Icon className={cx('h-4 w-4', active ? 'text-white' : 'text-black/36')} />
        <span className="text-[14px] font-black">{label}</span>
      </span>
    </button>
  );
}

function WarmCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <SynauraPanel className={`p-4 sm:p-5 ${className}`}>{children}</SynauraPanel>;
}

function InnerCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[1.35rem] border border-[#dccfbb] bg-[#f4ecdf] p-4 shadow-[0_10px_24px_rgba(44,33,19,0.04)] ${className}`}>{children}</div>;
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-black/34">{eyebrow}</div>
      <div className="mt-2 text-[1.65rem] font-black tracking-[-0.05em] text-[#171313]">{title}</div>
      <div className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-black/46">{description}</div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  tone?: 'default' | 'violet' | 'emerald';
}) {
  const toneClass =
    tone === 'violet'
      ? 'text-[#7c5cff]'
      : tone === 'emerald'
        ? 'text-[#0f8b6d]'
        : 'text-[#171313]';

  return (
    <div className="rounded-[1.1rem] border border-[#dbcdb8] bg-[#fff8ee] p-4 text-center">
      <div className={`text-2xl font-black tracking-[-0.04em] ${toneClass}`}>{value}</div>
      <div className="mt-1 text-[11px] font-black uppercase tracking-[0.12em] text-black/38">{label}</div>
    </div>
  );
}

function ToggleCard({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.1rem] border border-[#dbcdb8] bg-[#fff8ee] p-4">
      <Toggle checked={checked} onChange={onChange} label={label} description={description} />
    </div>
  );
}

function LegalLinkCard({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-[#dbcdb8] bg-[#fff8ee] px-4 py-3 text-sm font-black text-[#171313] transition hover:bg-[#fff3e4]"
    >
      <span>{label}</span>
      <ExternalLink className="h-4 w-4 text-black/32" />
    </Link>
  );
}

function PrimaryButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; className?: string }) {
  return (
    <button
      {...props}
      className={cx(
        'inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#171313] px-5 text-sm font-black text-white transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-45',
        className,
      )}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; className?: string }) {
  return (
    <button
      {...props}
      className={cx(
        'inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#d6c8b3] bg-[#efe4d4] px-4 text-sm font-black text-[#5f5650] transition hover:bg-[#e7dac8] hover:text-[#171313] disabled:cursor-not-allowed disabled:opacity-45',
        className,
      )}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-end justify-between gap-3">
        <span className="text-sm font-black text-[#171313]">{label}</span>
        {hint ? <span className="text-xs font-semibold text-black/38">{hint}</span> : null}
      </div>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-black text-[#171313]">{label}</div>
        {description ? <div className="mt-0.5 text-xs font-semibold text-black/42">{description}</div> : null}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        className={cx(
          'relative inline-flex h-8 w-[4.35rem] shrink-0 items-center rounded-full border px-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#171313]/20',
          checked ? 'border-[#171313] bg-[#171313]' : 'border-[#cfc0aa] bg-[#e6dac8]'
        )}
      >
        <span
          className={cx(
            'absolute left-1 top-1 h-6 w-6 rounded-full transition-transform shadow-[0_6px_14px_rgba(23,19,19,0.18)]',
            checked ? 'translate-x-[2.2rem] bg-[#fff8ee]' : 'translate-x-0 bg-white'
          )}
        />
        <span className={cx('ml-auto pr-2 text-[10px] font-black uppercase tracking-[0.1em]', checked ? 'text-white' : 'text-[#6c6157]')}>
          {checked ? 'On' : 'Off'}
        </span>
      </button>
    </div>
  );
}

export default function SettingsClient() {
  const { user, logout, refreshSession } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { requestNotificationPermission } = useAudioPlayer();

  const initialTab = (searchParams.get('tab') || 'profil') as SettingsTab;
  const [tab, setTab] = useState<SettingsTab>(
    (['profil', 'compte', 'parrainage', 'preferences', 'securite', 'legal'] as SettingsTab[]).includes(initialTab) ? initialTab : 'profil'
  );

  const [referralData, setReferralData] = useState<any>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);

  const username = (user as any)?.username as string | undefined;
  const email = (user as any)?.email as string | undefined;

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [uploading, setUploading] = useState<{ avatar: boolean; banner: boolean }>({ avatar: false, banner: false });
  const [profile, setProfile] = useState<ProfileForm>({
    name: safeTrim((user as any)?.name),
    bio: '',
    location: '',
    website: '',
    isArtist: false,
    artistName: '',
    genreText: '',
    avatar: (user as any)?.image || (user as any)?.avatar || null,
    banner: null,
  });
  const initialProfileRef = useRef<ProfileForm | null>(null);

  const [prefs, setPrefs] = useState<LocalPrefs>({
    autoplay: false,
    highQuality: true,
    activityVisible: true,
  });

  const [notifPerm, setNotifPerm] = useState<'default' | 'denied' | 'granted'>('default');

  // Notification preferences (serveur)
  type NotifPrefs = {
    push_enabled: boolean;
    email_enabled: boolean;
    in_app_enabled: boolean;
    new_follower: boolean;
    new_like: boolean;
    like_milestone: boolean;
    new_comment: boolean;
    new_message: boolean;
    new_track_followed: boolean;
    view_milestone: boolean;
    boost_reminder: boolean;
    admin_broadcast: boolean;
    weekly_recap: boolean;
  };
  const defaultNotifPrefs: NotifPrefs = {
    push_enabled: true, email_enabled: false, in_app_enabled: true,
    new_follower: true, new_like: true, like_milestone: true,
    new_comment: true, new_message: true, new_track_followed: true,
    view_milestone: true, boost_reminder: true, admin_broadcast: true,
    weekly_recap: false,
  };
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(defaultNotifPrefs);
  const [notifPrefsLoading, setNotifPrefsLoading] = useState(false);
  const [notifPrefsSaving, setNotifPrefsSaving] = useState(false);

  useEffect(() => {
    if (tab !== 'preferences') return;
    setNotifPrefsLoading(true);
    fetch('/api/notifications/preferences')
      .then(r => r.json())
      .then(d => {
        if (d.preferences) {
          setNotifPrefs(prev => ({ ...prev, ...d.preferences }));
        }
      })
      .catch(() => {})
      .finally(() => setNotifPrefsLoading(false));
  }, [tab]);

  const updateNotifPref = async (key: keyof NotifPrefs, value: boolean) => {
    const prev = { ...notifPrefs };
    setNotifPrefs(p => ({ ...p, [key]: value }));
    setNotifPrefsSaving(true);
    try {
      if (key === 'push_enabled') {
        const pushResult = value ? await registerPushSubscription() : await unregisterPushSubscription();
        if (value && pushResult !== 'granted' && pushResult !== 'already') {
          throw new Error(
            pushResult === 'unavailable'
              ? 'Le service push du navigateur est indisponible pour le moment'
              : pushResult === 'unsupported'
                ? 'Notifications navigateur non supportées ou VAPID manquant'
                : 'Autorisation navigateur refusée',
          );
        }
      }

      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) throw new Error();
      notify.success('Preference mise a jour');
    } catch (error: any) {
      setNotifPrefs(prev);
      notify.error('Erreur de sauvegarde', error?.message || 'Impossible de mettre à jour cette préférence');
    } finally {
      setNotifPrefsSaving(false);
    }
  };

  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState('');
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);

  const setTabAndUrl = (next: SettingsTab) => {
    setTab(next);
    router.replace(`/settings?tab=${encodeURIComponent(next)}`, { scroll: false });
  };

  // Préférences locales
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setPrefs((prev) => ({
        autoplay: typeof parsed?.autoplay === 'boolean' ? parsed.autoplay : prev.autoplay,
        highQuality: typeof parsed?.highQuality === 'boolean' ? parsed.highQuality : prev.highQuality,
        activityVisible: typeof parsed?.activityVisible === 'boolean' ? parsed.activityVisible : prev.activityVisible,
      }));
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // silent
    }
  }, [prefs]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    setNotifPerm(Notification.permission);
  }, []);

  // Charger profil complet
  useEffect(() => {
    const load = async () => {
      if (!username) {
        setProfileLoading(false);
        return;
      }
      setProfileLoading(true);
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(username)}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Impossible de charger le profil');
        const data = await res.json();
        const next: ProfileForm = {
          name: safeTrim(data?.name ?? (user as any)?.name),
          bio: safeTrim(data?.bio),
          location: safeTrim(data?.location),
          website: safeTrim(data?.website),
          isArtist: !!data?.isArtist,
          artistName: safeTrim(data?.artistName),
          genreText: Array.isArray(data?.genre) ? data.genre.join(', ') : '',
          avatar: data?.avatar ?? (user as any)?.image ?? null,
          banner: data?.banner ?? null,
        };
        setProfile(next);
        initialProfileRef.current = next;
      } catch (e: any) {
        notify.error('Profil', e?.message || 'Erreur');
      } finally {
        setProfileLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const isProfileDirty = useMemo(() => {
    const init = initialProfileRef.current;
    if (!init) return false;
    return JSON.stringify(init) !== JSON.stringify(profile);
  }, [profile]);

  const resetProfileForm = () => {
    if (!initialProfileRef.current) return;
    setProfile(initialProfileRef.current);
  };

  const saveProfile = async () => {
    if (!username) return;
    setProfileSaving(true);
    try {
      const payload = {
        name: profile.name,
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
        isArtist: profile.isArtist,
        artistName: profile.artistName,
        genre: parseGenres(profile.genreText),
      };
      const res = await fetch(`/api/users/${encodeURIComponent(username)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Erreur mise à jour');
      notify.success('Profil', 'Modifications enregistrées');
      initialProfileRef.current = { ...profile, genreText: parseGenres(profile.genreText).join(', ') };
      await refreshSession();
    } catch (e: any) {
      notify.error('Profil', e?.message || 'Impossible d’enregistrer');
    } finally {
      setProfileSaving(false);
    }
  };

  const uploadProfileImage = async (type: 'avatar' | 'banner', file: File) => {
    if (!username) return;
    setUploading((p) => ({ ...p, [type]: true }));
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const publicId = `ximam_${username}_${type}_${Date.now()}`;

      const sigRes = await fetch(`/api/users/${encodeURIComponent(username)}/upload-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp, publicId, type }),
      });
      const sig = await sigRes.json();
      if (!sigRes.ok) throw new Error(sig?.error || 'Signature upload impossible');

      const cloudName = sig.cloudName as string;
      const apiKey = sig.apiKey as string;
      const signature = sig.signature as string;
      if (!cloudName || !apiKey || !signature) throw new Error('Config Cloudinary manquante');

      const form = new FormData();
      form.append('file', file);
      form.append('api_key', apiKey);
      form.append('timestamp', String(timestamp));
      form.append('public_id', publicId);
      form.append('folder', `ximam/profiles/${username}`);
      form.append('signature', signature);

      const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: form });
      const up = await upRes.json();
      if (!upRes.ok) throw new Error(up?.error?.message || 'Upload Cloudinary échoué');

      const saveRes = await fetch(`/api/users/${encodeURIComponent(username)}/save-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: up.secure_url, type, publicId: up.public_id }),
      });
      const saved = await saveRes.json();
      if (!saveRes.ok) throw new Error(saved?.error || 'Sauvegarde image échouée');

      setProfile((p) => ({ ...p, [type]: up.secure_url }));
      notify.success('Image', type === 'avatar' ? 'Avatar mis à jour' : 'Bannière mise à jour');
      await refreshSession();
    } catch (e: any) {
      notify.error('Image', e?.message || 'Impossible de mettre à jour l’image');
    } finally {
      setUploading((p) => ({ ...p, [type]: false }));
    }
  };

  const requestNotif = async () => {
    try {
      const result = await registerPushSubscription();
      if (result === 'granted' || result === 'already') {
        setNotifPrefs((p) => ({ ...p, push_enabled: true }));
        await fetch('/api/notifications/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ push_enabled: true }),
        }).catch(() => {});
        notify.success('Notifications', 'Notifications navigateur activées');
      } else {
        if (result === 'unavailable') {
          notify.warning('Notifications', 'Le service push du navigateur est indisponible pour le moment');
        } else if (result === 'unsupported') {
          notify.warning('Notifications', 'Notifications navigateur non supportées sur cet environnement');
        } else {
          const ok = await requestNotificationPermission();
          if (!ok) notify.warning('Notifications', 'Permission refusée par le navigateur');
          else notify.success('Notifications', 'Autorisation activée');
        }
      }
      if (typeof window !== 'undefined' && 'Notification' in window) setNotifPerm(Notification.permission);
    } catch {
      notify.error('Notifications', 'Impossible de demander la permission');
    }
  };

  const sendResetPassword = async () => {
    if (!email) {
      notify.error('Sécurité', 'Email introuvable sur votre session');
      return;
    }
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Erreur');
      notify.success('Sécurité', data?.message || 'Email envoyé si un compte existe');
    } catch (e: any) {
      notify.error('Sécurité', e?.message || 'Impossible d’envoyer l’email');
    }
  };

  const DELETE_CONFIRM_PHRASE = 'SUPPRIMER MON COMPTE';
  const handleDeleteAccount = async () => {
    if (deleteAccountConfirm !== DELETE_CONFIRM_PHRASE) {
      notify.error('Suppression', 'Saisissez exactement la phrase de confirmation.');
      return;
    }
    setDeleteAccountLoading(true);
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Erreur lors de la suppression');
      notify.success('Compte', 'Votre compte et toutes vos données ont été supprimés.');
      setDeleteAccountModalOpen(false);
      setDeleteAccountConfirm('');
      await logout();
      router.replace('/auth/signin', { scroll: false });
    } catch (e: any) {
      notify.error('Suppression', e?.message || 'Impossible de supprimer le compte');
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  if (user === null) {
    return (
      <SynauraAppShell contentClassName="max-w-[1100px]">
        <SynauraTopBar searchHref="/discover" searchLabel="Rechercher un son, un profil ou un post..." />
        <WarmCard className="mx-auto max-w-md text-center">
          <div className="mx-auto w-fit rounded-[1.2rem] bg-black/[0.05] p-3 text-black/42">
            <Settings className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[#171313]">Parametres</h1>
          <p className="mt-2 text-sm font-semibold text-black/45">Connecte-toi pour acceder a tes parametres.</p>
          <button type="button" onClick={() => router.push('/auth/signin', { scroll: false })} className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#171313] px-5 text-sm font-black text-white transition hover:scale-[1.02]">
            Se connecter
          </button>
        </WarmCard>
      </SynauraAppShell>
    );
  }

  const avatarSrc = profile.avatar || '/default-avatar.png';
  const bannerSrc = profile.banner || null;
  const profileGenres = parseGenres(profile.genreText);
  const displayName = safeTrim(profile.name) || safeTrim((user as any)?.name) || 'Votre profil';
  const websiteLabel = safeTrim(profile.website).replace(/^https?:\/\//, '');
  const inputClassName =
    'h-12 w-full rounded-[1rem] border border-[#d7cab6] bg-[#fff8ef] px-4 text-sm font-semibold text-[#171313] outline-none transition placeholder:text-black/25 focus:border-[#171313]/18 focus:bg-[#fffdf8]';
  const textAreaClassName =
    'w-full min-h-[130px] rounded-[1rem] border border-[#d7cab6] bg-[#fff8ef] px-4 py-3 text-sm font-semibold text-[#171313] outline-none transition placeholder:text-black/25 focus:border-[#171313]/18 focus:bg-[#fffdf8] resize-y';

  return (
    <SynauraAppShell contentClassName="max-w-[1400px]">
      <SynauraTopBar searchHref="/discover" searchLabel="Rechercher un son, un profil ou un post..." />

      <div className="space-y-4 pb-24">
        <button
          onClick={() => router.back()}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-black/[0.08] bg-[#fffaf2]/88 px-4 text-sm font-black text-black/56 shadow-[0_14px_36px_rgba(30,25,20,0.08)] transition hover:bg-[#171313] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        <SynauraInkPanel className="overflow-hidden">
          <div className="px-5 py-6 sm:px-7 sm:py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/46">Synaura</p>
                <h1 className="mt-3 text-3xl font-black leading-[0.95] tracking-[-0.06em] text-white sm:text-5xl">Parametres</h1>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/58">
                  Profil, compte, notifications, securite et preferences du nouveau Synaura.
                </p>
              </div>

              <Link
                href={username ? `/profile/${encodeURIComponent(username)}` : '/'}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 text-sm font-black text-white/76 transition hover:bg-white/12 hover:text-white"
              >
                <ExternalLink className="h-4 w-4" />
                Voir mon profil
              </Link>
            </div>
          </div>
        </SynauraInkPanel>

        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* NAV */}
          <div className="lg:sticky lg:top-24 h-fit">
            <SynauraPanel className="overflow-hidden p-3">
              <div className="rounded-[1.5rem] border border-black/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(255,111,97,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(124,92,255,0.16),transparent_38%),rgba(0,0,0,0.03)] px-3 py-3">
                <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={avatarSrc}
                    alt="Avatar"
                    className="h-12 w-12 rounded-full object-cover border border-black/[0.08]"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/default-avatar.png';
                    }}
                  />
                  <span className="absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/70 bg-white text-[#171313] shadow-[0_10px_20px_rgba(30,25,20,0.1)]">
                    <Crown className="h-3 w-3" />
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-black line-clamp-1 text-[#171313]">{displayName}</div>
                  <div className="text-xs font-semibold text-black/45 line-clamp-1">@{username}</div>
                </div>
              </div>

                <div className="mt-3 grid gap-2">
                  <Link
                    href={username ? `/profile/${encodeURIComponent(username)}` : '/'}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#d6c8b3] bg-[#fff8ee] px-4 text-sm font-black text-[#171313] transition hover:bg-[#fff3e4]"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Voir mon profil
                  </Link>
                </div>
              </div>

              <div className="mt-3 px-1">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-black/34">Sections</div>
              </div>

              <div className="mt-2 grid gap-2">
                <SettingsNavItem active={tab === 'profil'} icon={User} label="Profil" onClick={() => setTabAndUrl('profil')} />
                <SettingsNavItem active={tab === 'compte'} icon={Crown} label="Compte" onClick={() => setTabAndUrl('compte')} />
                <SettingsNavItem active={tab === 'parrainage'} icon={Gift} label="Parrainage" onClick={() => {
                  setTabAndUrl('parrainage');
                  if (!referralData) {
                    setReferralLoading(true);
                    fetch('/api/referral').then(r => r.json()).then(d => setReferralData(d)).catch(() => {}).finally(() => setReferralLoading(false));
                  }
                }} />
                <SettingsNavItem active={tab === 'preferences'} icon={Sparkles} label="Préférences" onClick={() => setTabAndUrl('preferences')} />
                <SettingsNavItem active={tab === 'securite'} icon={Shield} label="Sécurité" onClick={() => setTabAndUrl('securite')} />
                <SettingsNavItem active={tab === 'legal'} icon={FileText} label="Légal" onClick={() => setTabAndUrl('legal')} />
              </div>

              <div className="mt-3 rounded-[1.25rem] border border-[#dccfbb] bg-[#f4ecdf] p-3">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-black/34">Raccourci</div>
                <div className="mt-2 text-sm font-semibold text-black/56">
                  Tout ce qui etait dans le petit modal profil est maintenant centralise ici.
                </div>
              </div>

              <div className="mt-3 border-t border-black/[0.08] pt-3">
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                  }}
                  className="w-full rounded-[1rem] border border-[#ff6f61]/20 bg-[#ff6f61]/8 px-3 py-3 text-sm font-black text-[#9a3e34] transition hover:bg-[#ff6f61]/14 flex items-center gap-2 justify-center"
                >
                  <LogOut className="h-4 w-4" />
                  Se déconnecter
                </button>
              </div>
            </SynauraPanel>
          </div>

          {/* CONTENT */}
          <div className="min-w-0 space-y-4">
            {/* Abonnement */}
            <WarmCard className="space-y-4 border-black/[0.08]">
              <SectionHeader
                eyebrow="Abonnement"
                title="Plan et limites"
                description="Retrouve ici ton niveau d’accès actuel et ouvre la gestion de ton abonnement si tu veux faire évoluer ton plan."
              />

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                <InnerCard>
                  <SubscriptionLimits />
                </InnerCard>

                <InnerCard>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-black/34">Gestion</div>
                  <div className="mt-3 rounded-[1.1rem] border border-[#dbcdb8] bg-[#fff8ee] p-4">
                    <div className="text-sm font-black text-[#171313]">Modifier mon plan</div>
                    <div className="mt-2 text-sm font-semibold leading-6 text-black/52">
                      Ouvre la page d’abonnement pour voir les offres, limites et options disponibles.
                    </div>
                    <Link
                      href="/subscriptions"
                      className="mt-4 inline-flex h-11 items-center justify-center rounded-full border border-[#d6c8b3] bg-[#efe4d4] px-4 text-sm font-black text-[#5f5650] transition hover:bg-[#e7dac8] hover:text-[#171313]"
                    >
                      Gérer l’abonnement
                    </Link>
                  </div>
                </InnerCard>
              </div>
            </WarmCard>

            {tab === 'profil' && (
              <WarmCard className="space-y-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-black/34">Edition</div>
                    <div className="mt-2 text-[1.65rem] font-black tracking-[-0.05em] text-[#171313]">Profil</div>
                    <div className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-black/54">
                      Nom, bio, visuels, lien, localisation et identité artiste. Tout ce qui était dans le petit modal est ici.
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <SecondaryButton type="button" onClick={resetProfileForm} disabled={!isProfileDirty || profileSaving || profileLoading}>
                      Réinitialiser
                    </SecondaryButton>
                    <PrimaryButton type="button" onClick={saveProfile} disabled={!isProfileDirty || profileSaving || profileLoading}>
                      {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Enregistrer
                    </PrimaryButton>
                  </div>
                </div>

                {profileLoading ? (
                  <div className="rounded-[1.35rem] border border-[#dccfbb] bg-[#f4ecdf] px-4 py-5 text-sm font-semibold text-black/52">
                    Chargement…
                  </div>
                ) : (
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_360px]">
                    <div className="space-y-4">
                      <InnerCard className="overflow-hidden p-0">
                        <div className="relative h-40 sm:h-48">
                          {bannerSrc ? (
                            <img src={bannerSrc} alt="Bannière" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(255,111,97,0.36),transparent_28%),radial-gradient(circle_at_top_right,rgba(124,92,255,0.3),transparent_32%),radial-gradient(circle_at_bottom,rgba(0,194,203,0.18),transparent_42%),linear-gradient(135deg,#171313_0%,#2b2320_100%)]" />
                          )}
                          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(23,19,19,0.1)_0%,rgba(23,19,19,0.62)_100%)]" />
                          <div className="absolute right-4 top-4">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/14 bg-black/24 px-3 py-2 text-xs font-black text-white backdrop-blur-xl transition hover:bg-black/36">
                              {uploading.banner ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                              Changer la bannière
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploading.banner}
                                onChange={(e) => {
                                  const f = e.currentTarget.files?.[0];
                                  e.currentTarget.value = '';
                                  if (f) uploadProfileImage('banner', f);
                                }}
                              />
                            </label>
                          </div>
                          <div className="absolute left-4 right-4 bottom-4 flex items-end gap-4">
                            <div className="relative shrink-0">
                              <img
                                src={avatarSrc}
                                alt="Avatar"
                                className="h-24 w-24 rounded-[1.75rem] border border-white/16 object-cover shadow-[0_18px_40px_rgba(0,0,0,0.25)]"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = '/default-avatar.png';
                                }}
                              />
                              <label className="absolute -bottom-2 -right-2 inline-flex cursor-pointer items-center justify-center rounded-full border border-white/70 bg-white p-2 text-[#171313] shadow-[0_10px_20px_rgba(30,25,20,0.12)] transition hover:scale-[1.03]">
                                {uploading.avatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  disabled={uploading.avatar}
                                  onChange={(e) => {
                                    const f = e.currentTarget.files?.[0];
                                    e.currentTarget.value = '';
                                    if (f) uploadProfileImage('avatar', f);
                                  }}
                                />
                              </label>
                            </div>

                            <div className="min-w-0 pb-1 text-white">
                              <div className="text-2xl font-black tracking-[-0.05em]">{displayName}</div>
                              <div className="mt-1 text-sm font-semibold text-white/70">@{username}</div>
                              {profile.isArtist && safeTrim(profile.artistName) ? (
                                <div className="mt-2 inline-flex rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-white/82">
                                  {profile.artistName}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </InnerCard>

                      <InnerCard>
                        <div className="grid gap-4 md:grid-cols-2">
                          <Field label="Nom d’affichage">
                            <input
                              value={profile.name}
                              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                              className={inputClassName}
                              placeholder="Votre nom"
                            />
                          </Field>

                          <Field label="Site web" hint="optionnel">
                            <input
                              value={profile.website}
                              onChange={(e) => setProfile((p) => ({ ...p, website: e.target.value }))}
                              className={inputClassName}
                              placeholder="https://…"
                            />
                          </Field>

                          <Field label="Localisation" hint="optionnel">
                            <input
                              value={profile.location}
                              onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))}
                              className={inputClassName}
                              placeholder="Ville, pays"
                            />
                          </Field>

                          <Field label="Genres" hint="séparés par des virgules">
                            <input
                              value={profile.genreText}
                              onChange={(e) => setProfile((p) => ({ ...p, genreText: e.target.value }))}
                              className={inputClassName}
                              placeholder="Pop, Electro, Rap…"
                            />
                          </Field>
                        </div>

                        <div className="mt-4">
                          <Field label="Bio" hint="optionnel">
                            <textarea
                              value={profile.bio}
                              onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                              className={textAreaClassName}
                              placeholder="Présente-toi en quelques lignes…"
                            />
                          </Field>
                        </div>
                      </InnerCard>

                      <InnerCard>
                        <Toggle
                          checked={profile.isArtist}
                          onChange={(v) => setProfile((p) => ({ ...p, isArtist: v }))}
                          label="Compte artiste"
                          description="Affiche une identité d’artiste sur votre profil."
                        />
                        {profile.isArtist ? (
                          <div className="mt-4">
                            <Field label="Nom d’artiste">
                              <input
                                value={profile.artistName}
                                onChange={(e) => setProfile((p) => ({ ...p, artistName: e.target.value }))}
                                className={inputClassName}
                                placeholder="Nom de scène"
                              />
                            </Field>
                          </div>
                        ) : null}
                      </InnerCard>
                    </div>

                    <div className="space-y-4">
                      <InnerCard>
                        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-black/34">Aperçu</div>
                        <div className="mt-3 rounded-[1.35rem] border border-[#dbcdb8] bg-[#fff8ee] p-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={avatarSrc}
                              alt="Avatar"
                              className="h-14 w-14 rounded-full border border-black/[0.08] object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/default-avatar.png';
                              }}
                            />
                            <div className="min-w-0">
                              <div className="truncate text-base font-black text-[#171313]">{displayName}</div>
                              <div className="truncate text-xs font-semibold text-black/42">@{username}</div>
                            </div>
                          </div>

                          {safeTrim(profile.bio) ? (
                            <p className="mt-4 whitespace-pre-line text-sm font-semibold leading-6 text-black/62">{profile.bio}</p>
                          ) : (
                            <p className="mt-4 text-sm font-semibold leading-6 text-black/34">Ajoute une bio pour donner du contexte à ton profil.</p>
                          )}

                          {(safeTrim(profile.location) || safeTrim(profile.website)) ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {safeTrim(profile.location) ? (
                                <span className="inline-flex rounded-full border border-[#d6c8b3] bg-[#efe4d4] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-[#5f5650]">
                                  {profile.location}
                                </span>
                              ) : null}
                              {safeTrim(profile.website) ? (
                                <span className="inline-flex rounded-full border border-[#d6c8b3] bg-[#efe4d4] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-[#5f5650]">
                                  {websiteLabel}
                                </span>
                              ) : null}
                            </div>
                          ) : null}

                          {profileGenres.length > 0 ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {profileGenres.map((genre) => (
                                <span key={genre} className="inline-flex rounded-full border border-[#7c5cff]/18 bg-[#7c5cff]/8 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-[#7c5cff]">
                                  {genre}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </InnerCard>

                      <InnerCard>
                        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-black/34">Images</div>
                        <div className="mt-3 space-y-3">
                          <div className="rounded-[1rem] border border-[#dbcdb8] bg-[#fff8ee] p-3">
                            <div className="text-sm font-black text-[#171313]">Avatar</div>
                            <div className="mt-1 text-xs font-semibold text-black/42">PNG ou JPG, idéalement carré.</div>
                          </div>
                          <div className="rounded-[1rem] border border-[#dbcdb8] bg-[#fff8ee] p-3">
                            <div className="text-sm font-black text-[#171313]">Bannière</div>
                            <div className="mt-1 text-xs font-semibold text-black/42">Choisis une image large pour habiller la tête du profil.</div>
                          </div>
                        </div>
                      </InnerCard>
                    </div>
                  </div>
                )}
              </WarmCard>
            )}

            {tab === 'compte' && (
              <WarmCard className="space-y-4">
                <SectionHeader
                  eyebrow="Compte"
                  title="Identité du compte"
                  description="Retrouve ici les informations rattachées à ta session et les accès principaux de ton compte."
                />

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-4">
                    <InnerCard>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-[1.1rem] border border-[#dbcdb8] bg-[#fff8ee] p-4">
                          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-black/34">Nom d’utilisateur</div>
                          <div className="mt-2 text-lg font-black tracking-[-0.04em] text-[#171313]">@{username}</div>
                        </div>
                        <div className="rounded-[1.1rem] border border-[#dbcdb8] bg-[#fff8ee] p-4">
                          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-black/34">Email</div>
                          <div className="mt-2 break-all text-lg font-black tracking-[-0.04em] text-[#171313]">{email || '—'}</div>
                        </div>
                      </div>
                    </InnerCard>

                    <InnerCard>
                      <div className="text-sm font-black text-[#171313]">Accès rapides</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href={username ? `/profile/${encodeURIComponent(username)}` : '/'}
                          className="inline-flex h-11 items-center justify-center rounded-full border border-[#d6c8b3] bg-[#fff8ee] px-4 text-sm font-black text-[#171313] transition hover:bg-[#fff3e4]"
                        >
                          Voir mon profil
                        </Link>
                        <button
                          type="button"
                          onClick={() => setTabAndUrl('securite')}
                          className="inline-flex h-11 items-center justify-center rounded-full border border-[#d6c8b3] bg-[#efe4d4] px-4 text-sm font-black text-[#5f5650] transition hover:bg-[#e7dac8] hover:text-[#171313]"
                        >
                          Gérer la sécurité
                        </button>
                      </div>
                    </InnerCard>
                  </div>

                  <div className="space-y-4">
                    <InnerCard>
                      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-black/34">Résumé</div>
                      <div className="mt-3 rounded-[1.1rem] border border-[#dbcdb8] bg-[#fff8ee] p-4">
                        <div className="text-sm font-black text-[#171313]">{displayName}</div>
                        <div className="mt-1 text-xs font-semibold text-black/42">@{username}</div>
                        <div className="mt-3 text-sm font-semibold leading-6 text-black/52">
                          Ce bloc regroupe l’identité de connexion. Les informations de présentation publique se modifient dans l’onglet profil.
                        </div>
                      </div>
                    </InnerCard>
                  </div>
                </div>
              </WarmCard>
            )}

            {tab === 'parrainage' && (
              <WarmCard className="space-y-4">
                <SectionHeader
                  eyebrow="Parrainage"
                  title="Inviter et suivre"
                  description="Invite tes proches, partage ton lien et garde un œil clair sur les crédits obtenus."
                />

                {referralLoading ? (
                  <InnerCard className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-black/35" />
                  </InnerCard>
                ) : referralData ? (
                  <div className="space-y-4">
                    <InnerCard className="bg-[radial-gradient(circle_at_top_left,rgba(124,92,255,0.12),transparent_36%),rgba(0,0,0,0.03)]">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-black/34">Lien de parrainage</div>
                          <div className="mt-2 text-sm font-semibold text-black/52">Partage ce lien pour inviter quelqu’un sur Synaura.</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(referralData.referralLink || '').catch(() => {});
                            setReferralCopied(true);
                            setTimeout(() => setReferralCopied(false), 2000);
                          }}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#7c5cff]/18 bg-[#7c5cff]/8 px-4 text-sm font-black text-[#7c5cff] transition hover:bg-[#7c5cff]/14"
                        >
                          {referralCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          {referralCopied ? 'Copié' : 'Copier le lien'}
                        </button>
                      </div>

                      <div className="mt-4 rounded-[1.1rem] border border-[#dbcdb8] bg-[#fff8ee] p-4">
                        <div className="break-all text-sm font-black text-[#171313]">{referralData.referralLink || ''}</div>
                        <div className="mt-2 text-[11px] font-black uppercase tracking-[0.12em] text-black/34">
                          Code <span className="ml-1 rounded-full bg-[#eadfce] px-2 py-1 font-mono tracking-normal text-[#5f5650]">{referralData.referralCode}</span>
                        </div>
                      </div>
                    </InnerCard>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <MetricCard label="Filleuls" value={referralData.totalReferrals || 0} />
                      <MetricCard label="Crédits gagnés" value={referralData.totalCreditsEarned || 0} tone="violet" />
                      <MetricCard label="Places restantes" value={referralData.remainingSlots ?? 20} tone="emerald" />
                    </div>

                    <InnerCard>
                      <div className="text-sm font-black text-[#171313]">Tes filleuls</div>
                      {referralData.referrals?.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {referralData.referrals.map((r: any) => (
                            <div key={r.id} className="flex items-center gap-3 rounded-[1rem] border border-[#dbcdb8] bg-[#fff8ee] p-3">
                              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[#d6c8b3] bg-[#eadfce] text-xs font-black text-[#171313]">
                                {r.avatar ? <img src={r.avatar} alt="" className="h-10 w-10 object-cover" /> : (r.username?.[0] || '?').toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-black text-[#171313]">@{r.username}</div>
                                <div className="text-xs font-semibold text-black/42">{new Date(r.date).toLocaleDateString('fr-FR')}</div>
                              </div>
                              <div className="text-xs font-black uppercase tracking-[0.08em] text-[#0f8b6d]">+{r.creditsGranted} crédits</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 rounded-[1rem] border border-[#dbcdb8] bg-[#fff8ee] p-4 text-sm font-semibold text-black/50">
                          Aucun filleul pour le moment.
                        </div>
                      )}
                    </InnerCard>
                  </div>
                ) : (
                  <InnerCard className="text-center py-10 text-sm font-semibold text-black/42">Erreur de chargement</InnerCard>
                )}
              </WarmCard>
            )}

            {tab === 'preferences' && (
              <WarmCard className="space-y-4">
                <SectionHeader
                  eyebrow="Préférences"
                  title="Ecoute et notifications"
                  description="Régle l’expérience locale sur cet appareil et choisis quelles notifications tu veux recevoir."
                />

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="space-y-4">
                    <InnerCard>
                      <div className="text-sm font-black text-[#171313]">Préférences locales</div>
                      <div className="mt-3 grid gap-3">
                        <ToggleCard checked={prefs.autoplay} onChange={(v) => setPrefs((p) => ({ ...p, autoplay: v }))} label="Lecture automatique" description="Active le démarrage automatique quand c’est possible." />
                        <ToggleCard checked={prefs.highQuality} onChange={(v) => setPrefs((p) => ({ ...p, highQuality: v }))} label="Qualité audio élevée" description="Préférence de qualité quand plusieurs flux sont disponibles." />
                        <ToggleCard checked={prefs.activityVisible} onChange={(v) => setPrefs((p) => ({ ...p, activityVisible: v }))} label="Afficher mon activité" description="Affichage de votre activité récente sur cet appareil." />
                      </div>
                    </InnerCard>

                    <InnerCard>
                      <div className="text-sm font-black text-[#171313]">Notifications navigateur</div>
                      <div className="mt-3 flex flex-col gap-3 rounded-[1.1rem] border border-[#dbcdb8] bg-[#fff8ee] p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-sm font-black text-[#171313]">Permission navigateur</div>
                          <div className="mt-1 text-xs font-semibold text-black/42">Statut actuel : {notifPerm}</div>
                        </div>
                        <SecondaryButton type="button" onClick={requestNotif} className="min-w-[160px]">
                          <Bell className="h-4 w-4" />
                          Activer
                        </SecondaryButton>
                      </div>
                    </InnerCard>

                    <InnerCard>
                      <div className="text-sm font-black text-[#171313]">Notifications détaillées</div>
                      <div className="mt-1 text-xs font-semibold text-black/42">Ces préférences sont enregistrées côté serveur.</div>

                      {notifPrefsLoading ? (
                        <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-black/42">
                          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
                        </div>
                      ) : (
                        <div className="mt-4 space-y-4">
                          <div>
                            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-black/34">Canaux</div>
                            <div className="mt-2 grid gap-3">
                              <ToggleCard checked={notifPrefs.push_enabled} onChange={(v) => updateNotifPref('push_enabled', v)} label="Notifications push" description="Recevez des notifications même quand vous n’êtes pas sur le site." />
                              <ToggleCard checked={notifPrefs.in_app_enabled} onChange={(v) => updateNotifPref('in_app_enabled', v)} label="Notifications in-app" description="Notifications dans le panneau de la cloche." />
                              <ToggleCard checked={notifPrefs.email_enabled} onChange={(v) => updateNotifPref('email_enabled', v)} label="Notifications par email" description="Recevez un résumé par email." />
                            </div>
                          </div>

                          <div>
                            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-black/34">Social</div>
                            <div className="mt-2 grid gap-3">
                              <ToggleCard checked={notifPrefs.new_follower} onChange={(v) => updateNotifPref('new_follower', v)} label="Nouvel abonné" description="Quand quelqu’un commence à vous suivre." />
                              <ToggleCard checked={notifPrefs.new_like} onChange={(v) => updateNotifPref('new_like', v)} label="Nouveau like" description="Quand quelqu’un aime votre musique." />
                              <ToggleCard checked={notifPrefs.new_comment} onChange={(v) => updateNotifPref('new_comment', v)} label="Nouveau commentaire" description="Quand quelqu’un commente votre musique." />
                            </div>
                          </div>

                          <div>
                            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-black/34">Musique et messages</div>
                            <div className="mt-2 grid gap-3">
                              <ToggleCard checked={notifPrefs.new_track_followed} onChange={(v) => updateNotifPref('new_track_followed', v)} label="Nouvelle musique d’un artiste suivi" description="Quand un artiste suivi publie un nouveau son." />
                              <ToggleCard checked={notifPrefs.new_message} onChange={(v) => updateNotifPref('new_message', v)} label="Nouveau message" description="Quand vous recevez un message privé." />
                            </div>
                          </div>

                          <div>
                            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-black/34">Paliers et rappels</div>
                            <div className="mt-2 grid gap-3">
                              <ToggleCard checked={notifPrefs.like_milestone} onChange={(v) => updateNotifPref('like_milestone', v)} label="Palier de likes" description="10, 50, 100, 500, 1000 likes atteints." />
                              <ToggleCard checked={notifPrefs.view_milestone} onChange={(v) => updateNotifPref('view_milestone', v)} label="Palier d’écoutes" description="10, 50, 100, 500, 1000 écoutes atteintes." />
                              <ToggleCard checked={notifPrefs.boost_reminder} onChange={(v) => updateNotifPref('boost_reminder', v)} label="Rappels de boost" description="Rappels quotidiens pour vos boosts disponibles." />
                            </div>
                          </div>

                          <div>
                            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-black/34">Plateforme</div>
                            <div className="mt-2 grid gap-3">
                              <ToggleCard checked={notifPrefs.admin_broadcast} onChange={(v) => updateNotifPref('admin_broadcast', v)} label="Annonces Synaura" description="Infos officielles et mises à jour de la plateforme." />
                              <ToggleCard checked={notifPrefs.weekly_recap} onChange={(v) => updateNotifPref('weekly_recap', v)} label="Résumé hebdomadaire" description="Recevez un résumé de vos stats chaque semaine." />
                            </div>
                          </div>
                        </div>
                      )}
                    </InnerCard>
                  </div>

                  <div className="space-y-4">
                    <InnerCard>
                      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-black/34">Cet appareil</div>
                      <div className="mt-3 rounded-[1.1rem] border border-[#dbcdb8] bg-[#fff8ee] p-4">
                        <div className="text-sm font-black text-[#171313]">Préférences locales</div>
                        <div className="mt-2 text-sm font-semibold leading-6 text-black/52">
                          Lecture automatique, qualité et visibilité d’activité sont sauvegardées sur cet appareil.
                        </div>
                      </div>
                    </InnerCard>
                  </div>
                </div>
              </WarmCard>
            )}

            {tab === 'securite' && (
              <WarmCard className="space-y-4">
                <SectionHeader
                  eyebrow="Sécurité"
                  title="Accès et suppression"
                  description="Gère la récupération du mot de passe et l’action irréversible de suppression de compte."
                />

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="space-y-4">
                    <InnerCard>
                      <div className="text-sm font-black text-[#171313]">Réinitialiser le mot de passe</div>
                      <div className="mt-3 flex flex-col gap-3 rounded-[1.1rem] border border-[#dbcdb8] bg-[#fff8ee] p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-black text-[#171313]">Envoyer un email</div>
                          <div className="mt-1 text-xs font-semibold text-black/42">Un email sera envoyé à {email || 'votre adresse'}.</div>
                        </div>
                        <PrimaryButton type="button" onClick={sendResetPassword} className="min-w-[170px]">
                          Envoyer le lien
                        </PrimaryButton>
                      </div>
                    </InnerCard>

                    <InnerCard className="border-[#ff6f61]/20 bg-[#ff6f61]/6">
                      <div className="text-sm font-black text-[#8f3d34]">Zone dangereuse</div>
                      <div className="mt-2 text-sm font-semibold leading-6 text-[#8f3d34]/78">
                        Supprime définitivement votre compte, votre profil, vos pistes, playlists, commentaires, médias et autres données associées.
                      </div>
                      <button
                        type="button"
                        onClick={() => setDeleteAccountModalOpen(true)}
                        className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#ff6f61]/28 bg-[#fff1ec] px-4 text-sm font-black text-[#8f3d34] transition hover:bg-[#ffe7df]"
                      >
                        <Trash2 className="h-4 w-4" />
                        Supprimer mon compte
                      </button>
                    </InnerCard>
                  </div>

                  <div className="space-y-4">
                    <InnerCard>
                      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-black/34">Conseil</div>
                      <div className="mt-3 rounded-[1.1rem] border border-[#dbcdb8] bg-[#fff8ee] p-4 text-sm font-semibold leading-6 text-black/58">
                        Commence toujours par la réinitialisation du mot de passe si tu veux simplement reprendre le contrôle du compte. La suppression est irréversible.
                      </div>
                    </InnerCard>
                  </div>
                </div>
              </WarmCard>
            )}

            {tab === 'legal' && (
              <WarmCard className="space-y-4">
                <SectionHeader
                  eyebrow="Légal"
                  title="Documents et politiques"
                  description="Accède rapidement aux pages de référence concernant l’utilisation de la plateforme et la confidentialité."
                />

                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    { href: '/legal', label: 'Centre légal' },
                    { href: '/legal/mentions-legales', label: 'Mentions légales' },
                    { href: '/legal/confidentialite', label: 'Confidentialité' },
                    { href: '/legal/cgu', label: 'CGU' },
                    { href: '/legal/cgv', label: 'CGV' },
                    { href: '/legal/cookies', label: 'Cookies' },
                    { href: '/legal/rgpd', label: 'RGPD' },
                  ].map((l) => (
                    <LegalLinkCard key={l.href} href={l.href} label={l.label} />
                  ))}
                </div>
              </WarmCard>
            )}
          </div>
        </div>
      </div>

      {/* Modal confirmation suppression de compte */}
      <UModal open={deleteAccountModalOpen} onClose={() => { if (!deleteAccountLoading) { setDeleteAccountModalOpen(false); setDeleteAccountConfirm(''); } }} size="md" className="border-[#ff6f61]/18">
        <UModalBody>
          <div className="flex items-center gap-3 text-[#8f3d34]">
            <span className="rounded-full bg-[#ff6f61]/12 p-2">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-black text-[#171313]">Supprimer définitivement mon compte</h2>
          </div>
          <p className="mt-3 text-sm font-semibold leading-6 text-black/58">
            Cette action est <strong>irréversible</strong>. Seront supprimés : votre profil, vos pistes, playlists, commentaires, likes, abonnements, messages, et tous les médias associés (Cloudinary). Votre compte d’authentification sera également supprimé.
          </p>
          <p className="mt-2 text-xs font-semibold text-black/38">
            Pour confirmer, saisissez exactement : <code className="rounded bg-black/[0.05] px-1.5 py-0.5 text-black/62">{DELETE_CONFIRM_PHRASE}</code>
          </p>
          <input
            type="text"
            value={deleteAccountConfirm}
            onChange={(e) => setDeleteAccountConfirm(e.target.value)}
            placeholder={DELETE_CONFIRM_PHRASE}
            className="mt-3 h-11 w-full rounded-[1rem] border border-[#dccfbb] bg-[#f7efe2] px-4 text-sm font-semibold text-[#171313] outline-none transition placeholder:text-black/24 focus:border-[#ff6f61]/35"
            disabled={deleteAccountLoading}
            autoComplete="off"
          />
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => { setDeleteAccountModalOpen(false); setDeleteAccountConfirm(''); }}
              disabled={deleteAccountLoading}
              className="flex-1 inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-black bg-[#efe4d4] text-[#5f5650] transition hover:bg-[#e7dac8] hover:text-[#171313]"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleteAccountConfirm !== DELETE_CONFIRM_PHRASE || deleteAccountLoading}
              className="flex-1 inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-black bg-[#ff6f61]/10 text-[#8f3d34] transition hover:bg-[#ff6f61]/18 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {deleteAccountLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Supprimer définitivement
            </button>
          </div>
        </UModalBody>
      </UModal>
    </SynauraAppShell>
  );
}

