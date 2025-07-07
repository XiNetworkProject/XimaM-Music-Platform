import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription extends Document {
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  limits: {
    uploads: number; // -1 pour illimité
    comments: number; // -1 pour illimité
    plays: number; // -1 pour illimité
    playlists: number; // -1 pour illimité
    quality: '128kbps' | '256kbps' | '320kbps' | 'lossless' | 'master';
    ads: boolean;
    analytics: 'none' | 'basic' | 'advanced' | 'complete';
    collaborations: boolean;
    apiAccess: boolean;
    support: 'community' | 'email' | 'priority' | 'dedicated';
  };
  features: string[];
  stripePriceId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ['free', 'starter', 'creator', 'pro', 'enterprise']
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'EUR'
  },
  interval: {
    type: String,
    default: 'month',
    enum: ['month', 'year']
  },
  limits: {
    uploads: {
      type: Number,
      required: true,
      default: 3
    },
    comments: {
      type: Number,
      required: true,
      default: 10
    },
    plays: {
      type: Number,
      required: true,
      default: 50
    },
    playlists: {
      type: Number,
      required: true,
      default: 2
    },
    quality: {
      type: String,
      default: '128kbps',
      enum: ['128kbps', '256kbps', '320kbps', 'lossless', 'master']
    },
    ads: {
      type: Boolean,
      default: true
    },
    analytics: {
      type: String,
      default: 'none',
      enum: ['none', 'basic', 'advanced', 'complete']
    },
    collaborations: {
      type: Boolean,
      default: false
    },
    apiAccess: {
      type: Boolean,
      default: false
    },
    support: {
      type: String,
      default: 'community',
      enum: ['community', 'email', 'priority', 'dedicated']
    }
  },
  features: [{
    type: String
  }],
  stripePriceId: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.models.Subscription || mongoose.model<ISubscription>('Subscription', SubscriptionSchema); 