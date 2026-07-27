'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  Mail,
  QrCode,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react';
import { notify } from '@/components/NotificationCenter';

type AccountDetails = {
  user: {
    id: string;
    name: string;
    username: string;
    email: string;
    emailVerified: boolean;
    providers: string[];
  };
  private: {
    firstName: string;
    lastName: string;
    birthDate: string;
    birthdayVisibility: 'private' | 'friends' | 'public';
    discoverableByEmail: boolean;
    profileComplete: boolean;
    termsVersion?: string | null;
    privacyVersion?: string | null;
  };
  identities: Array<{
    id: string;
    provider: string;
    createdAt?: string;
    lastSignInAt?: string;
  }>;
  mfaFactors: MfaFactor[];
  mfaEnabled: boolean;
};

type MfaFactor = {
  id: string;
  type: string;
  status: string;
  friendlyName?: string | null;
  createdAt?: string | null;
};

type TotpEnrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
};

const INPUT =
  'h-12 w-full rounded-xl border border-[#d7cab6] bg-[#fff8ef] px-4 text-sm font-semibold text-[#171313] outline-none transition placeholder:text-black/25 focus:border-[#171313]/25 focus:bg-white';

function maximumBirthDate() {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - 15);
  return date.toISOString().slice(0, 10);
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-black/42">{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function StatusPill({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${
      active ? 'bg-[var(--syn-soft-strong)] text-[var(--syn-success)]' : 'bg-black/[0.05] text-black/44'
    }`}>
      {active ? <Check className="h-3.5 w-3.5" /> : null}
      {children}
    </span>
  );
}

async function readJson(response: Response) {
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(json?.error || 'Opération impossible');
  return json;
}

export function WebAccountIdentityPanel({
  onSessionRefresh,
}: {
  onSessionRefresh: () => Promise<void>;
}) {
  const [details, setDetails] = useState<AccountDetails | null>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    birthdayVisibility: 'private' as 'private' | 'friends' | 'public',
    discoverableByEmail: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const json = await readJson(await fetch('/api/auth/web/account', { cache: 'no-store' }));
      const next = json.data as AccountDetails;
      setDetails(next);
      setForm({
        firstName: next.private.firstName,
        lastName: next.private.lastName,
        birthDate: next.private.birthDate,
        birthdayVisibility: next.private.birthdayVisibility,
        discoverableByEmail: next.private.discoverableByEmail,
      });
    } catch (caught) {
      notify.error('Compte', caught instanceof Error ? caught.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.birthDate) {
      notify.error('Compte', 'Complète le prénom, le nom et la date de naissance');
      return;
    }
    const completing = !details?.private.profileComplete;
    if (completing && (!acceptTerms || !acceptPrivacy)) {
      notify.error('Compte', 'Accepte les conditions et la politique de confidentialité');
      return;
    }

    setSaving(true);
    try {
      const json = await readJson(await fetch('/api/auth/web/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          name: details?.user.name,
          username: details?.user.username,
          completeProfile: completing,
          acceptTerms,
          acceptPrivacy,
        }),
      }));
      setDetails(json.data as AccountDetails);
      await onSessionRefresh();
      notify.success('Compte', 'Informations privées enregistrées');
    } catch (caught) {
      notify.error('Compte', caught instanceof Error ? caught.message : 'Sauvegarde impossible');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-[1.35rem] border border-[var(--syn-border)] bg-[var(--syn-surface-muted)] p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-black/45">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement de ton identité...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[1.35rem] border border-[var(--syn-border)] bg-[var(--syn-surface-muted)] p-4 shadow-[0_10px_24px_var(--syn-shadow)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-[#171313]">Moyens de connexion</div>
            <div className="mt-1 text-xs font-semibold text-black/42">Les identités reliées au même compte Synaura.</div>
          </div>
          <StatusPill active={Boolean(details?.user.emailVerified)}>
            Email {details?.user.emailVerified ? 'vérifié' : 'à vérifier'}
          </StatusPill>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusPill active={Boolean(details?.user.providers.includes('email'))}>
            <Mail className="h-3.5 w-3.5" />
            Email
          </StatusPill>
          <StatusPill active={Boolean(details?.user.providers.includes('google'))}>
            <BadgeCheck className="h-3.5 w-3.5" />
            Google
          </StatusPill>
        </div>
        <div className="mt-4 break-all rounded-xl border border-[#dbcdb8] bg-[#fff8ee] px-4 py-3 text-sm font-black text-[#171313]">
          {details?.user.email || 'Adresse email indisponible'}
        </div>
      </div>

      <div className="rounded-[1.35rem] border border-[var(--syn-border)] bg-[var(--syn-surface-muted)] p-4 shadow-[0_10px_24px_var(--syn-shadow)]">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#171313] text-white">
            <User className="h-5 w-5" />
          </span>
          <div>
            <div className="text-sm font-black text-[#171313]">Identité privée</div>
            <div className="mt-1 text-xs font-semibold leading-5 text-black/42">
              Ces données ne figurent pas sur ton profil public.
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Prénom">
            <input
              value={form.firstName}
              onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
              autoComplete="given-name"
              className={INPUT}
              placeholder="Ton prénom"
            />
          </Field>
          <Field label="Nom">
            <input
              value={form.lastName}
              onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
              autoComplete="family-name"
              className={INPUT}
              placeholder="Ton nom"
            />
          </Field>
          <Field label="Date de naissance">
            <span className="relative block">
              <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/32" />
              <input
                type="date"
                value={form.birthDate}
                onChange={(event) => setForm((current) => ({ ...current, birthDate: event.target.value }))}
                max={maximumBirthDate()}
                autoComplete="bday"
                className={`${INPUT} pl-11`}
              />
            </span>
          </Field>
          <Field label="Visibilité de l'anniversaire">
            <select
              value={form.birthdayVisibility}
              onChange={(event) => setForm((current) => ({
                ...current,
                birthdayVisibility: event.target.value as typeof current.birthdayVisibility,
              }))}
              className={INPUT}
            >
              <option value="private">Privé</option>
              <option value="friends">Amis</option>
              <option value="public">Public</option>
            </select>
          </Field>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={form.discoverableByEmail}
          onClick={() => setForm((current) => ({
            ...current,
            discoverableByEmail: !current.discoverableByEmail,
          }))}
          className="mt-4 flex w-full items-center justify-between gap-4 rounded-xl border border-[#dbcdb8] bg-[#fff8ee] px-4 py-3 text-left"
        >
          <span>
            <span className="block text-sm font-black text-[#171313]">Me retrouver avec mon email</span>
            <span className="mt-1 block text-xs font-semibold text-black/42">Autorise les contacts qui connaissent ton adresse à trouver ton profil.</span>
          </span>
          <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${form.discoverableByEmail ? 'bg-[#171313]' : 'bg-[#d8cbb8]'}`}>
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${form.discoverableByEmail ? 'left-6' : 'left-1'}`} />
          </span>
        </button>

        {!details?.private.profileComplete ? (
          <div className="mt-4 space-y-2 rounded-xl border border-[#dbcdb8] bg-[#fff8ee] p-4">
            <div className="text-xs font-black uppercase tracking-[0.12em] text-black/42">Finaliser le compte</div>
            <label className="flex items-start gap-3 text-xs font-bold leading-5 text-black/56">
              <input type="checkbox" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#171313]" />
              J&apos;accepte les conditions d&apos;utilisation actuelles.
            </label>
            <label className="flex items-start gap-3 text-xs font-bold leading-5 text-black/56">
              <input type="checkbox" checked={acceptPrivacy} onChange={(event) => setAcceptPrivacy(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#171313]" />
              J&apos;accepte la politique de confidentialité actuelle.
            </label>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#171313] px-5 text-sm font-black text-white transition hover:bg-black disabled:opacity-45"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Enregistrer
        </button>
      </div>
    </div>
  );
}

export function WebMfaPanel({
  onSessionRefresh,
}: {
  onSessionRefresh: () => Promise<void>;
}) {
  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeFactor = useMemo(
    () => factors.find((factor) => factor.type === 'totp' && factor.status === 'verified') || null,
    [factors],
  );

  const load = async () => {
    setLoading(true);
    try {
      const json = await readJson(await fetch('/api/auth/web/mfa', { cache: 'no-store' }));
      setFactors(Array.isArray(json.data?.factors) ? json.data.factors : []);
    } catch (caught) {
      notify.error('Sécurité', caught instanceof Error ? caught.message : 'État 2FA indisponible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const post = async (payload: Record<string, unknown>) => readJson(await fetch('/api/auth/web/mfa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }));

  const startEnrollment = async () => {
    setBusy(true);
    try {
      const json = await post({ action: 'enroll-totp' });
      setEnrollment(json.data as TotpEnrollment);
      setCode('');
    } catch (caught) {
      notify.error('2FA', caught instanceof Error ? caught.message : 'Activation impossible');
    } finally {
      setBusy(false);
    }
  };

  const verifyEnrollment = async () => {
    if (!enrollment || code.length !== 6) return;
    setBusy(true);
    try {
      const json = await post({
        action: 'verify',
        factorId: enrollment.factorId,
        code,
      });
      setFactors(Array.isArray(json.data?.factors) ? json.data.factors : []);
      setEnrollment(null);
      setCode('');
      await onSessionRefresh();
      notify.success('2FA', 'Application d’authentification activée');
    } catch (caught) {
      notify.error('2FA', caught instanceof Error ? caught.message : 'Code incorrect');
    } finally {
      setBusy(false);
    }
  };

  const cancelEnrollment = async () => {
    if (!enrollment) return;
    setBusy(true);
    try {
      await post({ action: 'cancel-enrollment', factorId: enrollment.factorId });
      setEnrollment(null);
      setCode('');
    } catch (caught) {
      notify.error('2FA', caught instanceof Error ? caught.message : 'Annulation impossible');
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!activeFactor || disableCode.length !== 6) return;
    setBusy(true);
    try {
      const json = await post({
        action: 'unenroll',
        factorId: activeFactor.id,
        code: disableCode,
      });
      setFactors(Array.isArray(json.data?.factors) ? json.data.factors : []);
      setDisableCode('');
      await onSessionRefresh();
      notify.success('2FA', 'Double authentification désactivée');
    } catch (caught) {
      notify.error('2FA', caught instanceof Error ? caught.message : 'Désactivation impossible');
    } finally {
      setBusy(false);
    }
  };

  const copySecret = async () => {
    if (!enrollment?.secret) return;
    await navigator.clipboard.writeText(enrollment.secret);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="rounded-[1.35rem] border border-[var(--syn-border)] bg-[var(--syn-surface-muted)] p-4 shadow-[0_10px_24px_var(--syn-shadow)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#171313] text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <div className="text-sm font-black text-[#171313]">Application d&apos;authentification</div>
            <div className="mt-1 text-xs font-semibold leading-5 text-black/42">
              Protection gratuite par code TOTP, sans SMS ni abonnement.
            </div>
          </div>
        </div>
        <StatusPill active={Boolean(activeFactor)}>
          {activeFactor ? 'Active' : 'Inactive'}
        </StatusPill>
      </div>

      {loading ? (
        <div className="mt-5 flex items-center gap-2 rounded-xl bg-black/[0.04] px-4 py-3 text-sm font-bold text-black/44">
          <Loader2 className="h-4 w-4 animate-spin" />
          Vérification...
        </div>
      ) : activeFactor ? (
        <div className="mt-5 border-t border-black/[0.08] pt-5">
          <div className="rounded-xl border border-[var(--syn-border)] bg-[var(--syn-soft)] px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-black text-[var(--syn-success)]">
              <BadgeCheck className="h-4 w-4" />
              Tes nouvelles connexions demandent un second code.
            </div>
            <div className="mt-1 text-xs font-semibold text-[var(--syn-text-secondary)]">
              {activeFactor.friendlyName || 'Synaura Authenticator'}
            </div>
          </div>
          <div className="mt-4">
            <Field label="Code actuel pour désactiver">
              <div className="flex flex-col gap-2 sm:flex-row">
                <span className="relative block flex-1">
                  <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/32" />
                  <input
                    value={disableCode}
                    onChange={(event) => setDisableCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    className={`${INPUT} pl-11 font-mono tracking-[0.2em]`}
                  />
                </span>
                <button
                  type="button"
                  disabled={busy || disableCode.length !== 6}
                  onClick={() => void disable()}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/8 px-4 text-sm font-black text-red-700 transition hover:bg-red-500/12 disabled:opacity-40"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Désactiver
                </button>
              </div>
            </Field>
          </div>
        </div>
      ) : enrollment ? (
        <div className="mt-5 border-t border-black/[0.08] pt-5">
          <div className="grid gap-5 md:grid-cols-[190px_minmax(0,1fr)]">
            <div className="flex aspect-square items-center justify-center rounded-xl border border-[#d8cbb8] bg-white p-3">
              <img src={enrollment.qrCode} alt="QR code pour l'application d'authentification" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-black text-[#171313]">
                <QrCode className="h-4 w-4" />
                Scanne le QR code
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-black/48">
                Utilise Google Authenticator, Microsoft Authenticator, Authy ou toute application TOTP compatible.
              </p>
              <div className="mt-3 rounded-xl border border-[#dbcdb8] bg-[#fff8ee] p-3">
                <div className="break-all font-mono text-xs font-black text-[#171313]">{enrollment.secret}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void copySecret()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-black/[0.06] px-3 text-xs font-black text-black/58">
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copié' : 'Copier la clé'}
                  </button>
                  <a href={enrollment.uri} className="inline-flex h-9 items-center gap-2 rounded-lg bg-black/[0.06] px-3 text-xs font-black text-black/58">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ouvrir l&apos;application
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5">
            <Field label="Code généré par l'application">
              <span className="relative block">
                <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/32" />
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  className={`${INPUT} pl-11 font-mono text-lg tracking-[0.22em]`}
                />
              </span>
            </Field>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || code.length !== 6}
                onClick={() => void verifyEnrollment()}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#171313] px-5 text-sm font-black text-white disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Activer la 2FA
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void cancelEnrollment()}
                className="inline-flex h-11 items-center rounded-xl border border-[#d8cbb8] bg-white px-4 text-sm font-black text-black/52 disabled:opacity-40"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 border-t border-black/[0.08] pt-5">
          <button
            type="button"
            disabled={busy}
            onClick={() => void startEnrollment()}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#171313] px-5 text-sm font-black text-white transition hover:bg-black disabled:opacity-45"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
            Configurer la 2FA gratuite
          </button>
        </div>
      )}
    </div>
  );
}
