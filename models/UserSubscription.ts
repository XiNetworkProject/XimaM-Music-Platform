import mongoose, { Schema, Document } from 'mongoose';

export interface IUserSubscription extends Document {
  user: mongoose.Types.ObjectId;
  subscription: mongoose.Types.ObjectId;
  status: 'active' | 'canceled' | 'expired' | 'trial';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  usage: {
    uploads: number;
    comments: number;
    plays: number;
    playlists: number;
  };
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSubscriptionSchema = new Schema<IUserSubscription>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  subscription: {
    type: Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'canceled', 'expired', 'trial'],
    default: 'trial'
  },
  currentPeriodStart: {
    type: Date,
    required: true,
    default: Date.now
  },
  currentPeriodEnd: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 jours
  },
  usage: {
    uploads: {
      type: Number,
      default: 0
    },
    comments: {
      type: Number,
      default: 0
    },
    plays: {
      type: Number,
      default: 0
    },
    playlists: {
      type: Number,
      default: 0
    }
  },
  stripeSubscriptionId: {
    type: String
  },
  stripeCustomerId: {
    type: String
  }
}, {
  timestamps: true
});

// Index pour optimiser les requêtes
UserSubscriptionSchema.index({ status: 1 });
UserSubscriptionSchema.index({ currentPeriodEnd: 1 });

export default mongoose.models.UserSubscription || mongoose.model<IUserSubscription>('UserSubscription', UserSubscriptionSchema); 