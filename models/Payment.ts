import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  userId: string;
  subscriptionId: string;
  stripePaymentIntentId: string;
  stripeSubscriptionId?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  paymentMethod: string;
  metadata: {
    subscriptionType: string;
    features: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  subscriptionId: {
    type: String,
    required: true,
    ref: 'Subscription'
  },
  stripePaymentIntentId: {
    type: String,
    required: true,
    unique: true
  },
  stripeSubscriptionId: {
    type: String
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'eur'
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'succeeded', 'failed', 'canceled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    required: true
  },
  metadata: {
    subscriptionType: {
      type: String,
      required: true
    },
    features: [{
      type: String
    }]
  }
}, {
  timestamps: true
});

// Index pour les requêtes fréquentes
PaymentSchema.index({ userId: 1, status: 1 });

export default mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema); 