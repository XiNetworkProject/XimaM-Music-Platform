import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MobileProfileTrack } from '@/api/client';
import { TrackCover } from '@/components/TrackCover';
import { RemixPermissionsSection, type RemixPermissionsValue } from '@/components/upload/RemixPermissionsSection';

export type TrackEditForm = {
  title: string;
  description: string;
  genreText: string;
  tagsText: string;
  isPublic: boolean;
  remixPermissions: RemixPermissionsValue;
};

export function TrackEditBottomSheet({
  track,
  form,
  saving,
  onChange,
  onClose,
  onSave,
  onDelete,
}: {
  track: MobileProfileTrack | null;
  form: TrackEditForm;
  saving: boolean;
  onChange: (patch: Partial<TrackEditForm>) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  return (
    <Modal visible={Boolean(track)} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          {track ? (
            <>
              <View style={styles.header}>
                <TrackCover track={track} style={styles.cover} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.eyebrow}>Modifier le son</Text>
                  <Text numberOfLines={1} style={styles.title}>{track.title}</Text>
                </View>
                <Pressable onPress={onClose} style={styles.iconBtn}><Ionicons name="close" size={20} color="#171313" /></Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <TextInput value={form.title} onChangeText={(title) => onChange({ title })} placeholder="Titre" placeholderTextColor="rgba(23,19,19,0.34)" style={styles.input} />
                <TextInput value={form.description} onChangeText={(description) => onChange({ description })} placeholder="Description" placeholderTextColor="rgba(23,19,19,0.34)" multiline textAlignVertical="top" style={[styles.input, styles.inputMulti]} />
                <TextInput value={form.genreText} onChangeText={(genreText) => onChange({ genreText })} placeholder="Genres separes par virgules" placeholderTextColor="rgba(23,19,19,0.34)" style={styles.input} />
                <TextInput value={form.tagsText} onChangeText={(tagsText) => onChange({ tagsText })} placeholder="Tags separes par virgules" placeholderTextColor="rgba(23,19,19,0.34)" style={styles.input} />
                <Pressable onPress={() => onChange({ isPublic: !form.isPublic })} style={styles.visibilityToggle}>
                  <Text style={styles.visibilityText}>{form.isPublic ? 'Public' : 'Prive'}</Text>
                  <Ionicons name={form.isPublic ? 'eye-outline' : 'eye-off-outline'} size={18} color="#171313" />
                </Pressable>
                <RemixPermissionsSection
                  value={form.remixPermissions}
                  onChange={(remixPermissions) => onChange({ remixPermissions })}
                />
                <View style={styles.actions}>
                  <Pressable onPress={onDelete} style={styles.delete}><Text style={styles.deleteText}>Supprimer</Text></Pressable>
                  <Pressable disabled={saving} onPress={onSave} style={[styles.save, saving && { opacity: 0.55 }]}>{saving ? <ActivityIndicator color="#FFF7ED" /> : <Text style={styles.saveText}>Sauver</Text>}</Pressable>
                </View>
              </ScrollView>
            </>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23,19,19,0.34)' },
  sheet: { alignSelf: 'center', width: '100%', maxWidth: 680, maxHeight: '94%', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: '#FFF7ED', padding: 16, paddingBottom: 22, gap: 10 },
  handle: { width: 46, height: 5, borderRadius: 999, backgroundColor: 'rgba(23,19,19,0.18)', alignSelf: 'center', marginBottom: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  cover: { width: 58, height: 58, borderRadius: 18 },
  eyebrow: { color: '#8B5CF6', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#171313', fontSize: 20, fontWeight: '900' },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(23,19,19,0.07)', alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 46, borderRadius: 23, paddingHorizontal: 14, backgroundColor: '#FFFFFF', color: '#171313', fontSize: 14, fontWeight: '700' },
  inputMulti: { minHeight: 86, paddingTop: 12 },
  visibilityToggle: { height: 46, borderRadius: 23, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(23,19,19,0.055)' },
  visibilityText: { color: '#171313', fontSize: 13, fontWeight: '900' },
  form: { gap: 10, paddingBottom: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  delete: { flex: 1, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(185,28,28,0.10)' },
  deleteText: { color: '#B91C1C', fontSize: 13, fontWeight: '900' },
  save: { flex: 1, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171313' },
  saveText: { color: '#FFF7ED', fontSize: 13, fontWeight: '900' },
});
