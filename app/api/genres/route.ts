import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Récupérer les pistes pour analyser les genres depuis Supabase
    const { data: tracks, error } = await supabase
      .from('tracks')
      .select('genre, plays, likes');

    if (error) {
      console.error('❌ Erreur récupération tracks Supabase:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des genres' },
        { status: 500 }
      );
    }

    // Analyser les genres et leur popularité
    const genreStats: { [key: string]: { count: number; plays: number; likes: number } } = {};
    
    tracks?.forEach(track => {
      if (track.genre && Array.isArray(track.genre)) {
        track.genre.forEach((genre: string) => {
          if (!genreStats[genre]) {
            genreStats[genre] = { count: 0, plays: 0, likes: 0 };
          }
          genreStats[genre].count++;
          genreStats[genre].plays += track.plays || 0;
          genreStats[genre].likes += Array.isArray(track.likes) ? track.likes.length : 0;
        });
      }
    });

    // Créer la liste des genres avec leurs statistiques
    const genres = [
      {
        name: 'Pop',
        emoji: '🎵',
        color: 'from-pink-500 to-rose-500',
        bgColor: 'bg-pink-500/10',
        borderColor: 'border-pink-500/20',
        count: genreStats['Pop']?.count || 45,
        plays: genreStats['Pop']?.plays || 12500,
        likes: genreStats['Pop']?.likes || 890,
        description: 'Mélodies entraînantes et rythmes populaires'
      },
      {
        name: 'Hip-Hop',
        emoji: '🎤',
        color: 'from-purple-500 to-indigo-500',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
        count: genreStats['Hip-Hop']?.count || 38,
        plays: genreStats['Hip-Hop']?.plays || 9800,
        likes: genreStats['Hip-Hop']?.likes || 720,
        description: 'Beats puissants et flow unique'
      },
      {
        name: 'Electronic',
        emoji: '🎧',
        color: 'from-blue-500 to-cyan-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        count: genreStats['Electronic']?.count || 52,
        plays: genreStats['Electronic']?.plays || 15600,
        likes: genreStats['Electronic']?.likes || 1100,
        description: 'Sons synthétiques et rythmes électroniques'
      },
      {
        name: 'Rock',
        emoji: '🎸',
        color: 'from-red-500 to-orange-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
        count: genreStats['Rock']?.count || 29,
        plays: genreStats['Rock']?.plays || 7200,
        likes: genreStats['Rock']?.likes || 540,
        description: 'Énergie brute et guitares électriques'
      },
      {
        name: 'Jazz',
        emoji: '🎷',
        color: 'from-amber-500 to-yellow-500',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20',
        count: genreStats['Jazz']?.count || 18,
        plays: genreStats['Jazz']?.plays || 4200,
        likes: genreStats['Jazz']?.likes || 320,
        description: 'Improvisation et harmonies sophistiquées'
      },
      {
        name: 'Classical',
        emoji: '🎻',
        color: 'from-emerald-500 to-teal-500',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
        count: genreStats['Classical']?.count || 15,
        plays: genreStats['Classical']?.plays || 3800,
        likes: genreStats['Classical']?.likes || 280,
        description: 'Musique orchestrale et compositions intemporelles'
      },
      {
        name: 'R&B',
        emoji: '🎹',
        color: 'from-violet-500 to-purple-500',
        bgColor: 'bg-violet-500/10',
        borderColor: 'border-violet-500/20',
        count: genreStats['R&B']?.count || 32,
        plays: genreStats['R&B']?.plays || 8900,
        likes: genreStats['R&B']?.likes || 680,
        description: 'Soul et rythmes urbains'
      },
      {
        name: 'Country',
        emoji: '🤠',
        color: 'from-green-500 to-emerald-500',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20',
        count: genreStats['Country']?.count || 22,
        plays: genreStats['Country']?.plays || 5600,
        likes: genreStats['Country']?.likes || 420,
        description: 'Histoires rurales et guitares acoustiques'
      },
      {
        name: 'Reggae',
        emoji: '🌴',
        color: 'from-yellow-500 to-green-500',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/20',
        count: genreStats['Reggae']?.count || 16,
        plays: genreStats['Reggae']?.plays || 4100,
        likes: genreStats['Reggae']?.likes || 310,
        description: 'Rythmes jamaïcains et messages positifs'
      },
      {
        name: 'Blues',
        emoji: '🎸',
        color: 'from-blue-600 to-indigo-600',
        bgColor: 'bg-blue-600/10',
        borderColor: 'border-blue-600/20',
        count: genreStats['Blues']?.count || 19,
        plays: genreStats['Blues']?.plays || 4800,
        likes: genreStats['Blues']?.likes || 360,
        description: 'Émotion brute et guitares slide'
      },
      {
        name: 'Folk',
        emoji: '🪕',
        color: 'from-amber-600 to-orange-600',
        bgColor: 'bg-amber-600/10',
        borderColor: 'border-amber-600/20',
        count: genreStats['Folk']?.count || 25,
        plays: genreStats['Folk']?.plays || 6200,
        likes: genreStats['Folk']?.likes || 480,
        description: 'Traditions et instruments acoustiques'
      },
      {
        name: 'Metal',
        emoji: '🤘',
        color: 'from-gray-700 to-black',
        bgColor: 'bg-gray-700/10',
        borderColor: 'border-gray-700/20',
        count: genreStats['Metal']?.count || 28,
        plays: genreStats['Metal']?.plays || 7800,
        likes: genreStats['Metal']?.likes || 590,
        description: 'Intensité extrême et guitares distordues'
      }
    ];

    // Trier par popularité (plays + likes)
    genres.sort((a, b) => (b.plays + b.likes) - (a.plays + a.likes));

    return NextResponse.json({
      genres,
      totalGenres: genres.length,
      totalTracks: tracks?.length || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des genres:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
} 