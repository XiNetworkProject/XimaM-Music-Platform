'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  Clock, 
  Plus, 
  Play, 
  Pause,
  MoreVertical, 
  Music, 
  Users,
  User,
  Calendar,
  Shuffle,
  Repeat,
  Edit3,
  Trash2,
  Share2,
  Download,
  Search,
  Filter,
  Grid,
  List,
  X,
  Check,
  FolderPlus,
  Star,
  Eye,
  EyeOff,
  Copy,
  Settings,
  Sparkles,
  Disc3,
  Mic2,
  Headphones
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useAudioService } from '@/hooks/useAudioService';
import { useBatchLikeSystem } from '@/hooks/useLikeSystem';
import { useBatchPlaysSystem } from '@/hooks/usePlaysSystem';

interface Track {
  _id: string;
  title: string;
  artist: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  genre: string[];
  duration: number;
  plays: number;
  likes: string[];
  comments: string[];
  createdAt: string;
  coverUrl?: string;
  audioUrl: string;
  isLiked?: boolean;
  isPlaying?: boolean;
}

interface Playlist {
  _id: string;
  name: string;
  description?: string;
  tracks: Track[];
  createdAt: string;
  coverUrl?: string;
  isPublic: boolean;
}

interface Album {
  _id: string;
  name: string;
  artist: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  tracks: Track[];
  releaseDate: string;
  coverUrl?: string;
}

interface Artist {
  _id: string;
  name: string;
  username: string;
  avatar?: string;
  bio?: string;
  tracks: Track[];
  followers: number;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'recent' | 'popular' | 'alphabetical' | 'duration';
type FilterOption = 'all' | 'liked' | 'recent' | 'popular';

const LibraryPage = () => {
  const { data: session } = useSession();
  const audioService = useAudioService();
  const { currentTrack, isPlaying } = audioService.state;
  const { play: playTrack, pause: pauseTrack } = audioService.actions;
  const { toggleLikeBatch, isBatchLoading: isLiking } = useBatchLikeSystem();
  const { incrementPlaysBatch, isBatchLoading: isPlayingTrack } = useBatchPlaysSystem();

  // États principaux
  const [activeTab, setActiveTab] = useState<'songs' | 'albums' | 'artists' | 'playlists'>('songs');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Données
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chargement des données
  const fetchTracks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tracks/simple');
      if (!response.ok) throw new Error('Erreur lors du chargement des tracks');
      const data = await response.json();
      setTracks(data.tracks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPlaylists = useCallback(async () => {
    try {
      const response = await fetch('/api/playlists/simple');
      if (!response.ok) throw new Error('Erreur lors du chargement des playlists');
      const data = await response.json();
      setPlaylists(data.playlists || []);
    } catch (err) {
      console.error('Erreur playlists:', err);
    }
  }, []);

  const fetchAlbums = useCallback(async () => {
    try {
      // Pour l'instant, on groupe les tracks par artiste comme albums
      const groupedAlbums = tracks.reduce((acc: Album[], track) => {
        const existingAlbum = acc.find(album => album.artist._id === track.artist._id);
        if (existingAlbum) {
          existingAlbum.tracks.push(track);
        } else {
          acc.push({
            _id: `album-${track.artist._id}`,
            name: `${track.artist.name} - Singles`,
            artist: track.artist,
            tracks: [track],
            releaseDate: track.createdAt,
            coverUrl: track.coverUrl
          });
        }
        return acc;
      }, []);
      setAlbums(groupedAlbums);
    } catch (err) {
      console.error('Erreur albums:', err);
    }
  }, [tracks]);

  const fetchArtists = useCallback(async () => {
    try {
      const uniqueArtists = tracks.reduce((acc: Artist[], track) => {
        const existingArtist = acc.find(artist => artist._id === track.artist._id);
        if (existingArtist) {
          existingArtist.tracks.push(track);
        } else {
          acc.push({
            _id: track.artist._id,
            name: track.artist.name,
            username: track.artist.username,
            avatar: track.artist.avatar,
            tracks: [track],
            followers: Math.floor(Math.random() * 1000) // Placeholder
          });
        }
        return acc;
      }, []);
      setArtists(uniqueArtists);
    } catch (err) {
      console.error('Erreur artists:', err);
    }
  }, [tracks]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  useEffect(() => {
    if (tracks.length > 0) {
      fetchAlbums();
      fetchArtists();
    }
  }, [tracks, fetchAlbums, fetchArtists]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  // Filtrage et tri
  const getFilteredAndSortedData = () => {
    let data: any[] = [];
    
    switch (activeTab) {
      case 'songs':
        data = [...tracks];
        break;
      case 'albums':
        data = [...albums];
        break;
      case 'artists':
        data = [...artists];
        break;
      case 'playlists':
        data = [...playlists];
        break;
    }

    // Filtrage par recherche
    if (searchQuery) {
      data = data.filter(item => 
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.artist?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtrage par type
    if (activeTab === 'songs') {
      switch (filterBy) {
        case 'liked':
          data = data.filter((track: Track) => track.isLiked);
          break;
        case 'recent':
          data = data.filter((track: Track) => {
            const trackDate = new Date(track.createdAt);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return trackDate > weekAgo;
          });
          break;
        case 'popular':
          data = data.filter((track: Track) => track.plays > 100);
          break;
      }
    }

    // Tri
    switch (sortBy) {
      case 'recent':
        data.sort((a, b) => new Date(b.createdAt || b.releaseDate).getTime() - new Date(a.createdAt || a.releaseDate).getTime());
        break;
      case 'popular':
        data.sort((a, b) => (b.plays || b.followers || 0) - (a.plays || a.followers || 0));
        break;
      case 'alphabetical':
        data.sort((a, b) => (a.title || a.name).localeCompare(b.title || b.name));
        break;
      case 'duration':
        if (activeTab === 'songs') {
          data.sort((a, b) => b.duration - a.duration);
        }
        break;
    }

    return data;
  };

  const filteredData = getFilteredAndSortedData();

  // Gestion des interactions
  const handlePlayTrack = async (track: Track) => {
    if (currentTrack?._id === track._id) {
      if (isPlaying) {
        pauseTrack();
      } else {
        await playTrack(track);
      }
    } else {
      await incrementPlaysBatch(track._id, track.plays);
      await playTrack(track);
    }
  };

  const handleLikeTrack = async (track: Track) => {
    await toggleLikeBatch(track._id, { isLiked: track.isLiked || false, likesCount: track.likes.length });
    setTracks(prev => prev.map(t => 
      t._id === track._id 
        ? { ...t, isLiked: !t.isLiked, likes: t.isLiked ? t.likes.filter(id => id !== session?.user?.id) : [...t.likes, session?.user?.id || ''] }
        : t
    ));
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Composant de tab
  const TabButton = ({ tab, label, icon: Icon }: { tab: string, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(tab as any)}
      className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors whitespace-nowrap ${
        activeTab === tab
          ? 'text-primary border-b-2 border-primary'
          : 'text-muted-foreground hover:text-foreground hover:border-b-2 hover:border-muted-foreground'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );

  // Composant de track en grille
  const TrackGridItem = ({ track }: { track: Track }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative bg-card rounded-lg p-4 hover:bg-accent transition-colors cursor-pointer"
      onClick={() => handlePlayTrack(track)}
    >
      <div className="relative mb-3">
        <div className="aspect-square bg-muted rounded-lg overflow-hidden">
          {track.coverUrl ? (
            <img 
              src={track.coverUrl} 
              alt={track.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music size={32} className="text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePlayTrack(track);
            }}
            className="bg-primary text-primary-foreground rounded-full p-2 hover:bg-primary/90 transition-colors"
          >
            {currentTrack?._id === track._id && isPlaying ? (
              <Pause size={16} />
            ) : (
              <Play size={16} />
            )}
          </button>
        </div>
      </div>
      
      <div className="space-y-1">
        <h3 className="font-medium text-sm truncate">{track.title}</h3>
        <p className="text-xs text-muted-foreground truncate">{track.artist.name}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatDuration(track.duration)}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLikeTrack(track);
              }}
              className={`hover:text-primary transition-colors ${
                track.isLiked ? 'text-red-500' : 'text-muted-foreground'
              }`}
            >
              <Heart size={12} fill={track.isLiked ? 'currentColor' : 'none'} />
            </button>
            <span>{track.likes.length}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );

  // Composant de track en liste
  const TrackListItem = ({ track, index }: { track: Track, index: number }) => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
      onClick={() => handlePlayTrack(track)}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 bg-muted rounded-lg overflow-hidden flex-shrink-0">
          {track.coverUrl ? (
            <img 
              src={track.coverUrl} 
              alt={track.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music size={16} className="text-muted-foreground" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">{track.title}</h3>
          <p className="text-xs text-muted-foreground truncate">{track.artist.name}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{formatDuration(track.duration)}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleLikeTrack(track);
            }}
            className={`hover:text-primary transition-colors ${
              track.isLiked ? 'text-red-500' : 'text-muted-foreground'
            }`}
          >
            <Heart size={14} fill={track.isLiked ? 'currentColor' : 'none'} />
          </button>
          <span>{track.likes}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Menu contextuel
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical size={16} />
        </button>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-2">Erreur de chargement</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header avec tabs */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Ma Bibliothèque</h1>
            <div className="flex items-center gap-1">
              <TabButton tab="songs" label="Musiques" icon={Music} />
              <TabButton tab="albums" label="Albums" icon={Disc3} />
              <TabButton tab="artists" label="Artistes" icon={Mic2} />
              <TabButton tab="playlists" label="Playlists" icon={Headphones} />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
              }`}
            >
              <Filter size={16} />
            </button>
            
            <div className="flex items-center bg-muted rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded transition-colors ${
                  viewMode === 'grid' ? 'bg-background text-foreground' : 'text-muted-foreground'
                }`}
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1 rounded transition-colors ${
                  viewMode === 'list' ? 'bg-background text-foreground' : 'text-muted-foreground'
                }`}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 py-2 border-t bg-muted/50"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Trier par:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="px-3 py-1 bg-background border rounded text-sm"
                  >
                    <option value="recent">Récent</option>
                    <option value="popular">Populaire</option>
                    <option value="alphabetical">Alphabétique</option>
                    {activeTab === 'songs' && <option value="duration">Durée</option>}
                  </select>
                </div>
                
                {activeTab === 'songs' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Filtrer:</span>
                    <select
                      value={filterBy}
                      onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                      className="px-3 py-1 bg-background border rounded text-sm"
                    >
                      <option value="all">Tout</option>
                      <option value="liked">Aimées</option>
                      <option value="recent">Récentes</option>
                      <option value="popular">Populaires</option>
                    </select>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 overflow-auto p-4">
        {filteredData.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Music size={48} className="text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun élément trouvé</p>
            </div>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredData.map((item, index) => (
                  <TrackGridItem key={item._id} track={item as Track} />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredData.map((item, index) => (
                  <TrackListItem key={item._id} track={item as Track} index={index} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LibraryPage;