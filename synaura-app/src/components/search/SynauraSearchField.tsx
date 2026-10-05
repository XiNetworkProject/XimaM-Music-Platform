import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { useCollectionPalette } from '@/components/mobile/CollectionUI';

export function SynauraSearchField({ value, onChangeText, onSubmit, onPress, onClear,
  placeholder = 'Rechercher sur Synaura', scope = 'Sons, artistes, playlists et posts', autoFocus = false, loading = false,
}: { value?: string; onChangeText?: (value: string) => void; onSubmit?: () => void; onPress?: () => void;
  onClear?: () => void; placeholder?: string; scope?: string; autoFocus?: boolean; loading?: boolean }) {
  const p = useCollectionPalette();
  const [focused, setFocused] = useState(false);
  if (onPress) return <EntryPressable accessibilityRole="button" accessibilityLabel={placeholder} onPress={onPress} style={[s.field, { backgroundColor: p.surface }]}>
    <Ionicons name="search-outline" size={23} color={p.blue} />
    <View style={s.copy}><Text numberOfLines={1} style={[s.title, { color: p.text }]}>{placeholder}</Text><Text numberOfLines={1} style={[s.scope, { color: p.muted }]}>{scope}</Text></View>
    <Ionicons name="arrow-forward" size={19} color={p.muted} />
  </EntryPressable>;
  return <View style={[s.field, { backgroundColor: focused ? p.raised : p.surface }]}>
    <Ionicons name="search-outline" size={23} color={focused ? p.blue : p.muted} />
    <TextInput accessibilityLabel={placeholder} autoFocus={autoFocus} value={value || ''} onChangeText={onChangeText}
      onSubmitEditing={onSubmit} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      placeholder={placeholder} placeholderTextColor={p.faint} returnKeyType="search" autoCorrect={false}
      selectionColor={p.blue} style={[s.input, { color: p.text }]} />
    {loading ? <ActivityIndicator accessibilityLabel="Recherche en cours" size="small" color={p.blue} /> : null}
    {value ? <EntryPressable accessibilityRole="button" accessibilityLabel="Effacer la recherche" onPress={onClear} style={s.clear}><Ionicons name="close-circle" size={21} color={p.muted} /></EntryPressable> : null}
  </View>;
}
const s = StyleSheet.create({
  field: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 20, paddingHorizontal: 16 },
  copy: { flex: 1, minWidth: 0, paddingVertical: 14 }, title: { fontSize: 15, fontWeight: '700' }, scope: { fontSize: 12, marginTop: 4 },
  input: { flex: 1, minWidth: 0, minHeight: 56, paddingVertical: 12, fontSize: 16 }, clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
});
