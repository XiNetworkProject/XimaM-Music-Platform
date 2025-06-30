import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  username: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  location?: string;
  website?: string;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    soundcloud?: string;
    spotify?: string;
  };
  followers: mongoose.Types.ObjectId[];
  following: mongoose.Types.ObjectId[];
  tracks: mongoose.Types.ObjectId[];
  playlists: mongoose.Types.ObjectId[];
  likes: mongoose.Types.ObjectId[];
  isVerified: boolean;
  isArtist: boolean;
  artistName?: string;
  genre?: string[];
  totalPlays: number;
  totalLikes: number;
  createdAt: Date;
  updatedAt: Date;
  lastSeen: Date;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    notifications: {
      email: boolean;
      push: boolean;
      newFollowers: boolean;
      newLikes: boolean;
      newComments: boolean;
    };
  };
}

const UserSchema = new Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true,
    maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères']
  },
  email: {
    type: String,
    required: [true, 'L\'email est requis'],
    unique: true,
    lowercase: true,
    trim: true
  },
  username: {
    type: String,
    required: [true, 'Le nom d\'utilisateur est requis'],
    unique: true,
    trim: true,
    minlength: [3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères'],
    maxlength: [30, 'Le nom d\'utilisateur ne peut pas dépasser 30 caractères'],
    match: [/^[a-zA-Z0-9_]+$/, 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores']
  },
  avatar: {
    type: String,
    default: null
  },
  banner: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [500, 'La bio ne peut pas dépasser 500 caractères'],
    default: ''
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'La localisation ne peut pas dépasser 100 caractères'],
    default: ''
  },
  website: {
    type: String,
    trim: true,
    default: ''
  },
  socialLinks: {
    instagram: { type: String, trim: true, default: '' },
    twitter: { type: String, trim: true, default: '' },
    youtube: { type: String, trim: true, default: '' },
    soundcloud: { type: String, trim: true, default: '' },
    spotify: { type: String, trim: true, default: '' }
  },
  followers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  tracks: [{
    type: Schema.Types.ObjectId,
    ref: 'Track'
  }],
  playlists: [{
    type: Schema.Types.ObjectId,
    ref: 'Playlist'
  }],
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'Track'
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  isArtist: {
    type: Boolean,
    default: false
  },
  artistName: {
    type: String,
    trim: true,
    maxlength: [50, 'Le nom d\'artiste ne peut pas dépasser 50 caractères'],
    default: ''
  },
  genre: [{
    type: String,
    trim: true
  }],
  totalPlays: {
    type: Number,
    default: 0
  },
  totalLikes: {
    type: Number,
    default: 0
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'dark'
    },
    language: {
      type: String,
      default: 'fr'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      newFollowers: { type: Boolean, default: true },
      newLikes: { type: Boolean, default: true },
      newComments: { type: Boolean, default: true }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour améliorer les performances
// UserSchema.index({ username: 1 }); // Supprimé car unique: true crée déjà l'index
// UserSchema.index({ email: 1 }); // Supprimé car unique: true crée déjà l'index
UserSchema.index({ isArtist: 1, totalPlays: -1 });
UserSchema.index({ followers: -1 });
UserSchema.index({ 'socialLinks.instagram': 1 });
UserSchema.index({ 'socialLinks.twitter': 1 });

// Virtuals pour les statistiques
UserSchema.virtual('trackCount').get(function() {
  return this.tracks ? this.tracks.length : 0;
});

UserSchema.virtual('playlistCount').get(function() {
  return this.playlists ? this.playlists.length : 0;
});

UserSchema.virtual('followerCount').get(function() {
  return this.followers ? this.followers.length : 0;
});

UserSchema.virtual('followingCount').get(function() {
  return this.following ? this.following.length : 0;
});

UserSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Méthodes pour les interactions sociales
UserSchema.methods.follow = function(userId: string) {
  if (!this.following.includes(userId)) {
    this.following.push(userId);
    return this.save();
  }
  return Promise.resolve(this);
};

UserSchema.methods.unfollow = function(userId: string) {
  this.following = this.following.filter((id: mongoose.Types.ObjectId) => id.toString() !== userId);
  return this.save();
};

UserSchema.methods.addFollower = function(userId: string) {
  if (!this.followers.includes(userId)) {
    this.followers.push(userId);
    return this.save();
  }
  return Promise.resolve(this);
};

UserSchema.methods.removeFollower = function(userId: string) {
  this.followers = this.followers.filter((id: mongoose.Types.ObjectId) => id.toString() !== userId);
  return this.save();
};

UserSchema.methods.likeTrack = function(trackId: string) {
  if (!this.likes.includes(trackId)) {
    this.likes.push(trackId);
    return this.save();
  }
  return Promise.resolve(this);
};

UserSchema.methods.unlikeTrack = function(trackId: string) {
  this.likes = this.likes.filter((id: mongoose.Types.ObjectId) => id.toString() !== trackId);
  return this.save();
};

// Middleware pre-save pour valider
UserSchema.pre('save', function(next) {
  if (this.username && this.username.length < 3) {
    next(new Error('Le nom d\'utilisateur doit contenir au moins 3 caractères'));
  }
  if (this.bio && this.bio.length > 500) {
    next(new Error('La bio ne peut pas dépasser 500 caractères'));
  }
  next();
});

// Middleware pour mettre à jour lastSeen
UserSchema.pre('save', function(next) {
  this.lastSeen = new Date();
  next();
});

// S'assurer que le modèle n'est pas déjà compilé
const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User; 