import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService, { User } from '../services/api';

// Types pour le contexte
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Types pour le contexte
interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: { name: string; username: string; email: string; password: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  googleSignIn: (idToken: string) => Promise<boolean>;
  forgotPassword: (email: string) => Promise<boolean>;
  resetPassword: (token: string, password: string) => Promise<boolean>;
  updateUser: (userData: Partial<User>) => void;
  clearError: () => void;
}

// Actions pour le reducer
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_TOKEN'; payload: string | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'LOGOUT' };

// État initial
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
      };
    case 'SET_TOKEN':
      return { ...state, token: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    default:
      return state;
  }
};

// Création du contexte
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider du contexte
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialisation au démarrage de l'app
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Vérifier s'il y a un token stocké
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        apiService.setToken(token);
        dispatch({ type: 'SET_TOKEN', payload: token });
        
        // Pour l'instant, on ne récupère pas les infos utilisateur au démarrage
        // car l'API mobile n'a pas encore cette fonctionnalité
        // TODO: Implémenter getCurrentUser dans l'API mobile
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de l\'auth:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Erreur de connexion' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const response = await apiService.login(email, password);
      
      if (response.success && response.data) {
        const { user, token } = response.data;
        apiService.setToken(token);
        await AsyncStorage.setItem('auth_token', token);
        dispatch({ type: 'SET_USER', payload: user });
        dispatch({ type: 'SET_TOKEN', payload: token });
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Erreur de connexion' });
        return false;
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Erreur de connexion' });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const register = async (userData: { name: string; username: string; email: string; password: string }): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const response = await apiService.register(userData);
      
      if (response.success && response.data) {
        const { user, token } = response.data;
        apiService.setToken(token);
        await AsyncStorage.setItem('auth_token', token);
        dispatch({ type: 'SET_USER', payload: user });
        dispatch({ type: 'SET_TOKEN', payload: token });
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Erreur d\'inscription' });
        return false;
      }
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Erreur d\'inscription' });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const googleSignIn = async (idToken: string): Promise<boolean> => {
    // TODO: Implémenter la connexion Google
    console.log('Connexion Google non implémentée');
    return false;
  };

  const forgotPassword = async (email: string): Promise<boolean> => {
    // TODO: Implémenter la récupération de mot de passe
    console.log('Récupération de mot de passe non implémentée');
    return false;
  };

  const resetPassword = async (token: string, password: string): Promise<boolean> => {
    // TODO: Implémenter la réinitialisation de mot de passe
    console.log('Réinitialisation de mot de passe non implémentée');
    return false;
  };

  const logout = async (): Promise<void> => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      await AsyncStorage.removeItem('auth_token');
      dispatch({ type: 'LOGOUT' });
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (state.user) {
      const updatedUser = { ...state.user, ...userData };
      dispatch({ type: 'SET_USER', payload: updatedUser });
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    googleSignIn,
    forgotPassword,
    resetPassword,
    updateUser,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook personnalisé pour utiliser le contexte
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};

export default AuthContext; 