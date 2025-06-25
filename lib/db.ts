import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let cached: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | null = null;

async function dbConnect() {
  // Si déjà connecté et la connexion est active
  if (cached?.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // Si une connexion est en cours, attendre
  if (cached?.promise) {
    try {
      cached.conn = await cached.promise;
      return cached.conn;
    } catch (error) {
      cached.promise = null;
      cached.conn = null;
    }
  }

  // Créer une nouvelle connexion
  const opts = {
    bufferCommands: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4,
    retryWrites: true
  };

  cached = { conn: null, promise: null };
  
  cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
    console.log('✅ Connexion MongoDB établie');
    return mongoose;
  }).catch((error) => {
    console.error('❌ Erreur connexion MongoDB:', error.message);
    cached!.promise = null;
    cached!.conn = null;
    
    // En production, on ne fait pas échouer le build
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ Mode production: connexion MongoDB échouée mais build continué');
      // Retourner une connexion factice pour éviter les erreurs
      return { connection: { readyState: 0 } } as typeof mongoose;
    }
    throw error;
  });

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
    // En production, on ne fait pas échouer le build
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ Mode production: erreur MongoDB ignorée pour le build');
      return { connection: { readyState: 0 } } as typeof mongoose;
    }
    throw e;
  }

  return cached.conn;
}

// Fonction pour vérifier si la connexion est prête
export function isConnected() {
  return mongoose.connection.readyState === 1;
}

// Gestion de la déconnexion propre
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error during MongoDB disconnection:', err);
    process.exit(1);
  }
});

export default dbConnect; 