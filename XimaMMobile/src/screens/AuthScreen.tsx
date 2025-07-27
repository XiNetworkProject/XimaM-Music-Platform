import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';

const AuthScreen: React.FC = () => {
  const { login, register, error, clearError, isLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const validateForm = () => {
    if (isLogin) {
      if (!email.trim() || !password.trim()) {
        Alert.alert('Erreur', 'Veuillez remplir tous les champs');
        return false;
      }
    } else {
      if (!name.trim()) {
        Alert.alert('Erreur', 'Le nom est requis');
        return false;
      }
      if (!username.trim()) {
        Alert.alert('Erreur', 'Le nom d\'utilisateur est requis');
        return false;
      }
      if (username.length < 3) {
        Alert.alert('Erreur', 'Le nom d\'utilisateur doit contenir au moins 3 caractères');
        return false;
      }
      if (!email.trim()) {
        Alert.alert('Erreur', 'L\'email est requis');
        return false;
      }
      if (!/\S+@\S+\.\S+/.test(email)) {
        Alert.alert('Erreur', 'Format d\'email invalide');
        return false;
      }
      if (password.length < 6) {
        Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
        return false;
      }
      if (password !== confirmPassword) {
        Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    clearError();

    if (isLogin) {
      const success = await login(email.trim().toLowerCase(), password);
      if (!success) {
        Alert.alert('Erreur', error || 'Email ou mot de passe incorrect');
      }
    } else {
      const success = await register({ 
        name: name.trim(),
        username: username.trim().toLowerCase(), 
        email: email.trim().toLowerCase(), 
        password 
      });
      if (success) {
        setSuccessMessage('Inscription réussie ! Vous pouvez maintenant vous connecter.');
        setIsLogin(true);
        setName('');
        setUsername('');
        setConfirmPassword('');
      } else {
        Alert.alert('Erreur', error || 'Erreur d\'inscription');
      }
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header avec logo */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Icon name="music-note" size={32} color="white" />
              <Text style={styles.logoText}>XimaM</Text>
            </View>
            <Text style={styles.title}>
              {isLogin ? 'Connexion' : 'Inscription'}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin 
                ? 'Connectez-vous à votre compte' 
                : 'Rejoignez la communauté musicale'
              }
            </Text>
          </View>

          {/* Conteneur principal avec effet glass */}
          <View style={styles.glassContainer}>
            {/* Messages d'erreur et de succès */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {successMessage && (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            )}

            {/* Formulaire */}
            <View style={styles.form}>
              {!isLogin && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nom complet</Text>
                  <View style={styles.inputContainer}>
                    <Icon name="person" size={20} color="rgba(255, 255, 255, 0.5)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Votre nom complet"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}

              {!isLogin && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nom d'utilisateur</Text>
                  <View style={styles.inputContainer}>
                    <Icon name="person" size={20} color="rgba(255, 255, 255, 0.5)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="nom_utilisateur"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={styles.inputContainer}>
                  <Icon name="email" size={20} color="rgba(255, 255, 255, 0.5)" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="votre@email.com"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mot de passe</Text>
                <View style={styles.inputContainer}>
                  <Icon name="lock" size={20} color="rgba(255, 255, 255, 0.5)" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Icon 
                      name={showPassword ? "visibility-off" : "visibility"} 
                      size={20} 
                      color="rgba(255, 255, 255, 0.5)" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {!isLogin && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirmer le mot de passe</Text>
                  <View style={styles.inputContainer}>
                    <Icon name="lock" size={20} color="rgba(255, 255, 255, 0.5)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <Icon 
                        name={showConfirmPassword ? "visibility-off" : "visibility"} 
                        size={20} 
                        color="rgba(255, 255, 255, 0.5)" 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Mot de passe oublié (seulement en mode connexion) */}
              {isLogin && (
                <View style={styles.forgotContainer}>
                  <TouchableOpacity>
                    <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Bouton de soumission */}
              <TouchableOpacity 
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]} 
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="white" />
                    <Text style={styles.submitText}>
                      {isLogin ? 'Connexion...' : 'Création du compte...'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.submitText}>
                    {isLogin ? 'Se connecter' : 'Créer mon compte'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Lien pour changer de mode */}
            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>
                {isLogin ? 'Pas encore de compte ? ' : 'Déjà un compte ? '}
              </Text>
              <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                <Text style={styles.switchLink}>
                  {isLogin ? 'Créer un compte' : 'Se connecter'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Conditions d'utilisation */}
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                En {isLogin ? 'vous connectant' : 'créant un compte'}, vous acceptez nos{' '}
                <Text style={styles.termsLink}>conditions d'utilisation</Text>{' '}
                et notre{' '}
                <Text style={styles.termsLink}>politique de confidentialité</Text>.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  glassContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: 'rgba(34, 197, 94, 0.5)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  successText: {
    color: '#86efac',
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    paddingVertical: 4,
  },
  forgotContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 14,
    color: '#3B82F6',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  switchText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  switchLink: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  termsContainer: {
    alignItems: 'center',
  },
  termsText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#3B82F6',
  },
});

export default AuthScreen; 