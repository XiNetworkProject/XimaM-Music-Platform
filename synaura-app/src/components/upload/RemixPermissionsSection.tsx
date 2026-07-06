import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme/tokens';
import { DEFAULT_REMIX_PERMISSIONS, type RemixPermissions } from '@/api/types';

export { DEFAULT_REMIX_PERMISSIONS };
export type RemixPermissionsValue = RemixPermissions;

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

export function RemixPermissionsSection({
  value,
  onChange,
}: {
  value: RemixPermissionsValue;
  onChange: (next: RemixPermissionsValue) => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const applyPreset = (key: PresetKey) => {
    void Haptics.selectionAsync().catch(() => {});
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
    <View style={{ gap: 12 }}>
      <View>
        <Text style={styles.title}>Droits de création</Text>
        <Text style={styles.subtitle}>Choisis ce que les autres peuvent créer à partir de ce morceau.</Text>
      </View>

      <View style={{ gap: 8 }}>
        {PRESET_ORDER.map((key) => {
          const preset = PRESETS[key];
          const active = matchesPreset(value, key);
          return (
            <Pressable
              key={key}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => applyPreset(key)}
              style={[styles.presetCard, active && styles.presetCardActive]}
            >
              <View style={styles.presetHeader}>
                <View style={[styles.radioDot, active && styles.radioDotActive]} />
                <Text style={styles.presetLabel}>{preset.label}</Text>
              </View>
              <Text style={styles.presetDescription}>{preset.description}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.advancedShell}>
        <Pressable onPress={() => setAdvancedOpen((v) => !v)} style={styles.advancedHeader}>
          <Text style={styles.advancedTitle}>Réglages avancés</Text>
          <Ionicons name={advancedOpen ? 'chevron-down' : 'chevron-forward'} size={16} color={colors.textTertiary} />
        </Pressable>
        {advancedOpen ? (
          <View style={{ gap: 2, paddingBottom: 6 }}>
            <ToggleRow
              label="Demander ma validation avant publication"
              description="Chaque création dérivée devra être approuvée par toi avant d'être visible."
              value={value.remixApprovalRequired}
              disabled={value.remixVisibility === 'disabled'}
              onChange={setApprovalRequired}
            />
            <ToggleRow
              label="Réserver aux abonnés"
              description="Seules les personnes qui te suivent pourront créer à partir de ce morceau."
              value={value.remixVisibility === 'followers'}
              disabled={value.remixVisibility === 'disabled'}
              onChange={setReserveToFollowers}
            />
            <ToggleRow
              label="Autoriser les clips"
              description="Extraits courts utilisables dans d'autres vidéos."
              value={value.allowClips}
              onChange={(checked) => setAllowField('allowClips', checked)}
            />
            <ToggleRow
              label="Autoriser les variations IA"
              description="Le Studio IA peut s'en inspirer pour générer des variations."
              value={value.allowAiVariation}
              onChange={(checked) => setAllowField('allowAiVariation', checked)}
            />
            <ToggleRow
              label="Autoriser les remixes audio"
              description="D'autres peuvent remixer l'audio complet de ce morceau."
              value={value.allowAudioRemix}
              onChange={(checked) => setAllowField('allowAudioRemix', checked)}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  description,
  value,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <View style={[styles.toggleRow, disabled && styles.toggleRowDisabled]}>
      <View style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={(checked) => {
          void Haptics.selectionAsync().catch(() => {});
          onChange(checked);
        }}
        trackColor={{ false: colors.border, true: colors.violet }}
        thumbColor={colors.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 14, fontWeight: '900' },
  subtitle: { marginTop: 3, color: colors.textTertiary, fontSize: 11, fontWeight: '700', lineHeight: 15 },
  presetCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
  },
  presetCardActive: {
    borderColor: colors.violet,
    backgroundColor: 'rgba(115,87,198,0.08)',
  },
  presetHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  radioDot: { width: 15, height: 15, borderRadius: 8, borderWidth: 2, borderColor: colors.borderStrong },
  radioDotActive: { borderColor: colors.violet, backgroundColor: colors.violet },
  presetLabel: { color: colors.text, fontSize: 13, fontWeight: '900' },
  presetDescription: { marginTop: 5, marginLeft: 24, color: colors.textTertiary, fontSize: 11, fontWeight: '700', lineHeight: 15 },
  advancedShell: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  advancedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  advancedTitle: { color: colors.textTertiary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  toggleRowDisabled: { opacity: 0.4 },
  toggleLabel: { color: colors.text, fontSize: 12, fontWeight: '800' },
  toggleDescription: { marginTop: 2, color: colors.textTertiary, fontSize: 10, fontWeight: '700', lineHeight: 13 },
});

export default RemixPermissionsSection;
