export interface GenreCategory {
  name: string;
  emoji: string;
  color: string;
  genres: string[];
}

export const GENRE_CATEGORIES: GenreCategory[] = [
  {
    name: 'Pop & Mainstream',
    emoji: '🎤',
    color: 'from-pink-500 to-purple-500',
    genres: ['Pop', 'Indie Pop', 'Synthpop', 'Electropop', 'K-Pop', 'J-Pop', 'City Pop', 'Dance Pop', 'Teen Pop'],
  },
  {
    name: 'Hip-Hop & Rap',
    emoji: '🎙️',
    color: 'from-amber-500 to-orange-500',
    genres: ['Hip-Hop', 'Rap', 'Rap FR', 'Rap US', 'Trap', 'Drill', 'Boom Bap', 'Cloud Rap', 'Phonk', 'Grime', 'Old School', 'Freestyle'],
  },
  {
    name: 'R&B & Soul',
    emoji: '💜',
    color: 'from-violet-500 to-fuchsia-500',
    genres: ['R&B', 'Soul', 'Neo-Soul', 'Funk', 'Motown', 'Contemporary R&B', 'PBR&B'],
  },
  {
    name: 'Electronic',
    emoji: '⚡',
    color: 'from-cyan-500 to-blue-500',
    genres: ['EDM', 'House', 'Deep House', 'Tech House', 'Techno', 'Melodic Techno', 'Hard Techno', 'Trance', 'Progressive House', 'Dubstep', 'Drum & Bass', 'Hardstyle', 'Garage', 'UK Garage', 'UK Bass', 'Future Bass', 'Electro', 'Bass House', 'Future House', 'Breakbeat', 'Jungle', 'Jersey Club'],
  },
  {
    name: 'Rock',
    emoji: '🎸',
    color: 'from-red-500 to-orange-500',
    genres: ['Rock', 'Indie', 'Alternative', 'Metal', 'Punk', 'Grunge', 'Hard Rock', 'Post-Rock', 'Prog Rock', 'Shoegaze', 'Emo', 'Hardcore', 'Metalcore', 'Nu Metal', 'Post-Punk', 'New Wave', 'Death Metal', 'Black Metal'],
  },
  {
    name: 'Chill & Ambient',
    emoji: '🌙',
    color: 'from-teal-500 to-emerald-500',
    genres: ['Lo-Fi', 'Chill', 'Ambient', 'Downtempo', 'Trip-Hop', 'Chillstep', 'New Age', 'Chillwave', 'Dream Pop'],
  },
  {
    name: 'Dance & Club',
    emoji: '🪩',
    color: 'from-fuchsia-500 to-rose-500',
    genres: ['Dance', 'Disco', 'Afro House', 'Amapiano', 'Dancehall', 'Reggaeton', 'Baile Funk', 'Electro Swing', 'Synthwave', 'Vaporwave'],
  },
  {
    name: 'Jazz & Blues',
    emoji: '🎷',
    color: 'from-indigo-500 to-blue-500',
    genres: ['Jazz', 'Blues', 'Smooth Jazz', 'Bebop', 'Jazz Fusion', 'Swing', 'Bossa Nova'],
  },
  {
    name: 'Africain & Caraibe',
    emoji: '🌍',
    color: 'from-yellow-500 to-amber-500',
    genres: ['Afrobeat', 'Afropop', 'Kompa', 'Zouk', 'Azonto', 'Coupe-Decale', 'Ndombolo', 'Highlife', 'Mbalax', 'Soca'],
  },
  {
    name: 'Latin',
    emoji: '💃',
    color: 'from-orange-500 to-red-500',
    genres: ['Latin', 'Salsa', 'Bachata', 'Cumbia', 'Tango', 'Merengue', 'Flamenco', 'Latin Pop', 'Latin Trap'],
  },
  {
    name: 'Classique & Acoustique',
    emoji: '🎻',
    color: 'from-slate-400 to-zinc-500',
    genres: ['Classical', 'Acoustic', 'Instrumental', 'Opera', 'Orchestral', 'Piano', 'Guitar', 'Chamber Music'],
  },
  {
    name: 'Autres',
    emoji: '🎵',
    color: 'from-gray-500 to-slate-500',
    genres: ['Country', 'Folk', 'Gospel', 'Reggae', 'Ska', 'World', 'Experimental', 'Soundtrack', 'Game Music', 'Anime', 'A Cappella', 'Spoken Word', 'Noise', 'Avant-Garde'],
  },
];

export const MUSIC_GENRES: string[] = GENRE_CATEGORIES.flatMap((c) => c.genres);

export type MusicGenre = string;

export function getGenreCategory(genre: string): string | null {
  for (const cat of GENRE_CATEGORIES) {
    if (cat.genres.includes(genre)) return cat.name;
  }
  return null;
}

export function getGenreColor(genre: string): string {
  for (const cat of GENRE_CATEGORIES) {
    if (cat.genres.includes(genre)) return cat.color;
  }
  return 'from-gray-500 to-slate-500';
}

export const MOODS = [
  { key: 'energetic', label: 'Energique', emoji: '⚡' },
  { key: 'melancholic', label: 'Melancolique', emoji: '🌧️' },
  { key: 'chill', label: 'Chill', emoji: '😌' },
  { key: 'dark', label: 'Sombre', emoji: '🌑' },
  { key: 'happy', label: 'Joyeux', emoji: '😊' },
  { key: 'romantic', label: 'Romantique', emoji: '❤️' },
  { key: 'aggressive', label: 'Agressif', emoji: '🔥' },
  { key: 'dreamy', label: 'Planant', emoji: '☁️' },
  { key: 'party', label: 'Festif', emoji: '🎉' },
  { key: 'nostalgic', label: 'Nostalgique', emoji: '🕰️' },
  { key: 'epic', label: 'Epique', emoji: '🏔️' },
  { key: 'intimate', label: 'Intime', emoji: '🕯️' },
] as const;

export type MoodKey = typeof MOODS[number]['key'];

export const LANGUAGES = [
  { key: 'fr', label: 'Francais' },
  { key: 'en', label: 'Anglais' },
  { key: 'es', label: 'Espagnol' },
  { key: 'ar', label: 'Arabe' },
  { key: 'pt', label: 'Portugais' },
  { key: 'de', label: 'Allemand' },
  { key: 'it', label: 'Italien' },
  { key: 'ja', label: 'Japonais' },
  { key: 'ko', label: 'Coreen' },
  { key: 'instrumental', label: 'Instrumental' },
  { key: 'other', label: 'Autre' },
] as const;

export const CREDIT_ROLES = [
  { key: 'producer', label: 'Producteur' },
  { key: 'mixer', label: 'Mixage' },
  { key: 'master', label: 'Mastering' },
  { key: 'author', label: 'Auteur' },
  { key: 'composer', label: 'Compositeur' },
  { key: 'beatmaker', label: 'Beatmaker' },
  { key: 'engineer', label: 'Ingenieur son' },
  { key: 'director', label: 'Directeur artistique' },
] as const;
