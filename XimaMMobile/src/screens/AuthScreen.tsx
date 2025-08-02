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
import { 
  MusicIcon, 
  MailIcon, 
  LockIcon, 
  EyeIcon, 
  EyeOffIcon, 
  ArrowRightIcon 
} from '../components/IconSystem';
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
      {/* Fond avec gradient comme dans le web */}
      <View style={styles.gradientBackground} />
      
      {/* Particules flottantes pour l'effet visuel */}
      <View style={styles.particleContainer}>
        <View style={[styles.particle, styles.particle1]} />
        <View style={[styles.particle, styles.particle2]} />
        <View style={[styles.particle, styles.particle3]} />
        <View style={[styles.particle, styles.particle4]} />
        <View style={[styles.particle, styles.particle5]} />
      </View>
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header avec logo identique au web */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <MusicIcon size={32} color="white" />
              <Text style={styles.logoText}>XimaM</Text>
            </View>
            <Text style={[styles.title, styles.gradientText]}>
              {isLogin ? 'Connexion' : 'Inscription'}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin 
                ? 'Connectez-vous à votre compte' 
                : 'Rejoignez la communauté musicale'
              }
            </Text>
          </View>

          {/* Conteneur principal avec effet glass identique au web */}
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
            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nom complet</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Votre nom complet"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
              </View>
            )}

            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nom d'utilisateur</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="nom_utilisateur"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputContainer}>
                <MailIcon size={20} color="rgba(255, 255, 255, 0.5)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="votre@email.com"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mot de passe</Text>
              <View style={styles.inputContainer}>
                <LockIcon size={20} color="rgba(255, 255, 255, 0.5)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOffIcon size={20} color="rgba(255, 255, 255, 0.5)" />
                  ) : (
                    <EyeIcon size={20} color="rgba(255, 255, 255, 0.5)" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirmer le mot de passe</Text>
                <View style={styles.inputContainer}>
                  <LockIcon size={20} color="rgba(255, 255, 255, 0.5)" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOffIcon size={20} color="rgba(255, 255, 255, 0.5)" />
                    ) : (
                      <EyeIcon size={20} color="rgba(255, 255, 255, 0.5)" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Lien mot de passe oublié (seulement en mode connexion) */}
            {isLogin && (
              <TouchableOpacity style={styles.forgotPasswordLink}>
                <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
              </TouchableOpacity>
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
                  <Text style={styles.submitButtonText}>
                    {isLogin ? 'Connexion...' : 'Inscription...'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.submitButtonText}>
                  {isLogin ? 'Se connecter' : 'S\'inscrire'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Switch entre connexion et inscription */}
            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>
                {isLogin ? 'Pas encore de compte ?' : 'Déjà un compte ?'}
              </Text>
              <TouchableOpacity onPress={() => {
                setIsLogin(!isLogin);
                clearError();
                setSuccessMessage('');
                setEmail('');
                setPassword('');
                setName('');
                setUsername('');
                setConfirmPassword('');
              }}>
                <Text style={styles.switchLink}>
                  {isLogin ? 'S\'inscrire' : 'Se connecter'}
                </Text>
              </TouchableOpacity>
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
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0f0f23',
  },
  particleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  particle1: {
    top: '20%',
    left: '10%',
    opacity: 0.3,
  },
  particle2: {
    top: '40%',
    right: '15%',
    opacity: 0.2,
  },
  particle3: {
    top: '60%',
    left: '20%',
    opacity: 0.4,
  },
  particle4: {
    top: '80%',
    right: '25%',
    opacity: 0.3,
  },
  particle5: {
    top: '30%',
    left: '50%',
    opacity: 0.2,
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
    marginBottom: 32,
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
  gradientText: {
    color: '#667eea',
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
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 14,
  },
  successContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.5)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  successText: {
    color: '#86EFAC',
    fontSize: 14,
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
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 40,
    paddingVertical: 12,
    color: 'white',
    fontSize: 16,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    zIndex: 1,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: 'rgba(59, 130, 246, 0.4)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  switchLink: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default AuthScreen; 