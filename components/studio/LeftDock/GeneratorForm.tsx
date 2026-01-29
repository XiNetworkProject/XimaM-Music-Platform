'use client';

import { useMemo, useState } from 'react';
import { Sliders, Wand2, FileText, Settings2 } from 'lucide-react';
import { SunoAccordionSection } from '@/components/ui/SunoAccordionSection';
import { useStudioStore } from '@/lib/studio/store';
import { SUNO_BTN_BASE, SUNO_FIELD, SUNO_TEXTAREA, SUNO_SELECT } from '@/components/ui/sunoClasses';

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 25);
}

export default function GeneratorForm({ onGenerate }: { onGenerate: () => void }) {
  const form = useStudioStore((s) => s.form);
  const setForm = useStudioStore((s) => s.setForm);

  const [open, setOpen] = useState<{ project: boolean; style: boolean; lyrics: boolean; advanced: boolean }>({
    project: true,
    style: true,
    lyrics: false,
    advanced: false,
  });

  const tagsText = useMemo(() => (form.tags || []).join(', '), [form.tags]);

  return (
    <div className="space-y-3">
      <div className="panel-suno overflow-hidden">
        <div className="p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-foreground-tertiary">GENERATOR</div>
            <div className="text-sm font-semibold text-foreground-primary">AI Music</div>
          </div>
          <button
            type="button"
            className="h-9 px-3 rounded-xl border border-border-secondary bg-white text-black font-semibold hover:opacity-90 transition flex items-center gap-2"
            onClick={onGenerate}
          >
            <Wand2 className="w-4 h-4" />
            Generate
          </button>
        </div>
      </div>

      <SunoAccordionSection
        title="Project"
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
              <option value="custom">Custom</option>
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-[11px] text-foreground-tertiary">Model</span>
            <select className={SUNO_SELECT} value={form.model} onChange={(e) => setForm({ model: e.target.value })}>
              <option value="V4_5">V4_5</option>
              <option value="V4_5PLUS">V4_5PLUS</option>
              <option value="V3_5">V3_5</option>
              <option value="V5">V5</option>
            </select>
          </label>

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
                <span className="text-[11px] text-foreground-tertiary">Title</span>
                <input
                  className={SUNO_FIELD}
                  value={form.title}
                  onChange={(e) => setForm({ title: e.target.value })}
                  placeholder="Titre (optionnel)"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-[11px] text-foreground-tertiary">Style</span>
                <input
                  className={SUNO_FIELD}
                  value={form.style}
                  onChange={(e) => setForm({ style: e.target.value })}
                  placeholder="ex: drill mélodique, 140bpm, dark…"
                />
              </label>
            </>
          ) : (
            <label className="grid gap-1">
              <span className="text-[11px] text-foreground-tertiary">Prompt</span>
              <textarea
                className={SUNO_TEXTAREA}
                value={form.description}
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
        title="Lyrics"
        description="Paroles (Custom)"
        leftIcon={<FileText className="w-4 h-4" />}
        isOpen={open.lyrics}
        onToggle={() => setOpen((s) => ({ ...s, lyrics: !s.lyrics }))}
      >
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-[11px] text-foreground-tertiary">Lyrics</span>
            <textarea
              className={SUNO_TEXTAREA}
              value={form.lyrics}
              onChange={(e) => setForm({ lyrics: e.target.value })}
              placeholder="Couplet / refrain…"
              rows={6}
            />
          </label>
          <div className="text-[11px] text-foreground-tertiary">
            En Custom non-instrumental, les paroles sont requises.
          </div>
        </div>
      </SunoAccordionSection>

      <SunoAccordionSection
        title="Advanced"
        description="Influences & negative tags"
        leftIcon={<Settings2 className="w-4 h-4" />}
        isOpen={open.advanced}
        onToggle={() => setOpen((s) => ({ ...s, advanced: !s.advanced }))}
      >
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-[11px] text-foreground-tertiary">Negative tags</span>
            <input
              className={SUNO_FIELD}
              value={form.negativeTags}
              onChange={(e) => setForm({ negativeTags: e.target.value })}
              placeholder="ex: low quality, off-key…"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] text-foreground-tertiary">Vocal gender</span>
            <input
              className={SUNO_FIELD}
              value={form.vocalGender}
              onChange={(e) => setForm({ vocalGender: e.target.value })}
              placeholder="ex: male / female"
            />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="grid gap-1">
              <span className="text-[11px] text-foreground-tertiary">Style%</span>
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
              <span className="text-[11px] text-foreground-tertiary">Weird%</span>
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
              <span className="text-[11px] text-foreground-tertiary">Audio%</span>
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
            <span className="relative">Reset advanced</span>
          </button>
        </div>
      </SunoAccordionSection>
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

