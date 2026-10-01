'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, RotateCcw, Zap } from 'lucide-react';
import BoosterOpening, {
  type OpeningReward,
} from '@/components/boosters/BoosterOpening';
import { RARITIES, RARITY_LABEL, type Rarity } from '@/lib/boosters/policy';
import '@/app/boosters/boosters.css';
import './preview.css';

const sample = (rarity: Rarity, index = 0): OpeningReward => ({
  inventory_id: `preview-${rarity}-${index}`,
  booster: {
    id: `preview-${index}`,
    key: 'preview',
    name: {
      common: 'Premier élan',
      rare: 'Onde de choc',
      epic: 'Résonance',
      legendary: 'Supernova',
    }[rarity],
    type: 'track',
    rarity,
    multiplier: 1.15,
    duration_hours: 6,
    description: 'Exemple visuel sans récompense',
    enabled: false,
  },
});

export default function OpeningPreview() {
  const [rarity, setRarity] = useState<Rarity>('epic');
  const [mode, setMode] = useState('single');
  const [run, setRun] = useState(0);
  const [open, setOpen] = useState(false);
  const [rewards, setRewards] = useState<OpeningReward[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(
      () => {
        if (mode === 'error') {
          setError(true);
          setOpen(false);
        } else
          setRewards(
            mode === 'pack'
              ? [...RARITIES, 'rare' as const].map(sample)
              : [sample(rarity)]
          );
      },
      mode === 'slow' ? 5000 : 180
    );
    return () => clearTimeout(timer);
  }, [run, open, mode, rarity]);
  const replay = () => {
    setRewards(null);
    setError(false);
    setRun((n) => n + 1);
    setOpen(true);
  };
  return (
    <main className="boost-page bo-preview">
      <span className="boost-eyebrow">ATELIER VISUEL · LOCAL UNIQUEMENT</span>
      <h1>
        Le moment de
        <br />
        <em>la révélation.</em>
      </h1>
      <p>
        La vraie animation d’ouverture, rejouable. Aucun boost récupéré, aucune
        donnée modifiée.
      </p>
      <div className="bo-preview-rarities" aria-label="Rareté de démonstration">
        {RARITIES.map((value) => (
          <button
            key={value}
            aria-pressed={rarity === value}
            onClick={() => setRarity(value)}
          >
            {RARITY_LABEL[value]}
          </button>
        ))}
      </div>
      <label>
        Scénario{' '}
        <select value={mode} onChange={(event) => setMode(event.target.value)}>
          <option value="single">Un booster</option>
          <option value="pack">Pack de 5</option>
          <option value="slow">Réponse lente · 5 secondes</option>
          <option value="error">Erreur de récupération</option>
        </select>
      </label>
      <button className="boost-primary" onClick={replay}>
        <Zap size={18} />
        Ouvrir le booster
        <ArrowRight size={18} />
      </button>
      {error && (
        <p role="alert">
          Erreur simulée : aucune récompense révélée. Tu peux réessayer.
        </p>
      )}
      <Link href="/boosters" className="boost-text-button">
        <RotateCcw size={15} />
        Retour à mes boosters
      </Link>
      {open && (
        <BoosterOpening
          key={run}
          rewards={rewards}
          onClose={() => setOpen(false)}
          onInventory={replay}
          onSelect={() => {}}
          preview
        />
      )}
    </main>
  );
}
