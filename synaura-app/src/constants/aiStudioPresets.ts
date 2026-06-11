export type MobileAIStudioPreset = {
  id: string;
  label: string;
  description: string;
  icon: string;
  tint: string;
  defaults: {
    title: string;
    description: string;
    style: string;
    instrumental: boolean;
    weirdness: number;
    styleInfluence: number;
    audioWeight: number;
  };
};

export const aiStudioPresets: MobileAIStudioPreset[] = [
  { id: 'viral-hook', label: 'Viral TikTok Hook', description: 'Hook immédiat et refrain mémorisable.', icon: 'phone-portrait-outline', tint: '#FF6F61', defaults: { title: 'Hook Viral', description: 'Une chanson courte et ultra accrocheuse, avec un hook chanté dès les premières secondes et un refrain explosif.', style: 'modern viral pop, catchy TikTok hook, punchy drums, glossy synth bass, instant chorus, radio-ready mix', instrumental: false, weirdness: 32, styleInfluence: 86, audioWeight: 48 } },
  { id: 'edm-neon', label: 'EDM Néon Festival', description: 'Build massif et drop euphorique.', icon: 'flash-outline', tint: '#7C5CFF', defaults: { title: 'Néon Festival', description: 'Un hymne EDM festival premium avec montée large, voix euphorique et drop principal massif.', style: 'festival EDM anthem, neon mainstage, huge supersaw chords, powerful drop, clean club master', instrumental: false, weirdness: 38, styleInfluence: 90, audioWeight: 56 } },
  { id: 'rap-absurde', label: 'Rap drôle absurde', description: 'Punchlines absurdes et refrain viral.', icon: 'happy-outline', tint: '#F59E0B', defaults: { title: 'Punchline Cosmique', description: 'Un rap français drôle et absurde avec punchlines mémorables, adlibs exagérés et refrain simple.', style: 'funny absurd French rap, bouncy trap drums, playful 808, viral chorus, witty punchlines', instrumental: false, weirdness: 68, styleInfluence: 76, audioWeight: 44 } },
  { id: 'club-melancolique', label: 'Club mélancolique', description: 'Danse nocturne et émotion triste.', icon: 'moon-outline', tint: '#38BDF8', defaults: { title: 'Minuit sur la piste', description: 'Un titre club mélancolique, dansant mais intime, avec basse ronde et pads nocturnes.', style: 'melancholic club pop, deep house groove, warm bassline, intimate vocal, emotional minor chords', instrumental: false, weirdness: 34, styleInfluence: 84, audioWeight: 50 } },
  { id: 'trailer-epique', label: 'Trailer épique', description: 'Montée cinématique et final héroïque.', icon: 'film-outline', tint: '#EF4444', defaults: { title: 'Dernier Signal', description: 'Une bande-annonce épique avec cordes dramatiques, cuivres héroïques et impacts cinématiques.', style: 'epic cinematic trailer, heroic brass, dramatic strings, huge impacts, cinematic choir', instrumental: true, weirdness: 30, styleInfluence: 92, audioWeight: 58 } },
  { id: 'disney-musical', label: 'Disney Musical', description: 'Comédie musicale magique.', icon: 'sparkles-outline', tint: '#EC4899', defaults: { title: 'Je peux briller', description: 'Une chanson familiale et magique avec couplet narratif, refrain chantable et montée émotionnelle.', style: 'family animated musical song, magical orchestration, expressive lead vocal, theatrical chorus', instrumental: false, weirdness: 24, styleInfluence: 88, audioWeight: 42 } },
  { id: 'metal-chaos', label: 'Metal orchestral chaos', description: 'Riffs lourds et énergie boss final.', icon: 'flame-outline', tint: '#D92D20', defaults: { title: 'Chaos Engine', description: 'Un morceau metal orchestral chaotique avec guitares massives, choeurs sombres et final explosif.', style: 'orchestral metal chaos, heavy distorted guitars, double kick drums, dark choir, boss battle energy', instrumental: true, weirdness: 62, styleInfluence: 86, audioWeight: 66 } },
  { id: 'anime-opening', label: 'Anime Opening', description: 'J-rock brillant et refrain héroïque.', icon: 'rocket-outline', tint: '#14B8A6', defaults: { title: 'Run to the Sky', description: 'Un opening anime dynamique avec batterie rapide, guitares brillantes et refrain explosif.', style: 'anime opening, energetic J-rock, bright electric guitars, heroic vocal, explosive chorus', instrumental: false, weirdness: 42, styleInfluence: 88, audioWeight: 52 } },
  { id: 'ai-pop', label: 'AI Pop Premium', description: 'Pop futuriste et production radio.', icon: 'diamond-outline', tint: '#00C2CB', defaults: { title: 'Synthetic Heart', description: 'Une pop premium futuriste, émotionnelle, glossy et prête pour la radio.', style: 'premium futuristic pop, glossy lead vocal, radio-ready chorus, elegant digital textures', instrumental: false, weirdness: 36, styleInfluence: 90, audioWeight: 46 } },
  { id: 'synaura-signature', label: 'Synaura Signature', description: 'Émotion, néon et drop élégant.', icon: 'radio-outline', tint: '#7C5CFF', defaults: { title: 'Synaura Signal', description: 'Un titre signature Synaura avec émotion immédiate, atmosphère néon et refrain large.', style: 'Synaura signature sound, emotional neon electronic pop, shimmering arpeggios, elegant drop', instrumental: false, weirdness: 46, styleInfluence: 92, audioWeight: 50 } },
];
