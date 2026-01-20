'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Bell,
  Camera,
  Check,
  Crown,
  ExternalLink,
  FileText,
  Loader2,
  LogOut,
  Settings,
  Shield,
  Sparkles,
  User,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import SubscriptionLimits from '@/components/SubscriptionLimits';
import { notify } from '@/components/NotificationCenter';
import { useAudioPlayer } from '@/app/providers';
import BottomNav from '@/components/BottomNav';

type SettingsTab = 'profil' | 'compte' | 'preferences' | 'securite' | 'legal';

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
        'w-full text-left rounded-xl border px-3 py-2.5 transition',
        active
          ? 'bg-background-tertiary border-border-primary text-foreground-primary shadow-[0_10px_24px_rgba(0,0,0,0.25)]'
          : 'bg-background-fog-thin border-border-secondary text-foreground-secondary hover:text-foreground-primary hover:bg-overlay-on-primary'
      )}
    >
      <span className="flex items-center gap-2">
        <Icon className={cx('h-4 w-4', active ? 'text-foreground-primary' : 'text-foreground-inactive')} />
        <span className="text-[14px] font-medium">{label}</span>
      </span>
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
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-end justify-between gap-3">
        <span className="text-sm font-semibold text-foreground-primary">{label}</span>
        {hint ? <span className="text-xs text-foreground-inactive">{hint}</span> : null}
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
        <div className="text-sm font-semibold text-foreground-primary">{label}</div>
        {description ? <div className="text-xs text-foreground-inactive mt-0.5">{description}</div> : null}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cx(
          'relative h-7 w-14 rounded-full border transition',
          checked ? 'bg-[var(--accent-brand)]/30 border-border-primary' : 'bg-background-tertiary border-border-secondary'
        )}
        aria-pressed={checked}
      >
        <span
          className={cx(
            'absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform shadow',
            checked ? 'translate-x-7' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { user, logout, refreshSession } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { requestNotificationPermission } = useAudioPlayer();

  const initialTab = (searchParams.get('tab') || 'profil') as SettingsTab;
  const [tab, setTab] = useState<SettingsTab>(
    (['profil', 'compte', 'preferences', 'securite', 'legal'] as SettingsTab[]).includes(initialTab) ? initialTab : 'profil'
  );

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
      const ok = await requestNotificationPermission();
      if (!ok) notify.warning('Notifications', 'Permission refusée par le navigateur');
      else notify.success('Notifications', 'Autorisation activée');
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

  if (user === null) {
    return (
      <div className="min-h-screen w-full px-4 pt-10 pb-24 text-foreground-primary">
        <div className="mx-auto max-w-md">
          <div className="panel-suno border border-border-secondary rounded-2xl p-6 text-center">
            <div className="mx-auto w-fit rounded-xl bg-background-tertiary border border-border-secondary p-3">
              <Settings className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-2xl font-bold">Paramètres</h1>
            <p className="mt-2 text-sm text-foreground-inactive">Connectez-vous pour accéder à vos paramètres.</p>
            <button type="button" onClick={() => router.push('/auth/signin', { scroll: false })} className="btn-suno mt-5 w-full">
              Se connecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  const avatarSrc = profile.avatar || '/default-avatar.png';

  return (
    <div className="min-h-screen w-full px-3 sm:px-5 pt-6 pb-24 text-foreground-primary">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-background-tertiary border border-border-secondary">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Paramètres</h1>
              <p className="text-sm text-foreground-inactive">Profil, préférences et sécurité.</p>
            </div>
          </div>

          <Link
            href={username ? `/profile/${encodeURIComponent(username)}` : '/'}
            className="hidden sm:inline-flex items-center gap-2 rounded-full border border-border-secondary bg-background-fog-thin px-3 py-2 text-sm text-foreground-secondary hover:text-foreground-primary hover:bg-overlay-on-primary transition"
          >
            <ExternalLink className="h-4 w-4" />
            Voir mon profil
          </Link>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[260px_1fr]">
          {/* NAV */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="panel-suno border border-border-secondary rounded-2xl p-3">
              <div className="flex items-center gap-3 px-2 py-2">
                <div className="relative">
                  <img
                    src={avatarSrc}
                    alt="Avatar"
                    className="h-10 w-10 rounded-full object-cover border border-border-secondary"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/default-avatar.png';
                    }}
                  />
                  <span className="absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-background-tertiary border border-border-secondary">
                    <Crown className="h-3 w-3 text-foreground-secondary" />
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold line-clamp-1">{safeTrim((user as any)?.name) || 'Compte'}</div>
                  <div className="text-xs text-foreground-inactive line-clamp-1">@{username}</div>
                </div>
              </div>

              <div className="mt-2 grid gap-2">
                <SettingsNavItem active={tab === 'profil'} icon={User} label="Profil" onClick={() => setTabAndUrl('profil')} />
                <SettingsNavItem active={tab === 'compte'} icon={Crown} label="Compte" onClick={() => setTabAndUrl('compte')} />
                <SettingsNavItem active={tab === 'preferences'} icon={Sparkles} label="Préférences" onClick={() => setTabAndUrl('preferences')} />
                <SettingsNavItem active={tab === 'securite'} icon={Shield} label="Sécurité" onClick={() => setTabAndUrl('securite')} />
                <SettingsNavItem active={tab === 'legal'} icon={FileText} label="Légal" onClick={() => setTabAndUrl('legal')} />
              </div>

              <div className="mt-3 border-t border-border-secondary/60 pt-3">
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                  }}
                  className="w-full rounded-xl border border-red-500/30 bg-background-fog-thin px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 transition flex items-center gap-2 justify-center"
                >
                  <LogOut className="h-4 w-4" />
                  Se déconnecter
                </button>
              </div>
            </div>
          </div>

          {/* CONTENT */}
          <div className="min-w-0 space-y-4">
            {/* Abonnement */}
            <div className="panel-suno border border-border-secondary rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">Abonnement</div>
                  <div className="text-xs text-foreground-inactive">Consultez vos limites et gérez votre plan.</div>
                </div>
                <Link
                  href="/subscriptions"
                  className="rounded-full border border-border-secondary bg-background-fog-thin px-3 py-2 text-xs text-foreground-secondary hover:text-foreground-primary hover:bg-overlay-on-primary transition"
                >
                  Gérer
                </Link>
              </div>
              <div className="mt-3">
                <SubscriptionLimits />
              </div>
            </div>

            {tab === 'profil' && (
              <div className="panel-suno border border-border-secondary rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold">Profil</div>
                    <div className="text-xs text-foreground-inactive">Nom, bio, liens et images.</div>
                  </div>
                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={!isProfileDirty || profileSaving}
                    className={cx(
                      'rounded-full px-4 py-2 text-sm font-semibold border transition inline-flex items-center gap-2',
                      isProfileDirty && !profileSaving
                        ? 'bg-background-tertiary border-border-primary hover:bg-overlay-on-primary'
                        : 'bg-background-fog-thin border-border-secondary text-foreground-inactive cursor-not-allowed'
                    )}
                  >
                    {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Enregistrer
                  </button>
                </div>

                {profileLoading ? (
                  <div className="mt-4 text-sm text-foreground-inactive">Chargement…</div>
                ) : (
                  <div className="mt-4 grid gap-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-border-secondary bg-background-fog-thin p-3">
                        <div className="text-sm font-semibold">Avatar</div>
                        <div className="mt-3 flex items-center gap-3">
                          <img
                            src={avatarSrc}
                            alt="Avatar"
                            className="h-14 w-14 rounded-full object-cover border border-border-secondary"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/default-avatar.png';
                            }}
                          />
                          <div className="min-w-0">
                            <div className="text-xs text-foreground-inactive">PNG/JPG — recommandé 512×512</div>
                            <label className="mt-2 inline-flex items-center gap-2 rounded-full border border-border-secondary bg-background-tertiary px-3 py-2 text-xs hover:bg-overlay-on-primary cursor-pointer transition">
                              {uploading.avatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                              Changer
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
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border-secondary bg-background-fog-thin p-3">
                        <div className="text-sm font-semibold">Bannière</div>
                        <div className="mt-3">
                          <div className="h-20 w-full overflow-hidden rounded-xl border border-border-secondary bg-background-tertiary">
                            {profile.banner ? (
                              <img src={profile.banner} alt="Bannière" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full [background:radial-gradient(120%_60%_at_20%_0%,rgba(110,86,207,0.35),transparent),_radial-gradient(120%_60%_at_80%_100%,rgba(0,211,167,0.18),transparent)]" />
                            )}
                          </div>
                          <label className="mt-2 inline-flex items-center gap-2 rounded-full border border-border-secondary bg-background-tertiary px-3 py-2 text-xs hover:bg-overlay-on-primary cursor-pointer transition">
                            {uploading.banner ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                            Changer
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
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Nom d’affichage">
                        <input
                          value={profile.name}
                          onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                          className="w-full rounded-xl border border-border-secondary bg-background-fog-thin px-3 py-2 text-sm outline-none focus:border-border-primary"
                          placeholder="Votre nom"
                        />
                      </Field>

                      <Field label="Site web" hint="optionnel">
                        <input
                          value={profile.website}
                          onChange={(e) => setProfile((p) => ({ ...p, website: e.target.value }))}
                          className="w-full rounded-xl border border-border-secondary bg-background-fog-thin px-3 py-2 text-sm outline-none focus:border-border-primary"
                          placeholder="https://…"
                        />
                      </Field>

                      <Field label="Localisation" hint="optionnel">
                        <input
                          value={profile.location}
                          onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))}
                          className="w-full rounded-xl border border-border-secondary bg-background-fog-thin px-3 py-2 text-sm outline-none focus:border-border-primary"
                          placeholder="Ville, pays"
                        />
                      </Field>

                      <Field label="Genres" hint="séparés par des virgules">
                        <input
                          value={profile.genreText}
                          onChange={(e) => setProfile((p) => ({ ...p, genreText: e.target.value }))}
                          className="w-full rounded-xl border border-border-secondary bg-background-fog-thin px-3 py-2 text-sm outline-none focus:border-border-primary"
                          placeholder="Pop, Electro, Rap…"
                        />
                      </Field>
                    </div>

                    <Field label="Bio" hint="optionnel">
                      <textarea
                        value={profile.bio}
                        onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                        className="w-full min-h-[110px] rounded-xl border border-border-secondary bg-background-fog-thin px-3 py-2 text-sm outline-none focus:border-border-primary resize-y"
                        placeholder="Présente-toi en quelques lignes…"
                      />
                    </Field>

                    <div className="rounded-2xl border border-border-secondary bg-background-fog-thin p-3">
                      <Toggle
                        checked={profile.isArtist}
                        onChange={(v) => setProfile((p) => ({ ...p, isArtist: v }))}
                        label="Compte artiste"
                        description="Affiche une identité d’artiste sur votre profil."
                      />
                      {profile.isArtist && (
                        <div className="mt-3">
                          <Field label="Nom d’artiste">
                            <input
                              value={profile.artistName}
                              onChange={(e) => setProfile((p) => ({ ...p, artistName: e.target.value }))}
                              className="w-full rounded-xl border border-border-secondary bg-background-fog-thin px-3 py-2 text-sm outline-none focus:border-border-primary"
                              placeholder="Nom de scène"
                            />
                          </Field>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'compte' && (
              <div className="panel-suno border border-border-secondary rounded-2xl p-4">
                <div className="text-base font-semibold">Compte</div>
                <div className="mt-1 text-xs text-foreground-inactive">Informations liées à votre session.</div>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-border-secondary bg-background-fog-thin p-3">
                    <div className="text-xs text-foreground-inactive">Nom d’utilisateur</div>
                    <div className="text-sm font-semibold">@{username}</div>
                  </div>
                  <div className="rounded-2xl border border-border-secondary bg-background-fog-thin p-3">
                    <div className="text-xs text-foreground-inactive">Email</div>
                    <div className="text-sm font-semibold">{email || '—'}</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/subscriptions"
                    className="rounded-full border border-border-secondary bg-background-tertiary px-3 py-2 text-xs hover:bg-overlay-on-primary transition"
                  >
                    Abonnements
                  </Link>
                  <Link
                    href="/library"
                    className="rounded-full border border-border-secondary bg-background-tertiary px-3 py-2 text-xs hover:bg-overlay-on-primary transition"
                  >
                    Bibliothèque
                  </Link>
                  <Link
                    href="/upload"
                    className="rounded-full border border-border-secondary bg-background-tertiary px-3 py-2 text-xs hover:bg-overlay-on-primary transition"
                  >
                    Uploader
                  </Link>
                </div>
              </div>
            )}

            {tab === 'preferences' && (
              <div className="panel-suno border border-border-secondary rounded-2xl p-4">
                <div className="text-base font-semibold">Préférences</div>
                <div className="mt-1 text-xs text-foreground-inactive">Ces préférences sont stockées sur cet appareil.</div>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-border-secondary bg-background-fog-thin p-3">
                    <Toggle
                      checked={prefs.autoplay}
                      onChange={(v) => setPrefs((p) => ({ ...p, autoplay: v }))}
                      label="Lecture automatique"
                      description="Active le démarrage automatique quand c’est possible."
                    />
                  </div>
                  <div className="rounded-2xl border border-border-secondary bg-background-fog-thin p-3">
                    <Toggle
                      checked={prefs.highQuality}
                      onChange={(v) => setPrefs((p) => ({ ...p, highQuality: v }))}
                      label="Qualité audio élevée"
                      description="Préférence de qualité (si plusieurs flux disponibles)."
                    />
                  </div>
                  <div className="rounded-2xl border border-border-secondary bg-background-fog-thin p-3">
                    <Toggle
                      checked={prefs.activityVisible}
                      onChange={(v) => setPrefs((p) => ({ ...p, activityVisible: v }))}
                      label="Afficher mon activité"
                      description="Affichage de votre activité récente (local)."
                    />
                  </div>
                  <div className="rounded-2xl border border-border-secondary bg-background-fog-thin p-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">Notifications navigateur</div>
                        <div className="text-xs text-foreground-inactive mt-0.5">
                          Statut: <span className="font-medium">{notifPerm}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={requestNotif}
                        className="rounded-full border border-border-secondary bg-background-tertiary px-3 py-2 text-xs hover:bg-overlay-on-primary transition inline-flex items-center gap-2"
                      >
                        <Bell className="h-4 w-4" />
                        Activer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'securite' && (
              <div className="panel-suno border border-border-secondary rounded-2xl p-4">
                <div className="text-base font-semibold">Sécurité</div>
                <div className="mt-1 text-xs text-foreground-inactive">Mot de passe et accès.</div>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-border-secondary bg-background-fog-thin p-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">Réinitialiser mon mot de passe</div>
                        <div className="text-xs text-foreground-inactive mt-0.5">
                          Envoie un email à <span className="font-medium">{email || 'votre adresse'}</span>.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={sendResetPassword}
                        className="rounded-full border border-border-secondary bg-background-tertiary px-3 py-2 text-xs hover:bg-overlay-on-primary transition"
                      >
                        Envoyer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'legal' && (
              <div className="panel-suno border border-border-secondary rounded-2xl p-4">
                <div className="text-base font-semibold">Légal</div>
                <div className="mt-1 text-xs text-foreground-inactive">Documents et politiques.</div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    { href: '/legal', label: 'Centre légal' },
                    { href: '/legal/mentions-legales', label: 'Mentions légales' },
                    { href: '/legal/confidentialite', label: 'Confidentialité' },
                    { href: '/legal/cgu', label: 'CGU' },
                    { href: '/legal/cgv', label: 'CGV' },
                    { href: '/legal/cookies', label: 'Cookies' },
                    { href: '/legal/rgpd', label: 'RGPD' },
                  ].map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="rounded-full border border-border-secondary bg-background-tertiary px-3 py-2 text-xs hover:bg-overlay-on-primary transition"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

