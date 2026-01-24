export const MUSIC_GENRES = [
  // Genres populaires
  'Pop', 'Rock', 'Hip-Hop', 'Rap', 'Electronic', 'Jazz', 'Classical', 'Country', 'R&B', 'Dance', 'EDM',
  
  // Rock et dérivés
  'Reggae', 'Blues', 'Folk', 'Metal', 'Punk', 'Indie', 'Alternative', 'Grunge',
  'Hard Rock', 'Post-Rock', 'Post-Punk', 'Shoegaze', 'Emo', 'Hardcore', 'Metalcore', 'Nu Metal',
  'Death Metal', 'Black Metal',
  
  // Electronic et dérivés
  'Ambient', 'Trap', 'Drill', 'Dubstep', 'House', 'Deep House', 'Tech House',
  'Techno', 'Hard Techno', 'Melodic Techno', 'Trance', 'Progressive', 'Progressive House',
  'Drum & Bass', 'Breakbeat', 'Jungle', 'UK Garage', 'Garage', 'Electro', 'Future House', 'Bass House',
  'Hardstyle', 'Jersey Club',
  
  // Chill et acoustique
  'Acoustic', 'Instrumental', 'Lo-Fi', 'Chill', 'Downtempo', 'Trip-Hop', 'Chillstep',
  
  // Funk et rétro
  'Funk', 'Soul', 'Disco', 'Synthwave', 'Vaporwave', 'Future Bass', 'Synthpop', 'New Wave', 'Electro Swing',
  
  // Internationaux et modernes
  'Phonk', 'Afrobeat', 'Afro House', 'Amapiano', 'Latin', 'Reggaeton', 'Dancehall',
  'Salsa', 'Bachata', 'Merengue', 'Cumbia', 'Tango', 'Flamenco', 'Bossa Nova',
  'K-Pop', 'J-Pop', 'C-Pop',
  'Baile Funk',
  
  // Spirituel et expérimental
  'Gospel', 'Spiritual', 'World', 'Experimental', 'Noise', 'Avant-Garde',
  'Soundtrack', 'Game Music', 'Anime', 'Opera', 'A Cappella'
] as const;

export type MusicGenre = typeof MUSIC_GENRES[number];

// Catégories pour filtrage/groupement
export const GENRE_CATEGORIES = {
  'Populaire': ['Pop', 'Hip-Hop', 'Rap', 'R&B', 'Electronic'],
  'Rock': ['Rock', 'Metal', 'Punk', 'Indie', 'Alternative', 'Grunge'],
  'Electronic': ['Electronic', 'House', 'Techno', 'Trance', 'Dubstep', 'Trap'],
  'Chill': ['Jazz', 'Blues', 'Acoustic', 'Lo-Fi', 'Chill', 'Ambient'],
  'International': ['Reggae', 'Afrobeat', 'Latin', 'Reggaeton', 'K-Pop', 'World'],
  'Expérimental': ['Experimental', 'Noise', 'Avant-Garde', 'Progressive']
} as const;

export function getGenreCategory(genre: string): string | null {
  for (const [category, genres] of Object.entries(GENRE_CATEGORIES)) {
    if ((genres as readonly string[]).includes(genre)) {
      return category;
    }
  }
  return null;
}

export function getGenreColor(genre: string): string {
  const category = getGenreCategory(genre);
  switch (category) {
    case 'Populaire': return 'from-pink-500 to-purple-500';
    case 'Rock': return 'from-red-500 to-orange-500';
    case 'Electronic': return 'from-blue-500 to-cyan-500';
    case 'Chill': return 'from-green-500 to-teal-500';
    case 'International': return 'from-yellow-500 to-amber-500';
    case 'Expérimental': return 'from-purple-500 to-indigo-500';
    default: return 'from-gray-500 to-slate-500';
  }
}
