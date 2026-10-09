/** Editorial browsing groups, not a reclassification of existing tracks. */
export const STYLE_FAMILIES: Record<string, Record<string, string[]>> = {
  'Pop & Mainstream': { Pop: ['Art Pop', 'Baroque Pop', 'Chamber Pop', 'Bedroom Pop', 'Bubblegum Pop', 'Hyperpop', 'Power Pop', 'Sophisti-Pop', 'Sunshine Pop', 'Dark Pop', 'Alternative Pop', 'French Pop', 'Chanson française', 'Variété française', 'Yé-yé'] },
  'Hip-Hop & Rap': {
    Rap: ['Rap conscient', 'Rap mélodique', 'Rap alternatif', 'Rap politique', 'Jazz Rap', 'Lo-Fi Hip-Hop', 'Abstract Hip-Hop', 'Horrorcore', 'Gangsta Rap', 'G-Funk'],
    Trap: ['Trap Soul', 'Emo Rap', 'Rage', 'Plugg', 'PluggnB', 'Detroit Rap', 'Memphis Rap'],
    Drill: ['UK Drill', 'Brooklyn Drill', 'French Drill', 'Jersey Drill'], Phonk: ['Drift Phonk', 'Brazilian Phonk', 'Phonk House'],
  },
  'R&B & Soul': { 'R&B': ['Alternative R&B', 'New Jack Swing', 'Quiet Storm'], Soul: ['Northern Soul', 'Southern Soul', 'Blue-Eyed Soul', 'Psychedelic Soul'], Funk: ['P-Funk', 'Boogie', 'Electro-Funk', 'Funk Rock'] },
  Electronic: {
    House: ['Acid House', 'Chicago House', 'French House', 'Disco House', 'Soulful House', 'Organic House', 'Minimal House', 'Tribal House', 'Ghetto House'],
    Techno: ['Detroit Techno', 'Dub Techno', 'Minimal Techno', 'Acid Techno', 'Industrial Techno', 'Hypnotic Techno', 'Schranz'],
    Trance: ['Uplifting Trance', 'Progressive Trance', 'Psytrance', 'Goa Trance', 'Vocal Trance', 'Hard Trance'],
    'Drum & Bass': ['Liquid Drum & Bass', 'Neurofunk', 'Jump Up', 'Atmospheric Drum & Bass', 'Drumfunk'],
    Dubstep: ['Melodic Dubstep', 'Riddim', 'Deep Dubstep', 'Brostep'],
    Hardstyle: ['Euphoric Hardstyle', 'Rawstyle', 'Hardcore Techno', 'Gabber', 'Frenchcore', 'Uptempo'],
    Electro: ['IDM', 'Glitch', 'Glitch Hop', 'Electronica', 'EBM', 'Electroclash', 'Footwork', '2-Step', 'Speed Garage', 'Bassline', 'Breakcore'],
  },
  Rock: {
    Rock: ['Classic Rock', 'Blues Rock', 'Garage Rock', 'Psychedelic Rock', 'Stoner Rock', 'Surf Rock', 'Math Rock', 'Gothic Rock', 'Noise Rock', 'Krautrock'],
    Metal: ['Heavy Metal', 'Thrash Metal', 'Doom Metal', 'Power Metal', 'Symphonic Metal', 'Progressive Metal', 'Folk Metal', 'Deathcore', 'Djent', 'Sludge Metal', 'Post-Metal', 'Atmospheric Black Metal'],
    Punk: ['Pop Punk', 'Skate Punk', 'Ska Punk', 'Post-Hardcore', 'Melodic Hardcore', 'Crust Punk'],
  },
  'Chill & Ambient': { Ambient: ['Dark Ambient', 'Space Ambient', 'Drone', 'Ambient Dub', 'Ambient Techno', 'Field Recording', 'Soundscape'], 'Lo-Fi': ['Lo-Fi Jazz', 'Lo-Fi House', 'Chillhop', 'Sleep Music', 'Meditation', 'Lounge', 'Balearic'] },
  'Dance & Club': { Disco: ['Nu-Disco', 'Italo Disco', 'Space Disco', 'Hi-NRG', 'Eurodisco'], Dance: ['Eurodance', 'Tropical House', 'Moombahton', 'Dembow', 'Bubbling', 'Kuduro'], Synthwave: ['Retrowave', 'Outrun', 'Darksynth', 'Dreamwave', 'Chillsynth'], Vaporwave: ['Future Funk', 'Mallsoft', 'Vaportrap'] },
  'Jazz & Blues': { Jazz: ['Cool Jazz', 'Hard Bop', 'Modal Jazz', 'Free Jazz', 'Spiritual Jazz', 'Nu Jazz', 'Acid Jazz', 'Gypsy Jazz', 'Vocal Jazz', 'Latin Jazz', 'Dixieland'], Blues: ['Delta Blues', 'Chicago Blues', 'Electric Blues', 'Country Blues', 'Piedmont Blues', 'Soul Blues'] },
  'Africain & Caraibe': { Afrobeat: ['Afrobeats', 'Afro-Soul', 'Afro-Fusion', 'Afro Swing', 'Afro Trap', 'Gqom', 'Bongo Flava', 'Kizomba', 'Semba', 'Soukous', 'Makossa'], Zouk: ['Zouk Love', 'Bouyon', 'Shatta', 'Biguine', 'Gwo Ka', 'Calypso', 'Sega', 'Maloya'] },
  Latin: { Latin: ['Bolero', 'Son Cubano', 'Mambo', 'Cha-Cha-Cha', 'Samba', 'Pagode', 'Forró', 'MPB', 'Nueva Canción', 'Mariachi', 'Ranchera', 'Norteño', 'Corridos', 'Corridos Tumbados'] },
  'Classique & Acoustique': { Classical: ['Baroque', 'Romantique', 'Classique contemporain', 'Minimalisme', 'Néoclassique', 'Musique chorale', 'Quatuor à cordes', 'Concerto', 'Symphonie'], Acoustic: ['Fingerstyle', 'Guitare classique', 'Piano solo', 'Acoustic Pop', 'Acoustic Folk'] },
  Autres: {
    Country: ['Bluegrass', 'Americana', 'Alt-Country', 'Country Pop', 'Outlaw Country', 'Honky Tonk'],
    Folk: ['Indie Folk', 'Contemporary Folk', 'Celtic', 'Traditional Folk', 'Folk Rock', 'Neofolk'],
    Reggae: ['Roots Reggae', 'Dub', 'Rocksteady', 'Lovers Rock', 'Reggae Fusion'],
    World: ['Raï', 'Chaâbi', 'Gnawa', 'Fado', 'Qawwali', 'Hindustani', 'Carnatique', 'Gamelan'],
    Soundtrack: ['Cinematic', 'Trailer Music', 'Film Score', 'Chiptune', '8-bit', '16-bit', 'Dungeon Synth', 'Musique pour enfants'],
    Experimental: ['Musique concrète', 'Electroacoustic', 'Musique acousmatique', 'Free Improvisation'],
  },
};
export const normalizeStyleSearch = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
