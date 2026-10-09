import CelestialLandmark from '@/components/celestial/CelestialLandmark';

/** Shared illustration follows the celestial entry; no audio, data or timers. */
export default function ChambreResonance({ className = '' }: { className?: string }) {
  return <div className={`chambre-resonance ${className}`} aria-hidden="true">
    <CelestialLandmark />
  </div>;
}
