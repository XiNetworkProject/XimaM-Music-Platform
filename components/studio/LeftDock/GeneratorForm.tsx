'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sliders, Wand2, FileText, Settings2 } from 'lucide-react';
import { SunoAccordionSection } from '@/components/ui/SunoAccordionSection';
import { useStudioStore } from '@/lib/studio/store';
import { SUNO_BTN_BASE, SUNO_FIELD, SUNO_TEXTAREA, SUNO_SELECT } from '@/components/ui/sunoClasses';
import { CURRENT_SUNO_MODELS, getSunoModelLabel, normalizeGenerationModel, SUNO_GENERATION_LIMITS } from '@/lib/sunoModels';
import { useEntitlementsClient } from '@/hooks/useEntitlementsClient';
import SunoV6Announcement from '@/components/ai-studio/SunoV6Announcement';

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 25);
}

function normalizeVariantTarget(value: number): number {
  const clamped = Math.max(2, Math.min(8, Number.isFinite(value) ? value : 2));
  return Math.ceil(clamped / 2) * 2;
}

export default function GeneratorForm({ onGenerate }: { onGenerate: () => void }) {
  const form = useStudioStore((s) => s.form);
  const setForm = useStudioStore((s) => s.setForm);
  const { loading: accessLoading, entitlements } = useEntitlementsClient();
  const [modelNotice, setModelNotice] = useState('');

  useEffect(() => {
    if (accessLoading) return;
    const model = normalizeGenerationModel(form.model, entitlements.ai.availableModels);
    if (model !== form.model) {
      setForm({ model });
      setModelNotice(`${getSunoModelLabel(model)} est sélectionné selon les modèles disponibles pour votre compte.`);
    }
  }, [accessLoading, entitlements.ai.availableModels, form.model, setForm]);

  const [open, setOpen] = useState<{ project: boolean; style: boolean; lyrics: boolean; advanced: boolean }>({
    project: false,
    style: true,
    lyrics: false,
    advanced: false,
  });

  const tagsText = useMemo(() => (form.tags || []).join(', '), [form.tags]);

  return (
    <div className="chambre-studio-generator space-y-3">
      <div className="panel-suno overflow-hidden">
        <div className="p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="v2-kicker">Génération IA</div>
            <div className="text-sm font-semibold text-foreground-primary">L’intention musicale</div>
          </div>
          <button
            type="button"
            className="h-9 px-3 rounded-xl border border-border-secondary bg-[var(--v2-raised)] text-[var(--v2-text)] font-semibold hover:opacity-90 transition flex items-center gap-2"
            onClick={onGenerate}
          >
            <Wand2 className="w-4 h-4" />
            Lancer {normalizeVariantTarget(Number(form.variations || 2)) / 2} génération(s)
          </button>
        </div>
        <div className="px-4 pb-4 -mt-2 text-[11px] text-foreground-tertiary">
          Les versions apparaissent dès leur disponibilité. Leur nombre peut varier.
        </div>
      </div>

      <SunoAccordionSection
        title="Projet"
        description="Mode & modèle"
        leftIcon={<Settings2 className="w-4 h-4" />}
        isOpen={open.project}
        onToggle={() => setOpen((s) => ({ ...s, project: !s.project }))}
      >
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-[11px] text-foreground-tertiary">Mode</span>
            <select
              className={SUNO_SELECT}
              value={form.customMode ? 'custom' : 'simple'}
              onChange={(e) => setForm({ customMode: e.target.value === 'custom' })}
            >
              <option value="simple">Simple</option>
              <option value="custom">Sur mesure</option>
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-[11px] text-foreground-tertiary">Modèle</span>
            <select className={SUNO_SELECT} value={form.model} onChange={(e) => setForm({ model: e.target.value })}>
              {CURRENT_SUNO_MODELS.map((model) => (
                <option key={model.id} value={model.id} disabled={!accessLoading && !entitlements.ai.availableModels.includes(model.id)}>
                  {model.label}{model.minPlan === 'free' ? ' · inclus' : ' · abonnement'}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-foreground-tertiary">
              {CURRENT_SUNO_MODELS.find((model) => model.id === form.model)?.description}
            </span>
            {modelNotice && (
              <span role="status" className="text-[10px] text-foreground-tertiary">
                {modelNotice}
              </span>
            )}
          </label>

          <label className="grid gap-1">
            <span className="text-[11px] text-foreground-tertiary">Générations à lancer (1–4)</span>
            <input
              className={SUNO_FIELD}
              type="number"
              min={1}
              max={4}
              step={1}
              value={normalizeVariantTarget(Number(form.variations || 2)) / 2}
              onChange={(e) => setForm({ variations: normalizeVariantTarget(Number(e.target.value || 1) * 2) })}
            />
            <span className="text-[10px] text-foreground-tertiary">
              Chaque génération est débitée séparément.
            </span>
          </label>

          <label className="grid gap-1">
            <span className="text-[11px] text-foreground-tertiary">Durée</span>
            <select
              className={SUNO_SELECT}
              value={!form.customMode || form.duration == null ? 'auto' : 'custom'}
              disabled={!form.customMode}
              onChange={(e) => setForm({ duration: e.target.value === 'auto' ? null : 60 })}
            >
              <option value="auto">Automatique</option>
              <option value="custom">Choisir en secondes</option>
            </select>
            {!form.customMode && <span className="text-[10px] text-foreground-tertiary">Passez en mode sur mesure pour choisir une durée.</span>}
          </label>
          {form.customMode && form.duration != null && (
            <label className="grid gap-1">
              <span className="text-[11px] text-foreground-tertiary">Durée demandée (10–360 secondes)</span>
              <input
                className={SUNO_FIELD}
                type="number"
                min={SUNO_GENERATION_LIMITS.minDuration}
                max={SUNO_GENERATION_LIMITS.maxDuration}
                step={1}
                value={form.duration}
                onChange={(e) => setForm({ duration: e.target.value === '' ? null : Number(e.target.value) })}
              />
            </label>
          )}

          <label className="flex items-center justify-between gap-3">
            <span className="text-[12px] text-foreground-secondary">Instrumental</span>
            <input
              type="checkbox"
              checked={!!form.instrumental}
              onChange={(e) => setForm({ instrumental: e.target.checked })}
            />
          </label>
        </div>
      </SunoAccordionSection>

      <SunoAccordionSection
        title="Style"
        description="Titre, style, tags"
        leftIcon={<Sliders className="w-4 h-4" />}
        isOpen={open.style}
        onToggle={() => setOpen((s) => ({ ...s, style: !s.style }))}
      >
        <div className="grid gap-3">
          {form.customMode ? (
            <>
              <label className="grid gap-1">
                <span className="text-[11px] text-foreground-tertiary">Titre</span>
                <input
                  className={SUNO_FIELD}
                  value={form.title}
                  maxLength={SUNO_GENERATION_LIMITS.title}
                  onChange={(e) => setForm({ title: e.target.value })}
                  placeholder="Titre (optionnel)"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-[11px] text-foreground-tertiary">Style</span>
                <input
                  className={SUNO_FIELD}
                  value={form.style}
                  maxLength={SUNO_GENERATION_LIMITS.style}
                  onChange={(e) => setForm({ style: e.target.value })}
                  placeholder="ex: drill mélodique, 140bpm, dark…"
                />
              </label>
            </>
          ) : (
            <label className="grid gap-1">
              <span className="text-[11px] text-foreground-tertiary">Ton intention</span>
              <textarea
                className={SUNO_TEXTAREA}
                value={form.description}
                maxLength={SUNO_GENERATION_LIMITS.simplePrompt}
                onChange={(e) => setForm({ description: e.target.value })}
                placeholder="Décris la musique que tu veux…"
                rows={4}
              />
            </label>
          )}

          <label className="grid gap-1">
            <span className="text-[11px] text-foreground-tertiary">Tags</span>
            <input
              className={SUNO_FIELD}
              value={tagsText}
              onChange={(e) => setForm({ tags: parseTags(e.target.value) })}
              placeholder="ex: rap, rage, synthwave…"
            />
          </label>
        </div>
      </SunoAccordionSection>

      <SunoAccordionSection
        title="Paroles"
        description="Pour une création sur mesure"
        leftIcon={<FileText className="w-4 h-4" />}
        isOpen={open.lyrics}
        onToggle={() => setOpen((s) => ({ ...s, lyrics: !s.lyrics }))}
      >
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-[11px] text-foreground-tertiary">Paroles</span>
            <textarea
              className={SUNO_TEXTAREA}
              value={form.lyrics}
              maxLength={SUNO_GENERATION_LIMITS.prompt}
              disabled={!form.customMode || form.instrumental}
              onChange={(e) => setForm({ lyrics: e.target.value })}
              placeholder="Couplet / refrain…"
              rows={6}
            />
          </label>
          <div className="text-[11px] text-foreground-tertiary">
            {!form.customMode ? 'Les paroles sont créées automatiquement en mode simple.' : form.instrumental ? 'Aucune parole pour une création instrumentale.' : 'Les paroles sont requises en mode sur mesure avec voix.'}
          </div>
        </div>
      </SunoAccordionSection>

      <SunoAccordionSection
        title="Réglages avancés"
        description="Influences et éléments à éviter"
        leftIcon={<Settings2 className="w-4 h-4" />}
        isOpen={open.advanced}
        onToggle={() => setOpen((s) => ({ ...s, advanced: !s.advanced }))}
      >
        <fieldset disabled={!form.customMode} className="grid gap-3 disabled:opacity-60">
          {!form.customMode && <p className="text-[11px] text-foreground-tertiary">Ces réglages sont utilisés en mode sur mesure.</p>}
          <label className="grid gap-1">
            <span className="text-[11px] text-foreground-tertiary">Éléments à éviter</span>
            <input
              className={SUNO_FIELD}
              value={form.negativeTags}
              onChange={(e) => setForm({ negativeTags: e.target.value })}
              placeholder="ex: low quality, off-key…"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] text-foreground-tertiary">Type de voix</span>
            <select
              className={SUNO_SELECT}
              value={form.vocalGender}
              disabled={form.instrumental}
              onChange={(e) => setForm({ vocalGender: e.target.value })}
            >
              <option value="">Automatique</option>
              <option value="m">Masculine</option>
              <option value="f">Féminine</option>
            </select>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="grid gap-1">
              <span className="text-[11px] text-foreground-tertiary">Style (%)</span>
              <input
                className={SUNO_FIELD}
                type="number"
                min={0}
                max={100}
                value={form.styleInfluence}
                onChange={(e) => setForm({ styleInfluence: Number(e.target.value || 0) })}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-[11px] text-foreground-tertiary">Originalité (%)</span>
              <input
                className={SUNO_FIELD}
                type="number"
                min={0}
                max={100}
                value={form.weirdness}
                onChange={(e) => setForm({ weirdness: Number(e.target.value || 0) })}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-[11px] text-foreground-tertiary">Audio (%)</span>
              <input
                className={SUNO_FIELD}
                type="number"
                min={0}
                max={100}
                value={form.audioWeight}
                onChange={(e) => setForm({ audioWeight: Number(e.target.value || 0) })}
              />
            </label>
          </div>

          <button type="button" className={SUNO_BTN_BASE} onClick={() => setForm({ ...form, ...DEFAULTS() })}>
            <span className="relative">Réinitialiser les réglages avancés</span>
          </button>
        </fieldset>
      </SunoAccordionSection>
      <details className="workspace-news">
        <summary>Nouveau · Suno V6</summary>
        <SunoV6Announcement compact />
      </details>
    </div>
  );
}

function DEFAULTS() {
  return {
    negativeTags: '',
    vocalGender: '',
    styleInfluence: 50,
    weirdness: 50,
    audioWeight: 50,
  };
}

