// lib/aiStudioPresets.ts
import type { AIStudioPreset } from './aiStudioTypes';

export const aiStudioPresets: AIStudioPreset[] = [
  {
    id: 'edm-banger',
    emoji: '⚡',
    label: 'EDM Banger',
    description: 'Drop puissant, lead agressif, kick qui tape.',
    defaults: {
      style: 'EDM, festival, punchy, sidechain, lead agressif',
      tags: ['edm', 'festival', bangerTag(), 'drop massif'],
      isInstrumental: false,
      weirdness: 35,
      styleInfluence: 80,
      audioWeight: 60,
    },
  },
  {
    id: 'lofi-chill',
    emoji: '🌙',
    label: 'Lo-fi Chill',
    description: 'Guitares détendues, bruits de pluie, ambiance cosy.',
    defaults: {
      style: 'Lo-fi, chill, cosy, pluie, vinyle, détendu',
      tags: ['lofi', 'chill', 'study', 'rain'],
      isInstrumental: true,
      weirdness: 20,
      styleInfluence: 65,
      audioWeight: 40,
    },
  },
  {
    id: 'synaura-signature',
    emoji: '✨',
    label: 'Synaura Signature',
    description: 'EDM émotionnel, atmosphères néon violettes, gros drops.',
    defaults: {
      title: 'Synaura Anthem',
      style: 'EDM émotionnel, néon, futuriste, sidechain, arpèges',
      tags: ['edm', 'emotional', 'anthem', 'synaura'],
      isInstrumental: false,
      weirdness: 45,
      styleInfluence: 90,
      audioWeight: 50,
    },
  },
  {
    id: 'cinematic',
    emoji: '🎬',
    label: 'Ciné / Trailer',
    description: 'Cordes, percussions épiques, montée progressive.',
    defaults: {
      style: 'Cinematique, bande-annonce, cordes, percussions épiques, montée',
      tags: ['epic', 'orchestral', 'trailer'],
      isInstrumental: true,
      weirdness: 30,
      styleInfluence: 85,
      audioWeight: 55,
    },
  },
  {
    id: 'weird-experimental',
    emoji: '🧪',
    label: 'Weird / Expérimental',
    description: 'Textures glitch, structures surprenantes, sound design fou.',
    defaults: {
      style: 'Expérimental, glitch, textures étranges, sound design créatif',
      tags: ['weird', 'glitch', 'experimental'],
      isInstrumental: true,
      weirdness: 80,
      styleInfluence: 60,
      audioWeight: 70,
    },
  },
];

function bangerTag() {
  return 'banger';
}

