import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const DiscoverScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Icon name="explore" size={28} color="#8B5CF6" />
          <Text style={styles.title}>Découvrir</Text>
          <Text style={styles.subtitle}>Explorez de nouveaux artistes et genres</Text>
        </View>

        {/* Contenu temporaire */}
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎵 Genres Populaires</Text>
            <View style={styles.genreGrid}>
              {['Hip-Hop', 'Pop', 'Rock', 'Électronique', 'Jazz', 'Classique'].map((genre) => (
                <TouchableOpacity key={genre} style={styles.genreCard}>
                  <Text style={styles.genreText}>{genre}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔥 Tendances</Text>
            <Text style={styles.placeholderText}>Contenu des tendances à venir...</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👥 Artistes Émergents</Text>
            <Text style={styles.placeholderText}>Découvrez de nouveaux talents...</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  genreCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  genreText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  placeholderText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 40,
  },
});

export default DiscoverScreen; 