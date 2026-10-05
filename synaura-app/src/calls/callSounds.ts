import { NativeModules } from 'react-native';
import type { CallCue } from './callModel';

type NativeCallAudio = { playCue: (cue: CallCue) => Promise<void>; stopCue: () => void; startCallSession: () => Promise<void>; stopCallSession: () => void };
const audio = NativeModules.SynauraCallAudio as NativeCallAudio | undefined;
export const callSoundsAvailable = Boolean(audio);
export const stopCallSound = () => audio?.stopCue();
export const startNativeCallSession = () => audio ? audio.startCallSession() : Promise.reject(new Error('Les appels nécessitent la nouvelle version Android.'));
export const stopNativeCallSession = () => audio?.stopCallSession();
export const playCallSound = (cue: CallCue) => { void audio?.playCue(cue).catch(() => {}); };
