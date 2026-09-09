export const DISCOVER_DEMO = {
  track: {
    title: 'Une onde devient un moment',
    artist: 'créateur Synaura',
    duration: '2:41',
    reactions: [
      { at: '0:18', label: 'ça monte' },
      { at: '0:47', label: 'ce passage ✦' },
      { at: '1:32', label: 'à remettre' },
    ],
  },
  creators: [
    { initials: 'KM', name: 'Keurlilamelo', role: 'écrit, publie, partage' },
    { initials: 'XO', name: 'XimaMOff', role: 'crée et transforme' },
    { initials: 'SY', name: 'Ta scène', role: 'réagit au même instant' },
  ],
  worlds: ['Rap & écriture', 'Nuit & nostalgie', 'Club & énergie'],
} as const;
