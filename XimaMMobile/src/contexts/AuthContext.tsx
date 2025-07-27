import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../services/api';
import { User, AuthState } from '../types';

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
      
      // Initialiser le service API
      await apiService.init();
      
      // Vérifier s'il y a un token stocké
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        dispatch({ type: 'SET_TOKEN', payload: token });
        
        // Récupérer les informations de l'utilisateur
        const response = await apiService.getCurrentUser();
        if (response.success && response.data) {
          dispatch({ type: 'SET_USER', payload: response.data });
        } else {
          // Token invalide, le supprimer
          await AsyncStorage.removeItem('auth_token');
          dispatch({ type: 'LOGOUT' });
        }
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
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const response = await apiService.googleSignIn(idToken);
      
      if (response.success && response.data) {
        const { user, token } = response.data;
        apiService.setToken(token);
        dispatch({ type: 'SET_USER', payload: user });
        dispatch({ type: 'SET_TOKEN', payload: token });
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Erreur de connexion Google' });
        return false;
      }
    } catch (error) {
      console.error('Erreur de connexion Google:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Erreur de connexion Google' });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const forgotPassword = async (email: string): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const response = await apiService.forgotPassword(email);
      
      if (response.success) {
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Erreur lors de l\'envoi de l\'email' });
        return false;
      }
    } catch (error) {
      console.error('Erreur forgot password:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Erreur lors de l\'envoi de l\'email' });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const resetPassword = async (token: string, password: string): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const response = await apiService.resetPassword(token, password);
      
      if (response.success) {
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Erreur lors de la réinitialisation' });
        return false;
      }
    } catch (error) {
      console.error('Erreur reset password:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Erreur lors de la réinitialisation' });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
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