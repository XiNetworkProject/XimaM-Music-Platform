import React from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme/tokens';

const SOCIALS: Array<{ keys: string[]; brand: string; color: string }> = [
  { keys: ['instagram'], brand: 'instagram', color: '#E1306C' },
  { keys: ['tiktok'], brand: 'tiktok', color: '#171313' },
  { keys: ['youtube'], brand: 'youtube', color: '#FF0000' },
  { keys: ['spotify'], brand: 'spotify', color: '#1DB954' },
  { keys: ['soundcloud'], brand: 'soundcloud', color: '#FF5500' },
  { keys: ['deezer'], brand: 'deezer', color: '#A238FF' },
  { keys: ['twitter', 'x.com'], brand: 'x-twitter', color: '#171313' },
  { keys: ['twitch'], brand: 'twitch', color: '#9146FF' },
  { keys: ['discord'], brand: 'discord', color: '#5865F2' },
  { keys: ['apple'], brand: 'apple', color: '#171313' },
];

function socialMeta(name: string, url: string) {
  const target = `${name} ${url}`.toLowerCase();
  return SOCIALS.find((social) => social.keys.some((key) => target.includes(key))) || {
    icon: 'link-outline' as const,
    color: colors.violet,
  };
}

export function MobileSocialLinks({ links }: { links: Record<string, string | undefined | null> }) {
  const entries = Object.entries(links).filter(([, url]) => Boolean(url));
  if (!entries.length) return null;

  return (
    <View style={styles.root}>
      {entries.slice(0, 9).map(([name, url]) => {
        const meta = socialMeta(name, String(url));
        return (
          <Pressable
            key={name}
            accessibilityLabel={`Ouvrir ${name}`}
            onPress={() => {
              void Haptics.selectionAsync().catch(() => {});
              void Linking.openURL(String(url));
            }}
            style={({ pressed }) => [styles.button, { borderColor: `${meta.color}32`, backgroundColor: `${meta.color}12` }, pressed && styles.pressed]}
          >
            {'brand' in meta
              ? <FontAwesome6 name={meta.brand as any} size={17} color={meta.color} />
              : <Ionicons name={meta.icon} size={18} color={meta.color} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: {
    width: 39,
    height: 39,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pressed: { transform: [{ scale: 0.92 }] },
});
