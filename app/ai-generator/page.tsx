'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { notify } from '@/components/NotificationCenter';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Music, Mic, Settings, Play, Pause, SkipBack, SkipForward, Zap, Download, Share2, Volume2, VolumeX, Coins, RefreshCw, ChevronRight, Heart, X, ThumbsUp, MessageCircle, ExternalLink, Repeat, Search, SlidersHorizontal, Wand2, ListMusic, Command, Terminal, FolderOpen, History, Library, Clock3, Send, Layers, Upload } from 'lucide-react';
import BuyCreditsModal from '@/components/BuyCreditsModal';
import { fetchCreditsBalance } from '@/lib/credits';
import { ACTION_COSTS, CREDITS_PER_GENERATION } from '@/lib/billing/pricing';
import { useAIQuota } from '@/hooks/useAIQuota';
import { useAudioPlayer } from '@/app/providers';
import { AIGeneration, AITrack } from '@/lib/aiGenerationService';
import { useSession } from 'next-auth/react';
import { useBackgroundGeneration } from '@/hooks/useBackgroundGeneration';
import { GenerationTimeline } from '@/components/ai-studio/GenerationTimeline';
import { TrackInspector } from '@/components/ai-studio/TrackInspector';
import { RemixDropzone } from '@/components/ai-studio/RemixDropzone';
import { UploadConfirmModal } from '@/components/ai-studio/UploadConfirmModal';
import { UploadProgressModal } from '@/components/ai-studio/UploadProgressModal';
import { LibraryMiddlePanel } from '@/components/ai-studio/LibraryMiddlePanel';
import { aiStudioPresets } from '@/lib/aiStudioPresets';
import StudioBackground from '@/components/StudioBackground';
import RightPanelImproved from '@/components/ai-studio/RightPanelImproved';
import type { GeneratedTrack, AIStudioPreset } from '@/lib/aiStudioTypes';
import { SUNO_BTN_BASE, SUNO_FIELD, SUNO_SELECT, SUNO_TEXTAREA, SUNO_INPUT, SUNO_PILL_SOLID, SUNO_PANEL } from '@/components/ui/sunoClasses';
import { SunoAccordionSection } from '@/components/ui/SunoAccordionSection';
import { SunoSlider } from '@/components/ui/SunoSlider';
import { SynauraWaveform } from '@/components/audio/SynauraWaveform';

const DEBUG_AI_STUDIO = process.env.NODE_ENV !== 'production';

type LogLine = {
  id: string;
  at: string;
  level: 'info' | 'warn' | 'error';
  msg: string;
};

type TimestampedWord = {
  word: string;
  startS: number;
  endS: number;
  success?: boolean;
  palign?: number;
};

const makeId = () => Math.random().toString(36).slice(2, 10);

/** Messages d'erreur Suno en français (doc: 400, 401, 404, 405, 413, 429, 430, 455, 500) */
function getSunoErrorMessage(status: number, errJson: { error?: string; msg?: string }): string {
  const custom = errJson?.error || errJson?.msg;
  if (custom && typeof custom === 'string' && custom.trim()) return custom.trim();
  const map: Record<number, string> = {
    400: 'Paramètres invalides. Vérifiez titre, style et paroles.',
    401: 'Session expirée. Reconnectez-vous.',
    402: 'Crédits insuffisants. Ajoutez des crédits pour continuer.',
    404: 'Service temporairement indisponible.',
    405: 'Limite de requêtes dépassée. Réessayez plus tard.',
    413: 'Texte trop long (titre, style ou paroles). Réduisez la taille.',
    429: 'Crédits insuffisants. Ajoutez des crédits pour continuer.',
    430: 'Trop de requêtes. Attendez quelques secondes avant de relancer.',
    455: 'Suno est en maintenance. Réessayez dans quelques minutes.',
    500: 'Erreur serveur. Réessayez dans un moment.',
  };
  return map[status] || `Erreur lors de la génération (${status}).`;
}

// Interface Track compatible avec le lecteur principal
interface PlayerTrack {
  _id: string;
  title: string;
  artist: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  audioUrl: string;
  coverUrl?: string;
  duration: number;
  likes: string[];
  comments: string[];
  plays: number;
  isLiked?: boolean;
  genre?: string[];
  backupAudioUrls?: string[];
}

// Composant "Orb" de statut pour la génération
function StudioStatusOrb({
  isGenerating,
  generationStatus,
}: {
  isGenerating: boolean;
  generationStatus: 'idle' | 'pending' | 'completed' | 'failed';
}) {
  const isActive = isGenerating || generationStatus === 'pending';
  const isError = generationStatus === 'failed';
  return (
    <div className="relative flex items-center justify-center">
      {/* Anneau externe */}
      <motion.div
        className="absolute w-48 h-48 rounded-full border border-white/10 bg-gradient-to-br from-white/8 via-transparent to-transparent"
        animate={{
          rotate: isActive ? [0, 180, 360] : 0,
        }}
        transition={{
          duration: 18,
          repeat: isActive ? Infinity : 0,
          ease: 'linear',
        }}
      />
      {/* Halo */}
      <motion.div
        className={`absolute w-48 h-48 rounded-full blur-3xl ${isError ? 'bg-red-400/50' : 'bg-accent-brand/50'}`}
        animate={{
          opacity: [0.3, 0.8, 0.3],
          scale: [0.9, 1.1, 0.9],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Noyau */}
      <motion.div
        className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-[#0f061f] via-[#150b2a] to-[#050111] border border-white/15 shadow-[0_0_40px_rgba(120,95,255,0.65)] flex items-center justify-center overflow-hidden"
        animate={{
          scale: isActive ? [0.98, 1.04, 0.98] : 1,
        }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* "Equalizer" radial */}
        <div className="absolute inset-0 flex items-center justify-center">
          {Array.from({ length: 14 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-[2px] rounded-full bg-gradient-to-b from-cyan-300 via-fuchsia-400 to-violet-500"
              style={{ height: 20, transformOrigin: 'bottom center' }}
              animate={{
                scaleY: isActive ? [0.4, 1.6, 0.6] : 0.7,
                opacity: [0.3, 1, 0.5],
                rotate: (360 / 14) * i,
              }}
              transition={{
                duration: 1.6,
                delay: i * 0.08,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
        <div className="relative z-10 flex flex-col items-center gap-1">
          <Music className="w-6 h-6 text-accent-brand drop-shadow-[0_0_18px_rgba(255,255,255,0.6)]" />
          <span className="text-[10px] uppercase tracking-[0.22em] text-white/60">
            {isError
              ? 'Erreur'
              : isActive
              ? 'Génération'
              : generationStatus === 'completed'
              ? 'Prêt'
              : 'Studio'}
          </span>
        </div>
        <motion.div
          className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 border border-white/20 backdrop-blur"
          animate={{
            opacity: isActive ? [0.4, 1, 0.4] : 0.6,
          }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="text-[9px] font-semibold tracking-[0.18em] text-white/80 uppercase">
            {isActive ? 'Live' : 'Idle'}
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ── Portal-based model dropdown (matches library ContextMenu style) ── */
function ModelDropdownPortal({
  modelVersion,
  disabled,
  open,
  onToggle,
  onSelect,
  onClose,
}: {
  modelVersion: string;
  disabled: boolean;
  open: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: Math.max(8, r.right - 220) });
    const close = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const t = setTimeout(() => {
      document.addEventListener('click', close);
      document.addEventListener('keydown', esc);
    }, 0);
    return () => { clearTimeout(t); document.removeEventListener('click', close); document.removeEventListener('keydown', esc); };
  }, [open, onClose]);

  const models = [
    { id: 'V5', label: 'v5', tag: 'Beta', color: 'indigo' },
    { id: 'V4_5PLUS', label: 'v4.5+', tag: 'Pro', color: 'violet' },
    { id: 'V4_5', label: 'v4.5', tag: 'Rapide', color: 'emerald' },
  ];

  const activeLabel = models.find(m => m.id === modelVersion)?.label || 'v4.5';

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-semibold text-white/60 hover:bg-white/[0.06] hover:text-white/80 disabled:opacity-50 transition-all"
      >
        {activeLabel}
        <ChevronRight className={`w-3 h-3 opacity-40 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[9999] w-[220px] rounded-xl border border-white/[0.08] bg-[#121218]/98 backdrop-blur-2xl py-1.5 shadow-[0_16px_64px_rgba(0,0,0,.7)]"
          style={{ top: pos.top, left: pos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Modèle IA</div>
          {models.map((m) => {
            const isActive = modelVersion === m.id;
            const colorMap: Record<string, string> = {
              indigo: isActive ? 'text-indigo-300 bg-indigo-500/10' : '',
              violet: isActive ? 'text-violet-300 bg-violet-500/10' : '',
              emerald: isActive ? 'text-emerald-300 bg-emerald-500/10' : '',
            };
            const tagMap: Record<string, string> = {
              indigo: 'bg-indigo-400/15 text-indigo-300 border-indigo-400/25',
              violet: 'bg-violet-400/15 text-violet-300 border-violet-400/25',
              emerald: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/25',
            };
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelect(m.id)}
                className={`w-full px-3 py-2 text-left text-xs transition-colors flex items-center gap-2 ${isActive ? colorMap[m.color] : 'text-white/70 hover:bg-white/[0.05]'}`}
              >
                <span className="font-semibold">{m.label}</span>
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${isActive ? tagMap[m.color] : 'bg-white/[0.04] text-white/30 border-white/[0.06]'}`}>{m.tag}</span>
                <span className="ml-auto text-[10px] text-white/20 tabular-nums">{ACTION_COSTS.generation.credits} cr.</span>
                {isActive && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-white/40">
                    <path d="M9.99 16.901a1 1 0 0 1-1.414 0L4.29 12.615c-.39-.39-.385-1.029.006-1.42.39-.39 1.029-.395 1.42-.005l3.567 3.568 8.468-8.468c.39-.39 1.03-.385 1.42.006.39.39.396 1.029.005 1.42z" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

export default function AIGenerator() {
  const { data: session } = useSession();
  const { quota, loading: quotaLoading } = useAIQuota();
  const { audioState, playTrack, play, pause, seek, nextTrack, previousTrack, setQueueAndPlay } = useAudioPlayer();
  // États pour la bibliothèque des générations (même logique que ai-library)
  const [generations, setGenerations] = useState<AIGeneration[]>([]);
  const [allTracks, setAllTracks] = useState<AITrack[]>([]);
  const [generationsLoading, setGenerationsLoading] = useState(true);
  const [generationsError, setGenerationsError] = useState<string | null>(null);
  const { generations: bgGenerations, activeGenerations, startBackgroundGeneration } = useBackgroundGeneration();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [creditsBalance, setCreditsBalance] = useState<number>(0);
  const [sunoCredits, setSunoCredits] = useState<number | null>(null);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [generatedTrack, setGeneratedTrack] = useState<GeneratedTrack | null>(null);
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'pending' | 'completed' | 'failed'>('idle');
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [generatedTracks, setGeneratedTracks] = useState<GeneratedTrack[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [sunoState, setSunoState] = useState<'idle' | 'pending' | 'first' | 'success' | 'error'>('idle');
  const [sunoError, setSunoError] = useState<string | null>(null);
  /** Cooldown après 430 (rate limit): désactive le bouton Générer pendant quelques secondes */
  const [rateLimitCooldownUntil, setRateLimitCooldownUntil] = useState<number>(0);
  const [cooldownTick, setCooldownTick] = useState(0);
  const [generationModeKind, setGenerationModeKind] = useState<'simple' | 'custom' | 'remix'>('simple');
  const [customMode, setCustomMode] = useState(false);
  const [modelVersion, setModelVersion] = useState('V4_5');
  const [generationDuration, setGenerationDuration] = useState<60 | 120 | 180>(120);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [likedTrackIds, setLikedTrackIds] = useState<Set<string>>(new Set());
  const [trashedTrackIds, setTrashedTrackIds] = useState<Set<string>>(new Set());

  const formatTime = (seconds: number) => {
    const s = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  };
  
  // États pour la bibliothèque des générations
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [filterBy, setFilterBy] = useState<'all' | 'instrumental' | 'with-lyrics' | 'liked' | 'trashed'>('all');
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [selectedGeneration, setSelectedGeneration] = useState<AIGeneration | null>(null);
  
  // États pour le panneau de track sélectionnée
  const [selectedTrack, setSelectedTrack] = useState<GeneratedTrack | null>(null);
  const [showTrackPanel, setShowTrackPanel] = useState(false);
  const [timestampedWords, setTimestampedWords] = useState<TimestampedWord[]>([]);
  const [timestampedWaveform, setTimestampedWaveform] = useState<number[]>([]);
  const [timestampedLoading, setTimestampedLoading] = useState(false);
  const [timestampedError, setTimestampedError] = useState<string | null>(null);
  const [publishingVisibility, setPublishingVisibility] = useState(false);
  
  // Remix (upload audio) pour upload-cover
  const [remixFile, setRemixFile] = useState<File | null>(null);
  const [remixUploadUrl, setRemixUploadUrl] = useState<string | null>(null);
  const [remixSourceDurationSec, setRemixSourceDurationSec] = useState<number | undefined>(undefined);
  const [remixUploading, setRemixUploading] = useState<boolean>(false);
  const [remixSourceLabel, setRemixSourceLabel] = useState<string | null>(null);
  const [remixSourceTrackId, setRemixSourceTrackId] = useState<string | null>(null);
  const [pendingRemixFile, setPendingRemixFile] = useState<File | null>(null);
  const [remixUploadModalOpen, setRemixUploadModalOpen] = useState(false);
  const [uploadingRemixTitle, setUploadingRemixTitle] = useState<string | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);
  
  // Génération IA activée
  const isGenerationDisabled = false;

  // Accordions (panneau gauche)
  const [openProjectSection, setOpenProjectSection] = useState(true);
  const [openStyleSection, setOpenStyleSection] = useState(true);
  const [openLyricsSection, setOpenLyricsSection] = useState(true);
  const [openAdvancedSection, setOpenAdvancedSection] = useState(false);
  const [openResultsSection, setOpenResultsSection] = useState(true);

  // Onglet mobile : Créer | Bibliothèque
  const [mobileTab, setMobileTab] = useState<'generate' | 'library'>('generate');
  const [shellMode, setShellMode] = useState<'ide' | 'classic'>('ide');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const [cmdIndex, setCmdIndex] = useState(0);
  const [consoleCollapsed, setConsoleCollapsed] = useState(false);
  const [leftExplorerTab, setLeftExplorerTab] = useState<'builder' | 'presets' | 'assets' | 'history'>('builder');
  const [rightTab, setRightTab] = useState<'inspector' | 'models' | 'export'>('inspector');
  const [abA, setAbA] = useState<string | null>(null);
  const [abB, setAbB] = useState<string | null>(null);
  const [abSide, setAbSide] = useState<'A' | 'B'>('A');
  const [assetQuery, setAssetQuery] = useState('');
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [waveHoverRatio, setWaveHoverRatio] = useState<number | null>(null);
  const [waveScrubbing, setWaveScrubbing] = useState(false);
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const activeGenerationCount = activeGenerations.size;
  const isRemixMode = generationModeKind === 'remix';

  // ── Persistence des préférences studio dans Supabase ──
  const prefsLoadedRef = useRef(false);
  const prefsSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!session?.user?.id || prefsLoadedRef.current) return;
    prefsLoadedRef.current = true;
    (async () => {
      try {
        const res = await fetch('/api/user/preferences');
        if (!res.ok) return;
        const { preferences: p } = await res.json();
        if (!p?.aiStudio) return;
        const s = p.aiStudio;
        if (s.shellMode) setShellMode(s.shellMode);
        if (s.modelVersion) setModelVersion(s.modelVersion);
        if (s.generationDuration) setGenerationDuration(s.generationDuration);
        if (s.generationModeKind) {
          setGenerationModeKind(s.generationModeKind);
          setCustomMode(s.generationModeKind !== 'simple');
        }
        if (s.sortBy) setSortBy(s.sortBy);
        if (s.filterBy) setFilterBy(s.filterBy);
        if (typeof s.isInstrumental === 'boolean') setIsInstrumental(s.isInstrumental);
      } catch {}
    })();
  }, [session?.user?.id]);

  const savePrefs = useCallback((overrides?: Record<string, any>) => {
    if (!session?.user?.id) return;
    if (prefsSaveTimerRef.current) clearTimeout(prefsSaveTimerRef.current);
    prefsSaveTimerRef.current = setTimeout(async () => {
      try {
        await fetch('/api/user/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aiStudio: {
              shellMode,
              modelVersion,
              generationDuration,
              generationModeKind,
              sortBy,
              filterBy,
              isInstrumental,
              ...overrides,
            },
          }),
        });
      } catch {}
    }, 1500);
  }, [session?.user?.id, shellMode, modelVersion, generationDuration, generationModeKind, sortBy, filterBy, isInstrumental]);

  useEffect(() => {
    if (!prefsLoadedRef.current) return;
    savePrefs();
  }, [shellMode, modelVersion, generationDuration, generationModeKind, sortBy, filterBy, isInstrumental]);
  const selectGenerationMode = useCallback((mode: 'simple' | 'custom' | 'remix') => {
    setGenerationModeKind(mode);
    setCustomMode(mode !== 'simple');
    if (mode !== 'remix') {
      setRemixFile(null);
      setRemixUploadUrl(null);
      setRemixSourceDurationSec(undefined);
      setRemixUploading(false);
      setRemixSourceLabel(null);
      setRemixSourceTrackId(null);
      setPendingRemixFile(null);
      setRemixUploadModalOpen(false);
    } else {
      setOpenStyleSection(true);
    }
  }, []);

  const remixSectionRef = useRef<HTMLDivElement | null>(null);
  const cmdInputRef = useRef<HTMLInputElement | null>(null);

  // --- Layout resizable (desktop) ; sur mobile (web) panneaux en pleine largeur ---
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [leftPx, setLeftPx] = useState(460);
  const [rightPx, setRightPx] = useState(360);
  const [isDesktopLayout, setIsDesktopLayout] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const on = () => setIsDesktopLayout(mq.matches);
    mq.addEventListener('change', on);
    on();
    return () => mq.removeEventListener('change', on);
  }, []);
  const dragRef = useRef<{ mode: 'left' | 'right' | null; startX: number; startLeft: number; startRight: number }>({
    mode: null,
    startX: 0,
    startLeft: 460,
    startRight: 360,
  });

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
  const LEFT_MIN = 320;
  const LEFT_MAX = 620;
  const RIGHT_MIN = 320;
  const RIGHT_MAX = 620;
  const CENTER_MIN = 420;
  const LAYOUT_VERSION = '3';

  const getContainerWidth = useCallback(() => {
    const w = containerRef.current?.getBoundingClientRect?.().width || 0;
    if (Number.isFinite(w) && w > 0) return w;
    if (typeof window !== 'undefined') return Math.min(window.innerWidth - 32, 1600);
    return 1600;
  }, []);

  const getDefaultLeftWidth = useCallback(() => {
    const cw = getContainerWidth();
    // Base: panneau gauche assez large (builder), centre prioritaire.
    return clamp(Math.round(cw * 0.32), 420, 580);
  }, [getContainerWidth]);

  const getDefaultRightWidth = useCallback(() => {
    const cw = getContainerWidth();
    // Base: panneau droit volontairement plus compact que gauche/centre.
    return clamp(Math.round(cw * 0.20), 300, 400);
  }, [getContainerWidth]);

  const normalizePanelWidths = useCallback((leftCandidate: number, rightCandidate: number) => {
    let left = clamp(leftCandidate, LEFT_MIN, LEFT_MAX);
    let right = clamp(rightCandidate, RIGHT_MIN, RIGHT_MAX);
    const cw = getContainerWidth();

    // Garantit une zone centrale minimale pour conserver une UI exploitable.
    const maxCombined = Math.max(LEFT_MIN + RIGHT_MIN, cw - CENTER_MIN);
    if (left + right > maxCombined) {
      let overflow = left + right - maxCombined;
      const rightReducible = right - RIGHT_MIN;
      const takeRight = Math.min(rightReducible, overflow);
      right -= takeRight;
      overflow -= takeRight;
      if (overflow > 0) {
        left = Math.max(LEFT_MIN, left - overflow);
      }
    }

    // Conserve la préférence: droite plus compacte que gauche sans bloquer les drags.
    if (right > left) {
      right = left;
    }

    return { left, right };
  }, [getContainerWidth]);

  const beginDrag = (mode: 'left' | 'right') => (e: React.PointerEvent<HTMLDivElement>) => {
    // Only meaningful on large screens; still safe otherwise.
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    dragRef.current = { mode, startX: e.clientX, startLeft: leftPx, startRight: rightPx };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d.mode) return;
      const delta = e.clientX - d.startX;

      if (d.mode === 'left') {
        const normalized = normalizePanelWidths(d.startLeft + delta, d.startRight);
        setLeftPx(normalized.left);
        setRightPx(normalized.right);
      } else {
        const normalized = normalizePanelWidths(d.startLeft, d.startRight - delta);
        setLeftPx(normalized.left);
        setRightPx(normalized.right);
      }
    };
    const onUp = () => {
      dragRef.current.mode = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [normalizePanelWidths]);

  const pushLog = useCallback((level: LogLine['level'], msg: string) => {
    const at = new Date().toLocaleTimeString('fr-FR', { hour12: false });
    setLogs((prev) => [{ id: makeId(), at, level, msg }, ...prev].slice(0, 120));
  }, []);

  // Charger la bibliothèque (même logique que ai-library)
  const loadLibrary = useCallback(async () => {
    if (!session?.user?.id) {
      return;
    }

    try {
      setGenerationsLoading(true);
      setGenerationsError(null);

      const [genRes, trRes] = await Promise.all([
        fetch('/api/ai/library', { cache: 'no-store', headers: { 'Cache-Control': 'no-store' } }),
        fetch('/api/ai/library/tracks', { cache: 'no-store', headers: { 'Cache-Control': 'no-store' } }),
      ]);

      if (!genRes.ok) {
        const txt = await genRes.text().catch(() => '');
        setGenerationsError(txt ? `Erreur chargement: ${txt}` : 'Erreur chargement de la bibliothèque');
        return;
      }

      const data = await genRes.json().catch(() => ({}));
      setGenerations(data.generations || []);
      pushLog('info', `Bibliothèque chargée: ${(data.generations || []).length} générations`);

      if (trRes.ok) {
        const trJson = await trRes.json().catch(() => ({}));
        const loadedTracks: AITrack[] = trJson.tracks || [];
        setAllTracks(loadedTracks);
        setLikedTrackIds(new Set(loadedTracks.filter((t: any) => t.is_liked).map((t: AITrack) => t.id)));
        setTrashedTrackIds(new Set(loadedTracks.filter((t: any) => t.generation?.is_trashed).map((t: AITrack) => t.id)));
        pushLog('info', `Assets synchronisés: ${loadedTracks.length} tracks`);
      } else {
        setAllTracks([]);
      }
    } catch (error) {
      if (DEBUG_AI_STUDIO) console.error('[AI Studio] Erreur chargement bibliothèque:', error);
      setGenerationsError('Impossible de charger la bibliothèque');
      pushLog('error', 'Erreur de chargement bibliothèque');
    } finally {
      setGenerationsLoading(false);
    }
  }, [pushLog, session?.user?.id]);

  // Rafraîchir la bibliothèque
  const refreshGenerations = () => {
    loadLibrary();
  };

  // Filtrer les générations (même logique que ai-library)
  const filteredAndSortedGenerations = React.useMemo(() => {
    let filtered = generations.filter(generation => {
      const matchesSearch = searchQuery === '' || 
        generation.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        generation.tracks?.some(track => 
          track.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
      
      const matchesFilter = filterBy === 'all' || 
        (filterBy === 'instrumental' && generation.tracks?.some(track => track.prompt?.toLowerCase().includes('instrumental'))) ||
        (filterBy === 'with-lyrics' && generation.tracks?.some(track => !track.prompt?.toLowerCase().includes('instrumental')));
      
      return matchesSearch && matchesFilter;
    });

    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'title':
          return (a.tracks?.[0]?.title || 'Musique générée').localeCompare(b.tracks?.[0]?.title || 'Musique générée');
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [generations, searchQuery, sortBy, filterBy]);

  // Convertir les tracks individuelles en générations groupées par generation_id
  const generationsFromTracks = React.useMemo(() => {
    if (allTracks.length === 0) {
      return [];
    }
    
    // Grouper les tracks par generation_id
    const tracksByGeneration = new Map<string, AITrack[]>();
    const generationMap = new Map<string, Partial<AIGeneration>>();
    
    allTracks.forEach((track: any) => {
      // L'API retourne peut-être generation_id directement ou via generation.id
      const genId = track.generation_id || track.generation?.id;
      if (!genId) {
        if (DEBUG_AI_STUDIO) console.warn('[AI Studio] Track sans generation_id:', track.id);
        return;
      }
      
      // Ajouter la track au groupe
      if (!tracksByGeneration.has(genId)) {
        tracksByGeneration.set(genId, []);
      }
      tracksByGeneration.get(genId)!.push(track);
      
      // Créer une génération virtuelle si elle n'existe pas
      if (!generationMap.has(genId)) {
        // Utiliser les infos de génération si disponibles (via JOIN), sinon utiliser la track
        const genInfo = track.generation || {};
        const firstTrack = track;
        generationMap.set(genId, {
          id: genId,
          user_id: genInfo.user_id || session?.user?.id || '',
          task_id: genInfo.task_id || '',
          prompt: genInfo.prompt || firstTrack.prompt || '',
          model: genInfo.model || firstTrack.model_name || 'V4_5',
          status: (genInfo.status || 'completed') as 'pending' | 'completed' | 'failed',
          created_at: genInfo.created_at || firstTrack.created_at,
          is_favorite: genInfo.is_favorite ?? firstTrack.is_favorite ?? false,
          is_public: genInfo.is_public ?? false,
          play_count: firstTrack.play_count || 0,
          like_count: firstTrack.like_count || 0,
          share_count: 0,
          metadata: {
            title: firstTrack.title,
            style: firstTrack.style || '',
          },
        });
      }
    });
    
    // Créer les générations complètes avec leurs tracks
    const result: AIGeneration[] = Array.from(generationMap.entries()).map(([genId, gen]) => ({
      ...gen as AIGeneration,
      tracks: tracksByGeneration.get(genId) || [],
    }));
    
    return result;
  }, [allTracks, session?.user?.id]);

  // Fusion des deux sources (API generations + generationsFromTracks) pour que A/B et le reste voient toutes les musiques générées
  const recentGenerationsSorted = React.useMemo(() => {
    const byId = new Map<string, AIGeneration>();
    generationsFromTracks.forEach((g) => byId.set(String(g.id), g));
    generations.forEach((g) => byId.set(String(g.id), g)); // l’API écrase si doublon (métadonnées plus complètes)
    return Array.from(byId.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [generations, generationsFromTracks]);
  const visibleGenerations = React.useMemo(
    () => recentGenerationsSorted.filter((g) => !g.is_trashed),
    [recentGenerationsSorted]
  );

  const generationsById = React.useMemo(() => {
    const m = new Map<string, AIGeneration>();
    recentGenerationsSorted.forEach((g) => m.set(String(g.id), g));
    return m;
  }, [recentGenerationsSorted]);

  const filteredAssets = React.useMemo(() => {
    const q = assetQuery.trim().toLowerCase();
    if (!q) return allTracks;
    return allTracks.filter((t) => {
      const hay = `${t.title || ''} ${t.prompt || ''} ${t.style || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allTracks, assetQuery]);

  const uploadedRemixAssets = React.useMemo(
    () =>
      allTracks.filter((t: any) => {
        const isUploadModel = String((t as any)?.model_name || '').toUpperCase() === 'UPLOAD';
        const links = parseSourceLinks((t as any)?.source_links);
        const hasCloudinaryUpload = Boolean(links?.cloudinary_public_id);
        return isUploadModel || hasCloudinaryUpload;
      }),
    [allTracks]
  );

  const commandItems = React.useMemo(
    () => [
      { id: 'generate', label: 'Generate', desc: 'Lancer une génération', run: () => executePaletteCommand('generate') },
      { id: 'preset-edm', label: 'Apply preset: EDM', desc: 'Appliquer un preset proche EDM', run: () => executePaletteCommand('preset edm') },
      { id: 'model-v5', label: 'Set model: v5', desc: 'Basculer le modèle vers v5', run: () => executePaletteCommand('model v5') },
      { id: 'mode-custom', label: 'Set mode: custom', desc: 'Passer en mode custom', run: () => executePaletteCommand('mode custom') },
      { id: 'mode-remix', label: 'Set mode: remix', desc: 'Passer en mode remix', run: () => executePaletteCommand('mode remix') },
      { id: 'instrumental-on', label: 'Instrumental: on', desc: 'Activer instrumental', run: () => executePaletteCommand('instrumental on') },
      { id: 'duration-120', label: 'Set duration: 120', desc: 'Durée de génération = 120s', run: () => executePaletteCommand('duration 120') },
      { id: 'tab-presets', label: 'Open tab: Presets', desc: 'Basculer vers l’onglet presets', run: () => executePaletteCommand('tab presets') },
      { id: 'tab-assets', label: 'Open tab: Assets', desc: 'Basculer vers l’onglet assets', run: () => executePaletteCommand('tab assets') },
      { id: 'refresh', label: 'Refresh library', desc: 'Synchroniser la bibliothèque', run: () => executePaletteCommand('refresh') },
      { id: 'refresh-credits', label: 'Refresh Suno credits', desc: 'Rafraîchir crédits provider Suno', run: () => executePaletteCommand('credits refresh') },
      { id: 'ab-toggle', label: 'A/B toggle', desc: 'Basculer lecture entre A et B', run: () => executePaletteCommand('ab toggle') },
      { id: 'export-mp3', label: 'Export MP3', desc: 'Préparer export MP3', run: () => executePaletteCommand('export mp3') },
      { id: 'mode-ide', label: 'Switch mode: IDE', desc: 'Passer en mode IDE', run: () => executePaletteCommand('mode ide') },
      { id: 'mode-classic', label: 'Switch mode: Classic', desc: 'Passer en mode Classic', run: () => executePaletteCommand('mode classic') },
    ],
    [executePaletteCommand]
  );

  const filteredCommandItems = React.useMemo(() => {
    const q = cmdQuery.trim().toLowerCase();
    if (!q) return commandItems;
    return commandItems.filter((c) => `${c.label} ${c.desc}`.toLowerCase().includes(q));
  }, [cmdQuery, commandItems]);

  const pickFirstHttp = (...values: Array<unknown>) => {
    for (const value of values) {
      if (typeof value !== 'string') continue;
      const trimmed = value.trim();
      if (!/^https?:\/\//i.test(trimmed)) continue;
      try {
        const host = new URL(trimmed).hostname.toLowerCase();
        // Legacy hosts now dead/unstable: skip early to avoid browser/network noise.
        if (
          host === 'musicfile.api.box' ||
          host.endsWith('.musicfile.api.box')
        ) {
          continue;
        }
      } catch {
        continue;
      }
      return trimmed;
    }
    return '';
  };

  const isBlockedCoverHost = (host: string) =>
    host === 'musicfile.api.box' ||
    host.endsWith('.musicfile.api.box');

  const pickFirstHttpImage = (...values: Array<unknown>) => {
    for (const value of values) {
      if (typeof value !== 'string') continue;
      const trimmed = value.trim();
      if (!/^https?:\/\//i.test(trimmed)) continue;
      try {
        const host = new URL(trimmed).hostname.toLowerCase();
        if (isBlockedCoverHost(host)) continue;
      } catch {
        continue;
      }
      return trimmed;
    }
    return '';
  };

  function parseSourceLinks(sourceLinks?: string | null) {
    if (!sourceLinks) return null as any;
    try {
      return JSON.parse(sourceLinks);
    } catch {
      return null;
    }
  }

  const getUploadedAssetName = (track: AITrack | any) => {
    const links = parseSourceLinks((track as any)?.source_links);
    const fromLinks =
      (typeof links?.original_file_name === 'string' && links.original_file_name.trim()) ||
      (typeof links?.file_name === 'string' && links.file_name.trim()) ||
      '';
    return fromLinks || String((track as any)?.title || 'Audio uploadé');
  };

  const resolveTrackMedia = (track: AITrack | any) => {
    const links = parseSourceLinks((track as any)?.source_links);
    const linksObj = links && typeof links === 'object' ? links : {};
    const audioFromLinks = pickFirstHttp(
      linksObj.audio,
      linksObj.audio_url,
      linksObj.audioUrl,
      linksObj.source_audio_url,
      linksObj.sourceAudioUrl,
      linksObj.url
    );
    const streamFromLinks = pickFirstHttp(
      linksObj.stream,
      linksObj.stream_url,
      linksObj.stream_audio_url,
      linksObj.streamAudioUrl,
      linksObj.source_stream_audio_url,
      linksObj.sourceStreamAudioUrl
    );
    const imageFromLinks = pickFirstHttpImage(
      linksObj.image,
      linksObj.image_url,
      linksObj.imageUrl,
      linksObj.source_image_url,
      linksObj.sourceImageUrl,
      linksObj.cover,
      linksObj.cover_url,
      linksObj.coverUrl
    );

    const streamUrl = pickFirstHttp(
      (track as any)?.stream_audio_url,
      (track as any)?.streamAudioUrl,
      (track as any)?.source_stream_audio_url,
      (track as any)?.sourceStreamAudioUrl,
      streamFromLinks
    );
    const audioUrl = pickFirstHttp(
      (track as any)?.audio_url,
      (track as any)?.audioUrl,
      (track as any)?.source_audio_url,
      (track as any)?.sourceAudioUrl,
      audioFromLinks
    );
    const imageUrl = pickFirstHttpImage(
      (track as any)?.image_url,
      (track as any)?.imageUrl,
      (track as any)?.source_image_url,
      (track as any)?.sourceImageUrl,
      imageFromLinks
    );

    return {
      // En bibliothèque, préférer l'URL audio finale; garder le stream en fallback.
      playableUrl: pickFirstHttp(audioUrl, streamUrl),
      audioUrl,
      streamUrl,
      imageUrl,
    };
  };

  const resolveLiveTrackMedia = (track: any) => {
    const audioUrl = pickFirstHttp(
      track?.audio,
      track?.audio_url,
      track?.audioUrl,
      track?.source_audio_url,
      track?.raw?.audio_url
    );
    const streamUrl = pickFirstHttp(
      track?.stream,
      track?.stream_audio_url,
      track?.streamAudioUrl,
      track?.source_stream_audio_url,
      track?.raw?.stream_audio_url
    );
    // En live, le stream est généralement disponible avant l'URL audio finale.
    const playableUrl = pickFirstHttp(streamUrl, audioUrl);
    const imageUrl = pickFirstHttpImage(
      track?.image,
      track?.image_url,
      track?.imageUrl,
      track?.source_image_url,
      track?.raw?.image_url
    );
    return { playableUrl, imageUrl, audioUrl, streamUrl };
  };

  const isPotentiallyExpiredProviderUrl = (url?: string) => {
    if (!url) return true;
    return /(^|\.)musicfile\.api\.box/i.test(url);
  };

  // Jouer une track IA (même logique que ai-library)
  const aiTrackToPlayerTrack = (track: AITrack, generation: AIGeneration): PlayerTrack | null => {
    const media = resolveTrackMedia(track);
    const playableUrl = media.playableUrl;
    if (!playableUrl) return null;
    const backupAudioUrls = Array.from(
      new Set([media.streamUrl, media.audioUrl].filter((u): u is string => Boolean(u && u !== playableUrl)))
    );

    const pt: PlayerTrack & { generationTaskId?: string; sunoAudioId?: string } = {
      _id: `ai-${track.id}`,
      title: track.title,
      artist: {
        _id: (session?.user?.id as string) || 'ai-generator',
        name: (session?.user as any)?.name || (session?.user as any)?.username || 'IA Synaura',
        username: (session?.user as any)?.username || (session?.user as any)?.name || 'ai-generator',
        avatar: (session?.user as any)?.avatar || (session?.user as any)?.image || '/logo.png'
      },
      duration: track.duration,
      audioUrl: playableUrl,
      backupAudioUrls,
      coverUrl: media.imageUrl || '/synaura_symbol.svg',
      genre: ['IA', 'Généré'],
      plays: track.play_count || 0,
      likes: [],
      comments: [],
      isLiked: likedTrackIds.has(track.id),
      // @ts-ignore - player Track accepte lyrics via providers
      lyrics: (track.prompt || generation.prompt || '').trim(),
    };
    (pt as any).generationTaskId = generation?.task_id ?? '';
    (pt as any).sunoAudioId = (track as any).suno_id || track.id;
    return pt;
  };

  const hydrateTrackFromSuno = useCallback(async (track: AITrack, generation: AIGeneration) => {
    const taskId = generation?.task_id;
    if (!taskId) return null;
    try {
      const res = await fetch(`/api/suno/status?taskId=${encodeURIComponent(taskId)}`, { cache: 'no-store' });
      if (!res.ok) return null;
      const json = await res.json().catch(() => ({}));
      const tracks = Array.isArray(json?.tracks) ? json.tracks : [];
      if (!tracks.length) return null;

      const wantedSunoId = String((track as any).suno_id || '').trim();
      const wantedId = String(track.id || '').trim();
      const wantedTitle = String(track.title || '').trim().toLowerCase();
      const candidate =
        tracks.find((t: any) => String(t?.id || '') === wantedSunoId) ||
        tracks.find((t: any) => String(t?.id || '') === wantedId) ||
        tracks.find((t: any) => String(t?.title || '').trim().toLowerCase() === wantedTitle) ||
        tracks[0];
      if (!candidate) return null;

      const patchedTrack: AITrack = {
        ...(track as any),
        suno_id: (track as any).suno_id || candidate.id || (track as any).suno_id,
        audio_url: candidate.audio || (track as any).audio_url || '',
        stream_audio_url: candidate.stream || (track as any).stream_audio_url || '',
        image_url: candidate.image || (track as any).image_url || '',
      } as AITrack;

      setAllTracks((prev) => prev.map((t) => (t.id === track.id ? patchedTrack : t)));
      setGenerations((prev) =>
        prev.map((g) => {
          if (g.id !== generation.id) return g;
          return {
            ...g,
            tracks: (g.tracks || []).map((t) => (t.id === track.id ? (patchedTrack as any) : t)),
          };
        })
      );
      return patchedTrack;
    } catch {
      return null;
    }
  }, []);

  const playAITrack = async (track: AITrack, generation: AIGeneration) => {
    let targetTrack = track;
    const initialMedia = resolveTrackMedia(track);
    if (!initialMedia.playableUrl || isPotentiallyExpiredProviderUrl(initialMedia.playableUrl)) {
      pushLog('info', 'Récupération des URLs fraîches de la piste…');
      const refreshed = await hydrateTrackFromSuno(track, generation);
      if (refreshed) targetTrack = refreshed;
    }

    const pt = aiTrackToPlayerTrack(targetTrack, generation);
    if (!pt) {
      notify.error('Lecture', 'Cette piste n’a pas d’URL audio exploitable pour le moment.');
      pushLog('warn', `Track sans URL audio: ${targetTrack.title || targetTrack.id}`);
      return;
    }
    try {
      await Promise.resolve(playTrack(pt as any));
      pushLog('info', `Lecture asset: ${targetTrack.title || targetTrack.id}`);
    } catch (err) {
      // Fallback robuste: si le chargement échoue, tenter une re-hydratation + retry 1 fois.
      const refreshed = await hydrateTrackFromSuno(track, generation);
      if (!refreshed) {
        notify.error('Lecture', 'Source audio indisponible pour cette piste.');
        pushLog('error', `Lecture impossible: ${targetTrack.title || targetTrack.id}`);
        return;
      }
      const retryPt = aiTrackToPlayerTrack(refreshed, generation);
      if (!retryPt) {
        notify.error('Lecture', 'Aucune source audio valide après synchronisation.');
        pushLog('error', `Retry lecture impossible: ${targetTrack.title || targetTrack.id}`);
        return;
      }
      try {
        await Promise.resolve(playTrack(retryPt as any));
        pushLog('info', `Lecture retry OK: ${refreshed.title || refreshed.id}`);
      } catch {
        notify.error('Lecture', 'Le provider audio renvoie un format non lisible.');
        pushLog('error', `Provider non lisible: ${refreshed.title || refreshed.id}`);
      }
    }
  };

  const playGenerationQueue = (generation: AIGeneration) => {
    const tracks = generation.tracks || [];
    if (!tracks.length) {
      notify.error('Lecture', 'Aucune piste trouvée pour cette génération.');
      return;
    }

    const playable = tracks
      .map((t) => aiTrackToPlayerTrack(t, generation))
      .filter(Boolean) as PlayerTrack[];

    if (!playable.length) {
      notify.error('Lecture', 'Aucune piste jouable (audio/stream) dans cette génération.');
      return;
    }

    // Queue + lecture (plus “bibliothèque” et plus pratique pour réécouter)
    setQueueAndPlay(playable as any, 0);
    notify.music('Lecture', `Lecture de ${playable.length} piste(s)`);
  };

  // Fonction pour jouer une génération
  const handlePlayGeneration = (generation: AIGeneration) => {
    if (generation.tracks?.length) {
      const firstTrack = generation.tracks[0];
      const converted = convertAITrackToGenerated(firstTrack as any);
      setSelectedTrack(converted);
      setGeneratedTrack(converted);
    }
    setSelectedGeneration(generation);
    playGenerationQueue(generation);
  };

  const assignABSlot = useCallback((slot: 'A' | 'B', generationId: string) => {
    if (slot === 'A') {
      setAbA(generationId);
      pushLog('info', `A/B: slot A = ${generationId.slice(0, 8)}`);
      return;
    }
    setAbB(generationId);
    pushLog('info', `A/B: slot B = ${generationId.slice(0, 8)}`);
  }, [pushLog]);

  const playABSlot = useCallback((slot: 'A' | 'B') => {
    const id = slot === 'A' ? abA : abB;
    if (!id) {
      pushLog('warn', `A/B: slot ${slot} vide`);
      return;
    }
    const gen = recentGenerationsSorted.find((g) => g.id === id);
    if (!gen) {
      pushLog('warn', `A/B: génération introuvable (${slot})`);
      return;
    }
    handlePlayGeneration(gen);
    setAbSide(slot);
    pushLog('info', `A/B: lecture ${slot}`);
  }, [abA, abB, handlePlayGeneration, pushLog, recentGenerationsSorted]);

  const toggleABPlay = useCallback(() => {
    const next: 'A' | 'B' = abSide === 'A' ? 'B' : 'A';
    playABSlot(next);
  }, [abSide, playABSlot]);

  // Toggle favori (même logique que ai-library)
  const toggleFavorite = async (generationId: string) => {
    try {
      const response = await fetch(`/api/ai/generations/${generationId}/favorite`, {
        method: 'POST'
      });
      
      if (response.ok) {
        // Mettre à jour l'état local
        setGenerations(prev => prev.map(g => 
          g.id === generationId 
            ? { ...g, is_favorite: !g.is_favorite }
            : g
        ));
      }
    } catch (error) {
      console.error('Erreur toggle favori:', error);
    }
  };

  const toggleTrackLikeRef = React.useRef(false);
  const toggleTrackLike = async (track: AITrack) => {
    if (toggleTrackLikeRef.current) return;
    toggleTrackLikeRef.current = true;
    const trackId = track.id;
    const wasLiked = likedTrackIds.has(trackId);
    const wantFav = !wasLiked;

    setLikedTrackIds((prev) => {
      const next = new Set(prev);
      if (wantFav) next.add(trackId); else next.delete(trackId);
      return next;
    });
    try {
      const res = await fetch(`/api/ai/tracks/${trackId}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: wantFav }),
      });
      if (!res.ok) {
        setLikedTrackIds((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(trackId); else next.delete(trackId);
          return next;
        });
      }
    } catch {
      setLikedTrackIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.add(trackId); else next.delete(trackId);
        return next;
      });
    } finally {
      toggleTrackLikeRef.current = false;
    }
  };

  const toggleTrackTrashRef = React.useRef(false);
  const toggleTrackTrash = async (track: AITrack) => {
    if (toggleTrackTrashRef.current) return;
    toggleTrackTrashRef.current = true;
    const trackId = track.id;
    const genId = (track as any).generation_id || (track as any).generation?.id;
    if (!genId) { toggleTrackTrashRef.current = false; return; }
    const wasTrashed = trashedTrackIds.has(trackId);
    const wantTrash = !wasTrashed;

    setTrashedTrackIds((prev) => {
      const next = new Set(prev);
      if (wantTrash) next.add(trackId); else next.delete(trackId);
      return next;
    });
    try {
      const res = await fetch(`/api/ai/generations/${genId}/trash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_trashed: wantTrash }),
      });
      if (res.ok) {
        const data = await res.json();
        setGenerations(prev => prev.map(g =>
          g.id === data.generation_id ? { ...g, is_trashed: data.is_trashed } : g
        ));
        const gen = generations.find(g => g.id === genId);
        if (gen?.tracks) {
          setTrashedTrackIds(prev => {
            const next = new Set(prev);
            for (const t of gen.tracks!) {
              if (data.is_trashed) next.add(t.id); else next.delete(t.id);
            }
            return next;
          });
        }
      } else {
        setTrashedTrackIds((prev) => {
          const next = new Set(prev);
          if (wasTrashed) next.add(trackId); else next.delete(trackId);
          return next;
        });
      }
    } catch {
      setTrashedTrackIds((prev) => {
        const next = new Set(prev);
        if (wasTrashed) next.add(trackId); else next.delete(trackId);
        return next;
      });
    } finally {
      toggleTrackTrashRef.current = false;
    }
  };

  const playLibraryQueue = useCallback((filteredTracks: AITrack[], startIndex: number) => {
    const playable = filteredTracks
      .map((t) => {
        const genId = (t as any).generation_id || (t as any).generation?.id;
        const gen = genId ? generationsById.get(String(genId)) : null;
        const fakeGen: AIGeneration = gen || {
          id: genId || 'unknown',
          prompt: (t as any).prompt || '',
          created_at: (t as any).created_at || new Date().toISOString(),
          status: 'completed',
          model: (t as any).model_name || 'V4_5',
          user_id: (session?.user?.id as string) || '',
          task_id: '',
          tracks: [],
          is_favorite: false,
          is_public: false,
          is_trashed: false,
          play_count: 0,
          like_count: 0,
          share_count: 0,
          metadata: {},
        };
        return aiTrackToPlayerTrack(t, fakeGen);
      })
      .filter(Boolean) as any[];

    if (playable.length > 0) {
      setQueueAndPlay(playable, startIndex);
    }
  }, [generationsById, session?.user?.id, aiTrackToPlayerTrack, setQueueAndPlay]);

  // Télécharger une track (même logique que ai-library)
  const downloadTrack = async (track: AITrack) => {
    try {
      const media = resolveTrackMedia(track);
      if (!media.playableUrl) {
        notify.error('Téléchargement', 'Aucune URL audio disponible pour cette piste.');
        return;
      }
      const response = await fetch(media.playableUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `synaura-${track.title || track.id}.mp3`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur téléchargement:', error);
    }
  };

  // Charger la bibliothèque au montage (même logique que ai-library)
  useEffect(() => {
    loadLibrary();
    const onUpdated = () => loadLibrary();
    window.addEventListener('aiLibraryUpdated', onUpdated as EventListener);
    return () => window.removeEventListener('aiLibraryUpdated', onUpdated as EventListener);
  }, [loadLibrary]);

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showModelDropdown && !target.closest('.model-dropdown-container')) {
        setShowModelDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModelDropdown]);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('synaura.ai.shellMode') : null;
    if (saved === 'ide' || saved === 'classic') setShellMode(saved);
    const savedTab = typeof window !== 'undefined' ? window.localStorage.getItem('synaura.ai.leftExplorerTab') : null;
    if (savedTab === 'builder' || savedTab === 'presets' || savedTab === 'assets' || savedTab === 'history') {
      setLeftExplorerTab(savedTab);
    }
    const savedConsole = typeof window !== 'undefined' ? window.localStorage.getItem('synaura.ai.consoleCollapsed') : null;
    if (savedConsole === '1') setConsoleCollapsed(true);
    const savedModel = typeof window !== 'undefined' ? window.localStorage.getItem('synaura.ai.defaultModel') : null;
    if (savedModel === 'V5' || savedModel === 'V4_5PLUS' || savedModel === 'V4_5') setModelVersion(savedModel);
    const savedDuration = typeof window !== 'undefined' ? window.localStorage.getItem('synaura.ai.defaultDuration') : null;
    if (savedDuration === '60' || savedDuration === '120' || savedDuration === '180') setGenerationDuration(Number(savedDuration) as 60 | 120 | 180);
    const savedLeftPx = typeof window !== 'undefined' ? window.localStorage.getItem('synaura.ai.leftPx') : null;
    const savedRightPx = typeof window !== 'undefined' ? window.localStorage.getItem('synaura.ai.rightPx') : null;
    const savedLeftRatio = typeof window !== 'undefined' ? window.localStorage.getItem('synaura.ai.leftRatio') : null;
    const savedRightRatio = typeof window !== 'undefined' ? window.localStorage.getItem('synaura.ai.rightRatio') : null;
    const savedLayoutVersion = typeof window !== 'undefined' ? window.localStorage.getItem('synaura.ai.layoutVersion') : null;

    const defaultLeft = getDefaultLeftWidth();
    const defaultRight = getDefaultRightWidth();
    let nextLeft = defaultLeft;
    let nextRight = defaultRight;

    const cw = getContainerWidth();
    const canUseSaved = savedLayoutVersion === LAYOUT_VERSION;
    if (canUseSaved && savedLeftRatio) {
      const r = Number(savedLeftRatio);
      if (Number.isFinite(r) && r > 0) nextLeft = clamp(Math.round(cw * r), LEFT_MIN, LEFT_MAX);
    } else if (canUseSaved && savedLeftPx) {
      nextLeft = clamp(Number(savedLeftPx), LEFT_MIN, LEFT_MAX);
    }
    if (canUseSaved && savedRightRatio) {
      const r = Number(savedRightRatio);
      if (Number.isFinite(r) && r > 0) nextRight = clamp(Math.round(cw * r), RIGHT_MIN, RIGHT_MAX);
    } else if (canUseSaved && savedRightPx) {
      nextRight = clamp(Number(savedRightPx), RIGHT_MIN, RIGHT_MAX);
    }
    const normalized = normalizePanelWidths(nextLeft, nextRight);
    setLeftPx(normalized.left);
    setRightPx(normalized.right);
  }, [getContainerWidth, getDefaultLeftWidth, getDefaultRightWidth, normalizePanelWidths]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem('synaura.ai.shellMode', shellMode); } catch {}
  }, [shellMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem('synaura.ai.leftExplorerTab', leftExplorerTab); } catch {}
  }, [leftExplorerTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem('synaura.ai.consoleCollapsed', consoleCollapsed ? '1' : '0'); } catch {}
  }, [consoleCollapsed]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem('synaura.ai.defaultModel', modelVersion); } catch {}
  }, [modelVersion]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem('synaura.ai.defaultDuration', String(generationDuration)); } catch {}
  }, [generationDuration]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('synaura.ai.leftPx', String(leftPx));
      window.localStorage.setItem('synaura.ai.rightPx', String(rightPx));
      window.localStorage.setItem('synaura.ai.layoutVersion', LAYOUT_VERSION);
      const cw = getContainerWidth();
      if (cw > 0) {
        window.localStorage.setItem('synaura.ai.leftRatio', String(leftPx / cw));
        window.localStorage.setItem('synaura.ai.rightRatio', String(rightPx / cw));
      }
    } catch {}
  }, [getContainerWidth, leftPx, rightPx]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inInput = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
        return;
      }
      if (e.key === 'Escape') {
        setSettingsOpen(false);
        setCmdOpen(false);
      }
      if (e.code === 'Space' && !inInput && !cmdOpen) {
        e.preventDefault();
        if (audioState.isPlaying) pause();
        else play().catch(() => {});
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [audioState.isPlaying, cmdOpen, pause, play]);

  useEffect(() => {
    if (!cmdOpen) return;
    setCmdQuery('');
    setCmdIndex(0);
    const t = window.setTimeout(() => cmdInputRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [cmdOpen]);

  useEffect(() => {
    if (cmdIndex < filteredCommandItems.length) return;
    setCmdIndex(0);
  }, [cmdIndex, filteredCommandItems.length]);
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [weirdness, setWeirdness] = useState<number>(50);
  const [styleInfluence, setStyleInfluence] = useState<number>(50);
  const [audioWeight, setAudioWeight] = useState<number>(50);
  const refreshSunoCredits = useCallback(async () => {
    try {
      const res = await fetch('/api/suno/credits', { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json().catch(() => ({}));
      if (typeof json?.credits === 'number') setSunoCredits(json.credits);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      const data = await fetchCreditsBalance();
      if (data && typeof data.balance === 'number') setCreditsBalance(data.balance);
      await refreshSunoCredits();
    })();
    // Vérifier si retour de Checkout Stripe
    try {
      const params = new URLSearchParams(window.location.search);
      const sid = params.get('session_id');
      if (sid) {
        // Petit délai pour laisser le webhook agir
        setTimeout(async () => {
          const refreshed = await fetchCreditsBalance();
          if (refreshed && typeof refreshed.balance === 'number') setCreditsBalance(refreshed.balance);
          // Si pas d'effet, tente une vérification côté serveur (secours)
          try {
            const res = await fetch('/api/billing/credits/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: sid }) });
            if (res.ok) {
              const j = await res.json();
              if (j?.added) {
                const b = await fetchCreditsBalance();
                if (b && typeof b.balance === 'number') setCreditsBalance(b.balance);
              }
            }
          } catch {}
          // Nettoyer l'URL
          const url = new URL(window.location.href);
          url.searchParams.delete('session_id');
          window.history.replaceState({}, '', url.toString());
        }, 1500);
      }
    } catch {}
  }, [refreshSunoCredits]);
  const [vocalGender, setVocalGender] = useState<string>(''); // 'm' | 'f' | ''
  const [negativeTags, setNegativeTags] = useState<string>('');

  const [styleSuggestions, setStyleSuggestions] = useState<string[]>(['rock','hip hop','electronic','pop','lo-fi','house','afrobeat','ambient']);
  const [vibeSuggestions, setVibeSuggestions] = useState<string[]>(['dramatic builds','catchy beats','emotional','fast guitar','breathy vocals']);

  // Catégories de tags façon Suno (scroll vertical) — fusion avec les suggestions API
  const tagCategories = React.useMemo(() => {
    const genre = Array.from(new Set([...styleSuggestions, 'pop', 'rock', 'electronic', 'hip hop', 'lo-fi', 'house', 'ambient', 'jazz', 'trap', 'edm', 'folk', 'R&B', 'country', 'metal', 'afrobeat', 'indie', 'synthwave', 'deep house']));
    const mood = Array.from(new Set([...vibeSuggestions, 'emotional', 'dramatic builds', 'catchy beats', 'dark', 'uplifting', 'moody', 'cinematic', 'nostalgic', 'dreamy', 'euphoric', 'intimate', 'powerful', 'melancholic']));
    const production = ['lo-fi', 'polished', 'vintage', 'warm', 'minimal', 'atmospheric', 'gritty', 'crisp', 'modern'];
    const vocal = ['breathy vocals', 'fast guitar', 'synth-driven', 'acoustic guitar', 'ethereal vocals', 'raspy vocals', 'piano', 'strings'];
    return [
      { id: 'genre', label: 'Genre', tags: genre },
      { id: 'mood', label: 'Ambiance', tags: mood },
      { id: 'production', label: 'Production', tags: production },
      { id: 'vocal', label: 'Voix / Instrument', tags: vocal },
    ];
  }, [styleSuggestions, vibeSuggestions]);


  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ai/tags/suggestions', { headers: { 'Cache-Control': 'no-store' } });
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) {
            if (Array.isArray(json.styles) && json.styles.length) setStyleSuggestions(json.styles);
            if (Array.isArray(json.tags) && json.tags.length) setVibeSuggestions(json.tags);
          }
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // Mémoire locale des préférences (dev simple)
  const persistTagPref = (tag: string) => {
    try {
      const key = 'ai_tag_prefs';
      const raw = localStorage.getItem(key);
      const map = raw ? JSON.parse(raw) as Record<string, number> : {};
      map[tag] = (map[tag] || 0) + 1;
      localStorage.setItem(key, JSON.stringify(map));
    } catch {}
  };

  const defaultStylesPool = ['pop','electronic','hip hop','lo-fi','house','ambient','rock','jazz','trap','edm'];
  const defaultVibesPool = ['catchy beats','emotional','dramatic builds','fast guitar','breathy vocals','dark','uplifting','moody','cinematic'];

  const pickNextCandidate = (pool: string[], exclude: Set<string>): string | null => {
    for (const p of pool) {
      if (!exclude.has(p)) return p;
    }
    return null;
  };

  const handleTagClick = (tag: string) => {
    const isActive = selectedTags.includes(tag);
    if (!isActive) {
      setSelectedTags(prev => [...prev, tag]);
      persistTagPref(tag);
      if (customMode) {
        setStyle(prev => {
          const parts = prev.split(',').map(s => s.trim()).filter(Boolean);
          if (parts.includes(tag)) return prev;
          return parts.length ? `${prev}, ${tag}` : tag;
        });
      } else {
        // En mode simple, injecter dans la description si non présent
        setDescription(prev => {
          const parts = prev.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
          if (parts.includes(tag)) return prev;
          return prev.trim().length ? `${prev}, ${tag}` : tag;
        });
      }
      // Remplacer la suggestion sélectionnée par une nouvelle
      const allShown = new Set<string>([...styleSuggestions, ...vibeSuggestions, ...selectedTags, tag]);
      if (styleSuggestions.includes(tag)) {
        const candidate = pickNextCandidate([...styleSuggestions, ...defaultStylesPool], allShown);
        setStyleSuggestions(prev => prev.filter(t => t !== tag).concat(candidate ? [candidate] : []));
      } else if (vibeSuggestions.includes(tag)) {
        const candidate = pickNextCandidate([...vibeSuggestions, ...defaultVibesPool], allShown);
        setVibeSuggestions(prev => prev.filter(t => t !== tag).concat(candidate ? [candidate] : []));
      }
    } else {
      // Désélection
      setSelectedTags(prev => prev.filter(t => t !== tag));
      // Réinsérer à la fin de la liste correspondante pour reproposer plus tard
      if (styleSuggestions.indexOf(tag) === -1 && vibeSuggestions.indexOf(tag) === -1) {
        // Réinjecter côté styles par défaut
        setStyleSuggestions(prev => prev.concat(tag));
      }
    }
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const formatCreditsCompact = (n: number) => {
    if (!Number.isFinite(n)) return String((n as any) ?? 0);
    if (n >= 1000) {
      const k = n / 1000;
      return `${k.toFixed(1)}k`;
    }
    return String(n);
  };

  const handleApplyPreset = (preset: AIStudioPreset) => {
    const d = preset.defaults;

    setActivePresetId(preset.id);

    if (d.title !== undefined) setTitle(d.title);
    if (d.description !== undefined) setDescription(d.description);
    if (d.style !== undefined) setStyle(d.style);
    if (d.isInstrumental !== undefined) setIsInstrumental(d.isInstrumental);
    if (typeof d.weirdness === 'number') setWeirdness(d.weirdness);
    if (typeof d.styleInfluence === 'number') setStyleInfluence(d.styleInfluence);
    if (typeof d.audioWeight === 'number') setAudioWeight(d.audioWeight);
    if (d.tags && d.tags.length) setSelectedTags(d.tags);
    pushLog('info', `Preset appliqué: ${(preset as any).name || preset.id}`);
  };

  const playGenerated = async (gt: GeneratedTrack) => {
    const directUrl = typeof gt.audioUrl === 'string' ? gt.audioUrl.trim() : '';
    const backupDirect = Array.isArray(gt.backupAudioUrls)
      ? gt.backupAudioUrls.find((u) => typeof u === 'string' && u.trim().length > 0)?.trim() || ''
      : '';
    const playableDirect = directUrl || backupDirect;
    if (!playableDirect) {
      const rawLive = (activeBgGeneration?.latestTracks || []).find((t: any, idx: number) => {
        const tid = String(t?.id || `${activeBgGeneration?.taskId || 'task'}_${idx}`);
        return tid === String(gt.id) || String(t?.title || '').trim() === String(gt.title || '').trim();
      });
      const livePlayableUrl = resolveLiveTrackMedia(rawLive).playableUrl;
      if (livePlayableUrl) {
        const liveMedia = resolveLiveTrackMedia(rawLive);
        const liveTrack: GeneratedTrack = {
          ...gt,
          audioUrl: livePlayableUrl,
          backupAudioUrls: Array.from(
            new Set(
              [liveMedia.audioUrl, liveMedia.streamUrl].filter(
                (u): u is string => Boolean(u && u !== livePlayableUrl)
              )
            )
          ),
        };
        setGeneratedTracks((prev) => prev.map((t) => (String(t.id) === String(gt.id) ? liveTrack : t)));
        setGeneratedTrack((prev) => (prev && String(prev.id) === String(gt.id) ? liveTrack : prev));
        await Promise.resolve(playGenerated(liveTrack));
        return;
      }
      // Fallback: retrouver la track IA source puis utiliser le pipeline robuste (hydrate/retry).
      const sourceTrack = allTracks.find((t) => String(t.id) === String(gt.id));
      if (sourceTrack) {
        const genId = (sourceTrack as any).generation_id || (sourceTrack as any).generation?.id;
        const sourceGen =
          (genId ? generationsById.get(String(genId)) : null) ||
          selectedGeneration ||
          recentGenerationsSorted.find((g) => (g.tracks || []).some((t) => String(t.id) === String(sourceTrack.id))) ||
          null;
        if (sourceGen) {
          await playAITrack(sourceTrack as any, sourceGen);
          return;
        }
      }
      notify.error('Lecture', 'Aucune URL audio exploitable pour cette piste.');
      pushLog('warn', `Track générée sans audioUrl: ${gt.title || gt.id}`);
      return;
    }

    const taskIdForLyrics =
      activeBgGeneration?.taskId ??
      recentGenerationsSorted.find((g) => (g.tracks || []).some((t: any) => String(t.id) === String(gt.id)))?.task_id ??
      null;
    const playerTrack: PlayerTrack & { generationTaskId?: string; sunoAudioId?: string } = {
      _id: `gen-${gt.id}`,
      title: gt.title || 'Musique générée',
      artist: {
        _id: 'ai-generator',
        name: 'Synaura IA',
        username: 'synaura-ai'
      },
      audioUrl: playableDirect,
      backupAudioUrls: Array.isArray(gt.backupAudioUrls)
        ? gt.backupAudioUrls.filter((u) => typeof u === 'string' && u.trim().length > 0 && u.trim() !== playableDirect)
        : [],
      coverUrl: gt.imageUrl || '/synaura_symbol.svg',
      duration: gt.duration || 120,
      likes: [],
      comments: [],
      plays: 0,
      genre: ['IA']
    };
    (playerTrack as any).generationTaskId = taskIdForLyrics ?? '';
    (playerTrack as any).sunoAudioId = String(gt.id ?? '');
    await Promise.resolve(playTrack(playerTrack as any)).catch(() => {
      notify.error('Lecture', 'La lecture a échoué pour cette piste.');
      pushLog('error', `Échec lecture generated: ${gt.title || gt.id}`);
    });
  };

  const downloadGenerated = async (gt: GeneratedTrack) => {
    try {
      const res = await fetch(gt.audioUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${gt.title || 'synaura-track'}.mp3`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {}
  };

  const shareGenerated = async (gt: GeneratedTrack) => {
    try {
      const shareData = {
        title: gt.title || 'Musique générée',
        text: 'Écoutez ma musique générée par IA sur Synaura',
        url: typeof window !== 'undefined' ? window.location.href : ''
      } as any;
      if ((navigator as any).share) {
        await (navigator as any).share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
        notify.success('Partage', 'Lien copié');
      }
    } catch {}
  };

  // Fonction pour ouvrir le panneau de track
  const openTrackPanel = (track: GeneratedTrack) => {
    console.log('🎵 Ouverture du panneau pour la track:', track);
    setSelectedTrack(track);
    setShowTrackPanel(true);
  };

  // Fonction pour fermer le panneau de track
  const closeTrackPanel = () => {
    setShowTrackPanel(false);
    setSelectedTrack(null);
  };

  const handleCopyLyrics = useCallback((track: GeneratedTrack, copyPrompt?: boolean) => {
    const text = (copyPrompt ? track.prompt : (track.lyrics || track.prompt) || '').trim();
    if (!text) {
      notify.warning(copyPrompt ? 'Prompt' : 'Paroles', copyPrompt ? 'Aucun prompt à copier.' : 'Aucune parole à copier pour cette piste.');
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => notify.success('Presse-papier', copyPrompt ? 'Prompt copié.' : 'Paroles copiées dans le presse-papier'),
      () => pushLog('warn', 'Impossible de copier dans le presse-papier')
    );
  }, [pushLog]);

  const handleReuseTrackInfo = useCallback((track: GeneratedTrack) => {
    setTitle(track.title || '');
    setStyle(track.style || '');
    setLyrics(track.lyrics || track.prompt || '');
    setCustomMode(true);
    notify.success('Formulaire', 'Titre, style et paroles réutilisés.');
    closeTrackPanel();
  }, []);

  const useLibraryTrackForRemix = (track: AITrack) => {
    const media = resolveTrackMedia(track as any);
    const sourceUrl = media.audioUrl || media.streamUrl || media.playableUrl;
    setRemixSourceTrackId(track.id);
    if (!sourceUrl) {
      notify.error('Remix', 'Aucune URL audio exploitable pour cette piste.');
      return;
    }
    setGenerationModeKind('remix');
    setCustomMode(true);
    setOpenStyleSection(true);
    setRemixFile(null);
    setRemixUploadUrl(sourceUrl);
    setRemixSourceDurationSec(Number((track as any)?.duration || 0) || undefined);
    const label = getUploadedAssetName(track);
    setRemixSourceLabel(label);

    if (track.title) setTitle(track.title);
    if (track.style) setStyle(track.style);
    else if (track.prompt) setStyle(track.prompt);
    if (track.lyrics) setLyrics(track.lyrics);

    pushLog('info', `Source remix sélectionnée: ${label}`);
  };

  const useGeneratedTrackForRemix = (track: GeneratedTrack) => {
    const sourceUrl =
      (typeof track.audioUrl === 'string' && track.audioUrl.trim().length > 0
        ? track.audioUrl.trim()
        : '') ||
      (Array.isArray(track.backupAudioUrls)
        ? track.backupAudioUrls.find((u) => typeof u === 'string' && u.trim().length > 0)?.trim() || ''
        : '');
    if (!sourceUrl) {
      notify.error('Remix', 'Aucune URL audio exploitable pour cette génération.');
      return;
    }
    setGenerationModeKind('remix');
    setCustomMode(true);
    setOpenStyleSection(true);
    setRemixFile(null);
    setRemixUploadUrl(sourceUrl);
    setRemixSourceDurationSec(Number(track.duration || 0) || undefined);
    const label = track.title || 'Piste générée';
    setRemixSourceLabel(label);
    setRemixSourceTrackId(null);

    if (track.title) setTitle(track.title);
    if (track.style) setStyle(track.style);
    else if (track.prompt) setStyle(track.prompt);
    if (track.lyrics) setLyrics(track.lyrics);

    pushLog('info', `Source remix sélectionnée: ${label}`);
  };

  const clearRemixSource = () => {
    setRemixFile(null);
    setRemixUploadUrl(null);
    setRemixSourceDurationSec(undefined);
    setRemixSourceLabel(null);
    setRemixSourceTrackId(null);
    pushLog('info', 'Source remix désélectionnée');
  };

  const performRemixUpload = useCallback(async (file: File, uploadTitle: string) => {
    setRemixUploading(true);
    setUploadingRemixTitle(uploadTitle);
    uploadAbortRef.current = new AbortController();
    const signal = uploadAbortRef.current.signal;
    try {
      const timestamp = Math.round(new Date().getTime() / 1000);
      const publicId = `remix_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const sigRes = await fetch('/api/upload/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp, publicId, resourceType: 'video' })
      });
      if (!sigRes.ok) throw new Error('Erreur signature Cloudinary');
      const { signature, apiKey, cloudName } = await sigRes.json();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'ximam/audio');
      formData.append('public_id', publicId);
      formData.append('resource_type', 'video');
      formData.append('timestamp', String(timestamp));
      formData.append('api_key', apiKey);
      formData.append('signature', signature);
      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
        method: 'POST',
        body: formData,
        signal,
      });
      if (!uploadResponse.ok) throw new Error('Erreur upload Cloudinary');
      const uploaded = await uploadResponse.json();
      const secureUrl = uploaded?.secure_url as string;
      const uploadedPublicId = uploaded?.public_id as string | undefined;
      const uploadedDuration = typeof uploaded?.duration === 'number' ? uploaded.duration : undefined;
      if (!secureUrl) throw new Error('URL de fichier manquante');
      setRemixUploading(false);
      setRemixUploadUrl(secureUrl);
      setRemixSourceDurationSec(uploadedDuration);
      setRemixSourceLabel(file.name);
      setRemixSourceTrackId(null);
      if (typeof uploadedDuration === 'number' && uploadedDuration > 8 * 60) {
        notify.warning('Durée audio', 'Suno accepte au maximum 8 minutes. Ton fichier est plus long et pourrait être refusé.');
      }
      setTitle(uploadTitle);
      try {
        const res = await fetch('/api/ai/upload-source', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioUrl: secureUrl,
            publicId: uploadedPublicId,
            title: uploadTitle,
            duration: uploadedDuration,
            fileName: file.name,
          })
        });
        if (res.ok) window.dispatchEvent(new CustomEvent('aiLibraryUpdated'));
      } catch {}
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setRemixUploading(false);
      notify.error('Upload audio', e?.message || 'Erreur upload');
    } finally {
      setUploadingRemixTitle(null);
      uploadAbortRef.current = null;
    }
  }, []);

  // Fonction pour convertir AITrack en GeneratedTrack
  const convertAITrackToGenerated = (aiTrack: AITrack): GeneratedTrack => {
    const media = resolveTrackMedia(aiTrack);
    const backupAudioUrls = Array.from(
      new Set([media.audioUrl, media.streamUrl].filter((u): u is string => Boolean(u && u !== media.playableUrl)))
    );
    const generation = generationsById.get(String(aiTrack.generation_id));
    return {
      id: aiTrack.id,
      sunoAudioId: aiTrack.suno_id || undefined,
      generationTaskId: generation?.task_id || undefined,
      audioUrl: media.playableUrl || '',
      backupAudioUrls,
      prompt: aiTrack.prompt || '',
      title: aiTrack.title,
      style: aiTrack.style || 'Custom',
      lyrics: aiTrack.lyrics || '',
      isInstrumental: aiTrack.prompt?.toLowerCase().includes('instrumental') || false,
      duration: aiTrack.duration || 120,
      createdAt: aiTrack.created_at,
      imageUrl: media.imageUrl || '/synaura_symbol.svg'
    };
  };

  const activeBgGeneration = React.useMemo(
    () =>
      currentTaskId
        ? bgGenerations.find((g) => g.taskId === currentTaskId) || null
        : bgGenerations.find((g) => g.status === 'pending' || g.status === 'first') || null,
    [bgGenerations, currentTaskId]
  );

  const livePreviewTrack = React.useMemo(
    () => generatedTracks.find((t) => Boolean(t.audioUrl)) || null,
    [generatedTracks]
  );

  const liveProgressPct = React.useMemo(() => {
    if (!activeBgGeneration) return 0;
    const raw = Number(activeBgGeneration.progress || 0);
    return Math.max(2, Math.min(99, Math.round(raw)));
  }, [activeBgGeneration]);

  const liveStatusLabel = React.useMemo(() => {
    if (sunoState === 'first') return isRemixMode ? 'Premier rendu remix disponible' : 'Premier rendu disponible';
    if (sunoState === 'pending') return isRemixMode ? 'Remix en cours' : 'Génération en cours';
    if (sunoState === 'success') return isRemixMode ? 'Remix finalisé' : 'Génération finalisée';
    if (sunoState === 'error') return isRemixMode ? 'Erreur de remix' : 'Erreur de génération';
    return 'En attente';
  }, [isRemixMode, sunoState]);

  // Source de vérité unique pour le statut de génération
  React.useEffect(() => {
    if (!activeBgGeneration) {
      setSunoState('idle');
      setSunoError(null);
      if (generationStatus === 'pending') setGenerationStatus('idle');
      return;
    }

    if (activeBgGeneration.status === 'failed') {
      setSunoState('error');
      setSunoError(activeBgGeneration.lastError || 'La génération a échoué.');
      setGenerationStatus('failed');
      return;
    }
    if (activeBgGeneration.status === 'completed') {
      setSunoState('success');
      setSunoError(null);
      setGenerationStatus('completed');
      return;
    }
    if (activeBgGeneration.status === 'first') {
      setSunoState('first');
      setSunoError(null);
      setGenerationStatus('pending');
      return;
    }

    setSunoState('pending');
    setSunoError(null);
    setGenerationStatus('pending');
  }, [activeBgGeneration, generationStatus]);

  React.useEffect(() => {
    if (!currentTaskId) return;
    const current = bgGenerations.find((g) => g.taskId === currentTaskId);
    if (!current) return;
    if (current.status === 'failed' || (current.status === 'completed' && current.completedSaved)) {
      setCurrentTaskId(null);
    }
  }, [bgGenerations, currentTaskId]);

  const showLivePanel = React.useMemo(() => {
    if (sunoState === 'error') return true;
    if (generationStatus === 'pending') return true;
    if (!activeBgGeneration) return false;
    if (activeBgGeneration.status === 'completed' && activeBgGeneration.completedSaved) return false;
    return activeBgGeneration.status === 'pending' || activeBgGeneration.status === 'first';
  }, [activeBgGeneration, generationStatus, sunoState]);

  const activeQueueTrack = (audioState.tracks || [])[audioState.currentTrackIndex || 0] as any;
  const activeInspectorTrack = selectedTrack || generatedTrack;
  const inspectorDuration = Number(audioState.duration || activeInspectorTrack?.duration || 0);
  const inspectorProgress = Math.max(
    0,
    Math.min(1, inspectorDuration > 0 ? Number(audioState.currentTime || 0) / inspectorDuration : 0),
  );
  const showDesktopRightPanel = Boolean(showTrackPanel && selectedTrack);
  const idePromptValue = customMode ? style : description;
  const playbackDuration = Number(audioState.duration || generatedTrack?.duration || 0);
  const playbackCurrentTime = Number(audioState.currentTime || 0);
  const playbackProgress = Math.max(0, Math.min(1, playbackDuration > 0 ? playbackCurrentTime / playbackDuration : 0));

  const getWaveRatioFromClientX = useCallback((clientX: number, host: HTMLDivElement) => {
    const rect = host.getBoundingClientRect();
    return clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
  }, []);

  const seekWithWaveRatio = useCallback((ratio: number) => {
    if (!Number.isFinite(inspectorDuration) || inspectorDuration <= 0) return;
    seek(inspectorDuration * ratio);
  }, [inspectorDuration, seek]);

  const handleWavePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!Number.isFinite(inspectorDuration) || inspectorDuration <= 0) return;
    const host = e.currentTarget as HTMLDivElement;
    host.setPointerCapture?.(e.pointerId);
    setWaveScrubbing(true);
    const ratio = getWaveRatioFromClientX(e.clientX, host);
    setWaveHoverRatio(ratio);
    seekWithWaveRatio(ratio);
    const onMove = (ev: PointerEvent) => {
      const moveRatio = getWaveRatioFromClientX(ev.clientX, host);
      setWaveHoverRatio(moveRatio);
      seekWithWaveRatio(moveRatio);
    };
    const onUp = () => {
      setWaveScrubbing(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [getWaveRatioFromClientX, inspectorDuration, seekWithWaveRatio]);

  const seekByRatio = useCallback((ratio: number) => {
    if (!Number.isFinite(playbackDuration) || playbackDuration <= 0) return;
    seek(Math.max(0, Math.min(playbackDuration, playbackDuration * ratio)));
  }, [playbackDuration, seek]);

  const selectGenerationInIde = useCallback((g: AIGeneration) => {
    const track = g.tracks?.[0];
    if (!track) {
      notify.warning('Version', 'Cette génération ne contient pas encore de piste exploitable.');
      return;
    }
    const converted = convertAITrackToGenerated(track as any);
    setSelectedGeneration(g);
    setSelectedTrack(converted);
    setGeneratedTrack(converted);
    setShowTrackPanel(true);
    setRightTab('inspector');
    pushLog('info', `Version sélectionnée: ${converted.title || 'Génération'}`);
  }, [pushLog]);

  const generateAutoLyrics = useCallback(async () => {
    if (isInstrumental) {
      notify.warning('Lyrics', 'Mode instrumental actif: passe en mode voix pour auto-générer des paroles.');
      return;
    }
    if (isGeneratingLyrics) return;

    const seedText = [
      title.trim() ? `Title: ${title.trim()}` : '',
      (customMode ? style : description).trim(),
      selectedTags.slice(0, 5).join(', '),
      'Structure: intro, verse, chorus, verse, chorus, bridge, outro',
      'Language: French',
      'Tone: modern, catchy, emotional',
    ]
      .filter(Boolean)
      .join(' | ');
    // Doc Suno Generate Lyrics: prompt max 200 caractères
    const lyricsPrompt = seedText.slice(0, 200);

    setIsGeneratingLyrics(true);
    pushLog('info', 'Lyrics auto: requête Suno...');
    try {
      const res = await fetch('/api/suno/generate-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: lyricsPrompt }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || 'Impossible de générer des lyrics');
      }

      let best = typeof json?.best === 'string' ? json.best.trim() : '';
      let variants = Array.isArray(json?.variants) ? json.variants : [];

      // Si encore pending, on poll les détails quelques secondes supplémentaires.
      const taskId = typeof json?.taskId === 'string' ? json.taskId : '';
      if (!best && variants.length === 0 && taskId) {
        pushLog('info', `Lyrics auto: task ${taskId.slice(0, 8)} en cours...`);
        for (let attempt = 0; attempt < 10; attempt += 1) {
          await new Promise((r) => window.setTimeout(r, 1400));
          const detailRes = await fetch(`/api/suno/generate-lyrics?taskId=${encodeURIComponent(taskId)}`, { cache: 'no-store' });
          const detailJson = await detailRes.json().catch(() => ({}));
          if (!detailRes.ok) continue;
          best = typeof detailJson?.best === 'string' ? detailJson.best.trim() : '';
          variants = Array.isArray(detailJson?.variants) ? detailJson.variants : [];
          if (best || variants.length > 0) break;
        }
      }

      const selected = best || (typeof variants?.[0]?.text === 'string' ? variants[0].text.trim() : '');
      if (!selected) {
        notify.warning('Lyrics', 'Toujours en cours chez Suno. Re-clique Auto dans quelques secondes.');
        pushLog('warn', `Lyrics auto: en attente (${taskId || json?.taskId || 'task'})`);
        return;
      }

      setLyrics((prev) => (prev.trim().length > 0 ? `${prev}\n\n${selected}` : selected));
      notify.success('Lyrics', `Paroles générées${variants.length > 1 ? ` (${variants.length} variantes)` : ''}`);
      pushLog('info', `Lyrics auto: ${variants.length || 1} variante(s) reçue(s)`);
    } catch (e: any) {
      notify.error('Lyrics', e?.message || 'Erreur génération lyrics');
      pushLog('error', `Lyrics auto: ${e?.message || 'échec'}`);
    } finally {
      setIsGeneratingLyrics(false);
    }
  }, [customMode, description, isGeneratingLyrics, isInstrumental, pushLog, selectedTags, style, title]);

  const selectedTrackContext = React.useMemo(() => {
    if (!selectedTrack) return { taskId: '', audioId: '' };
    const directTaskId = selectedTrack.generationTaskId || selectedGeneration?.task_id || '';
    const directAudioId = selectedTrack.sunoAudioId || '';
    if (directTaskId && directAudioId) {
      return { taskId: directTaskId, audioId: directAudioId };
    }

    const holder = recentGenerationsSorted.find((g) =>
      (g.tracks || []).some((t: any) => String(t.id) === String(selectedTrack.id) || String(t.suno_id || '') === String(selectedTrack.sunoAudioId || ''))
    );
    const candidate = holder?.tracks?.find((t: any) => String(t.id) === String(selectedTrack.id) || String(t.suno_id || '') === String(selectedTrack.sunoAudioId || ''));
    return {
      taskId: directTaskId || holder?.task_id || '',
      audioId: directAudioId || String(candidate?.suno_id || ''),
    };
  }, [recentGenerationsSorted, selectedGeneration?.task_id, selectedTrack]);

  /** Contexte de la piste actuellement en lecture (queue) pour charger waveform/paroles synchronisées */
  const playingTrackContext = React.useMemo(() => {
    const cur = activeQueueTrack as { generationTaskId?: string; sunoAudioId?: string } | undefined;
    const taskId = (cur?.generationTaskId ?? '').trim();
    const audioId = (cur?.sunoAudioId ?? '').trim();
    return { taskId, audioId };
  }, [activeQueueTrack]);

  /** Contexte effectif : piste en lecture si dispo (taskId+audioId), sinon piste sélectionnée → waveform/lyrics liés à la musique jouée */
  const effectiveTrackContext = React.useMemo(() => {
    if (playingTrackContext.taskId && playingTrackContext.audioId) return playingTrackContext;
    return selectedTrackContext;
  }, [playingTrackContext, selectedTrackContext]);

  /** La waveform/paroles affichées correspondent à la piste en lecture → on affiche la progression, sinon 0 */
  const isWaveformForPlayingTrack =
    !!playingTrackContext.taskId &&
    effectiveTrackContext.taskId === playingTrackContext.taskId &&
    effectiveTrackContext.audioId === playingTrackContext.audioId;

  const selectedTrackForVisibility = React.useMemo(() => {
    const active = selectedTrack || generatedTrack;
    if (!active?.id) return null;
    const trackInAll = allTracks.find((t) => String(t.id) === String(active.id));
    if (trackInAll) return trackInAll;
    for (const g of recentGenerationsSorted) {
      const found = (g.tracks || []).find((t: any) => String(t.id) === String(active.id));
      if (found) return found;
    }
    return null;
  }, [allTracks, generatedTrack, recentGenerationsSorted, selectedTrack]);

  const selectedGenerationForVisibility = React.useMemo(() => {
    if (selectedGeneration) return selectedGeneration;
    const active = selectedTrack || generatedTrack;
    if (active) {
      const sourceTrack = allTracks.find((t) => String(t.id) === String(active.id));
      const sourceGenId = (sourceTrack as any)?.generation_id || (sourceTrack as any)?.generation?.id;
      if (sourceGenId) {
        const byId = generationsById.get(String(sourceGenId));
        if (byId) return byId;
      }
      const byTrack = recentGenerationsSorted.find((g) =>
        (g.tracks || []).some((t: any) => String(t.id) === String(active.id))
      );
      if (byTrack) return byTrack;
    }
    return null;
  }, [allTracks, generatedTrack, generationsById, recentGenerationsSorted, selectedGeneration, selectedTrack]);

  const selectedVisibilityState = React.useMemo(() => {
    const track = selectedTrackForVisibility as any;
    if (track?.is_public != null) return { is_public: track.is_public };
    const gen = selectedGenerationForVisibility;
    if (gen) return { is_public: gen.is_public === true };
    return null;
  }, [selectedTrackForVisibility, selectedGenerationForVisibility]);

  const toggleGenerationVisibility = useCallback(async () => {
    const track = selectedTrackForVisibility;
    const generation = selectedGenerationForVisibility;
    if (!track?.id && !generation?.id) {
      notify.warning('Publication', 'Sélectionne une piste enregistrée pour publier.');
      return;
    }
    if (publishingVisibility) return;

    const currentPublic = selectedVisibilityState?.is_public === true;
    const nextPublic = !currentPublic;
    setPublishingVisibility(true);

    try {
      if (track?.id) {
        const res = await fetch(`/api/ai/tracks/${encodeURIComponent(String(track.id))}/visibility`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPublic: nextPublic }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || 'Impossible de changer la visibilité');

        setAllTracks((prev) =>
          prev.map((t) => (String(t.id) === String(track.id) ? { ...t, is_public: nextPublic } : t))
        );
        setGenerations((prev) =>
          prev.map((g) => ({
            ...g,
            tracks: (g.tracks || []).map((t: any) =>
              String(t.id) === String(track.id) ? { ...t, is_public: nextPublic } : t
            ),
          }))
        );
        setSelectedGeneration((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            tracks: (prev.tracks || []).map((t: any) =>
              String(t.id) === String(track.id) ? { ...t, is_public: nextPublic } : t
            ),
          };
        });
      } else if (generation?.id) {
        const res = await fetch(`/api/ai/generations/${encodeURIComponent(String(generation.id))}/visibility`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPublic: nextPublic }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || 'Impossible de changer la visibilité');

        setGenerations((prev) =>
          prev.map((g) => (String(g.id) === String(generation.id) ? { ...g, is_public: nextPublic } : g))
        );
        setSelectedGeneration((prev) =>
          prev && String(prev.id) === String(generation.id) ? { ...prev, is_public: nextPublic } : prev
        );
      }

      notify.success('Publication', nextPublic ? 'Piste rendue publique.' : 'Piste rendue privée.');
      pushLog('info', `Visibilité piste: ${nextPublic ? 'public' : 'privé'}`);
      window.dispatchEvent(new CustomEvent('aiLibraryUpdated'));
    } catch (e: any) {
      notify.error('Publication', e?.message || 'Erreur de publication');
      pushLog('error', `Visibilité: ${e?.message || 'échec'}`);
    } finally {
      setPublishingVisibility(false);
    }
  }, [publishingVisibility, pushLog, selectedTrackForVisibility, selectedGenerationForVisibility, selectedVisibilityState]);

  const fetchTimestampedLyrics = useCallback(async (silent = false, contextOverride?: { taskId: string; audioId: string }) => {
    const { taskId, audioId } = contextOverride ?? effectiveTrackContext;
    if (!taskId?.trim() || !audioId?.trim()) {
      setTimestampedWords([]);
      setTimestampedWaveform([]);
      setTimestampedError(contextOverride ? null : 'Sélectionne une piste issue d’une génération Suno finalisée.');
      return;
    }
    const trackForInstrumental = contextOverride ? null : selectedTrack;
    if (trackForInstrumental?.isInstrumental) {
      setTimestampedWords([]);
      setTimestampedWaveform([]);
      setTimestampedError('Pas de paroles alignées en mode instrumental.');
      return;
    }
    setTimestampedLoading(true);
    setTimestampedError(null);
    try {
      const res = await fetch('/api/suno/timestamped-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: taskId.trim(), audioId: audioId.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || 'Impossible de récupérer les paroles synchronisées');
      }
      const words = Array.isArray(json?.alignedWords) ? (json.alignedWords as TimestampedWord[]) : [];
      const wave = Array.isArray(json?.waveformData) ? (json.waveformData as number[]) : [];
      setTimestampedWords(words);
      setTimestampedWaveform(wave);
      if (words.length > 0) {
        if (!silent) {
          notify.success('Lyrics', `Paroles synchronisées chargées (${words.length} mots).`);
        }
      } else if (!silent) {
        notify.warning('Lyrics', 'Aucune parole alignée trouvée pour cette piste.');
      }
      pushLog('info', `Timestamped lyrics: ${words.length} mots`);
    } catch (e: any) {
      const msg = e?.message || 'Erreur de récupération des paroles synchronisées';
      setTimestampedError(msg);
      if (!silent) notify.error('Lyrics', msg);
      pushLog('warn', `Timestamped lyrics: ${msg}`);
    } finally {
      setTimestampedLoading(false);
    }
  }, [effectiveTrackContext, pushLog, selectedTrack?.isInstrumental]);

  /** Charger waveform + paroles synchronisées pour la piste effective (en lecture ou sélectionnée) */
  React.useEffect(() => {
    const { taskId, audioId } = effectiveTrackContext;
    if (!taskId?.trim() || !audioId?.trim()) {
      setTimestampedWords([]);
      setTimestampedWaveform([]);
      return;
    }
    fetchTimestampedLyrics(true, effectiveTrackContext);
  }, [effectiveTrackContext.taskId, effectiveTrackContext.audioId, fetchTimestampedLyrics]);

  const activeWordIndex = React.useMemo(() => {
    const now = Number(audioState.currentTime || 0);
    if (!timestampedWords.length) return -1;
    return timestampedWords.findIndex((w) => now >= Number(w.startS || 0) && now <= Number(w.endS || 0));
  }, [audioState.currentTime, timestampedWords]);

  // Afficher les tracks live issues du polling (FIRST_SUCCESS/SUCCESS)
  // Doc Suno: stream_audio_url dispo en 30–40s, audio_url (final) en 2–3 min. On stocke l’URL finale en priorité une fois dispo pour téléchargement/liste correcte.
  React.useEffect(() => {
    if (!activeBgGeneration?.latestTracks || activeBgGeneration.latestTracks.length === 0) return;
    const convertedTracks: GeneratedTrack[] = activeBgGeneration.latestTracks.map((track: any, index: number) => {
      const media = resolveLiveTrackMedia(track);
      const primaryUrl = media.audioUrl || media.playableUrl;
      const backups = Array.from(
        new Set([media.audioUrl, media.streamUrl, media.playableUrl].filter((u): u is string => Boolean(u && u !== primaryUrl)))
      );
      return {
        id: track.id || `${activeBgGeneration.taskId}_${index}`,
        audioUrl: primaryUrl,
        backupAudioUrls: backups,
        prompt: customMode ? (lyrics.trim() ? lyrics : '') : description,
        title: track.title || title || (isRemixMode ? `Remix ${index + 1}` : `Musique générée ${index + 1}`),
        style: track.raw?.tags || style || 'Custom',
        lyrics: customMode ? lyrics : '',
        isInstrumental,
        duration: track.duration || 120,
        createdAt: new Date().toISOString(),
        imageUrl: media.imageUrl,
      };
    });
    setGeneratedTracks(convertedTracks);
    setGeneratedTrack((prev) => prev || convertedTracks[0] || null);
  }, [activeBgGeneration, customMode, description, isInstrumental, isRemixMode, lyrics, style, title]);

  // Dès qu'une génération passe en completed, synchroniser la bibliothèque
  React.useEffect(() => {
    if (!activeBgGeneration || activeBgGeneration.status !== 'completed') return;
    const t = window.setTimeout(() => {
      refreshGenerations();
    }, 1200);
    return () => window.clearTimeout(t);
  }, [activeBgGeneration]);

  // Une fois la bibliothèque rafraîchie après "completed", remplacer generatedTracks par la version API (URLs finales garanties)
  React.useEffect(() => {
    if (!activeBgGeneration || activeBgGeneration.status !== 'completed' || !activeBgGeneration.taskId) return;
    const gen = generations.find((g) => g.task_id === activeBgGeneration!.taskId);
    if (!gen?.tracks?.length) return;
    const fromApi = gen.tracks.map((t) => convertAITrackToGenerated(t));
    setGeneratedTracks(fromApi);
    setGeneratedTrack((prev) => prev && fromApi.some((t) => String(t.id) === String(prev.id)) ? fromApi[0] ?? prev : prev);
  }, [activeBgGeneration?.status, activeBgGeneration?.taskId, generations]);

  const syncedCompletedTasksRef = useRef<Set<string>>(new Set());
  React.useEffect(() => {
    const completedNow = bgGenerations.filter((g) => g.status === 'completed').map((g) => g.taskId);
    if (!completedNow.length) return;

    const newlyCompleted = completedNow.filter((taskId) => !syncedCompletedTasksRef.current.has(taskId));
    if (!newlyCompleted.length) return;

    newlyCompleted.forEach((taskId) => syncedCompletedTasksRef.current.add(taskId));
    const t = window.setTimeout(() => {
      refreshGenerations();
      if (DEBUG_AI_STUDIO) {
        console.log('[AI Studio] Sync completed jobs after reload:', newlyCompleted);
      }
    }, 900);
    return () => window.clearTimeout(t);
  }, [bgGenerations]);

  const completedResaveRef = useRef<Set<string>>(new Set());
  const activeLyricWordRef = useRef<HTMLSpanElement | null>(null);
  const lyricsSyncScrollRef = useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (activeWordIndex < 0) return;
    const container = lyricsSyncScrollRef.current;
    const word = activeLyricWordRef.current;
    if (!container || !word) return;
    const cRect = container.getBoundingClientRect();
    const wRect = word.getBoundingClientRect();
    const relativeTop = wRect.top - cRect.top + container.scrollTop;
    const targetScroll = relativeTop - container.clientHeight / 2 + wRect.height / 2;
    const clamped = Math.max(0, Math.min(targetScroll, container.scrollHeight - container.clientHeight));
    container.scrollTo({ top: clamped, behavior: 'smooth' });
  }, [activeWordIndex]);

  React.useEffect(() => {
    const toResave = bgGenerations.filter(
      (g) => g.status === 'completed' && !g.completedSaved && Array.isArray(g.latestTracks) && g.latestTracks.length > 0
    );
    if (!toResave.length) return;

    toResave.forEach((g) => {
      if (completedResaveRef.current.has(g.taskId)) return;
      completedResaveRef.current.add(g.taskId);
      (async () => {
        try {
          const res = await fetch('/api/suno/save-tracks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId: g.taskId, tracks: g.latestTracks, status: 'completed' }),
          });
          if (res.ok) {
            window.dispatchEvent(new CustomEvent('aiLibraryUpdated'));
            refreshGenerations();
          }
        } catch {}
      })();
    });
  }, [bgGenerations]);

  useEffect(() => {
    if (generationStatus === 'completed') pushLog('info', 'Statut: completed');
    if (generationStatus === 'failed') pushLog('error', 'Statut: failed');
  }, [generationStatus, pushLog]);

  const generateMusic = async () => {
    setIsGenerating(true);
    setSunoError(null);
    setGenerationStatus('pending');
    setGeneratedTracks([]);
    pushLog('info', 'Génération lancée');
    
    try {
      let prompt = '';
      if (generationModeKind === 'remix' && !remixUploadUrl) {
        notify.error('Audio remix requis', 'Ajoute un audio source avant de générer en mode Remix.');
        setIsGenerating(false);
        setGenerationStatus('idle');
        return;
      }
      
      if (customMode) {
        // Mode personnalisé : le style est obligatoire, le titre est optionnel
        if (!style.trim()) {
          notify.error('Style manquant', 'Veuillez remplir le style de musique');
          setIsGenerating(false);
          setGenerationStatus('idle');
          return;
        }
        const styleFinal = [style, ...selectedTags].filter(Boolean).join(', ');
        prompt = `Titre: "${title}". Style: ${styleFinal}`;
        if (lyrics.trim()) {
          prompt += `. Paroles: ${lyrics}`;
        }
        if (isInstrumental) {
          prompt += '. Musique instrumentale uniquement, sans voix';
        }
        prompt += `. Weirdness: ${weirdness}%. Style influence: ${styleInfluence}%`;
      } else {
        // Mode description : utiliser la description
        if (!description.trim()) {
          notify.error('Description manquante', 'Veuillez décrire la musique que vous souhaitez');
          setIsGenerating(false);
          setGenerationStatus('idle');
          return;
        }
        const tags = selectedTags.length ? ` (tags: ${selectedTags.join(', ')})` : '';
        prompt = `${description}${tags}`;
      }

      // Convert sliders (0-100) to API expected 0.00–1.00 (step .01)
      const styleWeightVal = customMode ? Math.round(styleInfluence) / 100 : 0.5;
      const weirdnessVal = customMode ? Math.round(weirdness) / 100 : 0.5;
      const audioWeightVal = customMode ? Math.round(audioWeight) / 100 : 0.5;

      const requestBody: any = {
        customMode,
        instrumental: isInstrumental,
        model: modelVersion,
        callBackUrl: typeof window !== 'undefined' ? `${window.location.origin}/api/suno/callback` : undefined
      };

      // Indice de durée pour Suno (l’API ne garantit pas la durée exacte ; on l’injecte dans le prompt / hints)
      const durationHintBySec: Record<60 | 120 | 180, string> = {
        60: 'short track, about 1 minute, compact structure',
        120: 'radio edit 2:30–3:00 with intro / verse / pre / drop',
        180: 'extended track, about 3 minutes, full structure',
      };
      const durationHint = durationHintBySec[generationDuration];

      if (customMode) {
        // Mode Custom : title, style, prompt (lyrics)
        // Validation : si non-instrumental, les paroles sont requises
        if (!isInstrumental && !lyrics.trim()) {
          notify.error('Paroles manquantes', 'Veuillez remplir les paroles ou cocher "Instrumental"');
          setIsGenerating(false);
          setGenerationStatus('idle');
          return;
        }
        requestBody.title = title.trim() ? title : undefined; // undefined = Suno génère
        requestBody.style = [style, ...selectedTags].filter(Boolean).join(', ');
        requestBody.prompt = isInstrumental ? undefined : (lyrics.trim() || undefined); // Lyrics si non-instrumental, undefined si instrumental
        requestBody.styleWeight = Number(styleWeightVal.toFixed(2));
        requestBody.weirdnessConstraint = Number(weirdnessVal.toFixed(2));
        requestBody.audioWeight = Number(audioWeightVal.toFixed(2));
        requestBody.negativeTags = negativeTags || undefined;
        requestBody.vocalGender = vocalGender || undefined;
        requestBody.durationHint = durationHint; // Envoyé à createProductionPrompt côté API (mode Custom)
      } else {
        // Mode Simple : seulement prompt (description) + indication de durée dans le texte
        requestBody.prompt = [description, ...selectedTags].filter(Boolean).join(', ') + ` (about ${generationDuration / 60} min)`;
        // Pas de title, style, styleWeight, etc. en mode Simple selon la doc Suno
      }

      console.log('🎵 Requête génération:', { mode: generationModeKind, ...requestBody });

      // Si un audio remix est fourni, utiliser le flux upload-cover
      const response = await fetch(remixUploadUrl ? '/api/suno/upload-cover' : '/api/suno/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          remixUploadUrl
            ? {
                uploadUrl: remixUploadUrl,
                customMode: true,
                instrumental: isInstrumental,
                model: modelVersion,
                // En mode Custom: title/style requis; prompt=lyrics si non-instrumental
                title: title.trim() ? title : 'Remix',
                style: [style, ...selectedTags].filter(Boolean).join(', '),
                prompt: isInstrumental ? undefined : (lyrics.trim() ? lyrics : undefined),
                negativeTags: negativeTags || undefined,
                vocalGender: vocalGender || undefined,
                styleWeight: Number((Math.round(styleInfluence) / 100).toFixed(2)),
                weirdnessConstraint: Number((Math.round(weirdness) / 100).toFixed(2)),
                audioWeight: Number((Math.round(audioWeight) / 100).toFixed(2)),
                sourceDurationSec: remixSourceDurationSec,
                callBackUrl: typeof window !== 'undefined' ? `${window.location.origin}/api/suno/callback` : undefined,
              }
            : requestBody
        ),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        if (response.status === 402 || response.status === 429) setShowBuyCredits(true);
        if (response.status === 430) setRateLimitCooldownUntil(Date.now() + 12000); // 12 s cooldown
        const msg = getSunoErrorMessage(response.status, errJson);
        setSunoError(msg);
        throw new Error(msg);
      }

      const data = await response.json();
      if (data?.credits?.balance != null) {
        setCreditsBalance(data.credits.balance);
      }
      refreshSunoCredits();

      // Synchroniser le modèle effectif et informer en cas de downgrade
      if (data?.model) {
        if (data?.modelAdjusted) {
          notify.warning(
            'Modèle ajusté',
            `Le modèle ${data.requestedModel} n'est pas disponible sur votre plan. Utilisation de ${data.model}.`,
            7000
          );
        }
        setModelVersion(data.model);
      }
      
      console.log('🎵 Réponse API génération:', data);
      
      if (data.taskId) {
        // Génération Suno en cours - démarrer le suivi en arrière-plan
        const promptText = data.prompt || description || 'Musique générée';
        const customTitle = customMode
          ? (title.trim() || (isRemixMode ? 'Remix en cours' : 'Génération en cours'))
          : promptText.substring(0, 50) + (promptText.length > 50 ? '...' : '');
        
        startBackgroundGeneration({
          id: data.id,
          taskId: data.taskId,
          status: 'pending',
          title: customTitle,
          style: customMode ? style : 'Custom',
          prompt: promptText,
          progress: 0,
          startTime: Date.now(),
          estimatedTime: Math.max(45000, Math.round((generationDuration / 120) * 60000))
        });
        
        setCurrentTaskId(data.taskId);
        pushLog('info', `Job en file: ${data.taskId}`);
        console.log('🎵 Génération Suno initiée en arrière-plan:', data.taskId);
        console.log('🎵 Mode:', customMode ? 'personnalisé' : 'simple');
      } else {
        // Génération simulée terminée
        const promptText = data.prompt || description || 'Musique générée';
        const track: GeneratedTrack = {
          id: data.id,
          audioUrl: data.audioUrl,
          prompt: promptText,
          title: customMode ? title : promptText.substring(0, 50) + (promptText.length > 50 ? '...' : ''),
          style: customMode ? style : 'Custom',
          lyrics: customMode ? lyrics : '',
          isInstrumental,
          duration: data.duration || generationDuration,
          createdAt: new Date().toISOString()
        };

        setGeneratedTrack(track);
        setGenerationStatus('completed');
        pushLog('info', `Génération terminée: ${track.title || track.id}`);
      }
    } catch (error) {
      console.error('Erreur:', error);
      const message = error instanceof Error ? error.message : 'Erreur lors de la génération';
      setSunoError(message);
      notify.error('Génération', message);
      setGenerationStatus('failed');
      pushLog('error', `Échec de génération: ${message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const rateLimitActive = rateLimitCooldownUntil > Date.now();
  const cooldownSecondsLeft = rateLimitActive ? Math.max(0, Math.ceil((rateLimitCooldownUntil - Date.now()) / 1000)) : 0;

  // Mise à jour du compte à rebours chaque seconde pendant le cooldown (force re-render pour le libellé)
  useEffect(() => {
    if (!rateLimitActive || rateLimitCooldownUntil <= 0) return;
    const t = setInterval(() => {
      if (Date.now() >= rateLimitCooldownUntil) {
        setRateLimitCooldownUntil(0);
        clearInterval(t);
      } else {
        setCooldownTick((k) => k + 1);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [rateLimitActive, rateLimitCooldownUntil]);





  const shareTrack = async (track: GeneratedTrack) => {
    try {
      await navigator.share({
        title: 'Musique générée par Synaura',
        text: `Écoutez "${track.title}" généré par IA`,
        url: track.audioUrl
      });
    } catch (error) {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(track.audioUrl);
      notify.success('Partage', 'Lien copié dans le presse-papiers');
    }
  };

  function executePaletteCommand(raw: string) {
    const v = raw.trim().toLowerCase();
    if (!v) return;

    const modelMatch = v.match(/\bmodel\s+(v5|v4\.5\+|v4\.5)\b/);
    if (modelMatch) {
      const m = modelMatch[1];
      if (m === 'v5') setModelVersion('V5');
      else if (m === 'v4.5+') setModelVersion('V4_5PLUS');
      else setModelVersion('V4_5');
      pushLog('info', `Palette: model ${m}`);
      setCmdOpen(false);
      return;
    }

    if (v.includes('mode custom')) {
      selectGenerationMode('custom');
      pushLog('info', 'Palette: mode custom');
      setCmdOpen(false);
      return;
    }
    if (v.includes('mode simple')) {
      selectGenerationMode('simple');
      pushLog('info', 'Palette: mode simple');
      setCmdOpen(false);
      return;
    }
    if (v.includes('mode remix')) {
      selectGenerationMode('remix');
      pushLog('info', 'Palette: mode remix');
      setCmdOpen(false);
      return;
    }

    if (v.includes('instrumental on')) {
      setIsInstrumental(true);
      pushLog('info', 'Palette: instrumental on');
      setCmdOpen(false);
      return;
    }
    if (v.includes('instrumental off')) {
      setIsInstrumental(false);
      pushLog('info', 'Palette: instrumental off');
      setCmdOpen(false);
      return;
    }

    if (v.includes('ab toggle')) {
      toggleABPlay();
      setCmdOpen(false);
      return;
    }
    if (v.includes('ab a')) {
      playABSlot('A');
      setCmdOpen(false);
      return;
    }
    if (v.includes('ab b')) {
      playABSlot('B');
      setCmdOpen(false);
      return;
    }

    if (v.includes('generate') || v === 'run') {
      generateMusic();
      pushLog('info', 'Palette: generate');
      setCmdOpen(false);
      return;
    }
    if (v.includes('credits') || v.includes('balance')) {
      refreshSunoCredits();
      pushLog('info', 'Palette: refresh Suno credits');
      setCmdOpen(false);
      return;
    }
    if (v.includes('refresh') || v.includes('sync')) {
      refreshGenerations();
      pushLog('info', 'Palette: refresh library');
      setCmdOpen(false);
      return;
    }
    if (v.includes('mode ide')) {
      setShellMode('ide');
      pushLog('info', 'Palette: mode ide');
      setCmdOpen(false);
      return;
    }
    if (v.includes('mode classic')) {
      setShellMode('classic');
      pushLog('info', 'Palette: mode classic');
      setCmdOpen(false);
      return;
    }
    if (v.includes('tab builder')) {
      setLeftExplorerTab('builder');
      setShellMode('ide');
      pushLog('info', 'Palette: tab builder');
      setCmdOpen(false);
      return;
    }
    if (v.includes('tab presets')) {
      setLeftExplorerTab('presets');
      setShellMode('ide');
      pushLog('info', 'Palette: tab presets');
      setCmdOpen(false);
      return;
    }
    if (v.includes('tab assets')) {
      setLeftExplorerTab('assets');
      setShellMode('ide');
      pushLog('info', 'Palette: tab assets');
      setCmdOpen(false);
      return;
    }
    if (v.includes('tab history')) {
      setLeftExplorerTab('history');
      setShellMode('ide');
      pushLog('info', 'Palette: tab history');
      setCmdOpen(false);
      return;
    }
    if (v.includes('preset')) {
      const byName = aiStudioPresets.find((p) => {
        const name = String((p as any).name || p.id).toLowerCase();
        return v.includes(name);
      });
      const picked = byName || aiStudioPresets[0];
      if (picked) {
        handleApplyPreset(picked);
        pushLog('info', `Palette: apply preset ${(picked as any).name || picked.id}`);
      }
      setCmdOpen(false);
      return;
    }
    if (v.includes('export mp3') || v === 'export' || v.includes('export ')) {
      if (!generatedTrack) {
        notify.error('Export', 'Aucune piste sélectionnée');
      } else {
        downloadGenerated(generatedTrack);
        pushLog('info', 'Export MP3 lancé');
      }
      setRightTab('export');
      setCmdOpen(false);
      return;
    }
    if (v.includes('library')) {
      setMobileTab('library');
      pushLog('info', 'Palette: go library');
      setCmdOpen(false);
      return;
    }

    const durationMatch = v.match(/\bduration\s+(60|120|180)\b/);
    if (durationMatch) {
      const d = Number(durationMatch[1]) as 60 | 120 | 180;
      setGenerationDuration(d);
      pushLog('info', `Palette: duration ${d}s`);
      setCmdOpen(false);
      return;
    }
    pushLog('warn', `Commande inconnue: "${raw}"`);
  }

  // Vérification d'authentification (même logique que ai-library)
  if (!session) {
    return (
      <div className="relative min-h-screen text-white" suppressHydrationWarning>
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Music className="w-16 h-16 mx-auto mb-4 text-green-400" />
            <h2 className="text-2xl font-bold mb-2">Connexion requise</h2>
            <p className="text-gray-400">Connectez-vous pour accéder à votre générateur IA</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="studio-pro min-h-screen bg-[#07070a] text-white font-sans selection:bg-indigo-500/30">
      <StudioBackground />

      {/* --- HEADER : "TRANSPORT BAR" --- */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#07070a]/80 backdrop-blur-xl">
        <div className="flex items-center justify-between h-14 px-3 sm:px-5">
          {/* Left: Logo + Play */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 text-white min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Zap className="w-4 h-4" fill="currentColor" />
              </div>
              <span className="font-bold tracking-tight text-sm hidden sm:block">
                SYNAURA <span className="text-white/30 font-medium">STUDIO</span>
              </span>
            </div>

            <div className="h-5 w-px bg-white/[0.06] hidden sm:block" />

            <div className="flex items-center gap-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] p-0.5">
              <button
                type="button"
                onClick={() => previousTrack()}
                className="p-2 sm:p-1.5 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center text-white/40 hover:text-white transition-colors rounded-full hover:bg-white/[0.06]"
                aria-label="Piste précédente"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (audioState.isPlaying) { pause(); return; }
                  const cur = (audioState.tracks || [])[audioState.currentTrackIndex || 0];
                  if (cur) { await play(); return; }
                  if (generatedTrack) playGenerated(generatedTrack);
                }}
                className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center bg-white text-black rounded-full shadow-lg shadow-white/10 hover:scale-105 transition-all"
                aria-label={audioState.isPlaying ? 'Pause' : 'Lecture'}
              >
                {audioState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
              <button
                type="button"
                onClick={() => nextTrack()}
                className="p-2 sm:p-1.5 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center text-white/40 hover:text-white transition-colors rounded-full hover:bg-white/[0.06]"
                aria-label="Piste suivante"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            <div className="hidden md:flex items-center gap-2.5 min-w-0">
              <span className="font-mono text-[11px] text-white/50 tabular-nums whitespace-nowrap">
                {formatTime(audioState.currentTime)}
              </span>
              <div className="w-28 lg:w-40 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, ((audioState.currentTime || 0) / Math.max(1, audioState.duration || 1)) * 100)}%` }}
                />
              </div>
              <span className="font-mono text-[11px] text-white/30 tabular-nums whitespace-nowrap">
                {formatTime(audioState.duration || 0)}
              </span>
            </div>
          </div>

          {/* Right: Credits + Status + Settings */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBuyCredits(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 min-h-[40px] sm:min-h-0 rounded-full bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all"
              aria-label={`Crédits: ${creditsBalance}. Acheter des crédits`}
            >
              <Coins className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-xs font-semibold text-white/80 tabular-nums">{creditsBalance}</span>
              <span className="text-[10px] text-white/30 hidden sm:inline">cr.</span>
            </button>

            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
              <div className={`w-2 h-2 rounded-full ${isGenerating || activeGenerationCount > 0 ? 'bg-indigo-400 animate-pulse' : 'bg-emerald-400'} shadow-[0_0_6px_currentColor]`} />
              <span className="text-[10px] font-medium text-white/50">
                {isGenerating || activeGenerationCount > 0 ? `${activeGenerationCount || 1} en cours` : 'Prêt'}
              </span>
            </div>

            <div className="hidden md:inline-flex items-center rounded-full border border-white/[0.06] bg-white/[0.03] p-0.5">
              <button
                type="button"
                onClick={() => setShellMode('ide')}
                className={`px-2.5 py-1 text-[10px] font-medium rounded-full transition-all ${shellMode === 'ide' ? 'bg-white text-black shadow-sm' : 'text-white/40 hover:text-white/70'}`}
              >
                IDE
              </button>
              <button
                type="button"
                onClick={() => setShellMode('classic')}
                className={`px-2.5 py-1 text-[10px] font-medium rounded-full transition-all ${shellMode === 'classic' ? 'bg-white text-black shadow-sm' : 'text-white/40 hover:text-white/70'}`}
              >
                Classic
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="p-2 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-full text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all"
              aria-label="Paramètres"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-[1600px] px-3 sm:px-4 py-4 lg:pb-4 pb-[calc(140px+env(safe-area-inset-bottom,0px))]">
        <header className="sr-only">
          <h1>Studio IA Synaura</h1>
        </header>

        {/* Mobile studio tabs */}
        <div className="lg:hidden flex items-center gap-1.5 mb-3 bg-[#0e0e18]/80 rounded-2xl p-1 border border-white/[0.08] backdrop-blur-xl shadow-lg shadow-black/20">
          {([
            { key: 'generate' as const, label: 'Créer', icon: Wand2 },
            { key: 'library' as const, label: 'Bibliothèque', icon: ListMusic },
          ]).map((tab) => {
            const active = mobileTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setMobileTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold transition-all active:scale-[0.97] ${
                  active
                    ? 'bg-gradient-to-r from-indigo-500/20 to-violet-500/20 text-white border border-indigo-500/20 shadow-sm shadow-indigo-500/10'
                    : 'text-white/40 hover:text-white/60 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-indigo-400' : ''}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* LAYOUT "Studio Pro" : panneaux fixes (scroll interne uniquement) ; sur mobile onglets Générer / Bibliothèque */}
        <div ref={containerRef} className="grid grid-cols-12 gap-3 lg:flex lg:items-stretch lg:gap-3">
          {/* LEFT PANEL: Generator / Remixer */}
          <aside
            className={`col-span-12 md:col-span-3 lg:col-span-3 lg:shrink-0 flex flex-col rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden ${mobileTab === 'generate' ? 'flex' : 'hidden'} lg:!flex w-full lg:w-auto`}
            style={isDesktopLayout ? { width: leftPx } : { width: '100%', maxWidth: '100%' }}
          >
            {/* Sticky Generate Button + Mode Switch */}
            <div className="sticky top-0 z-20 shrink-0 border-b border-white/[0.06] bg-[#0c0c14]/95 backdrop-blur-2xl p-3 space-y-2.5">
              <button
                type="button"
                onClick={generateMusic}
                disabled={isGenerationDisabled || isGenerating || rateLimitActive}
                className="group w-full flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-bold text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 hover:from-indigo-400 hover:via-violet-400 hover:to-purple-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 hover:scale-[1.01] active:scale-[0.99]"
                aria-label={rateLimitActive ? `Réessayez dans ${cooldownSecondsLeft}s` : 'Créer'}
              >
                {isGenerating ? (
                  <span className="w-4 h-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
                ) : rateLimitActive ? (
                  <Clock3 className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                )}
                {isGenerating ? 'Génération…' : rateLimitActive ? `Réessayer dans ${cooldownSecondsLeft}s` : 'Créer'}
                {!isGenerating && !rateLimitActive && (
                  <span className="text-[10px] font-semibold text-white/40 bg-white/[0.08] px-1.5 py-0.5 rounded-full tabular-nums">{ACTION_COSTS.generation.credits} cr.</span>
                )}
              </button>

              <div className="flex items-center gap-2">
                <div className="flex-1 flex rounded-lg bg-white/[0.03] border border-white/[0.06] p-0.5">
                  {([
                    { key: 'simple' as const, label: 'Simple', activeClass: 'bg-white text-black shadow-sm' },
                    { key: 'custom' as const, label: 'Custom', activeClass: 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm shadow-indigo-500/20' },
                    { key: 'remix' as const, label: 'Remix', activeClass: 'bg-cyan-500/20 text-cyan-200 shadow-sm' },
                  ]).map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => selectGenerationMode(m.key)}
                      disabled={isGenerationDisabled}
                      className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-all ${generationModeKind === m.key ? m.activeClass : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'} ${isGenerationDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <ModelDropdownPortal
                  modelVersion={modelVersion}
                  disabled={isGenerationDisabled}
                  open={showModelDropdown}
                  onToggle={() => setShowModelDropdown(!showModelDropdown)}
                  onSelect={(id) => { setModelVersion(id); setShowModelDropdown(false); }}
                  onClose={() => setShowModelDropdown(false)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 space-y-3 pb-4 lg:pb-3 pt-3">
              {shellMode === 'ide' && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
                  <div className="flex items-center justify-between px-1 pb-2">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-white/30 font-semibold inline-flex items-center gap-1.5">
                      <Layers className="w-3 h-3" />
                      Explorer
                    </span>
                    <button type="button" onClick={() => setCmdOpen(true)} className="rounded-md bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/35 hover:bg-white/[0.08] hover:text-white/50 transition-all">
                      Ctrl+K
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {([
                      { key: 'builder' as const, label: 'Editor', Icon: SlidersHorizontal },
                      { key: 'presets' as const, label: 'Presets', Icon: Sparkles },
                      { key: 'assets' as const, label: 'Assets', Icon: Library },
                      { key: 'history' as const, label: 'History', Icon: History },
                    ]).map(({ key, label, Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setLeftExplorerTab(key)}
                        className={`h-8 rounded-lg text-[10px] inline-flex items-center justify-center gap-1 font-medium transition-all ${
                          leftExplorerTab === key
                            ? 'bg-indigo-500/15 text-indigo-200 border border-indigo-400/20'
                            : 'bg-white/[0.03] border border-white/[0.06] text-white/35 hover:bg-white/[0.06] hover:text-white/55'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {(shellMode !== 'ide' || leftExplorerTab === 'builder') && (
              <section className="space-y-3 flex flex-col min-h-0">
                {/* Formulaire : Titre dans "Titre & sortie" (Custom) ou implicite (Simple) */}
                <div className="space-y-3 px-0">
                  {/* Lien rapide source Remix (uniquement Custom / Remix) */}
                  {customMode && (
                    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[0.04] p-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          remixSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          setOpenStyleSection(true);
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/[0.06] py-2.5 text-xs text-cyan-200/90 hover:bg-cyan-500/10 transition"
                        aria-label="Aller à la section Audio / Remix"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0">
                          <g><path d="M12 4c-.631 0-1.143.512-1.143 1.143v5.714H5.143a1.143 1.143 0 0 0 0 2.286h5.714v5.714a1.143 1.143 0 0 0 2.286 0v-5.714h5.714a1.143 1.143 0 0 0 0-2.286h-5.714V5.143C13.143 4.512 12.63 4 12 4"></path></g>
                        </svg>
                        {isRemixMode ? 'Source Remix (obligatoire)' : 'Audio source Remix (optionnel)'}
                      </button>
                    </div>
                  )}

                  {customMode ? (
                    <>
                  {/* Titre */}
                  <SunoAccordionSection
                    title="Titre"
                    description="Titre du morceau (optionnel)."
                    isOpen={openProjectSection}
                    onToggle={() => setOpenProjectSection((v) => !v)}
                    variant="bare"
                  >
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Summer Vibes"
                      disabled={isGenerationDisabled}
                      className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 outline-none disabled:opacity-50"
                    />
                  </SunoAccordionSection>

                  {/* Style de musique */}
                  <SunoAccordionSection
                    title="Style"
                    description="Genre, ambiance, instruments (ou utilise les tags ci‑dessous)."
                    isOpen={openStyleSection}
                    onToggle={() => setOpenStyleSection((v) => !v)}
                    variant="bare"
                    rightActions={
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setStyle(''); }}
                        aria-label="Effacer le style"
                        title="Effacer"
                        className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    }
                  >
                    <textarea
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      placeholder="Ex: indie, electronic, synths, 120bpm"
                      rows={2}
                      maxLength={1000}
                      disabled={isGenerationDisabled}
                      className="w-full resize-none rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 outline-none disabled:opacity-50"
                    />
                    <div className="text-[10px] text-white/40 mt-1 text-right">{style.length}/1000</div>

                    <div className="mt-2">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] text-white/35 uppercase tracking-wider font-medium">Tags style</span>
                        {selectedTags.length > 0 && (
                          <button type="button" onClick={() => setSelectedTags([])} disabled={isGenerationDisabled} className="text-[10px] text-white/50 hover:text-white">
                            Tout effacer
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {tagCategories.map((cat) => (
                          <React.Fragment key={cat.id}>
                            {cat.tags.map((tag) => {
                              const active = selectedTags.includes(tag);
                              const colorMap: Record<string, string> = {
                                genre: active ? 'bg-violet-500/20 text-violet-200 border-violet-400/30' : 'bg-white/[0.04] text-white/60 border-white/[0.06] hover:bg-white/[0.08] hover:text-white/80',
                                mood: active ? 'bg-blue-500/20 text-blue-200 border-blue-400/30' : 'bg-white/[0.04] text-white/60 border-white/[0.06] hover:bg-white/[0.08] hover:text-white/80',
                                production: active ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30' : 'bg-white/[0.04] text-white/60 border-white/[0.06] hover:bg-white/[0.08] hover:text-white/80',
                                vocal: active ? 'bg-amber-500/20 text-amber-200 border-amber-400/30' : 'bg-white/[0.04] text-white/60 border-white/[0.06] hover:bg-white/[0.08] hover:text-white/80',
                              };
                              return (
                                <button
                                  key={`${cat.id}-${tag}`}
                                  type="button"
                                  onClick={() => handleTagClick(tag)}
                                  disabled={isGenerationDisabled}
                                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${colorMap[cat.id] || colorMap.genre} ${isGenerationDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  {tag}
                                  {active && <span className="text-[9px] ml-0.5">✕</span>}
                                </button>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    <div
                      className={`mt-3 rounded-xl border p-2.5 ${isRemixMode ? 'border-cyan-400/40 bg-cyan-500/10' : 'border-white/10 bg-white/[0.02]'}`}
                      ref={remixSectionRef}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-medium text-white/90">
                          {isRemixMode ? 'Source audio Remix' : 'Audio source (optionnel)'}
                        </span>
                        {isRemixMode && <span className="text-[10px] text-cyan-200/80">Requis</span>}
                      </div>
                      <p className="text-[10px] text-white/50 mb-1.5">
                        Utilise uniquement un enregistrement dont tu détiens les droits. Suno bloque les contenus protégés par le droit d&apos;auteur.
                      </p>
                      <RemixDropzone
                        file={remixFile}
                        uploading={remixUploading}
                        onFileSelected={(file: File) => {
                          setRemixFile(file);
                          setPendingRemixFile(file);
                          setRemixUploadModalOpen(true);
                        }}
                      />
                      <UploadConfirmModal
                        isOpen={remixUploadModalOpen && !!pendingRemixFile}
                        file={pendingRemixFile}
                        onConfirm={(uploadTitle) => {
                          const f = pendingRemixFile;
                          setRemixUploadModalOpen(false);
                          setPendingRemixFile(null);
                          if (f) performRemixUpload(f, uploadTitle);
                        }}
                        onCancel={() => {
                          setRemixUploadModalOpen(false);
                          setPendingRemixFile(null);
                          setRemixFile(null);
                        }}
                      />
                      <UploadProgressModal
                        isOpen={remixUploading}
                        title={uploadingRemixTitle}
                        onCancel={() => {
                          uploadAbortRef.current?.abort();
                          setRemixUploading(false);
                          setUploadingRemixTitle(null);
                        }}
                      />
                      {remixUploadUrl && (
                        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2 py-1.5">
                          <span className="truncate text-[11px] text-white/90">{remixSourceLabel ?? 'Fichier uploadé'}</span>
                          <button type="button" onClick={clearRemixSource} className="shrink-0 rounded px-1.5 py-0.5 text-[10px] text-red-300 hover:bg-red-500/20">
                            Retirer
                          </button>
                        </div>
                      )}
                      {isRemixMode && !remixUploadUrl && !remixUploading && (
                        <p className="mt-2 text-[10px] text-white/50">Dépose un fichier audio ou choisis une piste ci‑dessous.</p>
                      )}
                      {uploadedRemixAssets.length > 0 && (
                        <div className="mt-2">
                          <div className="mb-1 text-[10px] text-white/50">Pistes déjà uploadées</div>
                          <div className="max-h-28 overflow-y-auto divide-y divide-white/5 rounded-lg border border-white/5">
                            {uploadedRemixAssets.slice(0, 8).map((track) => {
                              const isSelected = remixUploadUrl && resolveTrackMedia(track).playableUrl === remixUploadUrl;
                              return (
                                <button
                                  key={`remix-asset-${track.id}`}
                                  type="button"
                                  onClick={() => useLibraryTrackForRemix(track)}
                                  className={`flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-[11px] transition ${isSelected ? 'bg-cyan-500/15 text-cyan-100' : 'text-white/80 hover:bg-white/5'}`}
                                >
                                  <span className="truncate">{getUploadedAssetName(track)}</span>
                                  <span className="text-[10px] text-white/40">{Number(track.duration || 0) > 0 ? `${Math.round(Number(track.duration))}s` : '—'}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </SunoAccordionSection>

                  {/* Paroles */}
                  <SunoAccordionSection
                    title="Paroles"
                    description="Texte de la chanson ou laisser vide si instrumental."
                    isOpen={openLyricsSection}
                    onToggle={() => setOpenLyricsSection((v) => !v)}
                    variant="bare"
                    rightActions={
                      <button type="button" onClick={(e) => { e.preventDefault(); setLyrics(''); }} aria-label="Effacer" title="Effacer" className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition">
                        <X className="w-4 h-4" />
                      </button>
                    }
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={isInstrumental} onChange={(e) => setIsInstrumental(e.target.checked)} disabled={isGenerationDisabled} className="sr-only" />
                        <div className={`h-5 w-9 rounded-full transition-colors ${isInstrumental ? 'bg-cyan-500' : 'bg-white/10'}`}>
                          <span className={`block h-4 w-4 mt-0.5 ml-0.5 rounded-full bg-white transition-transform ${isInstrumental ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                        <span className="text-[11px] text-white/80">Instrumental</span>
                      </label>
                      <span className="text-[10px] text-white/40">{lyrics.length}/5000</span>
                    </div>
                    <textarea
                      value={lyrics}
                      onChange={(e) => setLyrics(e.target.value)}
                      placeholder="Colle ou écris les paroles ici…"
                      rows={4}
                      maxLength={5000}
                      disabled={isGenerationDisabled}
                      className="w-full resize-none rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 outline-none disabled:opacity-50"
                    />
                  </SunoAccordionSection>
                  {/* Options avancées */}
                  <SunoAccordionSection
                    title="Options avancées"
                    description="Créativité, poids du style, voix…"
                    isOpen={openAdvancedSection}
                    onToggle={() => setOpenAdvancedSection((v) => !v)}
                    variant="bare"
                  >
                    <div className="space-y-3">
                      <SunoSlider
                        label="Créativité"
                        value={weirdness}
                        onChange={setWeirdness}
                        disabled={isGenerationDisabled}
                        midLabel={weirdness < 35 ? 'Contrôlé' : weirdness < 65 ? 'Équilibré' : 'Créatif'}
                      />
                      <SunoSlider
                        label="Poids du style"
                        value={styleInfluence}
                        onChange={setStyleInfluence}
                        disabled={isGenerationDisabled}
                        midLabel={styleInfluence < 35 ? 'Faible' : styleInfluence < 65 ? 'Moyen' : 'Fort'}
                      />
                      <SunoSlider
                        label="Poids de l’audio"
                        value={audioWeight}
                        onChange={setAudioWeight}
                        disabled={isGenerationDisabled}
                        midLabel={audioWeight < 35 ? 'Faible' : audioWeight < 65 ? 'Moyen' : 'Fort'}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-white/50 mb-1">Voix</label>
                          <select
                            value={vocalGender}
                            onChange={(e) => setVocalGender(e.target.value)}
                            disabled={isGenerationDisabled}
                            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-sm text-white focus:border-white/20 outline-none disabled:opacity-50"
                          >
                            <option value="">Auto</option>
                            <option value="m">Homme</option>
                            <option value="f">Femme</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-white/50 mb-1">Exclure styles</label>
                          <input
                            value={negativeTags}
                            onChange={(e) => setNegativeTags(e.target.value)}
                            placeholder="Tags à éviter"
                            disabled={isGenerationDisabled}
                            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-white/20 outline-none disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>
                  </SunoAccordionSection>

                  {/* Résultats */}
                  {generatedTracks.length > 0 && (
                    <SunoAccordionSection
                      title="Résultats"
                      description="Pistes générées"
                      isOpen={openResultsSection}
                      onToggle={() => setOpenResultsSection((v) => !v)}
                      variant="bare"
                    >
                      <GenerationTimeline
                        generatedTracks={generatedTracks}
                        generationStatus={generationStatus}
                        currentTaskId={currentTaskId}
                        sunoState={sunoState}
                        sunoError={sunoError}
                        onOpenTrack={openTrackPanel}
                        onPlayTrack={(track) => {
                          setSelectedTrack(track);
                          setGeneratedTrack(track);
                          playGenerated(track);
                        }}
                        onDownloadTrack={downloadGenerated}
                        onShareTrack={shareGenerated}
                        onRemixTrack={useGeneratedTrackForRemix}
                        onReuseTrack={handleReuseTrackInfo}
                        onCopyLyrics={handleCopyLyrics}
                      />
                    </SunoAccordionSection>
                  )}
                </>
              ) : (
                /* Mode Simple : description seule */
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-3">
                  <div>
                    <h2 className="text-xs font-semibold text-white/90 mb-0.5 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400/80" />
                      Description
                    </h2>
                    <p className="text-[10px] text-white/50 mb-2">Décris l’ambiance, l’IA génère titre et paroles.</p>
                    <label className="block text-[10px] font-medium mb-1 text-white/60">Description de la chanson</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ex: chanson pop énergique, été, amour..."
                      rows={3}
                      maxLength={199}
                      disabled={isGenerationDisabled}
                      className="w-full resize-none rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 outline-none disabled:opacity-50"
                    />
                    <div className="text-[10px] text-white/40 mt-1 text-right">{description.length}/199</div>
                    <div className="mt-2">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] text-white/50">Tags style</span>
                        {selectedTags.length > 0 && (
                          <button type="button" onClick={() => setSelectedTags([])} disabled={isGenerationDisabled} className="text-[10px] text-white/50 hover:text-white">
                            Tout effacer
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {tagCategories.map((cat) => (
                          <React.Fragment key={cat.id}>
                            {cat.tags.map((tag) => {
                              const active = selectedTags.includes(tag);
                              const colorMap: Record<string, string> = {
                                genre: active ? 'bg-violet-500/20 text-violet-200 border-violet-400/30' : 'bg-white/[0.04] text-white/60 border-white/[0.06] hover:bg-white/[0.08] hover:text-white/80',
                                mood: active ? 'bg-blue-500/20 text-blue-200 border-blue-400/30' : 'bg-white/[0.04] text-white/60 border-white/[0.06] hover:bg-white/[0.08] hover:text-white/80',
                                production: active ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30' : 'bg-white/[0.04] text-white/60 border-white/[0.06] hover:bg-white/[0.08] hover:text-white/80',
                                vocal: active ? 'bg-amber-500/20 text-amber-200 border-amber-400/30' : 'bg-white/[0.04] text-white/60 border-white/[0.06] hover:bg-white/[0.08] hover:text-white/80',
                              };
                              return (
                                <button
                                  key={`${cat.id}-s-${tag}`}
                                  type="button"
                                  onClick={() => handleTagClick(tag)}
                                  disabled={isGenerationDisabled}
                                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${colorMap[cat.id] || colorMap.genre} ${isGenerationDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  {tag}
                                  {active && <span className="text-[9px] ml-0.5">✕</span>}
                                </button>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Pas d'options avancées en mode simple */}
                </div>
              )}

              {showLivePanel && (
                <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-white">{isRemixMode ? 'Now remixing' : 'Now generating'}</div>
                      <div className="text-[11px] text-white/60">{liveStatusLabel}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full border ${
                      sunoState === 'error'
                        ? 'border-red-400/30 bg-red-500/15 text-red-200'
                        : sunoState === 'first'
                        ? 'border-cyan-400/30 bg-cyan-500/15 text-cyan-200'
                        : 'border-indigo-400/30 bg-indigo-500/15 text-indigo-200'
                    }`}>
                      {activeBgGeneration?.taskId ? `#${activeBgGeneration.taskId.slice(-6)}` : 'Live'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className={`h-full rounded-full ${
                          sunoState === 'first'
                            ? 'bg-gradient-to-r from-cyan-400 to-indigo-400'
                            : sunoState === 'error'
                            ? 'bg-gradient-to-r from-red-400 to-red-500'
                            : 'bg-gradient-to-r from-indigo-400 to-violet-400'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${liveProgressPct}%` }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-white/50">
                      <span>
                        {activeBgGeneration?.status === 'first'
                          ? (isRemixMode ? 'Remix live dispo' : 'Playable now')
                          : (isRemixMode ? 'Remix processing...' : 'Processing...')}
                      </span>
                      <span>{liveProgressPct}%</span>
                    </div>
                  </div>

                  {DEBUG_AI_STUDIO && (
                    <div className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-[10px] text-white/65">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>dbg state: {sunoState}</span>
                        <span>bg: {activeBgGeneration?.status || '-'}</span>
                        <span>task: {activeBgGeneration?.taskId?.slice(-8) || '-'}</span>
                        <span>api tracks: {Array.isArray(activeBgGeneration?.latestTracks) ? activeBgGeneration!.latestTracks!.length : 0}</span>
                        <span>ui tracks: {generatedTracks.length}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!livePreviewTrack) return;
                        playGenerated(livePreviewTrack);
                        setGeneratedTrack(livePreviewTrack);
                        pushLog('info', 'Lecture live preview');
                      }}
                      disabled={!livePreviewTrack}
                      className={`h-8 px-3 rounded-lg text-[11px] inline-flex items-center gap-2 ${
                        livePreviewTrack
                          ? 'bg-white text-black hover:bg-white/90'
                          : 'border border-white/10 bg-white/[0.03] text-white/40 cursor-not-allowed'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5" />
                      {livePreviewTrack
                        ? (isRemixMode ? 'Écouter le remix live' : 'Écouter le rendu live')
                        : (isRemixMode ? 'En attente du 1er remix' : 'En attente du 1er rendu')}
                    </button>
                    {generatedTracks.length > 0 && (
                      <span className="text-[10px] text-white/55">
                        {generatedTracks.length} variation{generatedTracks.length > 1 ? 's' : ''} disponible{generatedTracks.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {generatedTracks.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {generatedTracks.slice(0, 2).map((t, idx) => {
                        const playable = typeof t.audioUrl === 'string' && t.audioUrl.trim().length > 0;
                        return (
                          <button
                            key={`live-${t.id}-${idx}`}
                            type="button"
                            onClick={() => {
                              playGenerated(t);
                              setGeneratedTrack(t);
                            }}
                            className={`h-9 px-3 rounded-lg text-[11px] inline-flex items-center justify-between gap-2 ${
                              playable
                                ? 'bg-white/10 text-white hover:bg-white/15'
                                : 'border border-white/10 bg-white/[0.03] text-white/40'
                            }`}
                          >
                            <span className="truncate text-left">
                              {isRemixMode ? `Remix ${idx + 1}` : `Live ${idx + 1}`}: {t.title || `Variation ${idx + 1}`}
                            </span>
                            <Play className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {sunoError ? (
                    <div className="text-[11px] text-red-200/90 bg-red-500/10 border border-red-400/20 rounded-lg px-2.5 py-2">
                      {sunoError}
                    </div>
                  ) : null}
                </div>
              )}
                </div>

                {/* Bouton Créer déplacé en sticky top */}

                {/* Mobile : Inspector / Models / Export */}
                <div className="lg:hidden mt-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 space-y-2.5">
                  <div className="inline-flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
                    <button
                      type="button"
                      onClick={() => setRightTab('inspector')}
                      className={`h-8 px-3 rounded-lg text-[11px] ${rightTab === 'inspector' ? 'bg-white text-black' : 'text-zinc-300 hover:bg-white/10'}`}
                    >
                      Inspector
                    </button>
                    <button
                      type="button"
                      onClick={() => setRightTab('models')}
                      className={`h-8 px-3 rounded-lg text-[11px] ${rightTab === 'models' ? 'bg-white text-black' : 'text-zinc-300 hover:bg-white/10'}`}
                    >
                      Models
                    </button>
                    <button
                      type="button"
                      onClick={() => setRightTab('export')}
                      className={`h-8 px-3 rounded-lg text-[11px] ${rightTab === 'export' ? 'bg-white text-black' : 'text-zinc-300 hover:bg-white/10'}`}
                    >
                      Export
                    </button>
                  </div>

                  {rightTab === 'inspector' && (
                    <div className="space-y-2">
                      {selectedTrack ? (
                        <>
                          <div className="text-xs text-zinc-400 truncate">{selectedTrack.title || 'Piste sélectionnée'}</div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => playGenerated(selectedTrack)}
                              className="flex-1 h-9 rounded-xl bg-white text-black text-xs font-semibold"
                            >
                              Lire
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadGenerated(selectedTrack)}
                              className="h-9 px-3 rounded-xl border border-white/10 bg-white/5 text-xs"
                            >
                              MP3
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-zinc-500">Sélectionne une piste dans la bibliothèque.</div>
                      )}
                    </div>
                  )}

                  {rightTab === 'models' && (
                    <div className="grid grid-cols-3 gap-2">
                      {['V4_5', 'V4_5PLUS', 'V5'].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setModelVersion(m as any)}
                          className={`h-9 rounded-xl border text-xs ${modelVersion === m ? 'border-emerald-400/40 bg-emerald-400/10' : 'border-white/10 bg-white/5'}`}
                        >
                          {m === 'V4_5' ? 'v4.5' : m === 'V4_5PLUS' ? 'v4.5+' : 'v5'}
                        </button>
                      ))}
                    </div>
                  )}

                  {rightTab === 'export' && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!generatedTrack) {
                            notify.error('Export', 'Aucune piste sélectionnée');
                            return;
                          }
                          downloadGenerated(generatedTrack);
                        }}
                        className="w-full h-10 rounded-xl bg-white text-black text-sm font-semibold"
                      >
                        Export MP3
                      </button>
                      <div className="text-[11px] text-zinc-500">WAV arrive plus tard.</div>
                    </div>
                  )}
                </div>
              </section>
              )}
              {shellMode === 'ide' && leftExplorerTab === 'presets' && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 space-y-1.5">
                  <div className="text-[11px] text-white/50 inline-flex items-center gap-1.5 px-1"><FolderOpen className="w-3.5 h-3.5" /> Presets</div>
                  {aiStudioPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="w-full text-left rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] px-2.5 py-2 transition"
                    >
                      <div className="text-[11px] font-semibold text-white/90">{(preset as any).name || preset.id}</div>
                      <div className="text-[10px] text-zinc-500 truncate">{preset.description || 'Preset studio'}</div>
                    </button>
                  ))}
                </div>
              )}
              {shellMode === 'ide' && leftExplorerTab === 'assets' && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 space-y-2">
                  <div className="text-[11px] text-white/50 inline-flex items-center gap-1.5 px-1"><Library className="w-3.5 h-3.5" /> Assets</div>
                  <input
                    value={assetQuery}
                    onChange={(e) => setAssetQuery(e.target.value)}
                    placeholder="Filtrer assets..."
                    className="w-full h-8 rounded-lg border border-white/10 bg-black/30 px-2 text-xs outline-none focus:border-white/20"
                  />
                  {filteredAssets.slice(0, 24).map((track) => (
                    <div key={track.id} className="rounded-xl border border-white/10 bg-white/5 p-2">
                      <div className="text-xs font-semibold truncate">{getUploadedAssetName(track)}</div>
                      <div className="text-[11px] text-zinc-400 truncate">{track.style || track.model_name || 'AI Track'}</div>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const converted = convertAITrackToGenerated(track as any);
                            setSelectedTrack(converted);
                            setGeneratedTrack(converted);
                            setShowTrackPanel(true);
                            pushLog('info', `Inspector: ${track.title || track.id}`);
                          }}
                          className="h-7 px-2 rounded-lg text-[11px] bg-white/10 hover:bg-white/15"
                        >
                          Use
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const fakeGen = {
                              id: (track as any).generation_id || (track as any).generation?.id || 'unknown',
                              prompt: (track as any).prompt || '',
                              created_at: (track as any).created_at || new Date().toISOString(),
                              status: 'completed',
                              model: (track as any).model_name || 'V4_5',
                              user_id: (session?.user?.id as string) || '',
                              task_id: '',
                              tracks: [],
                            } as any as AIGeneration;
                            playAITrack(track as any, fakeGen);
                          }}
                          className="h-7 px-2 rounded-lg text-[11px] bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 transition-colors"
                        >
                          Play
                        </button>
                        {(String((track as any)?.model_name || '').toUpperCase() === 'UPLOAD' ||
                          Boolean(parseSourceLinks((track as any)?.source_links)?.cloudinary_public_id)) && (
                          <button
                            type="button"
                            onClick={() => useLibraryTrackForRemix(track)}
                            className="h-7 px-2 rounded-lg text-[11px] bg-cyan-400/20 hover:bg-cyan-400/30"
                          >
                            Remix
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredAssets.length === 0 && <div className="text-xs text-zinc-500">Aucun asset.</div>}
                </div>
              )}
              {shellMode === 'ide' && leftExplorerTab === 'history' && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 space-y-2">
                  <div className="text-[11px] text-white/50 inline-flex items-center gap-1.5 px-1"><History className="w-3.5 h-3.5" /> Historique</div>
                  {visibleGenerations.slice(0, 20).map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        handlePlayGeneration(g);
                        pushLog('info', `History play: ${g.id}`);
                      }}
                      className="w-full text-left rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 p-2"
                    >
                      <div className="text-xs font-semibold truncate">{g.metadata?.title || g.tracks?.[0]?.title || 'Génération'}</div>
                      <div className="text-[11px] text-zinc-400 inline-flex items-center gap-1"><Clock3 className="w-3 h-3" /> {new Date(g.created_at).toLocaleString('fr-FR')}</div>
                    </button>
                  ))}
                  {visibleGenerations.length === 0 && <div className="text-xs text-zinc-500">Pas d'historique.</div>}
                </div>
              )}
            </div>
          </aside>

          <div
            role="separator"
            aria-orientation="vertical"
            onPointerDown={beginDrag('left')}
            className="hidden lg:flex w-2 shrink-0 cursor-col-resize items-center justify-center rounded-full hover:bg-white/10"
            title="Redimensionner panneau gauche"
          >
            <div className="h-16 w-[2px] rounded-full bg-white/20" />
          </div>

          {/* CENTER PANEL: Library */}
          <main className={`col-span-12 md:col-span-6 lg:col-span-6 lg:flex-1 lg:min-w-0 min-w-0 flex flex-col rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden ${mobileTab === 'library' ? 'flex' : 'hidden'} lg:!flex`}>
            <div className="flex-1 overflow-y-auto px-1 space-y-3 min-h-0 pb-4 lg:pb-0">
              {shellMode === 'ide' && (
                <div className="w-full min-w-0 space-y-3 p-2">
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-white/60 inline-flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400/60" />
                      Workspace
                    </span>
                    <button
                      type="button"
                      onClick={refreshGenerations}
                      className="h-7 px-2.5 rounded-lg border border-white/[0.06] bg-white/[0.03] text-[10px] hover:bg-white/[0.08] inline-flex items-center gap-1.5 text-white/50 hover:text-white/80 transition-all"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Actualiser
                    </button>
                  </div>

                <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-12">
                  <div className="min-w-0 space-y-3 lg:col-span-7">
                    <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-3.5">
                      <div className="mb-2.5 flex items-center justify-between">
                        <div className="text-[13px] font-semibold text-white/90">Prompt</div>
                        <div className="inline-flex items-center gap-1.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300/80 border border-indigo-500/20">
                            {modelVersion === 'V5' ? 'v5' : modelVersion === 'V4_5PLUS' ? 'v4.5+' : 'v4.5'}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-white/40 border border-white/[0.06]">
                            {generationDuration}s
                          </span>
                        </div>
                      </div>
                      <textarea
                        value={idePromptValue}
                        onChange={(e) => (customMode ? setStyle(e.target.value) : setDescription(e.target.value))}
                        className="min-h-[120px] w-full resize-none rounded-xl border border-white/[0.06] bg-[#07070a]/60 px-3.5 py-3 text-sm outline-none placeholder:text-white/25 focus:border-indigo-500/30 focus:ring-1 focus:ring-indigo-500/10 transition-all"
                        placeholder="Décris le style, l’ambiance, les instruments, la structure…"
                      />
                      <div className="mt-2 flex items-center justify-between text-[10px] text-white/30">
                        <span>{customMode ? 'Custom : style + lyrics' : 'Simple : ce prompt pilote tout'}</span>
                        <span className="tabular-nums">{idePromptValue.length}</span>
                      </div>
                      {selectedTags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {selectedTags.slice(0, 12).map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setSelectedTags((x) => x.filter((t) => t !== tag))}
                              className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] text-indigo-200/80 hover:bg-indigo-500/20 transition"
                            >
                              {tag} <X className="w-2.5 h-2.5" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-3.5">
                      <div className="mb-2.5 flex items-center justify-between">
                        <div className="text-[13px] font-semibold text-white/90">Timeline</div>
                        <div className="font-mono text-[10px] text-white/40 tabular-nums">
                          {formatTime(playbackCurrentTime)} / {formatTime(playbackDuration || generatedTrack?.duration || 0)}
                        </div>
                      </div>
                      <SynauraWaveform
                        waveformData={timestampedWaveform}
                        progress={isWaveformForPlayingTrack ? playbackProgress : 0}
                        onSeek={seekByRatio}
                        variant="studio"
                        heightClass="h-24"
                        idPrefix="ide-timeline-wave"
                        duration={playbackDuration || 0}
                        showTimeLabel
                        showProgressBar
                      />
                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => seek(Math.max(0, playbackCurrentTime - 10))}
                          className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[10px] text-white/50 hover:bg-white/[0.08] hover:text-white/80 transition-all"
                        >
                          -10s
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (audioState.isPlaying) {
                              pause();
                              return;
                            }
                            if (generatedTrack) {
                              await Promise.resolve(playGenerated(generatedTrack));
                              return;
                            }
                            await play().catch(() => {});
                          }}
                          className="rounded-full bg-white w-8 h-8 flex items-center justify-center text-black hover:scale-105 shadow-lg shadow-white/10 transition-all"
                        >
                          {audioState.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => seek(Math.min(playbackDuration || 0, playbackCurrentTime + 10))}
                          className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[10px] text-white/50 hover:bg-white/[0.08] hover:text-white/80 transition-all"
                        >
                          +10s
                        </button>
                        <div className="ml-auto flex-1 max-w-[45%]">
                          <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400 transition-all duration-300"
                              style={{ width: `${Math.round(playbackProgress * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 w-full space-y-3 lg:col-span-5">
                    <div className="flex h-[420px] w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-3.5">
                      <div className="mb-2.5 flex shrink-0 items-center justify-between">
                        <div className="text-[13px] font-semibold text-white/90">Lyrics</div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isInstrumental ? 'bg-emerald-500/10 text-emerald-300/80 border-emerald-500/20' : 'bg-violet-500/10 text-violet-300/80 border-violet-500/20'}`}>{isInstrumental ? 'Instrumental' : 'Voix'}</span>
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto">
                        <textarea
                          value={lyrics}
                          onChange={(e) => setLyrics(e.target.value)}
                          className="min-h-[180px] w-full resize-none rounded-xl border border-white/[0.06] bg-[#07070a]/60 px-3.5 py-3 text-sm outline-none placeholder:text-white/25 focus:border-indigo-500/30 focus:ring-1 focus:ring-indigo-500/10 transition-all"
                          placeholder="Colle tes paroles ici (ou laisse vide pour auto)."
                        />
                        <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!lyrics.trim()) return;
                            try {
                              await navigator.clipboard.writeText(lyrics);
                              notify.success('Lyrics', 'Paroles copiées');
                              pushLog('info', 'Lyrics copiées');
                            } catch {
                              pushLog('warn', 'Impossible de copier les lyrics');
                            }
                          }}
                          disabled={!lyrics.trim()}
                          className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs ${
                            lyrics.trim()
                              ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                              : 'border-white/10 bg-white/[0.03] text-white/40 cursor-not-allowed'
                          }`}
                        >
                          Copier
                        </button>
                        <button
                          type="button"
                          onClick={generateAutoLyrics}
                          disabled={isGeneratingLyrics || isInstrumental}
                          className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs ${
                            isGeneratingLyrics || isInstrumental
                              ? 'border-white/10 bg-white/[0.03] text-white/45 cursor-not-allowed'
                              : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                          }`}
                        >
                          {isGeneratingLyrics ? 'Auto…' : 'Auto'}
                        </button>
                        <button
                          type="button"
                          onClick={() => fetchTimestampedLyrics(false)}
                          disabled={timestampedLoading || isInstrumental}
                          className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs ${
                            timestampedLoading || isInstrumental
                              ? 'border-white/10 bg-white/[0.03] text-white/45 cursor-not-allowed'
                              : 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20'
                          }`}
                        >
                          {timestampedLoading ? 'Sync…' : 'Sync audio'}
                        </button>
                      </div>
                      {timestampedError && (
                        <div className="mt-2 text-[10px] text-amber-300/90">{timestampedError}</div>
                      )}
                      {timestampedWords.length > 0 && (() => {
                        const MAX_WORDS_PER_LINE = 10;
                        const END_PHRASE = /[.!?;:\n]$/;
                        const lines: TimestampedWord[][] = [];
                        let currentLine: TimestampedWord[] = [];
                        timestampedWords.forEach((w, i) => {
                          const word = String(w.word || '').trim();
                          currentLine.push(w);
                          const endsPhrase = END_PHRASE.test(word);
                          const atMax = currentLine.length >= MAX_WORDS_PER_LINE;
                          if (endsPhrase || atMax) {
                            lines.push([...currentLine]);
                            currentLine = [];
                          }
                        });
                        if (currentLine.length) lines.push(currentLine);
                        let wordOffset = 0;
                        return (
                          <div className="mt-3 flex h-[200px] flex-col overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-b from-cyan-500/[0.08] to-cyan-600/[0.04] shadow-[0_0_24px_-4px_rgba(34,211,238,0.12)]">
                            <div className="flex shrink-0 items-center gap-2 border-b border-cyan-400/10 px-4 py-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                </svg>
                              </div>
                              <span className="text-sm font-semibold tracking-tight text-cyan-100/95">Paroles synchronisées</span>
                              <span className="ml-auto rounded-full bg-cyan-400/15 px-2.5 py-1 text-[11px] font-medium text-cyan-200/90">
                                {timestampedWords.length} mots
                              </span>
                            </div>
                            <div ref={lyricsSyncScrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 scroll-smooth">
                              <div className="mx-auto max-w-md space-y-3">
                                {lines.map((lineWords, lineIdx) => {
                                  const lineStartIdx = wordOffset;
                                  wordOffset += lineWords.length;
                                  return (
                                    <p
                                      key={`line-${lineIdx}`}
                                      className="text-center leading-[1.75] text-[13px] tracking-wide text-white/90"
                                    >
                                      {lineWords.map((w, wordIdx) => {
                                        const idx = lineStartIdx + wordIdx;
                                        const isActive = idx === activeWordIndex;
                                        const isPast = activeWordIndex >= 0 && idx < activeWordIndex;
                                        return (
                                          <span
                                            key={`aligned-${idx}-${w.startS}`}
                                            ref={isActive ? activeLyricWordRef : undefined}
                                            className={`inline-block rounded-md px-1 py-px transition-all duration-200 ${
                                              isActive
                                                ? 'bg-cyan-400/25 text-cyan-50 font-semibold shadow-[0_0_14px_rgba(34,211,238,0.3)]'
                                                : isPast
                                                  ? 'text-white/40'
                                                  : 'text-white/80'
                                            }`}
                                            style={isActive ? { textShadow: '0 0 14px rgba(34,211,238,0.45)' } : undefined}
                                          >
                                            {w.word}
                                            {wordIdx < lineWords.length - 1 ? '\u00A0' : ''}
                                          </span>
                                        );
                                      })}
                                    </p>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      </div>
                    </div>
                  </div>

                  {/* Versions A/B : ligne pleine largeur */}
                  <div className="w-full min-w-0 lg:col-span-12">
                    <div className="w-full rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-3.5">
                      <div className="mb-3 w-full">
                        <div className="mb-2.5 text-[13px] font-semibold text-white/90">Versions A/B</div>
                        <div className="grid w-full grid-cols-2 gap-2 lg:grid-cols-3">
                          <div className="min-w-0 rounded-xl border border-indigo-500/15 bg-indigo-500/[0.04] px-3 py-2.5">
                            <div className="text-[10px] font-medium uppercase tracking-wider text-indigo-300/50 mb-0.5">Slot A</div>
                            <div className="truncate text-xs text-white/90 font-medium">{abA ? (recentGenerationsSorted.find((x) => x.id === abA)?.metadata?.title || recentGenerationsSorted.find((x) => x.id === abA)?.tracks?.[0]?.title || abA.slice(0, 8)) : '—'}</div>
                          </div>
                          <div className="min-w-0 rounded-xl border border-violet-500/15 bg-violet-500/[0.04] px-3 py-2.5">
                            <div className="text-[10px] font-medium uppercase tracking-wider text-violet-300/50 mb-0.5">Slot B</div>
                            <div className="truncate text-xs text-white/90 font-medium">{abB ? (recentGenerationsSorted.find((x) => x.id === abB)?.metadata?.title || recentGenerationsSorted.find((x) => x.id === abB)?.tracks?.[0]?.title || abB.slice(0, 8)) : '—'}</div>
                          </div>
                          <button
                            type="button"
                            onClick={toggleABPlay}
                            className="col-span-2 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-xs font-medium hover:bg-white/[0.06] lg:col-span-1 transition-all text-white/70 hover:text-white"
                            title="Basculer A/B"
                          >
                            Écouter {abSide === 'A' ? 'B' : 'A'} <span className="text-white/30">({abSide})</span>
                          </button>
                        </div>
                      </div>
                      <div className="w-full space-y-2">
                        {bgGenerations
                          .filter((g) => g.status === 'pending' || g.status === 'first')
                          .slice(0, 2)
                          .map((g) => {
                            const activeLive = activeBgGeneration?.taskId === g.taskId;
                            const firstReady = g.status === 'first' && activeLive && !!livePreviewTrack;
                            const progress = Math.max(2, Math.min(99, Math.round(g.progress || 0)));
                            return (
                              <div key={g.taskId} className="w-full rounded-2xl border border-indigo-400/20 bg-indigo-500/10 px-3 py-2">
                                <div className="flex w-full items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold">
                                      {g.title || g.prompt || `Job ${g.taskId.slice(-4)}`}
                                    </div>
                                    <div className="truncate text-xs text-white/60">
                                      {g.status === 'first' ? 'Premier rendu dispo' : 'Render en cours'} • {progress}%
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="rounded-full px-2 py-1 text-[10px] bg-indigo-400/20 text-indigo-100">
                                      {g.status}
                                    </span>
                                    <button
                                      type="button"
                                      disabled={!firstReady}
                                      onClick={() => {
                                        if (!livePreviewTrack) return;
                                        playGenerated(livePreviewTrack);
                                        setGeneratedTrack(livePreviewTrack);
                                      }}
                                      className={`rounded-xl p-2 ${
                                        firstReady
                                          ? 'text-white hover:bg-white/15'
                                          : 'text-white/35 cursor-not-allowed'
                                      }`}
                                      title={firstReady ? 'Écouter le rendu live' : 'Disponible au premier rendu'}
                                    >
                                      <Play className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                                  <div
                                    className={`h-full rounded-full ${
                                      g.status === 'first'
                                        ? 'bg-gradient-to-r from-cyan-400 to-indigo-400'
                                        : 'bg-gradient-to-r from-indigo-400 to-violet-400'
                                    }`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}

                        <div className="flex w-full flex-col gap-2">
                        {visibleGenerations.slice(0, 50).map((g) => (
                          <div
                            key={g.id}
                            onClick={() => selectGenerationInIde(g)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                selectGenerationInIde(g);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            className={`w-full text-left flex min-w-0 flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5 transition-all sm:flex-nowrap ${
                              selectedGeneration?.id === g.id
                                ? 'border-indigo-400/30 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 shadow-sm shadow-indigo-500/5'
                                : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.10]'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold">{g.metadata?.title || g.tracks?.[0]?.title || 'Génération'}</div>
                              <div className="truncate text-xs text-white/60">{new Date(g.created_at).toLocaleString('fr-FR')}</div>
                            </div>
                            <span className={`rounded-full px-2 py-1 text-[10px] ${
                              g.status === 'completed' ? 'bg-emerald-400/15 text-emerald-200' : g.status === 'failed' ? 'bg-red-500/15 text-red-200' : 'bg-yellow-400/15 text-yellow-200'
                            }`}>
                              {g.status}
                            </span>
                            <div className="flex shrink-0 items-center gap-1.5 border-l border-white/[0.06] pl-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlayGeneration(g);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-2.5 py-1.5 text-xs font-medium text-white hover:from-indigo-400 hover:to-violet-400 shadow-sm shadow-indigo-500/20 transition-all"
                                title="Lire ce titre"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span className="hidden sm:inline">Lire</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  assignABSlot('A', g.id);
                                }}
                                className={`inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-lg px-2 text-[11px] font-bold transition-all ${
                                  abA === g.id ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/20' : 'border border-white/[0.08] bg-white/[0.03] text-white/60 hover:bg-white/[0.08]'
                                }`}
                                title="Mettre en slot A"
                              >
                                A
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  assignABSlot('B', g.id);
                                }}
                                className={`inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-lg px-2 text-[11px] font-bold transition-all ${
                                  abB === g.id ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/20' : 'border border-white/[0.08] bg-white/[0.03] text-white/60 hover:bg-white/[0.08]'
                                }`}
                                title="Mettre en slot B"
                              >
                                B
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectGenerationInIde(g);
                                }}
                                className="rounded-lg border border-white/15 bg-white/5 p-1.5 text-white/80 hover:bg-white/15 hover:text-white"
                                title="Ouvrir dans l’inspector"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                        </div>
                        {visibleGenerations.length === 0 && (
                          <div className="w-full py-4 text-center text-xs text-zinc-500">Aucune version pour le moment.</div>
                        )}
                        {visibleGenerations.length > 50 && (
                          <div className="w-full py-2 text-center text-[10px] text-zinc-500">50 plus récentes affichées. Utilise la bibliothèque pour voir tout l’historique.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              )}

              {shellMode !== 'ide' && (
              <div className="flex flex-col min-h-0 flex-1 overflow-visible">
                <LibraryMiddlePanel
                  tracks={allTracks}
                  generationsById={generationsById}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  filterBy={filterBy === 'with-lyrics' ? 'voix' : filterBy}
                  onFilterByChange={(v) => setFilterBy(v === 'voix' ? 'with-lyrics' : v)}
                  sortBy={sortBy}
                  onSortByChange={setSortBy}
                  onRefresh={refreshGenerations}
                  remixMode={isRemixMode}
                  onRemixModeToggle={() => selectGenerationMode(isRemixMode ? 'simple' : 'remix')}
                  remixSourceTrackId={remixSourceTrackId}
                  onSetRemixSource={(track) => useLibraryTrackForRemix(track)}
                  onClearRemixSource={clearRemixSource}
                  onPickTrack={(track, gen) => {
                    const converted = convertAITrackToGenerated(track as any);
                    setSelectedTrack(converted);
                    setGeneratedTrack(converted);
                    setShowTrackPanel(true);
                    if (gen) setSelectedGeneration(gen);
                  }}
                  onPlayTrack={(track, gen) => {
                    const converted = convertAITrackToGenerated(track as any);
                    setSelectedTrack(converted);
                    setGeneratedTrack(converted);
                    if (gen) setSelectedGeneration(gen);
                    playGenerated(converted);
                  }}
                  onPlayQueue={playLibraryQueue}
                  onRemixTrack={(track) => useLibraryTrackForRemix(track)}
                  onReuseTrack={(track, gen) => {
                    const converted = convertAITrackToGenerated(track as any);
                    handleReuseTrackInfo(converted);
                  }}
                  onCopyLyrics={(track, gen) => {
                    const converted = convertAITrackToGenerated(track as any);
                    handleCopyLyrics(converted);
                  }}
                  onToggleLike={toggleTrackLike}
                  onTrashTrack={toggleTrackTrash}
                  likedTrackIds={likedTrackIds}
                  trashedTrackIds={trashedTrackIds}
                  loading={generationsLoading}
                  error={generationsError}
                />
              </div>
            )}
            </div>
          </main>

          {/* RIGHT PANEL: Desktop aside + Mobile sheet */}
          {/* Desktop aside */}
          <aside
            className="hidden lg:flex col-span-12 lg:col-span-3 lg:shrink-0 flex-col rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur overflow-hidden w-[409px]"
            style={{ width: rightPx }}
          >
            <React.Suspense fallback={null}>
              <RightPanelImproved
                track={selectedTrack as any}
                stylePrompt={selectedGeneration?.prompt}
                lyrics={(selectedTrack as any)?.lyrics}
                onRemix={() => (selectedTrack ? useGeneratedTrackForRemix(selectedTrack) : undefined)}
                onDownload={() => (generatedTrack ? downloadGenerated(generatedTrack) : undefined)}
                modelVersion={modelVersion}
                onSetModelVersion={(id: string) => setModelVersion(id)}
                selectedGenerationForVisibility={selectedVisibilityState}
                publishingVisibility={publishingVisibility}
                toggleGenerationVisibility={toggleGenerationVisibility}
              />
            </React.Suspense>
          </aside>

          {/* Mini-player flottant mobile — positioned above BottomNav (56px + safe-area + gap) */}
          <div className="lg:hidden fixed left-3 right-3 z-[41]" style={{ bottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 12px)' }}>
            {generatedTrack ? (
              <div
                onClick={() => setShowTrackPanel(true)}
                className="w-full flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#0c0c14]/95 backdrop-blur-2xl px-3.5 py-3 shadow-[0_12px_40px_rgba(0,0,0,.5)] cursor-pointer active:scale-[0.98] transition-transform"
              >
                {generatedTrack.imageUrl ? (
                  <img src={generatedTrack.imageUrl} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0 ring-1 ring-white/[0.08]" />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 shrink-0 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-indigo-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <div className="truncate text-sm font-semibold text-white/90">{generatedTrack.title || 'Piste'}</div>
                  <div className="text-[11px] text-white/40 mt-0.5">{formatTime(audioState.currentTime)} / {formatTime(audioState.duration || generatedTrack.duration || 0)}</div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    audioState.isPlaying ? pause() : playGenerated(generatedTrack);
                  }}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-black shadow-lg active:scale-95 transition-transform"
                >
                  {audioState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>
              </div>
            ) : null}
          </div>

          {/* Bottom nav spacer for global BottomNav on mobile */}
        </div>

        {shellMode === 'ide' && (
          <footer className="hidden lg:block fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[#07070a]/85 backdrop-blur">
            <div className="mx-auto max-w-[1600px] px-4 py-3">
              <div className="grid grid-cols-12 gap-3 lg:flex lg:items-start lg:gap-3">
              <div className="hidden lg:block shrink-0" style={{ width: leftPx }} />
              <div className="col-span-12 md:col-span-6 lg:flex-1">
                <div className="flex items-center justify-between gap-2 text-xs text-zinc-300">
                  <div className="inline-flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5" />
                    Console
                    <span className="text-zinc-500">•</span>
                    <span className="text-zinc-500">Derniers événements</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConsoleCollapsed((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/10"
                  >
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${consoleCollapsed ? '' : 'rotate-90'}`} />
                    {consoleCollapsed ? 'Développer' : 'Réduire'}
                  </button>
                </div>
                {!consoleCollapsed && (
                  <div className="mt-2 space-y-1 max-h-[86px] overflow-auto pr-1">
                    {logs.slice(0, 8).map((line) => (
                      <div key={line.id} className={`text-[11px] ${line.level === 'error' ? 'text-red-300' : line.level === 'warn' ? 'text-amber-300' : 'text-zinc-300'}`}>
                        <span className="text-zinc-500">[{line.at}]</span> {line.msg}
                      </div>
                    ))}
                    {logs.length === 0 && <div className="text-[11px] text-zinc-500">Aucun log pour le moment.</div>}
                  </div>
                )}
              </div>
              {showDesktopRightPanel && (
              <div className="col-span-12 md:col-span-3 lg:shrink-0" style={{ width: rightPx }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-zinc-400">Transport</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => pushLog('info', 'Upload (à brancher)')}
                      className="rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
                      title="Upload"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => pushLog('info', 'Download (à brancher)')}
                      className="rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {!consoleCollapsed && (
                <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Playhead</span>
                    <span>{Math.round(Math.max(0, Math.min(1, (audioState.duration || 0) > 0 ? (audioState.currentTime || 0) / (audioState.duration || 1) : 0)) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(Math.max(0, Math.min(1, (audioState.duration || 0) > 0 ? (audioState.currentTime || 0) / (audioState.duration || 1) : 0)) * 100)}
                    onChange={(e) => {
                      const pct = Number(e.target.value || 0) / 100;
                      const duration = Number(audioState.duration || 0);
                      if (!Number.isFinite(duration) || duration <= 0) return;
                      seek(Math.max(0, Math.min(duration, pct * duration)));
                    }}
                    className="mt-2 w-full accent-white"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (audioState.isPlaying) pause();
                        else await play().catch(() => {});
                      }}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-white/90"
                    >
                      {audioState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {audioState.isPlaying ? 'Pause' : 'Play'}
                    </button>
                    <button
                      type="button"
                      onClick={() => pause()}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/[0.06]"
                    >
                      Stop
                    </button>
                  </div>
                </div>
                )}
              </div>
              )}
              </div>
            </div>
          </footer>
        )}

        {/* Modal Paramètres */}
        <AnimatePresence>
          {settingsOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md p-4 flex items-center justify-center"
              onClick={() => setSettingsOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0c0c14]/98 backdrop-blur-2xl shadow-[0_30px_100px_rgba(0,0,0,.8)]"
                onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center">
                      <Settings className="h-4 w-4 text-indigo-300" />
                    </div>
                    <h2 className="text-base font-semibold text-white/90">Paramètres du studio</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(false)}
                    className="rounded-xl p-2 text-white/30 hover:bg-white/[0.06] hover:text-white/60 transition-all"
                    aria-label="Fermer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                  <div className="space-y-2.5">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/35 font-semibold">Interface</p>
                    <div className="flex gap-2">
                      {([
                        { key: 'ide' as const, label: 'IDE', desc: 'Explorateur, onglets, timeline' },
                        { key: 'classic' as const, label: 'Classic', desc: 'Panneau unique' },
                      ]).map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setShellMode(m.key)}
                          className={`flex-1 p-3 rounded-xl text-left transition-all ${
                            shellMode === m.key
                              ? 'bg-white text-black shadow-lg shadow-white/10'
                              : 'bg-white/[0.04] border border-white/[0.06] text-white/70 hover:bg-white/[0.08]'
                          }`}
                        >
                          <span className="text-sm font-semibold block">{m.label}</span>
                          <span className={`text-[10px] block mt-0.5 ${shellMode === m.key ? 'text-black/50' : 'text-white/30'}`}>{m.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/35 font-semibold">Onglet au démarrage</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {([
                        { key: 'builder' as const, label: 'Editor' },
                        { key: 'presets' as const, label: 'Presets' },
                        { key: 'assets' as const, label: 'Assets' },
                        { key: 'history' as const, label: 'Historique' },
                      ]).map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setLeftExplorerTab(tab.key)}
                          className={`py-2 rounded-lg text-[11px] font-medium transition-all ${
                            leftExplorerTab === tab.key
                              ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/20'
                              : 'bg-white/[0.04] border border-white/[0.06] text-white/50 hover:bg-white/[0.08]'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/35 font-semibold">Génération</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <span className="text-[11px] text-white/40 font-medium">Modèle</span>
                        <div className="flex gap-1.5">
                          {([
                            { id: 'V4_5' as const, label: 'v4.5' },
                            { id: 'V4_5PLUS' as const, label: 'v4.5+' },
                            { id: 'V5' as const, label: 'v5' },
                          ]).map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setModelVersion(m.id)}
                              className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                                modelVersion === m.id
                                  ? 'bg-white text-black shadow-sm'
                                  : 'bg-white/[0.04] border border-white/[0.06] text-white/50 hover:bg-white/[0.08]'
                              }`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[11px] text-white/40 font-medium">Durée cible</span>
                        <div className="flex gap-1.5">
                          {([60, 120, 180] as const).map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setGenerationDuration(d)}
                              className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                                generationDuration === d
                                  ? 'bg-white text-black shadow-sm'
                                  : 'bg-white/[0.04] border border-white/[0.06] text-white/50 hover:bg-white/[0.08]'
                              }`}
                            >
                              {d === 60 ? '1m' : d === 120 ? '2m' : '3m'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-white/25">Tous les modèles : {ACTION_COSTS.generation.credits} crédits/génération. Durée indicative.</p>
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/35 font-semibold">Console</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConsoleCollapsed(false)}
                        className={`flex-1 py-2 rounded-lg text-[11px] font-medium transition-all ${
                          !consoleCollapsed
                            ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/20'
                            : 'bg-white/[0.04] border border-white/[0.06] text-white/50 hover:bg-white/[0.08]'
                        }`}
                      >
                        Visible au démarrage
                      </button>
                      <button
                        type="button"
                        onClick={() => setConsoleCollapsed(true)}
                        className={`flex-1 py-2 rounded-lg text-[11px] font-medium transition-all ${
                          consoleCollapsed
                            ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/20'
                            : 'bg-white/[0.04] border border-white/[0.06] text-white/50 hover:bg-white/[0.08]'
                        }`}
                      >
                        Repliée au démarrage
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/35 font-semibold">Raccourcis clavier</p>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">
                      <div className="flex items-center justify-between px-3.5 py-2.5">
                        <span className="text-[11px] text-white/50">Palette de commandes</span>
                        <kbd className="rounded-md px-2 py-1 bg-white/[0.06] border border-white/[0.06] font-mono text-[10px] text-white/40">Ctrl+K</kbd>
                      </div>
                      <div className="flex items-center justify-between px-3.5 py-2.5">
                        <span className="text-[11px] text-white/50">Lecture / Pause</span>
                        <kbd className="rounded-md px-2 py-1 bg-white/[0.06] border border-white/[0.06] font-mono text-[10px] text-white/40">Espace</kbd>
                      </div>
                      <div className="flex items-center justify-between px-3.5 py-2.5">
                        <span className="text-[11px] text-white/50">Fermer</span>
                        <kbd className="rounded-md px-2 py-1 bg-white/[0.06] border border-white/[0.06] font-mono text-[10px] text-white/40">Échap</kbd>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-400/10 bg-amber-500/[0.04] px-4 py-3">
                    <p className="text-[11px] text-amber-200/60 leading-relaxed">
                      Les fichiers générés par Suno sont conservés <strong className="text-amber-200/80">15 jours</strong>. Pensez à télécharger ou publier vos créations.
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {cmdOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md p-4 pt-[12vh] flex items-start justify-center"
              onClick={() => setCmdOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: -12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.97 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="w-full max-w-[640px] rounded-2xl border border-white/[0.08] bg-[#0c0c14]/98 backdrop-blur-2xl shadow-[0_30px_100px_rgba(0,0,0,.8)] overflow-hidden"
                onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center">
                    <Command className="w-3 h-3 text-indigo-300" />
                  </div>
                  <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Palette de commandes</span>
                </div>
                <div className="px-4 pb-3">
                  <input
                    ref={cmdInputRef}
                    placeholder="Rechercher une commande..."
                    value={cmdQuery}
                    onChange={(e) => setCmdQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setCmdIndex((i) => Math.min(i + 1, Math.max(0, filteredCommandItems.length - 1)));
                        return;
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setCmdIndex((i) => Math.max(i - 1, 0));
                        return;
                      }
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (filteredCommandItems[cmdIndex]) filteredCommandItems[cmdIndex].run();
                        else executePaletteCommand(cmdQuery);
                      }
                    }}
                    className="w-full h-10 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 text-sm text-white/80 outline-none placeholder:text-white/25 focus:border-indigo-400/30 focus:bg-white/[0.05] transition-all"
                  />
                </div>
                <div className="border-t border-white/[0.04] max-h-[320px] overflow-auto">
                  {filteredCommandItems.map((cmd, idx) => (
                    <button
                      key={cmd.id}
                      onClick={cmd.run}
                      className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-3 ${
                        idx === cmdIndex
                          ? 'bg-indigo-500/10'
                          : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white/80">{cmd.label}</div>
                        <div className="text-[11px] text-white/30 truncate">{cmd.desc}</div>
                      </div>
                      {idx === cmdIndex && (
                        <kbd className="shrink-0 rounded-md px-2 py-1 bg-white/[0.06] border border-white/[0.06] font-mono text-[10px] text-white/35">Enter</kbd>
                      )}
                    </button>
                  ))}
                  {filteredCommandItems.length === 0 && (
                    <div className="px-4 py-6 text-center text-[12px] text-white/25">
                      Aucune commande trouvée
                    </div>
                  )}
                </div>
                <div className="border-t border-white/[0.04] px-4 py-2.5 flex items-center gap-4 text-[10px] text-white/20">
                  <span><kbd className="font-mono bg-white/[0.06] px-1.5 py-0.5 rounded text-white/30">↑↓</kbd> naviguer</span>
                  <span><kbd className="font-mono bg-white/[0.06] px-1.5 py-0.5 rounded text-white/30">Enter</kbd> valider</span>
                  <span><kbd className="font-mono bg-white/[0.06] px-1.5 py-0.5 rounded text-white/30">Esc</kbd> fermer</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modale d'achat de crédits */}
        <BuyCreditsModal isOpen={showBuyCredits} onClose={() => setShowBuyCredits(false)} />

        {/* TrackInspector overlay (mobile) */}
        <div className="lg:hidden">
          <TrackInspector
            track={selectedTrack}
            isOpen={showTrackPanel}
            onClose={closeTrackPanel}
            onPlay={playGenerated}
            onDownload={downloadGenerated}
            onShare={shareGenerated}
            onRemix={useGeneratedTrackForRemix}
            onCopyLyrics={handleCopyLyrics}
            variant="overlay"
            isPublished={selectedVisibilityState?.is_public === true}
            publishingVisibility={publishingVisibility}
            onTogglePublish={toggleGenerationVisibility}
          />
        </div>
      </div>
    </div>
  );
}

