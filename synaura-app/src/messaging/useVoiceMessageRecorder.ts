import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NativeModules, PanResponder, PermissionsAndroid, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';

type NativeRecorderResult = { uri: string; durationMs: number };
type NativeMessagingModule = {
  startVoiceRecording: () => Promise<string>;
  stopVoiceRecording: () => Promise<NativeRecorderResult>;
  cancelVoiceRecording: () => Promise<void>;
  getVoiceAmplitude: () => Promise<number>;
};

const nativeMessaging = NativeModules.SynauraMessaging as NativeMessagingModule | undefined;
const MAX_VOICE_DURATION_MS = 5 * 60_000;
const MAX_STORED_WAVEFORM_SAMPLES = 160;

function compactWaveformSamples(samples: number[], target = MAX_STORED_WAVEFORM_SAMPLES) {
  if (samples.length <= target) return samples.slice();
  const result: number[] = [];
  const bucketSize = samples.length / target;
  for (let index = 0; index < target; index += 1) {
    const start = Math.floor(index * bucketSize);
    const end = Math.max(start + 1, Math.floor((index + 1) * bucketSize));
    const bucket = samples.slice(start, end);
    const peak = Math.max(...bucket);
    const average = bucket.reduce((sum, value) => sum + value, 0) / bucket.length;
    result.push(Math.max(0, Math.min(1, peak * 0.7 + average * 0.3)));
  }
  return result;
}

export type VoiceDraft = {
  uri: string;
  durationMs: number;
  waveform: number[];
};

export function useVoiceMessageRecorder(options: {
  disabled?: boolean;
  onError: (message: string) => void;
  onBeforeRecord?: () => Promise<void> | void;
}) {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'preview'>('idle');
  const [durationMs, setDurationMs] = useState(0);
  const [draft, setDraft] = useState<VoiceDraft | null>(null);
  const [waveform, setWaveform] = useState<number[]>([]);
  const waveformRef = useRef<number[]>([]);
  const fullWaveformRef = useRef<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [cancelArmed, setCancelArmed] = useState(false);
  const phaseRef = useRef(phase);
  const lockedRef = useRef(false);
  const cancelArmedRef = useRef(false);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startPromiseRef = useRef<Promise<boolean> | null>(null);
  const stopRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const removeDraftFile = useCallback(async (value?: VoiceDraft | null) => {
    const target = value || draft;
    if (target?.uri.startsWith('file://')) await FileSystem.deleteAsync(target.uri, { idempotent: true }).catch(() => {});
  }, [draft]);

  const reset = useCallback(async () => {
    stopTimer();
    if (phaseRef.current === 'recording') await nativeMessaging?.cancelVoiceRecording().catch(() => {});
    await removeDraftFile();
    setDraft(null);
    setWaveform([]);
    waveformRef.current = [];
    fullWaveformRef.current = [];
    setDurationMs(0);
    setLocked(false);
    setCancelArmed(false);
    lockedRef.current = false;
    cancelArmedRef.current = false;
    phaseRef.current = 'idle';
    setPhase('idle');
  }, [removeDraftFile, stopTimer]);

  const begin = useCallback(async () => {
    if (options.disabled || phaseRef.current !== 'idle') return false;
    if (Platform.OS !== 'android' || !nativeMessaging) {
      options.onError('L’enregistrement intégré est indisponible sur cet appareil.');
      return false;
    }
    const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
      title: 'Microphone Synaura',
      message: 'Synaura utilise le microphone uniquement pendant ton message vocal.',
      buttonPositive: 'Autoriser',
      buttonNegative: 'Pas maintenant',
    });
    if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
      options.onError('Autorise le microphone pour enregistrer un vocal.');
      return false;
    }
    try {
      await options.onBeforeRecord?.();
      await nativeMessaging.startVoiceRecording();
      startedAtRef.current = Date.now();
      lockedRef.current = false;
      cancelArmedRef.current = false;
      setLocked(false);
      setCancelArmed(false);
      setDurationMs(0);
      setWaveform([]);
      waveformRef.current = [];
      fullWaveformRef.current = [];
      phaseRef.current = 'recording';
      setPhase('recording');
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startedAtRef.current;
        setDurationMs(elapsed);
        if (elapsed >= MAX_VOICE_DURATION_MS) {
          void stopRef.current();
          return;
        }
        void nativeMessaging.getVoiceAmplitude().then((sample) => {
          const normalized = Math.max(0, Math.min(1, Number(sample || 0)));
          fullWaveformRef.current.push(normalized);
          setWaveform((current) => {
            const next = [...current, normalized].slice(-120);
            waveformRef.current = next;
            return next;
          });
        }).catch(() => {});
      }, 100);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      return true;
    } catch (error) {
      options.onError(error instanceof Error ? error.message : 'Impossible de démarrer le microphone.');
      return false;
    }
  }, [options]);

  const cancel = useCallback(async () => {
    stopTimer();
    await nativeMessaging?.cancelVoiceRecording().catch(() => {});
    setDurationMs(0);
    setWaveform([]);
    waveformRef.current = [];
    fullWaveformRef.current = [];
    setLocked(false);
    setCancelArmed(false);
    lockedRef.current = false;
    cancelArmedRef.current = false;
    phaseRef.current = 'idle';
    setPhase('idle');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }, [stopTimer]);

  const stop = useCallback(async () => {
    if (startPromiseRef.current) await startPromiseRef.current;
    if (phaseRef.current !== 'recording' || !nativeMessaging) return;
    stopTimer();
    try {
      const result = await nativeMessaging.stopVoiceRecording();
      const next = {
        uri: result.uri,
        durationMs: Math.max(Number(result.durationMs || 0), Date.now() - startedAtRef.current),
        waveform: compactWaveformSamples(fullWaveformRef.current),
      };
      if (next.durationMs < 350) {
        await removeDraftFile(next);
        options.onError('Maintiens le micro un peu plus longtemps.');
        phaseRef.current = 'idle';
        setPhase('idle');
        setDurationMs(0);
        setWaveform([]);
        waveformRef.current = [];
        fullWaveformRef.current = [];
        return;
      }
      setDraft(next);
      setDurationMs(next.durationMs);
      setLocked(false);
      setCancelArmed(false);
      phaseRef.current = 'preview';
      setPhase('preview');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      phaseRef.current = 'idle';
      setPhase('idle');
      setDurationMs(0);
      setWaveform([]);
      waveformRef.current = [];
      fullWaveformRef.current = [];
      options.onError(error instanceof Error ? error.message : 'Le vocal n’a pas pu être préparé.');
    }
  }, [options, removeDraftFile, stopTimer]);

  stopRef.current = stop;

  const discardDraft = useCallback(async () => {
    await removeDraftFile();
    setDraft(null);
    setWaveform([]);
    waveformRef.current = [];
    fullWaveformRef.current = [];
    setDurationMs(0);
    phaseRef.current = 'idle';
    setPhase('idle');
  }, [removeDraftFile]);

  const consumeDraft = useCallback(() => {
    setDraft(null);
    setWaveform([]);
    waveformRef.current = [];
    fullWaveformRef.current = [];
    setDurationMs(0);
    phaseRef.current = 'idle';
    setPhase('idle');
  }, []);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !options.disabled && phaseRef.current === 'idle',
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      startPromiseRef.current = begin();
    },
    onPanResponderMove: (_event, gesture) => {
      if (phaseRef.current !== 'recording') return;
      const shouldCancel = gesture.dx < -74 && !lockedRef.current;
      if (shouldCancel !== cancelArmedRef.current) {
        cancelArmedRef.current = shouldCancel;
        setCancelArmed(shouldCancel);
        void Haptics.selectionAsync().catch(() => {});
      }
      if (gesture.dy < -72 && !lockedRef.current) {
        lockedRef.current = true;
        cancelArmedRef.current = false;
        setLocked(true);
        setCancelArmed(false);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
    },
    onPanResponderRelease: async () => {
      if (startPromiseRef.current) await startPromiseRef.current;
      if (cancelArmedRef.current) await cancel();
      else if (!lockedRef.current) await stop();
    },
    onPanResponderTerminate: async () => {
      if (startPromiseRef.current) await startPromiseRef.current;
      if (!lockedRef.current) await cancel();
    },
    onPanResponderTerminationRequest: () => false,
  }), [begin, cancel, options.disabled, stop]);

  useEffect(() => () => {
    stopTimer();
    if (phaseRef.current === 'recording') void nativeMessaging?.cancelVoiceRecording().catch(() => {});
  }, [stopTimer]);

  return {
    phase,
    durationMs,
    waveform,
    draft,
    locked,
    cancelArmed,
    panHandlers: panResponder.panHandlers,
    begin,
    stop,
    cancel,
    discardDraft,
    consumeDraft,
    reset,
  };
}
