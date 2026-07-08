import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { decideRemix } from '@/api/client';
import type { PendingVariation } from '@/api/types';
import { colors } from '@/theme/tokens';

const FALLBACK_COVER = require('../../assets/synaura-symbol-2026.png');

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export function PendingApprovalsModal({
  visible,
  onClose,
  items,
  onDecided,
}: {
  visible: boolean;
  onClose: () => void;
  items: PendingVariation[];
  onDecided: (remixId: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [busyId, setBusyId] = useState<string | null>(null);

  const decide = async (remixId: string, decision: 'approve' | 'reject') => {
    setBusyId(remixId);
    try {
      await decideRemix(remixId, decision);
      onDecided(remixId);
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Action impossible pour le moment.');
    } finally {
      setBusyId(null);
    }
  };

  const confirmReject = (item: PendingVariation) => {
    Alert.alert(
      'Refuser cette variation ?',
      'Le brouillon reste privé chez le créateur.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Refuser', style: 'destructive', onPress: () => void decide(item.remixId, 'reject') },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>VARIATIONS</Text>
            <Text style={styles.title}>Variations à valider</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton} accessibilityLabel="Fermer">
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
          {items.length ? (
            items.map((item) => (
              <View key={item.remixId} style={styles.card}>
                <View style={styles.cardTop}>
                  <Image source={item.coverUrl ? { uri: item.coverUrl } : FALLBACK_COVER} style={styles.cover} />
                  <View style={styles.cardCopy}>
                    <Text numberOfLines={1} style={styles.cardTitle}>{item.title}</Text>
                    <Text numberOfLines={1} style={styles.cardMeta}>par {item.creator.name || item.creator.username}</Text>
                    <Text numberOfLines={1} style={styles.cardSource}>Inspiré de {item.source.title}</Text>
                  </View>
                </View>
                <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>

                <View style={styles.actionsRow}>
                  <Pressable
                    disabled={busyId === item.remixId}
                    onPress={() => void decide(item.remixId, 'approve')}
                    style={[styles.approveButton, busyId === item.remixId && styles.disabled]}
                  >
                    {busyId === item.remixId ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                        <Text style={styles.approveText}>Accepter</Text>
                      </>
                    )}
                  </Pressable>
                  <Pressable
                    disabled={busyId === item.remixId}
                    onPress={() => confirmReject(item)}
                    style={[styles.rejectButton, busyId === item.remixId && styles.disabled]}
                  >
                    <Ionicons name="close" size={15} color={colors.coral} />
                    <Text style={styles.rejectText}>Refuser</Text>
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>Aucune variation en attente.</Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 14 },
  eyebrow: { color: colors.violet, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  title: { marginTop: 4, color: colors.text, fontSize: 22, fontWeight: '900' },
  closeButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,17,17,0.05)' },
  content: { paddingHorizontal: 18, gap: 10 },
  card: { borderRadius: 20, borderWidth: 1, borderColor: 'rgba(17,17,17,0.08)', backgroundColor: '#FFFFFF', padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  cover: { width: 54, height: 54, borderRadius: 16, backgroundColor: 'rgba(17,17,17,0.06)' },
  cardCopy: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 14, fontWeight: '900', color: colors.text },
  cardMeta: { marginTop: 2, fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  cardSource: { marginTop: 2, fontSize: 11, fontWeight: '600', color: colors.textTertiary },
  cardDate: { marginTop: 8, fontSize: 10, fontWeight: '700', color: colors.textTertiary },
  actionsRow: { marginTop: 10, flexDirection: 'row', gap: 8 },
  approveButton: { flex: 1, height: 40, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.violet },
  approveText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  rejectButton: { flex: 1, height: 40, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(217,109,99,0.4)' },
  rejectText: { color: colors.coral, fontSize: 12, fontWeight: '900' },
  disabled: { opacity: 0.6 },
  empty: { marginTop: 60, textAlign: 'center', fontSize: 13, fontWeight: '700', color: colors.textTertiary },
});
