import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/tokens';

export type CreateArrivalContext = 'ai' | 'variation' | 'clip' | 'upload' | 'challenge';

const CONTEXT_STYLE: Record<CreateArrivalContext, { icon: keyof typeof Ionicons.glyphMap; tint: string }> = {
  ai: { icon: 'sparkles', tint: colors.violet },
  variation: { icon: 'color-wand-outline', tint: colors.cyan },
  clip: { icon: 'film-outline', tint: colors.coral },
  upload: { icon: 'cloud-upload-outline', tint: colors.gold },
  challenge: { icon: 'trophy-outline', tint: colors.coral },
};

export function createArrivalLabel(context: CreateArrivalContext, title?: string | null) {
  if (context === 'variation') return title ? `Variation inspirée de ${title}` : 'Créer une variation';
  if (context === 'clip') return title ? `Clip utilisant ${title}` : 'Publier un Clip';
  if (context === 'upload') return 'Publier un morceau';
  if (context === 'challenge') return title ? `Défi : ${title}` : 'Participer à un défi';
  return "Créer avec l'IA";
}

export function CreateArrivalBanner({ context, title }: { context: CreateArrivalContext; title?: string | null }) {
  const style = CONTEXT_STYLE[context];
  return (
    <View style={[styles.root, { backgroundColor: `${style.tint}18` }]}>
      <Ionicons name={style.icon} size={14} color={style.tint} />
      <Text numberOfLines={1} style={[styles.text, { color: style.tint }]}>{createArrivalLabel(context, title)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 10,
  },
  text: { fontSize: 11, fontWeight: '900', flexShrink: 1 },
});

export default CreateArrivalBanner;
