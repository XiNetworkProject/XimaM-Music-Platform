import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const LibraryScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Icon name="library-music" size={28} color="#8B5CF6" />
          <Text style={styles.title}>Bibliothèque</Text>
          <Text style={styles.subtitle}>Vos playlists et favoris</Text>
        </View>

        {/* Contenu temporaire */}
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎵 Mes Playlists</Text>
            <Text style={styles.placeholderText}>Vos playlists personnalisées...</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>❤️ Favoris</Text>
            <Text style={styles.placeholderText}>Vos morceaux préférés...</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏰ Écouté Récemment</Text>
            <Text style={styles.placeholderText}>Votre historique d'écoute...</Text>
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
  placeholderText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 40,
  },
});

export default LibraryScreen; 