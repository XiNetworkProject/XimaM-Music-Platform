import mongoose from 'mongoose';
import User from '@/models/User';
import Message from '@/models/Message';
import Conversation from '@/models/Conversation';
import Comment from '@/models/Comment';
import Track from '@/models/Track';
import Playlist from '@/models/Playlist';
import Subscription from '@/models/Subscription';
import Payment from '@/models/Payment';

// Fonction pour initialiser tous les modèles
export function initializeModels() {
  // Cette fonction force l'enregistrement de tous les modèles
  // même si on ne les utilise pas directement
  const models = {
    User,
    Message,
    Conversation,
    Comment,
    Track,
    Playlist,
    Subscription,
    Payment
  };

  // Vérifier que tous les modèles sont bien enregistrés
  Object.entries(models).forEach(([name, model]) => {
    if (!mongoose.models[name]) {
      console.warn(`⚠️ Modèle ${name} non enregistré`);
    } else {
      console.log(`✅ Modèle ${name} enregistré`);
    }
  });

  return models;
}

// Initialiser les modèles au chargement du module
initializeModels();

export { User, Message, Conversation, Comment, Track, Playlist, Subscription, Payment }; 