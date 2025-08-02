import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { 
  SearchIcon, 
  MusicIcon, 
  UserIcon, 
  PlayIcon, 
  HeartIcon,
  SparklesIcon
} from './IconSystem';
import { TrackCover, UserAvatar } from './ImageSystem';
import apiService from '../services/api';

interface SearchBarProps {
  onSearch?: (query: string, filter: string) => void;
}

interface SearchResult {
  tracks: any[];
  artists: any[];
  playlists: any[];
  total: number;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('all');
  const [searchResults, setSearchResults] = useState<SearchResult>({
    tracks: [],
    artists: [],
    playlists: [],
    total: 0
  });
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const suggestions = [
    'Nouveautés 2024',
    'Remixes', 
    'Live Sessions',
    'Collaborations',
    'Demos',
    'Covers'
  ];

  const filters = [
    { label: 'Tous', value: 'all', icon: MusicIcon },
    { label: 'Créations', value: 'tracks', icon: MusicIcon },
    { label: 'Artistes', value: 'artists', icon: UserIcon },
    { label: 'Playlists', value: 'playlists', icon: MusicIcon }
  ];

  const performSearch = async (query: string, filter: string) => {
    if (!query.trim()) {
      setShowSearchResults(false);
      return;
    }

    setSearchLoading(true);
    setShowSearchResults(true);

    try {
      const response = await apiService.search(query, filter);
      if (response.success) {
        setSearchResults(response.data || {
          tracks: [],
          artists: [],
          playlists: [],
          total: 0
        });
      } else {
        setSearchResults({
          tracks: [],
          artists: [],
          playlists: [],
          total: 0
        });
      }
    } catch (error) {
      console.error('Erreur recherche:', error);
      setSearchResults({
        tracks: [],
        artists: [],
        playlists: [],
        total: 0
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (text.trim()) {
      performSearch(text, searchFilter);
    } else {
      setShowSearchResults(false);
    }
  };

  const handleFilterChange = (filter: string) => {
    setSearchFilter(filter);
    if (searchQuery.trim()) {
      performSearch(searchQuery, filter);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <>
      {/* Barre de recherche principale */}
      <TouchableOpacity 
        style={styles.searchBarContainer}
        onPress={() => setShowModal(true)}
      >
        <SearchIcon size={20} color="rgba(255, 255, 255, 0.5)" style={styles.searchIcon} />
        <Text style={styles.searchPlaceholder}>
          Rechercher des créations, artistes, genres...
        </Text>
      </TouchableOpacity>

      {/* Modal de recherche complète */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Recherche</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Barre de recherche */}
          <View style={styles.searchInputContainer}>
            <SearchIcon size={20} color="rgba(255, 255, 255, 0.5)" style={styles.searchInputIcon} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={handleSearchChange}
              placeholder="Rechercher des créations, artistes, genres..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              autoFocus
            />
            {searchLoading && (
              <ActivityIndicator size="small" color="#8B5CF6" style={styles.loadingIndicator} />
            )}
          </View>

          {/* Filtres */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
            {filters.map((filter, index) => (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterButton,
                  searchFilter === filter.value && styles.activeFilterButton
                ]}
                onPress={() => handleFilterChange(filter.value)}
              >
                <filter.icon 
                  size={16} 
                  color={searchFilter === filter.value ? 'white' : 'rgba(255, 255, 255, 0.6)'} 
                />
                <Text style={[
                  styles.filterText,
                  searchFilter === filter.value && styles.activeFilterText
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Contenu */}
          <ScrollView style={styles.resultsContainer}>
            {showSearchResults ? (
              <>
                {/* Résumé des résultats */}
                <View style={styles.resultsSummary}>
                  <Text style={styles.resultsSummaryText}>
                    {searchResults.total > 0 
                      ? `${searchResults.total} résultat(s) pour "${searchQuery}"`
                      : `Aucun résultat pour "${searchQuery}"`
                    }
                  </Text>
                </View>

                {/* Résultats par catégorie */}
                {searchResults.tracks.length > 0 && (
                  <View style={styles.resultsSection}>
                    <View style={styles.sectionHeader}>
                      <MusicIcon size={20} color="#8B5CF6" />
                      <Text style={styles.sectionTitle}>
                        Créations ({searchResults.tracks.length})
                      </Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {searchResults.tracks.map((track, index) => (
                        <View key={track._id} style={styles.trackCard}>
                          {track.isDiscovery && (
                            <View style={styles.discoveryBadge}>
                              <SparklesIcon size={12} color="white" />
                              <Text style={styles.discoveryBadgeText}>Découverte</Text>
                            </View>
                          )}
                          <TrackCover source={track.coverUrl} size={80} />
                          <Text style={styles.trackTitle} numberOfLines={1}>
                            {track.title || 'Titre inconnu'}
                          </Text>
                          <Text style={styles.trackArtist} numberOfLines={1}>
                            {track.artist?.name || track.artist?.username || 'Artiste inconnu'}
                          </Text>
                          <View style={styles.trackStats}>
                            <View style={styles.statItem}>
                              <PlayIcon size={12} color="rgba(255, 255, 255, 0.6)" />
                              <Text style={styles.statText}>{formatNumber(track.plays)}</Text>
                            </View>
                            <View style={styles.statItem}>
                              <HeartIcon size={12} color="rgba(255, 255, 255, 0.6)" />
                              <Text style={styles.statText}>{track.likes?.length || 0}</Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {searchResults.artists.length > 0 && (
                  <View style={styles.resultsSection}>
                    <View style={styles.sectionHeader}>
                      <UserIcon size={20} color="#3B82F6" />
                      <Text style={styles.sectionTitle}>
                        Artistes ({searchResults.artists.length})
                      </Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {searchResults.artists.map((artist, index) => (
                        <View key={artist._id} style={styles.artistCard}>
                          {artist.isDiscovery && (
                            <View style={styles.discoveryBadge}>
                              <SparklesIcon size={12} color="white" />
                              <Text style={styles.discoveryBadgeText}>Découverte</Text>
                            </View>
                          )}
                          <UserAvatar source={artist.avatar} size={80} />
                          <Text style={styles.artistName} numberOfLines={1}>
                            {artist.name}
                          </Text>
                          <Text style={styles.artistUsername} numberOfLines={1}>
                            @{artist.username}
                          </Text>
                          <View style={styles.artistStats}>
                            <Text style={styles.artistStatText}>
                              {artist.listeners || 0} auditeurs
                            </Text>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {searchResults.playlists.length > 0 && (
                  <View style={styles.resultsSection}>
                    <View style={styles.sectionHeader}>
                      <MusicIcon size={20} color="#10B981" />
                      <Text style={styles.sectionTitle}>
                        Playlists ({searchResults.playlists.length})
                      </Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {searchResults.playlists.map((playlist, index) => (
                        <View key={playlist._id} style={styles.playlistCard}>
                          <TrackCover source={playlist.coverUrl} size={80} />
                          <Text style={styles.playlistTitle} numberOfLines={1}>
                            {playlist.title || 'Titre inconnu'}
                          </Text>
                          <Text style={styles.playlistCreator} numberOfLines={1}>
                            par {playlist.creator?.name || 'Créateur inconnu'}
                          </Text>
                          <View style={styles.playlistStats}>
                            <Text style={styles.playlistStatText}>
                              {playlist.trackCount || 0} titres
                            </Text>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            ) : (
              /* Suggestions de recherche */
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>Suggestions populaires :</Text>
                <View style={styles.suggestionsGrid}>
                  {suggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={suggestion}
                      style={styles.suggestionButton}
                      onPress={() => {
                        setSearchQuery(suggestion);
                        performSearch(suggestion, searchFilter);
                      }}
                    >
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchPlaceholder: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  closeButtonText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchInputIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
  },
  loadingIndicator: {
    marginLeft: 12,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeFilterButton: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  filterText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  activeFilterText: {
    color: 'white',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resultsSummary: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resultsSummaryText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  resultsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  trackCard: {
    width: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  artistCard: {
    width: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  playlistCard: {
    width: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  discoveryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 1,
  },
  discoveryBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  trackTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  trackArtist: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  trackStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    marginLeft: 2,
  },
  artistName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  artistUsername: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  artistStats: {
    marginTop: 8,
  },
  artistStatText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    textAlign: 'center',
  },
  playlistTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  playlistCreator: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  playlistStats: {
    marginTop: 8,
  },
  playlistStatText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    textAlign: 'center',
  },
  suggestionsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  suggestionsTitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginBottom: 16,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  suggestionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  suggestionText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
});

export default SearchBar; 