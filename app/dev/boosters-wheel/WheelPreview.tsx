'use client';

import { useState } from 'react';
import Link from 'next/link';
import DailyRewardWheel from '@/components/boosters/DailyRewardWheel';
import RewardWheel from '@/components/boosters/RewardWheel';
import { WHEEL_SEGMENTS } from '@/components/boosters/wheelModel';
import '@/app/boosters/boosters.css';

export default function WheelPreview() {
  const [index, setIndex] = useState(4);
  const [mode, setMode] = useState('normal');
  const [open, setOpen] = useState(false);
  return (
    <main
      className="boost-page"
      style={{ paddingTop: 100, paddingBottom: 100 }}
    >
      <span className="boost-eyebrow">ATELIER VISUEL · LOCAL UNIQUEMENT</span>
      <h1 style={{ fontSize: 40, margin: '20px 0' }}>La roue Synaura.</h1>
      <p>Aperçu interactif. Aucun tour consommé, aucune récompense créée.</p>
      <div style={{ width: 280, margin: '30px 0' }}>
        <RewardWheel />
      </div>
      <div
        style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}
      >
        <label>
          Résultat{' '}
          <select
            style={{ background: '#201a32', padding: 10, borderRadius: 10 }}
            value={index}
            onChange={(e) => setIndex(Number(e.target.value))}
          >
            {WHEEL_SEGMENTS.map((segment, i) => (
              <option key={segment.key} value={i}>
                {segment.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Scénario{' '}
          <select
            style={{ background: '#201a32', padding: 10, borderRadius: 10 }}
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="normal">Normal</option>
            <option value="slow">Réponse lente · 5 s</option>
            <option value="error">Erreur serveur</option>
            <option value="cooldown">Tour déjà joué</option>
          </select>
        </label>
      </div>
      <button className="boost-primary" onClick={() => setOpen(true)}>
        Voir la roue
      </button>
      <Link
        className="boost-text-button"
        style={{ marginTop: 20 }}
        href="/boosters"
      >
        Retour aux boosters
      </Link>
      {open && (
        <DailyRewardWheel
          preview
          canSpin={mode !== 'cooldown'}
          availableIn="23 h 59"
          onClose={() => setOpen(false)}
          onInventory={() => setOpen(false)}
          onSpin={async () => {
            await new Promise((resolve) =>
              setTimeout(resolve, mode === 'slow' ? 5000 : 180)
            );
            if (mode === 'error')
              return {
                ok: false,
                error: 'Erreur simulée. Aucun tour consommé.',
              };
            const segment = WHEEL_SEGMENTS[index];
            return {
              ok: true,
              result: {
                index,
                resultKey: segment.key,
                reward: { kind: segment.kind, label: segment.label },
              },
            };
          }}
        />
      )}
    </main>
  );
}
