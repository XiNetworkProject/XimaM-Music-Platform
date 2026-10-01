'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flame,
  Gift,
  History,
  Info,
  Loader2,
  Music2,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  User as UserRound,
  X,
  Zap,
} from 'lucide-react';
import { useBoosters, type InventoryItem } from '@/hooks/useBoosters';
import {
  PACKS,
  RARITY_LABEL,
  effectiveBoost,
  type Booster,
} from '@/lib/boosters/policy';
import ExperienceMotionFrame from '@/components/ambient/ExperienceMotionFrame';
import BoosterDialog from '@/components/boosters/BoosterDialog';
import BoosterOpening from '@/components/boosters/BoosterOpening';
import BoosterCatalog from '@/components/boosters/BoosterCatalog';
import {
  activationFamily,
  campaignDefinition,
  campaignEligibility,
  campaignExpiry,
  familyFor,
} from '@/lib/boosters/campaigns';
import DailyRewardWheel from '@/components/boosters/DailyRewardWheel';
import RewardWheel from '@/components/boosters/RewardWheel';
import {
  readWheelOutcome,
  type WheelResponse,
} from '@/components/boosters/wheelModel';
import { useBoosterResource } from '@/components/boosters/useBoosterResource';
import './boosters.css';

type Tab = 'inventory' | 'rewards' | 'activity' | 'catalog';
type Track = {
  id: string;
  title: string;
  coverUrl?: string;
  createdAt?: string;
};
type Active = {
  id?: string;
  booster_key?: string;
  track_id?: string;
  artist_id?: string;
  multiplier: number;
  expires_at: string;
};
type Mission = {
  id: string;
  title: string;
  goal_type: string;
  progress: number;
  threshold: number;
  canClaim: boolean;
  claimed: boolean;
  resetsAt?: string;
  reward?: Booster;
};
type Received = { inventory_id: string; booster: Booster };
type HistoryItem = {
  id: string;
  opened_at: string;
  source: string;
  rarity: Booster['rarity'];
  type: string;
  multiplier: number;
  duration_hours: number;
};
const duration = (hours: number) =>
  hours >= 24 && hours % 24 === 0 ? `${hours / 24} j` : `${hours} h`;
function countdown(ms: number) {
  if (ms <= 0) return 'Disponible';
  const minutes = Math.ceil(ms / 60_000),
    hours = Math.floor(minutes / 60);
  return hours
    ? `${hours} h ${String(minutes % 60).padStart(2, '0')}`
    : `${minutes} min`;
}
const date = (value: string) =>
  new Date(value).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
const typeLabel = (type: string) =>
  type === 'credits'
    ? 'Crédits Studio'
    : type === 'artist'
    ? 'Artiste'
    : 'Morceau';
function Seal({
  rarity = 'rare',
  small = false,
}: {
  rarity?: Booster['rarity'];
  small?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`boost-seal ${small ? 'is-small' : ''}`}
      data-rarity={rarity}
    >
      <span />
      <Zap fill="currentColor" strokeWidth={1.3} />
    </span>
  );
}
function ErrorBlock({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className="boost-error" role="alert">
      <p>{message}</p>
      <button className="boost-text-button" onClick={retry}>
        Réessayer <ArrowRight size={15} />
      </button>
    </div>
  );
}
function Empty({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="boost-empty">
      <Radio size={32} strokeWidth={1} aria-hidden="true" />
      <h3>{title}</h3>
      {children}
    </div>
  );
}
function Activity({
  identity,
  revision,
  inventory,
}: {
  identity: string;
  revision: number;
  inventory: InventoryItem[];
}) {
  const [kind, setKind] = useState<'received' | 'used'>('received');
  const [cursors, setCursors] = useState<string[]>([]);
  const cursor = cursors.at(-1);
  const history = useBoosterResource<{
    items: HistoryItem[];
    nextCursor: string | null;
  }>(
    kind === 'received'
      ? `/api/boosters/history?limit=20${
          cursor ? '&cursor=' + encodeURIComponent(cursor) : ''
        }`
      : null,
    identity,
    revision
  );
  const used = inventory
    .filter((item) => item.status === 'used')
    .sort(
      (a, b) =>
        new Date(b.used_at || b.obtained_at).getTime() -
        new Date(a.used_at || a.obtained_at).getTime()
    );
  return (
    <section className="boost-section">
      <header className="boost-section-heading">
        <div>
          <span className="boost-eyebrow">LE FIL DE TES BOOSTS</span>
          <h2>Chaque mouvement compte.</h2>
        </div>
      </header>
      <nav className="boost-filter" aria-label="Type d’activité">
        <button
          aria-pressed={kind === 'received'}
          onClick={() => setKind('received')}
        >
          Reçus
        </button>
        <button aria-pressed={kind === 'used'} onClick={() => setKind('used')}>
          Activés
        </button>
      </nav>
      {kind === 'received' ? (
        <>
          {history.loading && (
            <p role="status" className="boost-loading">
              <Loader2 /> Chargement de l’activité…
            </p>
          )}
          {history.error && (
            <ErrorBlock message={history.error} retry={history.reload} />
          )}
          {!history.loading &&
            !history.error &&
            !history.data?.items.length && (
              <Empty title="Le début de ton histoire.">
                <p>Tes récompenses reçues apparaîtront ici.</p>
              </Empty>
            )}
          <div className="boost-history">
            {history.data?.items.map((item) => (
              <article key={item.id}>
                <Seal rarity={item.rarity || 'common'} small />
                <div>
                  <strong>
                    {typeLabel(item.type)} ·{' '}
                    {RARITY_LABEL[item.rarity] || 'Booster'}
                  </strong>
                  <span>
                    {item.source === 'daily'
                      ? 'Booster quotidien'
                      : item.source === 'spin'
                      ? 'Roue du jour'
                      : item.source.startsWith('pack:')
                      ? 'Pack abonnement'
                      : item.source === 'mission'
                      ? 'Mission accomplie'
                      : 'Récompense'}{' '}
                    ·{' '}
                    {item.type === 'credits'
                      ? 'Recharge Studio'
                      : duration(item.duration_hours)}
                  </span>
                </div>
                <time dateTime={item.opened_at}>{date(item.opened_at)}</time>
              </article>
            ))}
          </div>
          <div className="boost-pagination">
            <button
              className="boost-secondary"
              disabled={!cursors.length || history.loading}
              onClick={() => setCursors((values) => values.slice(0, -1))}
            >
              <ChevronLeft size={16} /> Précédent
            </button>
            <button
              className="boost-secondary"
              disabled={!history.data?.nextCursor || history.loading}
              onClick={() => {
                if (history.data?.nextCursor)
                  setCursors((values) => [
                    ...values,
                    history.data!.nextCursor!,
                  ]);
              }}
            >
              Suivant <ChevronRight size={16} />
            </button>
          </div>
        </>
      ) : (
        <>
          {!used.length && (
            <Empty title="Aucun boost activé pour le moment.">
              <p>Choisis un boost dans ta réserve pour te lancer.</p>
            </Empty>
          )}
          <div className="boost-history">
            {used.map((item) => (
              <article key={item.id}>
                <Seal rarity={item.booster.rarity} small />
                <div>
                  <strong>{item.booster.name}</strong>
                  <span>
                    {typeLabel(item.booster.type)} ·{' '}
                    {duration(item.booster.duration_hours)}
                    {item.metadata?.activation
                      ? ` · Fin ${date(item.metadata.activation.expiresAt)}`
                      : ''}
                  </span>
                </div>
                {item.used_at && (
                  <time dateTime={item.used_at}>{date(item.used_at)}</time>
                )}
              </article>
            ))}
          </div>
          {!!used.length && (
            <p className="boost-footnote">
              Les activations anciennes ne disposent pas toutes d’un détail de
              cible enregistré.
            </p>
          )}
        </>
      )}
    </section>
  );
}

export default function BoostersClient() {
  const { data: session, status } = useSession();
  const boosts = useBoosters();
  const {
    inventory,
    identity,
    revision,
    now,
    plan,
    packs,
    canOpen,
    remainingMs,
    openDaily,
    useOnTrack,
    useOnArtist,
  } = boosts;
  const [tab, setTab] = useState<Tab>('inventory'),
    [filter, setFilter] = useState<'all' | 'track' | 'artist' | 'credits'>(
      'all'
    );
  const [query, setQuery] = useState(''),
    [trackQuery, setTrackQuery] = useState('');
  const [pending, setPending] = useState<InventoryItem | null>(null),
    [target, setTarget] = useState<Track | null>(null),
    [confirming, setConfirming] = useState(false);
  const [received, setReceived] = useState<Received[] | null>(null),
    [rules, setRules] = useState(false);
  const [notice, setNotice] = useState<{
    text: string;
    error?: boolean;
  } | null>(null);
  const [spinResult, setSpinResult] = useState<{
    label: string;
    kind: string;
  } | null>(null);
  const [opening, setOpening] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);
  const active = useBoosterResource<{
    boosts: Active[];
    artistBoosts: Active[];
  }>('/api/boosters/my-active', identity, revision);
  const missions = useBoosterResource<{ missions: Mission[] }>(
    tab === 'rewards' ? '/api/missions' : null,
    identity,
    revision
  );
  const spin = useBoosterResource<{
    canSpin: boolean;
    nextAvailableAt: string | null;
  }>(tab === 'rewards' ? '/api/daily-spin' : null, identity, revision);
  const tracks = useBoosterResource<{ tracks: Track[] }>(
    pending?.booster.type === 'track' || active.data?.boosts.length
      ? '/api/boosters/targets'
      : null,
    identity
  );
  useEffect(() => {
    setPending(null);
    setReceived(null);
    setOpening(false);
    setWheelOpen(false);
    setNotice(null);
    setSpinResult(null);
    setTarget(null);
  }, [identity]);
  const owned = inventory.filter((item) => item.status === 'owned');
  const groups = useMemo(() => {
    const map = new Map<string, InventoryItem[]>();
    for (const item of inventory)
      if (
        item.status === 'owned' &&
        item.booster &&
        (filter === 'all' || item.booster.type === filter) &&
        item.booster.name
          .toLocaleLowerCase('fr')
          .includes(query.toLocaleLowerCase('fr'))
      )
        map.set(item.booster.id, [...(map.get(item.booster.id) || []), item]);
    return Array.from(map.values()).sort(
      (a, b) => b[0].booster.multiplier - a[0].booster.multiplier
    );
  }, [inventory, filter, query]);
  const running = [
    ...(active.data?.boosts || []),
    ...(active.data?.artistBoosts || []),
  ].filter((item) => new Date(item.expires_at).getTime() > now);
  const eligibleTracks = (tracks.data?.tracks || []).filter(
    (track) =>
      !track.id.startsWith('ai-') &&
      !track.id.startsWith('radio-') &&
      (!pending ||
        !campaignEligibility(pending.booster.key, track.createdAt, now))
  );
  const closeActivation = () => {
    if (!boosts.busy) {
      setPending(null);
      setTarget(null);
      setConfirming(false);
    }
  };
  const selectBoost = (item: InventoryItem) => {
    setReceived(null);
    setOpening(false);
    setPending(item);
    setTarget(null);
    setConfirming(item.booster.type !== 'track');
    setTrackQuery('');
    setNotice(null);
  };
  const open = async () => {
    setNotice(null);
    setReceived(null);
    setOpening(true);
    const result = await openDaily();
    if (!result.ok) {
      setOpening(false);
      setNotice({
        text: result.error || 'Ouverture indisponible.',
        error: true,
      });
    } else if (result.received)
      setReceived([
        {
          inventory_id: result.received.inventoryId,
          booster: result.received.booster,
        },
      ]);
    else {
      setOpening(false);
      setNotice({
        text: 'Réponse reçue sans détail du boost. Consulte ta réserve avant de réessayer.',
        error: true,
      });
    }
  };
  const claimPack = async (packKey: string) => {
    setNotice(null);
    setReceived(null);
    setOpening(true);
    const result = await boosts.perform('/api/boosters/claim-pack', {
      packKey,
    });
    if (result.ok && result.data?.received?.length)
      setReceived(result.data.received);
    else {
      setOpening(false);
      setNotice({
        text:
          result.error ||
          'Aucun détail de récompense reçu. Consulte ta réserve avant de réessayer.',
        error: true,
      });
    }
  };
  const claimMission = async (missionId: string) => {
    setNotice(null);
    const result = await boosts.perform('/api/missions/claim', { missionId });
    if (!result.ok)
      setNotice({
        text: result.error || 'Récompense indisponible.',
        error: true,
      });
    else if (result.data.received) {
      setReceived([result.data.received]);
      setOpening(true);
    } else setNotice({ text: 'Mission récupérée.' });
  };
  const claimReadyMissions = async () => {
    const ids = (missions.data?.missions || [])
      .filter((mission) => mission.canClaim)
      .map((mission) => mission.id)
      .slice(0, 20);
    if (!ids.length) return;
    setNotice(null);
    const result = await boosts.perform('/api/missions/claim-many', {
      missionIds: ids,
    });
    if (!result.ok) {
      setNotice({
        text: result.error || 'Récompenses indisponibles.',
        error: true,
      });
      return;
    }
    const count = result.data.claimed?.length || 0;
    const errors = result.data.errors || [];
    setNotice({
      text: `${count} récompense(s) récupérée(s).${
        errors.length
          ? ` ${errors.length} en attente : ${errors[0].error}`
          : ' Retrouve-les dans ta réserve.'
      }`,
      error: errors.length > 0,
    });
  };
  const activate = async () => {
    if (!pending || (pending.booster.type === 'track' && !target)) return;
    const result =
      pending.booster.type !== 'track'
        ? await useOnArtist(pending.id)
        : await useOnTrack(pending.id, target!.id);
    if (!result.ok) {
      setNotice({
        text: result.error || 'Activation indisponible.',
        error: true,
      });
      return;
    }
    setPending(null);
    setTarget(null);
    setConfirming(false);
    setTab('inventory');
    setNotice({
      text: result.data.credits
        ? `+${result.data.credits.amount} crédits IA ajoutés à ton solde.`
        : `Boost activé jusqu’au ${date(result.data.boost.expiresAt)}.`,
    });
  };
  const spinDaily = async (): Promise<WheelResponse> => {
    setNotice(null);
    const result = await boosts.perform('/api/daily-spin');
    if (!result.ok) {
      setNotice({ text: result.error || 'Tour indisponible.', error: true });
      spin.reload();
      return { ok: false, error: result.error || 'Tour indisponible.' };
    }
    const outcome = readWheelOutcome(result.data);
    if (!outcome) {
      spin.reload();
      return {
        ok: false,
        error:
          'Résultat non confirmé. Vérifie ta réserve et ton solde avant de rejouer.',
      };
    }
    setSpinResult({
      label: outcome.reward.label,
      kind: outcome.reward.kind,
    });
    return { ok: true, result: outcome };
  };

  if (status === 'loading')
    return (
      <main className="boost-page">
        <p role="status" className="boost-loading">
          <Loader2 /> Chargement de tes boosts…
        </p>
      </main>
    );
  if (!identity)
    return (
      <main className="boost-page">
        <div className="boost-guest">
          <Seal />
          <span className="boost-eyebrow">BOOSTERS SYNAURA</span>
          <h1>
            Ta musique.
            <br />
            Un peu plus loin.
          </h1>
          <p>Connecte-toi pour retrouver tes boosts et tes récompenses.</p>
          <Link
            className="boost-primary"
            href="/auth/signin?callbackUrl=%2Fboosters"
          >
            Se connecter <ArrowRight size={18} />
          </Link>
        </div>
      </main>
    );

  const sameTarget = pending
    ? running.filter(
        (item) =>
          activationFamily(item.booster_key) ===
            activationFamily(pending.booster.key) &&
          (pending.booster.type === 'credits'
            ? false
            : pending.booster.type === 'artist'
            ? item.artist_id === identity
            : item.track_id === target?.id)
      )
    : [];
  const preview = pending
    ? effectiveBoost(sameTarget, pending.booster, now)
    : null;
  if (preview && pending)
    preview.expiresAt = campaignExpiry(
      pending.booster.key,
      target?.createdAt,
      preview.expiresAt
    );
  const dominated =
    !!preview &&
    sameTarget.some(
      (item) =>
        Number(item.multiplier) >= preview.multiplier &&
        new Date(item.expires_at).getTime() >=
          new Date(preview.expiresAt).getTime()
    );
  const spinWait = spin.data?.nextAvailableAt
    ? Math.max(0, new Date(spin.data.nextAvailableAt).getTime() - now)
    : 0;
  const spinReady = !!spin.data && (spin.data.canSpin || spinWait === 0);
  return (
    <main className="boost-page">
      <ExperienceMotionFrame className="boost-stage">
        <div className="boost-stage-copy">
          <span className="boost-eyebrow">
            <Zap size={13} /> BOOSTERS / FAIS PASSER LE SON
          </span>
          <h1>
            Fais-toi
            <br />
            <em>remarquer.</em>
          </h1>
          <p>
            Un coup de lumière sur ta musique.
            <br />À toi de choisir le bon moment.
          </p>
          <div className="boost-hero-actions">
            <button
              className="boost-primary"
              disabled={!canOpen}
              onClick={open}
            >
              {boosts.busy ? <Loader2 size={18} /> : <Gift size={18} />}
              {canOpen
                ? 'Récupérer mon boost'
                : boosts.ready
                ? `Prochain dans ${countdown(remainingMs)}`
                : 'Chargement…'}
            </button>
            <button
              className="boost-text-button"
              onClick={() => setRules(true)}
            >
              Comment ça marche <ArrowUpRight size={16} />
            </button>
          </div>
          <span className="boost-hero-note">
            Inclus · aucun crédit dépensé · toutes les{' '}
            {boosts.cooldownMs / 3_600_000} h
          </span>
        </div>
        <div className="boost-stage-art" aria-hidden="true">
          <div className="boost-scene">
            <div className="boost-halo" />
            <div className="boost-orbit orbit-one" />
            <div className="boost-orbit orbit-two" />
            <div className="boost-beam" />
            <div className="boost-core">
              <Seal />
            </div>
            <span className="boost-signal signal-one">TON SON</span>
            <span className="boost-signal signal-two">
              <span /> PLUS LOIN
            </span>
            {Array.from({ length: 8 }, (_, i) => (
              <i
                className="boost-particle"
                key={i}
                style={{ '--i': i } as CSSProperties}
              />
            ))}
            <div className="boost-stage-caption">
              DE LA CRÉATION À LA DÉCOUVERTE
            </div>
          </div>
        </div>
      </ExperienceMotionFrame>

      <div className="boost-status-strip">
        <div>
          <strong>{boosts.ready ? owned.length : '—'}</strong>
          <span>en réserve</span>
        </div>
        <div>
          <span className={running.length ? 'boost-live-dot' : ''} />
          <strong>{active.data ? running.length : '—'}</strong>
          <span>en cours</span>
        </div>
        <div>
          <Flame size={17} />
          <strong>{boosts.ready ? boosts.streak : '—'}</strong>
          <span>ouvertures suivies</span>
        </div>
        <button className="boost-text-button" onClick={() => setRules(true)}>
          <ShieldCheck size={16} />
          <span>Des effets transparents</span>
        </button>
      </div>

      {boosts.error && (
        <ErrorBlock
          message={boosts.error}
          retry={() => void boosts.fetchInventory()}
        />
      )}
      {notice && !pending && (
        <div
          className={`boost-notice ${notice.error ? 'is-error' : ''}`}
          role={notice.error ? 'alert' : 'status'}
        >
          {notice.error ? <Info size={18} /> : <Check size={18} />}
          <span>{notice.text}</span>
          <button
            className="boost-icon-button"
            aria-label="Masquer le message"
            onClick={() => setNotice(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <nav className="boost-tabs" aria-label="Espace Boosters">
        {(
          [
            { id: 'inventory', label: 'Mes boosts', icon: Zap },
            { id: 'rewards', label: 'Récompenses', icon: Gift },
            { id: 'catalog', label: 'Catalogue', icon: Sparkles },
            { id: 'activity', label: 'Activité', icon: History },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            aria-pressed={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            <item.icon size={17} />
            <span>{item.label}</span>
            {item.id === 'inventory' && owned.length > 0 && (
              <b>{owned.length}</b>
            )}
          </button>
        ))}
      </nav>

      {tab === 'inventory' && (
        <section className="boost-section">
          <button
            className="boost-catalog-teaser"
            onClick={() => setTab('catalog')}
          >
            <Sparkles size={23} />
            <span>
              <strong>36 nouveaux boosters à explorer</strong>
              <small>
                Visibilité ciblée, nouveaux auditeurs et crédits Studio.
              </small>
            </span>
            <ArrowUpRight size={20} />
          </button>
          {active.error && (
            <ErrorBlock
              message="Le suivi des boosts actifs est indisponible."
              retry={active.reload}
            />
          )}
          {!!running.length && (
            <div className="boost-running">
              <header>
                <span className="boost-live-dot" />
                <h2>Sous les projecteurs</h2>
              </header>
              {running.map((item) => (
                <article
                  key={
                    item.id ||
                    `${item.track_id || item.artist_id}:${
                      item.booster_key || 'legacy'
                    }`
                  }
                >
                  <div className="boost-running-icon">
                    {item.artist_id ? <UserRound /> : <Music2 />}
                  </div>
                  <div>
                    <strong>
                      {item.artist_id
                        ? 'Ton profil artiste'
                        : tracks.data?.tracks.find(
                            (track) => track.id === item.track_id
                          )?.title || 'Ton morceau'}
                    </strong>
                    <span>
                      {familyFor(item.booster_key)?.name || 'Boost'} · Actif
                      jusqu’au {date(item.expires_at)}
                    </span>
                  </div>
                  <div className="boost-running-time">
                    <span>Temps restant</span>
                    <strong>
                      {countdown(new Date(item.expires_at).getTime() - now)}
                    </strong>
                  </div>
                </article>
              ))}
            </div>
          )}
          <header className="boost-section-heading">
            <div>
              <span className="boost-eyebrow">À TOI DE JOUER</span>
              <h2>Ta réserve d’énergie.</h2>
              <p>Choisis un boost. On s’occupe de la suite, ensemble.</p>
            </div>
            <button
              className="boost-secondary"
              onClick={() => setTab('rewards')}
            >
              Obtenir des boosts <ArrowRight size={16} />
            </button>
          </header>
          {!!owned.length && (
            <div className="boost-inventory-tools">
              <nav className="boost-filter" aria-label="Filtrer les boosters">
                {(['all', 'track', 'artist', 'credits'] as const).map(
                  (value) => (
                    <button
                      key={value}
                      aria-pressed={filter === value}
                      onClick={() => setFilter(value)}
                    >
                      {value === 'all'
                        ? 'Tout'
                        : value === 'track'
                        ? 'Morceaux'
                        : value === 'credits'
                        ? 'Studio'
                        : 'Artiste'}
                    </button>
                  )
                )}
              </nav>
              <label className="boost-search">
                <Search size={16} />
                <input
                  aria-label="Rechercher un booster"
                  placeholder="Rechercher un boost"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
            </div>
          )}
          {boosts.loading && !boosts.ready && (
            <p role="status" className="boost-loading">
              <Loader2 /> Ta réserve arrive…
            </p>
          )}
          {boosts.ready && !owned.length && (
            <div className="boost-starter">
              <div className="boost-starter-art" aria-hidden="true">
                <Seal rarity="common" />
                <Seal rarity="rare" />
                <Seal rarity="epic" />
              </div>
              <div>
                <span className="boost-eyebrow">LE PREMIER PAS</span>
                <h3>
                  Ton prochain coup
                  <br />
                  de projecteur est ici.
                </h3>
                <p>
                  Récupère un boost gratuit, garde-le dans ta réserve, puis
                  active-le sur ton morceau ou ton profil.
                </p>
                <button
                  className="boost-text-button"
                  onClick={() => setTab('rewards')}
                >
                  Découvrir mes récompenses <ArrowRight size={17} />
                </button>
              </div>
            </div>
          )}
          {!!owned.length && !groups.length && (
            <Empty title="Aucun boost dans cette sélection.">
              <button
                className="boost-text-button"
                onClick={() => {
                  setFilter('all');
                  setQuery('');
                }}
              >
                Effacer les filtres
              </button>
            </Empty>
          )}
          <div className="boost-inventory-grid">
            {groups.map((items) => {
              const item = items[0],
                booster = item.booster;
              return (
                <article
                  key={booster.id}
                  className="boost-card"
                  data-rarity={booster.rarity}
                >
                  <div className="boost-card-top">
                    <span>{RARITY_LABEL[booster.rarity]}</span>
                    <b>
                      ×{items.length}{' '}
                      <span className="sr-only">exemplaires</span>
                    </b>
                  </div>
                  <div className="boost-card-art">
                    <Seal rarity={booster.rarity} />
                  </div>
                  <span className="boost-eyebrow">
                    {typeLabel(booster.type)}
                  </span>
                  <h3>{booster.name}</h3>
                  {familyFor(booster.key) && (
                    <p className="boost-card-effect">
                      {familyFor(booster.key)!.description}
                    </p>
                  )}
                  <div className="boost-card-spec">
                    <span>
                      <Clock3 size={14} />{' '}
                      {booster.type === 'credits'
                        ? 'Recharge immédiate'
                        : duration(booster.duration_hours)}
                    </span>
                    <span>
                      {booster.type === 'credits'
                        ? `+${
                            campaignDefinition(booster.key)?.credits || 0
                          } crédits`
                        : `Indice ${Number(booster.multiplier).toLocaleString(
                            'fr-FR'
                          )}×`}
                    </span>
                  </div>
                  <button
                    className="boost-card-action"
                    disabled={boosts.busy || booster.enabled === false}
                    onClick={() => selectBoost(item)}
                  >
                    {booster.enabled === false
                      ? 'Indisponible'
                      : booster.type === 'track'
                      ? 'Choisir mon morceau'
                      : booster.type === 'credits'
                      ? 'Ajouter mes crédits'
                      : campaignDefinition(booster.key)
                      ? 'Booster mon catalogue'
                      : 'Booster mon profil'}
                    <ArrowUpRight size={18} />
                  </button>
                </article>
              );
            })}
          </div>
          <div className="boost-how">
            <div>
              <span>01</span>
              <strong>Récupère</strong>
              <p>Un boost gratuit ou une récompense de mission.</p>
            </div>
            <div>
              <span>02</span>
              <strong>Choisis</strong>
              <p>Ton morceau ou ton profil, selon le type de boost.</p>
            </div>
            <div>
              <span>03</span>
              <strong>Active</strong>
              <p>Vérifie l’effet et la durée. Tu gardes le dernier mot.</p>
            </div>
          </div>
        </section>
      )}

      {tab === 'rewards' && (
        <section className="boost-section">
          <header className="boost-section-heading">
            <div>
              <span className="boost-eyebrow">ÇA SE GAGNE AUSSI</span>
              <h2>Un peu d’élan, chaque jour.</h2>
              <p>Pas besoin d’abonnement pour commencer.</p>
            </div>
          </header>
          <div className="boost-reward-grid">
            <article className="boost-daily">
              <div className="boost-reward-symbol">
                <Gift size={28} />
              </div>
              <span className="boost-eyebrow">LE RENDEZ-VOUS</span>
              <h3>Ton boost offert.</h3>
              <p>
                Un booster dans ta réserve toutes les{' '}
                {boosts.cooldownMs / 3_600_000} heures.
              </p>
              {boosts.nextRarity !== 'common' && (
                <span className="boost-guarantee">
                  {RARITY_LABEL[boosts.nextRarity]} ou mieux garanti au prochain
                  tirage
                </span>
              )}
              <button
                className="boost-primary"
                disabled={!canOpen}
                onClick={open}
              >
                {canOpen
                  ? 'Récupérer mon boost'
                  : `Dans ${countdown(remainingMs)}`}{' '}
                <ArrowRight size={16} />
              </button>
              <button
                className="boost-text-button"
                onClick={() => setRules(true)}
              >
                Voir les chances et garanties <Info size={14} />
              </button>
            </article>
            <article className="boost-wheel-card">
              <div className="bw-card-wheel">
                <RewardWheel />
              </div>
              <span className="boost-eyebrow">LE PETIT BONUS</span>
              <h3>À toi de tourner.</h3>
              <p>
                Des crédits IA, un booster… ou un rendez-vous demain. Un tour
                gratuit par jour.
              </p>
              {spinResult && (
                <p className="boost-spin-result" role="status">
                  {spinResult.kind === 'none'
                    ? 'Pas de gain cette fois. Rendez-vous demain !'
                    : `Reçu : ${spinResult.label}`}
                </p>
              )}
              {spin.error ? (
                <ErrorBlock message={spin.error} retry={spin.reload} />
              ) : (
                <button
                  className="boost-secondary"
                  disabled={boosts.busy || spin.loading || !spin.data}
                  onClick={() => setWheelOpen(true)}
                >
                  {spin.loading
                    ? 'Chargement…'
                    : spinReady
                    ? 'Tenter ma chance'
                    : 'Voir la roue'}{' '}
                  <ArrowRight size={16} />
                </button>
              )}
              <span className="boost-footnote">
                50 % booster · 40 % crédits · 10 % sans gain
              </span>
            </article>
          </div>
          <header className="boost-section-heading">
            <div>
              <span className="boost-eyebrow">EN EXPLORANT SYNAURA</span>
              <h2>Tes missions.</h2>
            </div>
            {(missions.data?.missions.filter((mission) => mission.canClaim)
              .length || 0) > 1 ? (
              <button
                className="boost-secondary"
                disabled={boosts.busy}
                onClick={claimReadyMissions}
              >
                Tout récupérer <Gift size={16} />
              </button>
            ) : (
              <Link className="boost-text-button" href="/discover">
                Partir à la découverte <ArrowUpRight size={16} />
              </Link>
            )}
          </header>
          {missions.loading && (
            <p className="boost-loading" role="status">
              <Loader2 /> Chargement des missions…
            </p>
          )}
          {missions.error && (
            <ErrorBlock message={missions.error} retry={missions.reload} />
          )}
          {!missions.loading &&
            !missions.error &&
            !missions.data?.missions.length && (
              <Empty title="Aucune mission en ce moment.">
                <p>Le boost quotidien reste disponible.</p>
              </Empty>
            )}
          <div className="boost-missions">
            {missions.data?.missions.map((mission) => (
              <article key={mission.id}>
                <div className="boost-mission-icon">
                  {mission.claimed ? <Check /> : <Target />}
                </div>
                <div className="boost-mission-copy">
                  <h3>{mission.title.replace(/^(Daily|Weekly):\s*/i, '')}</h3>
                  <p>
                    {mission.reward
                      ? `${RARITY_LABEL[mission.reward.rarity]} · ${typeLabel(
                          mission.reward.type
                        )} · ${duration(mission.reward.duration_hours)}`
                      : 'Mission Synaura'}
                  </p>
                  <progress
                    value={Math.min(mission.progress, mission.threshold)}
                    max={mission.threshold}
                    aria-label={`Progression : ${mission.title}`}
                  />
                  <span>
                    {Math.min(mission.progress, mission.threshold)} /{' '}
                    {mission.threshold}
                    {mission.claimed && mission.resetsAt
                      ? ` · Reprise ${date(mission.resetsAt)}`
                      : ''}
                  </span>
                </div>
                <button
                  className={
                    mission.canClaim ? 'boost-primary' : 'boost-secondary'
                  }
                  disabled={!mission.canClaim || boosts.busy}
                  onClick={() => claimMission(mission.id)}
                >
                  {mission.claimed
                    ? 'Récupéré'
                    : mission.canClaim
                    ? 'Récupérer'
                    : 'En cours'}
                  {mission.canClaim && <ArrowRight size={15} />}
                </button>
              </article>
            ))}
          </div>
          <header className="boost-section-heading">
            <div>
              <span className="boost-eyebrow">INCLUS AVEC TON ABONNEMENT</span>
              <h2>Le rendez-vous hebdo.</h2>
              <p>Les packs reviennent chaque lundi à 00 h UTC.</p>
            </div>
            {plan === 'free' && (
              <Link href="/subscriptions" className="boost-text-button">
                Les abonnements <ArrowUpRight size={16} />
              </Link>
            )}
          </header>
          <div className="boost-pack-grid">
            {Object.entries(PACKS).map(([key, pack]) => {
              const state = packs[key],
                available = !!state?.eligible && state.claimed < state.perWeek;
              return (
                <article key={key}>
                  <div className="boost-pack-art" aria-hidden="true">
                    <Seal
                      rarity={key === 'starter_weekly' ? 'rare' : 'epic'}
                      small
                    />
                    <span>×{pack.size}</span>
                  </div>
                  <div>
                    <h3>{pack.label}</h3>
                    <p>{pack.size} boosters · rares ou mieux</p>
                    <span className="boost-footnote">
                      {pack.perWeek} pack{pack.perWeek > 1 ? 's' : ''} / semaine
                      {state?.eligible ? ` · ${state.claimed} récupéré(s)` : ''}
                    </span>
                  </div>
                  {state?.eligible ? (
                    <button
                      className="boost-secondary"
                      disabled={!available || boosts.busy}
                      onClick={() => claimPack(key)}
                    >
                      {available ? 'Récupérer' : 'À lundi'}{' '}
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <span className="boost-pack-plan">
                      {key === 'starter_weekly'
                        ? 'Dès Starter'
                        : 'Pro & Enterprise'}
                    </span>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {tab === 'activity' && (
        <Activity
          identity={identity}
          revision={revision}
          inventory={inventory}
        />
      )}
      {tab === 'catalog' && (
        <BoosterCatalog
          catalog={boosts.catalog}
          inventory={inventory}
          onSelect={selectBoost}
        />
      )}
      <footer className="boost-footer">
        <ShieldCheck size={16} />
        <p>
          Un boost favorise la découverte. Il n’achète ni écoutes, ni likes, ni
          position garantie.
        </p>
        <button className="boost-text-button" onClick={() => setRules(true)}>
          Les règles <ArrowUpRight size={15} />
        </button>
      </footer>

      {pending && (
        <BoosterDialog
          title={
            confirming
              ? 'Prêt à faire passer le son ?'
              : 'Quel morceau on met en lumière ?'
          }
          onClose={closeActivation}
          busy={boosts.busy}
        >
          <div className="boost-dialog-scroll">
            <div className="boost-selection">
              <Seal rarity={pending.booster.rarity} small />
              <div>
                <strong>{pending.booster.name}</strong>
                <span>
                  {typeLabel(pending.booster.type)} ·{' '}
                  {pending.booster.type === 'credits'
                    ? 'Recharge à usage unique'
                    : duration(pending.booster.duration_hours)}
                </span>
              </div>
            </div>
            {!confirming ? (
              <>
                <label className="boost-search">
                  <Search size={17} />
                  <input
                    aria-label="Rechercher dans mes morceaux"
                    placeholder="Le titre de ton morceau…"
                    value={trackQuery}
                    onChange={(event) => setTrackQuery(event.target.value)}
                  />
                </label>
                <p className="boost-footnote">
                  Tes morceaux originaux publiés avec un audio uniquement. Les
                  pistes IA et les radios ne sont pas éligibles.
                </p>
                {familyFor(pending.booster.key) && (
                  <p className="boost-footnote">
                    {familyFor(pending.booster.key)!.condition}
                  </p>
                )}
                {tracks.loading && (
                  <p className="boost-loading" role="status">
                    <Loader2 /> Chargement de tes morceaux…
                  </p>
                )}
                {tracks.error && (
                  <ErrorBlock message={tracks.error} retry={tracks.reload} />
                )}
                {!tracks.loading && !tracks.error && !eligibleTracks.length && (
                  <Empty title="Ton premier morceau t’attend.">
                    <p>Publie un morceau original pour utiliser ce boost.</p>
                    <Link className="boost-secondary" href="/upload">
                      Publier un morceau <ArrowUpRight size={16} />
                    </Link>
                  </Empty>
                )}
                <div className="boost-track-list">
                  {eligibleTracks
                    .filter((track) =>
                      track.title
                        .toLocaleLowerCase('fr')
                        .includes(trackQuery.toLocaleLowerCase('fr'))
                    )
                    .map((track) => (
                      <label key={track.id}>
                        <input
                          type="radio"
                          name="boost-track"
                          checked={target?.id === track.id}
                          onChange={() => setTarget(track)}
                        />
                        {track.coverUrl ? (
                          <img src={track.coverUrl} alt="" />
                        ) : (
                          <span className="boost-cover-fallback">
                            <Music2 size={22} />
                          </span>
                        )}
                        <strong>{track.title}</strong>
                        {target?.id === track.id && <Check size={17} />}
                      </label>
                    ))}
                </div>
                {!!eligibleTracks.length &&
                  !eligibleTracks.some((track) =>
                    track.title
                      .toLocaleLowerCase('fr')
                      .includes(trackQuery.toLocaleLowerCase('fr'))
                  ) && (
                    <p className="boost-footnote">
                      Aucun morceau ne correspond à cette recherche.
                    </p>
                  )}
              </>
            ) : (
              <div className="boost-confirm">
                <span className="boost-eyebrow">LA CIBLE</span>
                <h3>
                  {pending.booster.type !== 'track'
                    ? session?.user?.name || 'Ton profil artiste'
                    : target?.title}
                </h3>
                <p>
                  {familyFor(pending.booster.key)?.description ||
                    (pending.booster.type === 'artist'
                      ? 'Un bonus de classement dans les listes d’artistes compatibles, plafonné à ×2.'
                      : 'Un signal de promotion dans les recommandations compatibles. Les goûts des auditeurs restent prioritaires.')}
                </p>
                <dl>
                  <div>
                    <dt>
                      {pending.booster.type === 'credits'
                        ? 'Recharge Studio'
                        : 'Durée du boost'}
                    </dt>
                    <dd>
                      {pending.booster.type === 'credits'
                        ? `+${
                            campaignDefinition(pending.booster.key)?.credits ||
                            0
                          } crédits IA`
                        : duration(pending.booster.duration_hours)}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      {pending.booster.type === 'credits'
                        ? 'Disponibilité'
                        : 'Fin prévue'}
                    </dt>
                    <dd>
                      {pending.booster.type === 'credits'
                        ? 'À la confirmation'
                        : preview && date(preview.expiresAt)}
                    </dd>
                  </div>
                  <div>
                    <dt>Coût</dt>
                    <dd>1 boost de ta réserve</dd>
                  </div>
                </dl>
                {!!sameTarget.length && (
                  <p className="boost-overlap">
                    Un boost est déjà actif. La puissance la plus haute et la
                    fin la plus lointaine sont conservées : les coefficients ne
                    se multiplient pas et les durées ne s’additionnent pas.
                  </p>
                )}
                {dominated && (
                  <p className="boost-error">
                    Ton boost actuel couvre déjà cet effet et cette durée.
                    Conserve ce booster pour plus tard.
                  </p>
                )}
                <p className="boost-footnote">
                  L’activation démarre immédiatement et ne peut pas être
                  annulée. Aucune écoute garantie.
                </p>
              </div>
            )}
            {notice?.error && (
              <p role="alert" className="boost-error">
                {notice.text}
              </p>
            )}
          </div>
          <footer className="boost-dialog-footer">
            <button
              className="boost-secondary"
              disabled={boosts.busy}
              onClick={() =>
                confirming && pending.booster.type === 'track'
                  ? setConfirming(false)
                  : closeActivation()
              }
            >
              {confirming && pending.booster.type === 'track'
                ? 'Changer de morceau'
                : 'Annuler'}
            </button>
            <button
              className="boost-primary"
              disabled={
                boosts.busy ||
                active.loading ||
                !!active.error ||
                (!confirming && !target) ||
                dominated
              }
              onClick={confirming ? activate : () => setConfirming(true)}
            >
              {boosts.busy ? <Loader2 size={17} /> : <Zap size={17} />}
              {confirming ? 'Confirmer l’activation' : 'Continuer'}
            </button>
          </footer>
        </BoosterDialog>
      )}

      {opening && (
        <BoosterOpening
          rewards={received}
          onClose={() => {
            setOpening(false);
            setReceived(null);
          }}
          onInventory={() => {
            setOpening(false);
            setReceived(null);
            setTab('inventory');
          }}
          onSelect={(item) =>
            selectBoost({
              id: item.inventory_id,
              status: 'owned',
              obtained_at: new Date().toISOString(),
              booster: item.booster,
            })
          }
        />
      )}

      {wheelOpen && (
        <DailyRewardWheel
          canSpin={spinReady && !boosts.busy}
          availableIn={spinReady ? undefined : countdown(spinWait)}
          onSpin={spinDaily}
          onClose={() => setWheelOpen(false)}
          onInventory={() => {
            setWheelOpen(false);
            setTab('inventory');
          }}
        />
      )}

      {rules && (
        <BoosterDialog
          title="Un coup de pouce. Pas un raccourci."
          onClose={() => setRules(false)}
        >
          <div className="boost-dialog-scroll boost-rules">
            <section>
              <Music2 />
              <div>
                <h3>Un morceau, ou ton profil.</h3>
                <p>
                  Les boosts morceau ajoutent un signal de promotion plafonné
                  aux recommandations compatibles. Les boosts artiste améliorent
                  le classement dans les listes d’artistes qui les prennent en
                  charge, avec un coefficient plafonné à ×2. Ils ne garantissent
                  ni apparition dans chaque liste, ni écoute. L’indice du
                  booster est un coefficient interne, pas un multiplicateur de
                  tes écoutes.
                </p>
                <p>
                  Les nouvelles familles ajoutent un bonus ciblé jusqu’à 24
                  points de score, avant les pénalités de répétition. Les tris
                  par popularité ou date restent inchangés. Une seule campagne
                  sur cinq positions tant que des morceaux sans campagne sont
                  disponibles. Constellation soutient aussi le catalogue musical
                  de l’artiste.
                </p>
                <p>
                  Les recharges Création ajoutent 6, 12, 24 ou 48 crédits IA au
                  solde, une seule fois à la confirmation ; elles ne changent
                  pas l’abonnement.
                </p>
              </div>
            </section>
            <section>
              <Clock3 />
              <div>
                <h3>Ton timing, ta décision.</h3>
                <p>
                  Garde tes boosts aussi longtemps que tu veux. Leur durée ne
                  commence qu’à la confirmation. Sur une même cible, on garde le
                  meilleur coefficient et la fin la plus lointaine d’une même
                  famille, sans multiplier les effets ni additionner les durées.
                </p>
              </div>
            </section>
            <section>
              <Gift />
              <div>
                <h3>Des récompenses offertes.</h3>
                <p>
                  Un booster toutes les 24 h, ou 12 h avec abonnement. Une série
                  continue si deux ouvertures sont espacées de 48 h maximum. Les
                  paliers 7, 14 et 30 garantissent respectivement rare, épique
                  et légendaire ou mieux.
                </p>
                <p>
                  La protection contre la malchance garantit aussi rare au 7e
                  tirage sans rare, épique au 25e sans épique et légendaire au
                  80e sans légendaire. Les compteurs se réinitialisent quand
                  cette rareté, ou mieux, est obtenue.
                </p>
              </div>
            </section>
            <h3>Ton prochain tirage quotidien</h3>
            <div className="boost-odds">
              {boosts.odds.map((odd) => (
                <div key={odd.rarity}>
                  <span>{RARITY_LABEL[odd.rarity]}</span>
                  <strong>
                    {odd.percent.toLocaleString('fr-FR', {
                      maximumFractionDigits: 2,
                    })}{' '}
                    %
                  </strong>
                </div>
              ))}
            </div>
            <p className="boost-footnote">
              Chances calculées par le serveur selon ton abonnement, ta garantie
              actuelle et le catalogue disponible. Une récompense garantie n’est
              jamais remplacée par une rareté inférieure. Les packs
              hebdomadaires garantissent rare ou mieux pour chaque booster.
            </p>
          </div>
        </BoosterDialog>
      )}
    </main>
  );
}
