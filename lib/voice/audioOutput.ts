export type VoiceOutputDevice = { deviceId: string; label: string };

// The browser default is not a promise of speakerphone routing.
export function voiceOutputDevices(devices: Pick<MediaDeviceInfo, 'kind' | 'deviceId' | 'label'>[]): VoiceOutputDevice[] {
  const outputs: VoiceOutputDevice[] = [{ deviceId: '', label: 'Sortie système' }];
  const seen = new Set(['', 'default']);
  for (const device of devices) {
    if (device.kind !== 'audiooutput' || seen.has(device.deviceId)) continue;
    seen.add(device.deviceId);
    outputs.push({ deviceId: device.deviceId, label: device.label || `Sortie audio ${outputs.length}` });
  }
  return outputs;
}

export function voiceOutputError(error: unknown) {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError') return 'Cette sortie n’est pas autorisée. Choisis un appareil autorisé ou la sortie système.';
  if (name === 'NotFoundError') return 'Cet appareil n’est plus disponible. Choisis une autre sortie.';
  return 'Impossible de changer de sortie. L’appel continue sur la sortie actuelle.';
}
