import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const SettingsScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Icon name="settings" size={28} color="#8B5CF6" />
          <Text style={styles.title}>Paramètres</Text>
          <Text style={styles.subtitle}>Personnalisez votre expérience</Text>
        </View>

        {/* Contenu temporaire */}
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 Profil</Text>
            <Text style={styles.placeholderText}>Modifiez vos informations...</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔔 Notifications</Text>
            <Text style={styles.placeholderText}>Gérez vos notifications...</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎵 Audio</Text>
            <Text style={styles.placeholderText}>Paramètres audio...</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔒 Confidentialité</Text>
            <Text style={styles.placeholderText}>Paramètres de confidentialité...</Text>
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

export default SettingsScreen; 