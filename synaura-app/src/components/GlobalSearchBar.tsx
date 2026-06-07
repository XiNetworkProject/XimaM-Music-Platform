import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function GlobalSearchBar({ visible, onOpen }: { visible: boolean; onOpen: () => void }) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 8 }]}>
      <Pressable onPress={onOpen} style={styles.bar}>
        <Ionicons name="search" size={17} color="#6B5F5A" />
        <Text style={styles.placeholder}>Rechercher sons, artistes, posts...</Text>
        <View style={styles.key}>
          <Text style={styles.keyText}>Synaura</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 30,
  },
  bar: {
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(23, 19, 19, 0.10)',
    backgroundColor: 'rgba(255, 250, 244, 0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  placeholder: {
    flex: 1,
    color: '#6B5F5A',
    fontSize: 13,
    fontWeight: '700',
  },
  key: {
    borderRadius: 999,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  keyText: {
    color: '#6D28D9',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
