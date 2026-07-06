'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export type RemixPermissionsValue = {
  allowClips: boolean;
  allowAudioRemix: boolean;
  allowAiVariation: boolean;
  remixApprovalRequired: boolean;
  remixVisibility: 'everyone' | 'followers' | 'disabled';
};

export const DEFAULT_REMIX_PERMISSIONS: RemixPermissionsValue = {
  allowClips: false,
  allowAudioRemix: false,
  allowAiVariation: false,
  remixApprovalRequired: false,
  remixVisibility: 'disabled',
};

type PresetKey = 'disabled' | 'clips' | 'ai' | 'audio' | 'open';
type AllowField = 'allowClips' | 'allowAudioRemix' | 'allowAiVariation';

const PRESETS: Record<PresetKey, { label: string; description: string; value: Pick<RemixPermissionsValue, AllowField | 'remixVisibility'> }> = {
  disabled: {
    label: 'Remix désactivé',
    description: 'Personne ne peut créer de clip, de variation IA ou de remix à partir de ce morceau.',
    value: { allowClips: false, allowAudioRemix: false, allowAiVariation: false, remixVisibility: 'disabled' },
  },
  clips: {
    label: 'Autoriser les clips avec ce son',
    description: "D'autres membres pourront utiliser ce son pour créer des clips courts.",
    value: { allowClips: true, allowAudioRemix: false, allowAiVariation: false, remixVisibility: 'everyone' },
  },
  ai: {
    label: 'Autoriser les variations IA',
    description: "L'IA de Synaura pourra s'inspirer de ce morceau pour proposer des variations.",
    value: { allowClips: false, allowAudioRemix: false, allowAiVariation: true, remixVisibility: 'everyone' },
  },
  audio: {
    label: 'Autoriser les remixes audio',
    description: "D'autres artistes pourront remixer l'audio de ce morceau.",
    value: { allowClips: false, allowAudioRemix: true, allowAiVariation: false, remixVisibility: 'everyone' },
  },
  open: {
    label: 'Remix ouvert',
    description: 'Clips, variations IA et remixes audio sont tous autorisés.',
    value: { allowClips: true, allowAudioRemix: true, allowAiVariation: true, remixVisibility: 'everyone' },
  },
};

const PRESET_ORDER: PresetKey[] = ['disabled', 'clips', 'ai', 'audio', 'open'];

function matchesPreset(value: RemixPermissionsValue, key: PresetKey) {
  const p = PRESETS[key].value;
  return (
    value.remixVisibility === p.remixVisibility &&
    value.allowClips === p.allowClips &&
    value.allowAudioRemix === p.allowAudioRemix &&
    value.allowAiVariation === p.allowAiVariation
  );
}

export default function RemixPermissionsSection({
  value,
  onChange,
}: {
  value: RemixPermissionsValue;
  onChange: (next: RemixPermissionsValue) => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const applyPreset = (key: PresetKey) => {
    onChange({ ...PRESETS[key].value, remixApprovalRequired: key === 'disabled' ? false : value.remixApprovalRequired });
  };

  const setAllowField = (field: AllowField, checked: boolean) => {
    const next = { ...value, [field]: checked };
    const anyAllowed = next.allowClips || next.allowAudioRemix || next.allowAiVariation;
    next.remixVisibility = anyAllowed ? (value.remixVisibility === 'followers' ? 'followers' : 'everyone') : 'disabled';
    if (!anyAllowed) next.remixApprovalRequired = false;
    onChange(next);
  };

  const setApprovalRequired = (checked: boolean) => onChange({ ...value, remixApprovalRequired: checked });

  const setReserveToFollowers = (checked: boolean) => {
    if (value.remixVisibility === 'disabled') return;
    onChange({ ...value, remixVisibility: checked ? 'followers' : 'everyone' });
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-black text-white">Droits de création</h3>
        <p className="mt-1 text-xs font-semibold text-white/40">Choisis ce que les autres peuvent créer à partir de ce morceau.</p>
      </div>

      <div className="grid gap-2">
        {PRESET_ORDER.map((key) => {
          const preset = PRESETS[key];
          const active = matchesPreset(value, key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              aria-pressed={active}
              className={[
                'rounded-[1.1rem] border px-4 py-3 text-left transition',
                active ? 'border-violet-400/50 bg-violet-500/[0.12]' : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05]',
              ].join(' ')}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={[
                    'grid h-4 w-4 shrink-0 place-items-center rounded-full border-2',
                    active ? 'border-violet-300 bg-violet-400' : 'border-white/25',
                  ].join(' ')}
                />
                <span className="text-sm font-black text-white/90">{preset.label}</span>
              </div>
              <p className="mt-1 pl-[26px] text-xs font-semibold leading-5 text-white/44">{preset.description}</p>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-[1.1rem] border border-white/[0.08] bg-white/[0.02]">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="text-xs font-black uppercase tracking-[0.14em] text-white/40">Réglages avancés</span>
          {advancedOpen ? <ChevronDown className="h-4 w-4 text-white/30" /> : <ChevronRight className="h-4 w-4 text-white/30" />}
        </button>
        {advancedOpen ? (
          <div className="space-y-1 px-3 pb-3">
            <ToggleRow
              label="Demander ma validation avant publication"
              description="Chaque création dérivée devra être approuvée par toi avant d'être visible."
              checked={value.remixApprovalRequired}
              disabled={value.remixVisibility === 'disabled'}
              onChange={setApprovalRequired}
            />
            <ToggleRow
              label="Réserver aux abonnés"
              description="Seules les personnes qui te suivent pourront créer à partir de ce morceau."
              checked={value.remixVisibility === 'followers'}
              disabled={value.remixVisibility === 'disabled'}
              onChange={setReserveToFollowers}
            />
            <ToggleRow
              label="Autoriser les clips"
              description="Extraits courts utilisables dans d'autres vidéos."
              checked={value.allowClips}
              onChange={(checked) => setAllowField('allowClips', checked)}
            />
            <ToggleRow
              label="Autoriser les variations IA"
              description="Le Studio IA peut s'en inspirer pour générer des variations."
              checked={value.allowAiVariation}
              onChange={(checked) => setAllowField('allowAiVariation', checked)}
            />
            <ToggleRow
              label="Autoriser les remixes audio"
              description="D'autres peuvent remixer l'audio complet de ce morceau."
              checked={value.allowAudioRemix}
              onChange={(checked) => setAllowField('allowAudioRemix', checked)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={['flex items-start gap-3 rounded-[0.9rem] px-2 py-2.5 transition', disabled ? 'opacity-40' : 'cursor-pointer hover:bg-white/[0.03]'].join(' ')}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-white/[0.04] text-violet-500 focus:ring-violet-500/30"
      />
      <span>
        <span className="block text-xs font-black text-white/78">{label}</span>
        <span className="mt-0.5 block text-[11px] font-semibold leading-4 text-white/38">{description}</span>
      </span>
    </label>
  );
}
