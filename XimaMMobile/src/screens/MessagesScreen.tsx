import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const MessagesScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Icon name="chat" size={28} color="#8B5CF6" />
          <Text style={styles.title}>Messages</Text>
          <Text style={styles.subtitle}>Communiquez avec la communauté</Text>
        </View>

        {/* Contenu temporaire */}
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💬 Conversations</Text>
            <Text style={styles.placeholderText}>Vos conversations privées...</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👥 Demandes d'amis</Text>
            <Text style={styles.placeholderText}>Nouvelles demandes de connexion...</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔔 Notifications</Text>
            <Text style={styles.placeholderText}>Vos notifications récentes...</Text>
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

export default MessagesScreen; 