import mongoose, { Schema, Document } from 'mongoose';

export interface IUserStatus extends Document {
  userId: mongoose.Types.ObjectId;
  isOnline: boolean;
  lastSeen: Date;
  isTyping: boolean;
  typingInConversation?: mongoose.Types.ObjectId;
  lastActivity: Date;
  deviceInfo?: {
    userAgent: string;
    platform: string;
    isMobile: boolean;
  };
  connectionId?: string; // Pour identifier les connexions multiples
  createdAt: Date;
  updatedAt: Date;
}

const UserStatusSchema = new Schema<IUserStatus>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  isTyping: {
    type: Boolean,
    default: false,
  },
  typingInConversation: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  deviceInfo: {
    userAgent: String,
    platform: String,
    isMobile: Boolean,
  },
  connectionId: {
    type: String,
    index: true,
  },
}, {
  timestamps: true,
});

// Index pour les requêtes fréquentes
UserStatusSchema.index({ isOnline: 1, lastSeen: -1 });
UserStatusSchema.index({ userId: 1, isOnline: 1 });
UserStatusSchema.index({ isTyping: 1, typingInConversation: 1 });

// Méthode pour mettre à jour le statut
UserStatusSchema.methods.updateStatus = function(updates: Partial<IUserStatus>) {
  Object.assign(this, updates);
  this.lastActivity = new Date();
  return this.save();
};

// Méthode statique pour nettoyer les statuts expirés
UserStatusSchema.statics.cleanupExpiredStatuses = async function() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.updateMany(
    { lastActivity: { $lt: fiveMinutesAgo }, isOnline: true },
    { isOnline: false }
  );
};

const UserStatus = mongoose.models.UserStatus || mongoose.model<IUserStatus>('UserStatus', UserStatusSchema);

export default UserStatus; 