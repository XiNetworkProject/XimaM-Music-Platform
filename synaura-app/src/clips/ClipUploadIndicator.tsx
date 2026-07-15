import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { MotionPressable } from '@/components/motion/Motion';
import { colors } from '@/theme/tokens';
import { useClipUploads } from './ClipUploadProvider';

const SIZE = 58;
const RADIUS = 25;
const CIRCUMFERENCE = Math.PI * 2 * RADIUS;

export function ClipUploadIndicator({ top, left }: { top: number; left: number }) {
  const navigation = useNavigation<any>();
  const { activeTask, retry, remove } = useClipUploads();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  if (!activeTask) return null;
  const failed = activeTask.status === 'failed';
  const completed = activeTask.status === 'completed';
  const progress = Math.max(0.02, Math.min(1, activeTask.progress || 0));
  const label = failed
    ? 'Envoi échoué'
    : completed
      ? 'Clip publié'
      : activeTask.status === 'publishing'
        ? 'Publication…'
        : `${Math.round(progress * 100)} %`;

  const edit = () => {
    setSheetOpen(false);
    navigation.navigate('ClipComposer', {
      editUploadTaskId: activeTask.id,
      sourceTrackId: activeTask.source.sourceTrackId,
      sourceTrackType: activeTask.source.sourceTrackType,
      challengeId: activeTask.challengeId,
    });
  };

  return (
    <>
      <View style={[styles.position, { top, left }]}>
        <Pressable
          accessibilityLabel={failed ? `Échec de l’envoi. ${activeTask.error || ''}. Ouvrir les options.` : `${label}. Ouvrir le suivi.`}
          onPress={() => setSheetOpen(true)}
          style={styles.control}
        >
          <View style={styles.circle}>
            {activeTask.source.coverUrl ? <Image source={{ uri: activeTask.source.coverUrl }} style={styles.cover} /> : <View style={styles.cover} />}
            <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
              <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke="rgba(255,250,242,0.25)" strokeWidth={4} fill="none" />
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                stroke={failed ? colors.coral : completed ? colors.cyan : colors.background}
                strokeWidth={4}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
                rotation="-90"
                origin={`${SIZE / 2}, ${SIZE / 2}`}
              />
            </Svg>
            {(failed || completed) ? (
              <View style={[styles.state, failed ? styles.stateFailed : styles.stateCompleted]}>
                <Ionicons name={failed ? 'alert' : 'checkmark'} size={18} color={colors.background} />
              </View>
            ) : null}
          </View>
          <Text numberOfLines={1} style={[styles.label, failed && styles.labelFailed]}>{label}</Text>
        </Pressable>
      </View>

      <BottomSheet
        visible={sheetOpen}
        title={failed ? 'Publication interrompue' : completed ? 'Clip publié' : 'Publication en cours'}
        subtitle={failed ? activeTask.error || 'Tu peux corriger le Clip ou relancer son envoi.' : `${activeTask.source.title} · ${Math.round(progress * 100)} %`}
        onClose={() => setSheetOpen(false)}
        maxHeight="78%"
      >
        <View style={styles.sheetContent}>
          <View style={styles.taskSummary}>
            {activeTask.source.coverUrl ? <Image source={{ uri: activeTask.source.coverUrl }} style={styles.summaryCover} /> : <View style={styles.summaryCover} />}
            <View style={styles.summaryCopy}>
              <Text numberOfLines={1} style={styles.summaryTitle}>{activeTask.caption || activeTask.source.title}</Text>
              <Text numberOfLines={1} style={styles.summaryMeta}>{activeTask.source.title} · tentative {Math.max(1, activeTask.attempts + 1)}</Text>
            </View>
            <Text style={styles.summaryProgress}>{Math.round(progress * 100)} %</Text>
          </View>

          {failed ? (
            <>
              <MotionPressable onPress={() => { setSheetOpen(false); retry(activeTask.id); }} style={[styles.action, styles.actionPrimary]} scaleTo={0.98}>
                <View style={[styles.actionIcon, styles.actionIconPrimary]}><Ionicons name="refresh" size={19} color={colors.paper} /></View>
                <View style={styles.actionCopy}><Text style={[styles.actionTitle, styles.actionTitlePrimary]}>Réessayer</Text><Text style={styles.actionText}>Reprendre depuis la dernière étape valide</Text></View>
                <Ionicons name="arrow-forward" size={17} color={colors.paper} />
              </MotionPressable>
              <MotionPressable onPress={edit} style={styles.action} scaleTo={0.98}>
                <View style={styles.actionIcon}><Ionicons name="create-outline" size={19} color={colors.violet} /></View>
                <View style={styles.actionCopy}><Text style={styles.actionTitle}>Modifier le Clip</Text><Text style={styles.actionText}>Vidéo, son, extrait, légende ou tags</Text></View>
                <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
              </MotionPressable>
              <MotionPressable onPress={() => { setSheetOpen(false); remove(activeTask.id); }} style={[styles.action, styles.actionDanger]} scaleTo={0.98}>
                <View style={[styles.actionIcon, styles.actionIconDanger]}><Ionicons name="trash-outline" size={19} color={colors.coral} /></View>
                <View style={styles.actionCopy}><Text style={[styles.actionTitle, styles.actionTitleDanger]}>Supprimer cet envoi</Text><Text style={styles.actionText}>Retirer le brouillon et son indicateur du Flow</Text></View>
              </MotionPressable>
            </>
          ) : (
            <View style={styles.progressNote}>
              <Ionicons name={completed ? 'checkmark-circle' : 'cloud-upload-outline'} size={20} color={completed ? colors.cyan : colors.violet} />
              <Text style={styles.progressNoteText}>{completed ? 'Ton Clip est maintenant disponible dans le Flow.' : 'Tu peux continuer à utiliser Synaura pendant la publication.'}</Text>
            </View>
          )}
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  position: { position: 'absolute', zIndex: 18, width: 76, alignItems: 'center' },
  control: { width: 76, alignItems: 'center', gap: 4 },
  circle: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  cover: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2B2628' },
  state: { position: 'absolute', width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  stateFailed: { backgroundColor: 'rgba(217,109,99,0.94)' },
  stateCompleted: { backgroundColor: 'rgba(74,158,170,0.94)' },
  label: { maxWidth: 76, color: colors.background, fontSize: 9, fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.65)', textShadowRadius: 4 },
  labelFailed: { color: '#FFD7D2' },
  sheetContent: { gap: 9, padding: 18, paddingTop: 14 },
  taskSummary: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 9 },
  summaryCover: { width: 44, height: 44, borderRadius: 9, backgroundColor: colors.surfaceMuted },
  summaryCopy: { flex: 1, minWidth: 0 },
  summaryTitle: { color: colors.text, fontSize: 13, lineHeight: 17, fontWeight: '900' },
  summaryMeta: { marginTop: 3, color: colors.textSecondary, fontSize: 10, lineHeight: 13, fontWeight: '700' },
  summaryProgress: { color: colors.violet, fontSize: 12, fontWeight: '900' },
  action: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 11, paddingVertical: 9 },
  actionPrimary: { borderColor: colors.black, backgroundColor: colors.black },
  actionDanger: { marginTop: 4, borderColor: 'rgba(217,109,99,0.18)', backgroundColor: 'rgba(217,109,99,0.06)' },
  actionIcon: { width: 38, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violetSoft },
  actionIconPrimary: { backgroundColor: 'rgba(255,255,255,0.12)' },
  actionIconDanger: { backgroundColor: colors.coralSoft },
  actionCopy: { flex: 1, minWidth: 0 },
  actionTitle: { color: colors.text, fontSize: 13, lineHeight: 17, fontWeight: '900' },
  actionTitlePrimary: { color: colors.paper },
  actionTitleDanger: { color: colors.coral },
  actionText: { marginTop: 2, color: colors.textSecondary, fontSize: 10, lineHeight: 14, fontWeight: '600' },
  progressNote: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, backgroundColor: colors.surface, padding: 14 },
  progressNoteText: { flex: 1, color: colors.textSecondary, fontSize: 11, lineHeight: 16, fontWeight: '700' },
});
