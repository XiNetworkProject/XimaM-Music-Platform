import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLatestAppRelease, type MobileAppRelease } from '@/api/client';

const DISMISSED_RELEASE_KEY = 'synaura.mobile.dismissed-release.v1';

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'current' | 'error';

type AppUpdateContextValue = {
  status: UpdateStatus;
  release: MobileAppRelease | null;
  progress: number;
  error: string | null;
  currentVersionCode: number;
  currentVersionName: string;
  checkForUpdate: (force?: boolean) => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  openInstallSettings: () => Promise<void>;
  dismiss: () => Promise<void>;
};

const AppUpdateContext = createContext<AppUpdateContextValue | null>(null);

export function useAppUpdate() {
  const value = useContext(AppUpdateContext);
  if (!value) throw new Error('useAppUpdate doit etre utilise dans UpdateProvider');
  return value;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'La mise a jour a rencontre un probleme.';
}

export function UpdateProvider({ children }: { children: React.ReactNode }) {
  const currentVersionCode = Number(Application.nativeBuildVersion || 0);
  const currentVersionName = Application.nativeApplicationVersion || '0.0.0';
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [release, setRelease] = useState<MobileAppRelease | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const isMandatory = Boolean(
    release && release.versionCode > currentVersionCode && (release.mandatory || currentVersionCode < release.minimumVersionCode),
  );

  const checkForUpdate = useCallback(async (force = false) => {
    if (Platform.OS !== 'android') return;
    setStatus('checking');
    setError(null);
    try {
      const result = await getLatestAppRelease(currentVersionCode);
      const releaseVersionCode = Number(result.release?.versionCode || 0);
      const hasInstallableRelease = Boolean(result.available && result.release && releaseVersionCode > currentVersionCode);
      setRelease(hasInstallableRelease ? result.release : null);
      if (!hasInstallableRelease || !result.release) {
        setStatus('current');
        if (force) setVisible(true);
        return;
      }

      const mandatory = result.release.mandatory || currentVersionCode < result.release.minimumVersionCode;
      const dismissed = await AsyncStorage.getItem(DISMISSED_RELEASE_KEY);
      setStatus('available');
      if (force || mandatory || dismissed !== String(result.release.versionCode)) setVisible(true);
    } catch (nextError) {
      setStatus('error');
      setError(errorMessage(nextError));
      if (force) setVisible(true);
    }
  }, [currentVersionCode]);

  useEffect(() => {
    const timeout = setTimeout(() => void checkForUpdate(false), 2500);
    return () => clearTimeout(timeout);
  }, [checkForUpdate]);

  const downloadAndInstall = useCallback(async () => {
    if (!release) return;
    if (release.versionCode <= currentVersionCode) {
      setStatus('current');
      return;
    }
    if (Platform.OS !== 'android') {
      await Linking.openURL(release.apkUrl);
      return;
    }

    setStatus('downloading');
    setError(null);
    setProgress(0);
    try {
      const localUri = `${FileSystem.cacheDirectory}synaura-${release.versionName}-${release.versionCode}.apk`;
      await FileSystem.deleteAsync(localUri, { idempotent: true });
      const download = FileSystem.createDownloadResumable(
        release.apkUrl,
        localUri,
        {},
        ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
          if (totalBytesExpectedToWrite > 0) {
            setProgress(Math.min(1, totalBytesWritten / totalBytesExpectedToWrite));
          }
        },
      );
      const result = await download.downloadAsync();
      if (!result?.uri) throw new Error('Le fichier APK telecharge est introuvable.');

      const info = await FileSystem.getInfoAsync(result.uri);
      if (!info.exists || (release.sizeBytes > 0 && info.size < release.sizeBytes * 0.95)) {
        throw new Error('Le telechargement semble incomplet. Reessaie dans un instant.');
      }

      setProgress(1);
      setStatus('ready');
      const contentUri = await FileSystem.getContentUriAsync(result.uri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1,
        type: 'application/vnd.android.package-archive',
      });
    } catch (nextError) {
      setStatus('error');
      setError(errorMessage(nextError));
    }
  }, [currentVersionCode, release]);

  const openInstallSettings = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    await IntentLauncher.startActivityAsync('android.settings.MANAGE_UNKNOWN_APP_SOURCES', {
      data: `package:${Application.applicationId}`,
    });
  }, []);

  const dismiss = useCallback(async () => {
    if (isMandatory) return;
    if (release) await AsyncStorage.setItem(DISMISSED_RELEASE_KEY, String(release.versionCode));
    setVisible(false);
  }, [isMandatory, release]);

  const value = useMemo<AppUpdateContextValue>(() => ({
    status,
    release,
    progress,
    error,
    currentVersionCode,
    currentVersionName,
    checkForUpdate,
    downloadAndInstall,
    openInstallSettings,
    dismiss,
  }), [
    status,
    release,
    progress,
    error,
    currentVersionCode,
    currentVersionName,
    checkForUpdate,
    downloadAndInstall,
    openInstallSettings,
    dismiss,
  ]);

  return (
    <AppUpdateContext.Provider value={value}>
      {children}
      <UpdateModal
        visible={visible}
        status={status}
        release={release}
        progress={progress}
        error={error}
        currentVersionName={currentVersionName}
        mandatory={isMandatory}
        onClose={() => void dismiss()}
        onRetry={() => void checkForUpdate(true)}
        onInstall={() => void downloadAndInstall()}
        onSettings={() => void openInstallSettings()}
      />
    </AppUpdateContext.Provider>
  );
}

function UpdateModal({
  visible,
  status,
  release,
  progress,
  error,
  currentVersionName,
  mandatory,
  onClose,
  onRetry,
  onInstall,
  onSettings,
}: {
  visible: boolean;
  status: UpdateStatus;
  release: MobileAppRelease | null;
  progress: number;
  error: string | null;
  currentVersionName: string;
  mandatory: boolean;
  onClose: () => void;
  onRetry: () => void;
  onInstall: () => void;
  onSettings: () => void;
}) {
  const insets = useSafeAreaInsets();
  const downloading = status === 'downloading';
  const isCurrent = status === 'current';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={mandatory ? undefined : onClose}>
      <View style={[styles.backdrop, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 18 }]}>
        <View style={styles.sheet}>
          <View style={styles.icon}>
            <Ionicons name={isCurrent ? 'checkmark' : 'cloud-download-outline'} size={28} color="#fffaf2" />
          </View>
          {!mandatory ? (
            <Pressable accessibilityLabel="Fermer" onPress={onClose} style={styles.close}>
              <Ionicons name="close" size={20} color="#171313" />
            </Pressable>
          ) : null}

          <Text style={styles.kicker}>{mandatory ? 'Mise a jour requise' : 'Synaura Android'}</Text>
          <Text style={styles.title}>
            {isCurrent ? 'Tu as deja la derniere version' : release?.title || 'Recherche de mise a jour'}
          </Text>
          <Text style={styles.subtitle}>
            {release
              ? `Version ${release.versionName} disponible. Tu utilises la version ${currentVersionName}.`
              : error || 'Verification de la derniere version disponible...'}
          </Text>

          {release?.releaseNotes?.length ? (
            <View style={styles.notes}>
              {release.releaseNotes.slice(0, 5).map((note) => (
                <View key={note} style={styles.note}>
                  <View style={styles.bullet} />
                  <Text style={styles.noteText}>{note}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {downloading ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
          ) : null}
          {downloading ? <Text style={styles.progressText}>{Math.round(progress * 100)} % telecharge</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {status === 'checking' ? <ActivityIndicator color="#171313" /> : null}
          {release && !isCurrent ? (
            <Pressable disabled={downloading} onPress={onInstall} style={[styles.primary, downloading && styles.disabled]}>
              {downloading ? <ActivityIndicator color="#fffaf2" /> : <Ionicons name="download-outline" size={18} color="#fffaf2" />}
              <Text style={styles.primaryText}>{status === 'ready' ? "Ouvrir l'installation" : 'Telecharger et installer'}</Text>
            </Pressable>
          ) : null}
          {status === 'error' ? (
            <Pressable onPress={onRetry} style={styles.primary}><Text style={styles.primaryText}>Reessayer</Text></Pressable>
          ) : null}
          {release && !isCurrent ? (
            <Pressable onPress={onSettings} style={styles.secondary}>
              <Ionicons name="settings-outline" size={16} color="#171313" />
              <Text style={styles.secondaryText}>Autoriser les installations</Text>
            </Pressable>
          ) : null}
          {isCurrent ? (
            <Pressable onPress={onClose} style={styles.primary}><Text style={styles.primaryText}>Parfait</Text></Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 12, backgroundColor: 'rgba(23,19,19,0.52)' },
  sheet: { borderRadius: 28, padding: 20, gap: 12, backgroundColor: '#fffaf2', borderWidth: 1, borderColor: 'rgba(23,19,19,0.09)' },
  icon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7c5cff' },
  close: { position: 'absolute', right: 14, top: 14, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.06)' },
  kicker: { marginTop: 4, color: '#7c5cff', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  title: { color: '#171313', fontSize: 24, lineHeight: 28, fontWeight: '900' },
  subtitle: { color: 'rgba(23,19,19,0.58)', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  notes: { gap: 8, borderRadius: 18, padding: 12, backgroundColor: 'rgba(23,19,19,0.045)' },
  note: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 6, backgroundColor: '#ff6f61' },
  noteText: { flex: 1, color: 'rgba(23,19,19,0.72)', fontSize: 11, lineHeight: 17, fontWeight: '700' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: 'rgba(23,19,19,0.08)' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: '#7c5cff' },
  progressText: { color: 'rgba(23,19,19,0.54)', fontSize: 10, fontWeight: '900', textAlign: 'center' },
  error: { borderRadius: 14, padding: 10, color: '#b91c1c', backgroundColor: 'rgba(239,68,68,0.1)', fontSize: 11, lineHeight: 16, fontWeight: '800' },
  primary: { minHeight: 48, borderRadius: 24, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171313' },
  primaryText: { color: '#fffaf2', fontSize: 12, fontWeight: '900' },
  secondary: { minHeight: 44, borderRadius: 22, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.07)' },
  secondaryText: { color: '#171313', fontSize: 11, fontWeight: '900' },
  disabled: { opacity: 0.55 },
});
