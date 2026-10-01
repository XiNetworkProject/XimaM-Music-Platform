'use client';

import { useState, type CSSProperties } from 'react';
import { ArrowUpRight, Clock3, Sparkles, Zap } from 'lucide-react';
import {
  BOOST_FAMILIES,
  CAMPAIGN_CATALOG,
  campaignDefinition,
} from '@/lib/boosters/campaigns';
import {
  RARITIES,
  RARITY_LABEL,
  type Booster,
  type Rarity,
} from '@/lib/boosters/policy';
import type { InventoryItem } from '@/hooks/useBoosters';
import BoosterDialog from './BoosterDialog';
import { useLivingMotion } from '@/components/ambient/useLivingMotion';
import './booster-catalog.css';

export default function BoosterCatalog({
  catalog = [],
  inventory,
  onSelect,
}: {
  catalog?: Booster[];
  inventory: InventoryItem[];
  onSelect: (item: InventoryItem) => void;
}) {
  const [rarity, setRarity] = useState<Rarity>('epic');
  const motion = useLivingMotion();
  const [selected, setSelected] = useState<string | null>(null);
  const available = new Set(
    catalog.filter((item) => item.enabled !== false).map((item) => item.key)
  );
  const prepared = !CAMPAIGN_CATALOG.every((item) => available.has(item.key));
  const chosen = campaignDefinition(selected);
  const family = BOOST_FAMILIES.find((item) => item.id === chosen?.family);
  const owned = inventory.find(
    (item) =>
      item.status === 'owned' &&
      item.booster.enabled !== false &&
      item.booster.key === selected
  );
  return (
    <section
      className="bc-catalog boost-section"
      data-motion={motion.enabled ? 'on' : 'off'}
    >
      <header className="bc-heading">
        <div>
          <span className="boost-eyebrow">36 BOOSTERS · 9 FAMILLES</span>
          <h2>
            Choisis ton <em>impact.</em>
          </h2>
          <p>Faire découvrir. Relancer. Créer encore.</p>
        </div>
        <Sparkles size={30} aria-hidden="true" />
      </header>
      <nav className="bc-levels" aria-label="Puissance des boosters">
        {RARITIES.map((value, i) => (
          <button
            key={value}
            aria-pressed={rarity === value}
            onClick={() => setRarity(value)}
          >
            <span>{['I', 'II', 'III', 'IV'][i]}</span>
            {RARITY_LABEL[value]}
          </button>
        ))}
      </nav>
      {prepared && (
        <p className="bc-candidate" role="status">
          Nouveau catalogue en aperçu. Les variantes non déployées ne sont pas
          encore distribuées ; ta réserve actuelle reste utilisable.
        </p>
      )}
      <div className="bc-grid">
        {BOOST_FAMILIES.map((item) => {
          const booster = CAMPAIGN_CATALOG.find(
            (entry) => entry.family === item.id && entry.rarity === rarity
          )!;
          const count = inventory.filter(
            (entry) =>
              entry.status === 'owned' && entry.booster.key === booster.key
          ).length;
          return (
            <button
              key={item.id}
              className="bc-card"
              style={{ '--bc-color': item.color } as CSSProperties}
              onClick={() => setSelected(booster.key)}
              aria-label={`Découvrir ${item.name} ${RARITY_LABEL[rarity]}`}
            >
              <div className="bc-card-top">
                <span>
                  {item.target === 'credits'
                    ? 'STUDIO'
                    : item.target === 'artist'
                    ? 'CATALOGUE ARTISTE'
                    : 'MORCEAU'}
                </span>
                <ArrowUpRight size={17} />
              </div>
              <div className="bc-art" aria-hidden="true">
                <i />
                <i />
                <span>{item.symbol}</span>
                <b />
              </div>
              <div className="bc-card-title">
                <h3>{item.name}</h3>
                <span>{RARITY_LABEL[rarity]}</span>
              </div>
              <p>{item.description}</p>
              <div className="bc-card-bottom">
                <strong>
                  {booster.credits ? (
                    `+${booster.credits} crédits IA`
                  ) : (
                    <>
                      Intensité{' '}
                      {['I', 'II', 'III', 'IV'][RARITIES.indexOf(rarity)]}
                    </>
                  )}
                </strong>
                <span>
                  {booster.credits
                    ? 'À activer'
                    : `${booster.duration_hours} h`}
                </span>
              </div>
              {count > 0 && (
                <span className="bc-owned">{count} dans ta réserve</span>
              )}
            </button>
          );
        })}
      </div>
      <p className="bc-footnote">
        Les boosts de visibilité changent une priorité de recommandation, jamais
        les compteurs d’écoutes. Pas de cumul multiplicatif ; les goûts,
        exclusions et la diversité restent protégés.
      </p>
      {chosen && family && (
        <BoosterDialog
          title={chosen.name}
          className="bc-dialog"
          onClose={() => setSelected(null)}
        >
          <div
            className="boost-dialog-scroll"
            style={{ '--bc-color': family.color } as CSSProperties}
          >
            <div className="bc-detail-icon" aria-hidden="true">
              {family.symbol}
            </div>
            <p className="bc-detail-description">{family.description}</p>
            <div className="bc-detail-spec">
              <span>
                <Zap size={17} />
                {chosen.credits
                  ? `+${chosen.credits} crédits IA`
                  : `Intensité ${RARITIES.indexOf(chosen.rarity) + 1}/4`}
              </span>
              <span>
                <Clock3 size={17} />
                {chosen.credits
                  ? 'Crédités immédiatement'
                  : `${chosen.duration_hours} heures`}
              </span>
            </div>
            <h3>Quand l’utiliser ?</h3>
            <p>{family.condition}</p>
            <h3>Ce qui se passe vraiment</h3>
            <p>
              {chosen.credits
                ? 'Le solde du compte reçoit ces crédits une seule fois, à la confirmation. Ils suivent les règles habituelles du Studio ; aucun abonnement n’est modifié.'
                : 'Le morceau gagne un bonus de score dans les recommandations éligibles. Le bonus atteint au maximum 24 points au niveau IV, avant les pénalités de répétition. Aucun nombre d’écoutes ni place fixe n’est garanti.'}
            </p>
            {!chosen.credits && (
              <p>
                Plusieurs familles peuvent rester actives. Pour chaque auditeur,
                seule la plus forte des familles adaptées s’applique : pas de
                multiplication entre boosters.
              </p>
            )}
            {!available.has(chosen.key) && (
              <p className="bc-candidate">
                Variante locale en préparation, pas encore récupérable.
              </p>
            )}
          </div>
          <footer className="boost-dialog-footer">
            <button
              className="boost-secondary"
              onClick={() => setSelected(null)}
            >
              Fermer
            </button>
            {owned && (
              <button
                className="boost-primary"
                onClick={() => {
                  setSelected(null);
                  onSelect(owned);
                }}
              >
                Utiliser mon booster <ArrowUpRight size={16} />
              </button>
            )}
          </footer>
        </BoosterDialog>
      )}
    </section>
  );
}
