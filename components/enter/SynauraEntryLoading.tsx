import FennecSprite from '@/components/celestial/FennecSprite';
import '@/components/celestial/celestial.css';

export default function SynauraEntryLoading({ label = 'Synaura se prépare…' }: { label?: string }) {
  return <main className="celestial-loading" aria-busy="true" aria-live="polite"><div><FennecSprite pose="look"/><span className="celestial-loading-stars" aria-hidden="true">· ✧ ·</span><p>{label}</p></div></main>;
}
