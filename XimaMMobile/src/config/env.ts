// Configuration des variables d'environnement pour XimaM Mobile
export const ENV = {
  // API Configuration
  API_URL: 'https://xima-m-music-platform.vercel.app',
  // ou pour le développement local: 'http://192.168.1.100:3000',
  
  // Cloudinary Configuration
  CLOUDINARY_CLOUD_NAME: 'dtgglgtfx',
  CLOUDINARY_API_KEY: '355147446149394',
  CLOUDINARY_API_SECRET: 'avwrxcHmhfe-3MxCNVFAlpgund0',
  CLOUDINARY_UPLOAD_PRESET: 'ximam-music',
  
  // Stripe Configuration
  STRIPE_PUBLISHABLE_KEY: 'pk_test_your_stripe_key',
  
  // Google Sign-In
  GOOGLE_WEB_CLIENT_ID: '524152832188-cgmbeo0eugh86rdg6ievuqr5i68p32mu.apps.googleusercontent.com',
  
  // App Configuration
  APP_NAME: 'XimaM',
  APP_VERSION: '1.0.0',
  
  // Features
  ENABLE_PUSH_NOTIFICATIONS: true,
  ENABLE_BIOMETRICS: true,
  ENABLE_OFFLINE_MODE: true,
  
  // Audio Configuration
  AUDIO_QUALITY: 'high', // 'low', 'medium', 'high'
  MAX_AUDIO_DURATION: 300, // 5 minutes en secondes
  
  // Cache Configuration
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 heures en millisecondes
  MAX_CACHE_SIZE: 100 * 1024 * 1024, // 100 MB
  
  // UI Configuration
  THEME: 'dark', // 'light', 'dark', 'auto'
  ANIMATION_DURATION: 300,
  
  // Social Features
  ENABLE_COMMENTS: true,
  ENABLE_LIKES: true,
  ENABLE_SHARING: true,
  ENABLE_MESSAGING: true,
  
  // Moderation
  ENABLE_CONTENT_MODERATION: true,
  ENABLE_USER_REPORTING: true,
  
  // Analytics
  ENABLE_ANALYTICS: true,
  ANALYTICS_ID: 'your-analytics-id',
};

// Configuration pour le développement
export const DEV_CONFIG = {
  ...ENV,
  API_URL: 'http://localhost:3000', // URL locale pour le développement
  ENABLE_DEBUG_MODE: true,
  LOG_LEVEL: 'debug',
};

// Configuration pour la production
export const PROD_CONFIG = {
  ...ENV,
  ENABLE_DEBUG_MODE: false,
  LOG_LEVEL: 'error',
};

// Sélectionner la configuration selon l'environnement
export const CONFIG = __DEV__ ? DEV_CONFIG : PROD_CONFIG;

export default CONFIG; 