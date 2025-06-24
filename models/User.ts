import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name: string;
  username: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  followers: mongoose.Types.ObjectId[];
  following: mongoose.Types.ObjectId[];
  followersCount: number;
  followingCount: number;
  trackCount: number;
  likedTracks: mongoose.Types.ObjectId[];
  isVerified: boolean;
  role: 'user' | 'artist' | 'admin';
  provider?: string;
  providerId?: string;
  password?: string;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    spotify?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  avatar: {
    type: String,
  },
  bio: {
    type: String,
    maxlength: 500,
  },
  location: {
    type: String,
    maxlength: 100,
  },
  website: {
    type: String,
    maxlength: 200,
  },
  followers: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  following: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  followersCount: {
    type: Number,
    default: 0,
  },
  followingCount: {
    type: Number,
    default: 0,
  },
  trackCount: {
    type: Number,
    default: 0,
  },
  likedTracks: [{
    type: Schema.Types.ObjectId,
    ref: 'Track',
  }],
  isVerified: {
    type: Boolean,
    default: false,
  },
  role: {
    type: String,
    enum: ['user', 'artist', 'admin'],
    default: 'user',
  },
  provider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local',
  },
  providerId: {
    type: String,
  },
  password: {
    type: String,
  },
  socialLinks: {
    instagram: String,
    twitter: String,
    youtube: String,
    spotify: String,
  },
}, {
  timestamps: true,
});

// Pas besoin d'index manuels car unique: true les crée automatiquement

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema); 