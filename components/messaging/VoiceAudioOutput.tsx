'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import type { Room } from 'livekit-client';
import { voiceOutputDevices, voiceOutputError, type VoiceOutputDevice } from '@/lib/voice/audioOutput';

type OutputPicker = MediaDevices & { selectAudioOutput?: () => Promise<MediaDeviceInfo> };

export default function VoiceAudioOutput({ room, ready }: { room: Room | null; ready: boolean }) {
  const [open, setOpen] = useState(false);
  const [supported, setSupported] = useState(false);
  const [devices, setDevices] = useState<VoiceOutputDevice[]>(voiceOutputDevices([]));
  const [selected, setSelected] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [canPick, setCanPick] = useState(false);
  const generation = useRef(0);
  const changing = useRef(false);

  useEffect(() => {
    const version = ++generation.current;
    const media = navigator.mediaDevices as OutputPicker | undefined;
    const available = typeof HTMLMediaElement.prototype.setSinkId === 'function';
    setSupported(available); setCanPick(typeof media?.selectAudioOutput === 'function');
    setOpen(false); setNotice(''); setPending(false); changing.current = false;
    const refresh = async () => {
      if (!ready || !room || !available || !media) return;
      try {
        const next = voiceOutputDevices(await media.enumerateDevices());
        if (generation.current !== version) return;
        setDevices(next);
        const id = room.getActiveDevice('audiooutput') || '';
        setSelected(id === 'default' ? '' : id);
      } catch { if (generation.current === version) setNotice('La liste des sorties est indisponible. L’appel continue.'); }
    };
    void refresh(); media?.addEventListener('devicechange', refresh);
    return () => { generation.current += 1; media?.removeEventListener('devicechange', refresh); };
  }, [room, ready]);

  const choose = async (deviceId: string | null) => {
    if (!room || !ready || !supported || changing.current) return;
    changing.current = true; setPending(true); setNotice('');
    const version = generation.current;
    try {
      let output: MediaDeviceInfo | undefined;
      if (deviceId === null) output = await (navigator.mediaDevices as OutputPicker).selectAudioOutput?.();
      if (generation.current !== version || (deviceId === null && !output)) return;
      const id = output?.deviceId || deviceId || '';
      if (!await room.switchActiveDevice('audiooutput', id)) throw new Error('Output change failed');
      if (generation.current !== version) return;
      setSelected(id === 'default' ? '' : id);
      if (output) setDevices(current => current.some(item => item.deviceId === id) ? current : [...current, { deviceId: id, label: output.label || 'Sortie sélectionnée' }]);
      setNotice('Sortie audio changée.');
    } catch (error) {
      if (generation.current === version) setNotice(voiceOutputError(error));
    } finally {
      if (generation.current === version) { changing.current = false; setPending(false); }
    }
  };

  return <div className="voice-output">
    <button type="button" className="voice-output-trigger" disabled={!ready} aria-expanded={open} aria-controls="voice-output-settings" onClick={() => setOpen(value => !value)}><Volume2 size={18} />Haut-parleur / sortie audio</button>
    {open && <div id="voice-output-settings" className="voice-output-settings">
      {supported ? <>
        <label htmlFor="voice-output-device">Écouter l’appel sur</label>
        <select id="voice-output-device" value={selected} disabled={pending} onChange={event => void choose(event.target.value)}>
          {!devices.some(device => device.deviceId === selected) && <option value={selected}>Sortie actuelle</option>}
          {devices.map(device => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}
        </select>
        {canPick && <button type="button" disabled={pending} className="voice-enable" onClick={() => void choose(null)}>Choisir un autre appareil</button>}
        <p>Choisis tes haut-parleurs ou ton casque dans les sorties proposées par le navigateur.</p>
      </> : <p>Ce navigateur laisse le téléphone gérer la sortie audio. Le site ne peut pas forcer le haut-parleur. Utilise les options audio du téléphone si elles sont proposées, ou un casque.</p>}
      {notice && <p role="status">{notice}</p>}
    </div>}
  </div>;
}
