import type { MidiInstrument } from './tools.ts';
/** Standard MIDI format 1, 120 BPM: provider timings are in seconds. */
export function encodeStudioMidi(instruments: MidiInstrument[]): Uint8Array {
  const be = (n: number, bytes: number) => Array.from({ length: bytes }, (_, i) => (n >>> ((bytes - i - 1) * 8)) & 255);
  const vlq = (n: number) => { const bytes = [n & 127]; while ((n = Math.floor(n / 128))) bytes.unshift((n & 127) | 128); return bytes; };
  const chunk = (name: string, data: number[]) => [...Array.from(name).map(c => c.charCodeAt(0)), ...be(data.length, 4), ...data];
  const tracks: number[][] = [[0, 0xff, 0x51, 3, 7, 0xa1, 0x20, 0, 0xff, 0x2f, 0]];
  for (const [index, instrument] of Array.from(instruments.slice(0, 128).entries())) {
    const channel = index % 15 >= 9 ? index % 15 + 1 : index % 15;
    const events: { tick: number; on: boolean; pitch: number; velocity: number }[] = [];
    for (const note of instrument.notes) {
      if (!Number.isInteger(note.pitch) || note.pitch < 0 || note.pitch > 127 || !Number.isFinite(note.start) || !Number.isFinite(note.end) || note.start < 0 || note.end <= note.start || note.end > 3600 || !Number.isFinite(note.velocity)) continue;
      const start = Math.round(note.start * 960);
      events.push({ tick: start, on: true, pitch: note.pitch, velocity: Math.max(1, Math.min(127, Math.round(note.velocity * 127))) }, { tick: Math.max(start + 1, Math.round(note.end * 960)), on: false, pitch: note.pitch, velocity: 0 });
    }
    events.sort((a, b) => a.tick - b.tick || Number(a.on) - Number(b.on));
    const name = Array.from(new TextEncoder().encode(instrument.name.slice(0, 80)));
    const bytes = [0, 0xff, 3, ...vlq(name.length), ...name]; let previous = 0;
    for (const event of events) { bytes.push(...vlq(event.tick - previous), (event.on ? 0x90 : 0x80) + channel, event.pitch, event.velocity); previous = event.tick; }
    bytes.push(0, 0xff, 0x2f, 0); tracks.push(bytes);
  }
  const output = [...chunk('MThd', [0, 1, ...be(tracks.length, 2), 1, 0xe0])];
  for (const track of tracks) { const bytes = chunk('MTrk', track); for (const byte of bytes) output.push(byte); }
  return Uint8Array.from(output);
}
