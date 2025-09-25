// components/TracksList.tsx
import { Track } from '@/lib/suno-normalize';

export function TracksList({ tracks }: { tracks: Array<{id:string; title?:string; audio?:string; stream?:string; image?:string;}> }) {
  return (
    <div className="grid gap-3">
      {tracks.map(t => (
        <div key={t.id} className="p-3 rounded-2xl panel-suno border border-[var(--border)] bg-[var(--surface)]/70">
          <div className="font-semibold text-[var(--text)] title-suno">{t.title ?? "Untitled"}</div>
          <audio controls src={t.audio ?? t.stream} className="mt-2 w-full" />
          {t.image && <img src={t.image.replace('/upload/','/upload/f_auto,q_auto/')} alt="cover" className="mt-2 w-28 h-28 object-cover rounded-xl border border-[var(--border)]" loading="lazy" decoding="async" />}
        </div>
      ))}
    </div>
  );
}
