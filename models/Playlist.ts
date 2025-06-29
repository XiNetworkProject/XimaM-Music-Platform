import mongoose, { Schema, Document } from 'mongoose';

export interface IPlaylist extends Document {
  name: string;
  description: string;
  coverUrl?: string;
  tracks: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  isPublic: boolean;
  likes: mongoose.Types.ObjectId[];
  followers: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const PlaylistSchema = new Schema<IPlaylist>({
  name: {
    type: String,
    required: [true, 'Le nom de la playlist est requis'],
    trim: true,
    maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères'],
    default: ''
  },
  coverUrl: {
    type: String,
    default: null
  },
  tracks: [{
    type: Schema.Types.ObjectId,
    ref: 'Track'
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  followers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour améliorer les performances
PlaylistSchema.index({ createdBy: 1, createdAt: -1 });
PlaylistSchema.index({ isPublic: 1, likes: -1 });
PlaylistSchema.index({ name: 'text', description: 'text' });

// Virtual pour le nombre de pistes
PlaylistSchema.virtual('trackCount').get(function() {
  return this.tracks.length;
});

// Virtual pour la durée totale
PlaylistSchema.virtual('duration').get(function() {
  // Cette valeur sera calculée dynamiquement lors de la récupération
  return 0;
});

// Méthode pour ajouter une piste
PlaylistSchema.methods.addTrack = function(trackId: string) {
  const trackObjectId = new mongoose.Types.ObjectId(trackId);
  if (!this.tracks.some((id: mongoose.Types.ObjectId) => id.equals(trackObjectId))) {
    this.tracks.push(trackObjectId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Méthode pour retirer une piste
PlaylistSchema.methods.removeTrack = function(trackId: string) {
  const trackObjectId = new mongoose.Types.ObjectId(trackId);
  this.tracks = this.tracks.filter((id: mongoose.Types.ObjectId) => !id.equals(trackObjectId));
  return this.save();
};

// Méthode pour liker/unliker
PlaylistSchema.methods.toggleLike = function(userId: string) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const userIndex = this.likes.findIndex((id: mongoose.Types.ObjectId) => id.equals(userObjectId));
  if (userIndex > -1) {
    this.likes.splice(userIndex, 1);
  } else {
    this.likes.push(userObjectId);
  }
  return this.save();
};

// Méthode pour suivre/ne plus suivre
PlaylistSchema.methods.toggleFollow = function(userId: string) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const userIndex = this.followers.findIndex((id: mongoose.Types.ObjectId) => id.equals(userObjectId));
  if (userIndex > -1) {
    this.followers.splice(userIndex, 1);
  } else {
    this.followers.push(userObjectId);
  }
  return this.save();
};

// Middleware pre-save pour valider
PlaylistSchema.pre('save', function(next) {
  if (this.name.trim().length === 0) {
    next(new Error('Le nom de la playlist ne peut pas être vide'));
  }
  next();
});

export default mongoose.models.Playlist || mongoose.model<IPlaylist>('Playlist', PlaylistSchema); 