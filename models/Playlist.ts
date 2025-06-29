import mongoose, { Schema, Document } from 'mongoose';

export interface IPlaylist extends Document {
  name: string;
  description?: string;
  coverUrl?: string;
  coverPublicId?: string;
  createdBy: mongoose.Types.ObjectId;
  tracks: mongoose.Types.ObjectId[];
  isPublic: boolean;
  isCollaborative: boolean;
  collaborators: mongoose.Types.ObjectId[];
  likes: mongoose.Types.ObjectId[];
  followers: mongoose.Types.ObjectId[];
  totalDuration: number;
  createdAt: Date;
  updatedAt: Date;
}

const PlaylistSchema = new Schema<IPlaylist>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  coverUrl: {
    type: String,
  },
  coverPublicId: {
    type: String,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  tracks: [{
    type: Schema.Types.ObjectId,
    ref: 'Track',
  }],
  isPublic: {
    type: Boolean,
    default: true,
  },
  isCollaborative: {
    type: Boolean,
    default: false,
  },
  collaborators: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  followers: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  totalDuration: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

PlaylistSchema.index({ createdBy: 1 });
PlaylistSchema.index({ name: 'text', description: 'text' });
PlaylistSchema.index({ isPublic: 1, createdAt: -1 });

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