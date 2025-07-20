import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  user: mongoose.Types.ObjectId;
  track: mongoose.Types.ObjectId;
  content: string;
  likes: mongoose.Types.ObjectId[];
  replies: mongoose.Types.ObjectId[];
  parentComment?: mongoose.Types.ObjectId;
  reactions?: {
    [key: string]: {
      count: number;
      users: mongoose.Types.ObjectId[];
    };
  };
  isModerated?: boolean;
  moderationScore?: number;
  // Nouvelles propriétés pour la modération créateur
  isDeleted?: boolean;
  deletedBy?: mongoose.Types.ObjectId; // ID de l'utilisateur qui a supprimé
  deletedAt?: Date;
  deletionReason?: string;
  isCreatorFavorite?: boolean; // Si le créateur a "adoré" ce commentaire
  creatorFavoriteAt?: Date;
  creatorFavoriteBy?: mongoose.Types.ObjectId; // ID du créateur qui a adoré
  // Système de filtrage avancé pour créateurs
  customFiltered?: boolean; // Si le commentaire a été filtré par le créateur
  customFilterReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  track: {
    type: Schema.Types.ObjectId,
    ref: 'Track',
    required: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  replies: [{
    type: Schema.Types.ObjectId,
    ref: 'Comment',
  }],
  parentComment: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
  },
  reactions: {
    type: Map,
    of: {
      count: { type: Number, default: 0 },
      users: [{ type: Schema.Types.ObjectId, ref: 'User' }]
    },
    default: {}
  },
  isModerated: {
    type: Boolean,
    default: false,
  },
  moderationScore: {
    type: Number,
    default: 0,
  },
  // Nouvelles propriétés pour la modération créateur
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  deletedAt: {
    type: Date,
  },
  deletionReason: {
    type: String,
    enum: ['user', 'creator', 'admin', 'spam', 'inappropriate', 'other'],
    default: 'user',
  },
  isCreatorFavorite: {
    type: Boolean,
    default: false,
  },
  creatorFavoriteAt: {
    type: Date,
  },
  creatorFavoriteBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  // Système de filtrage avancé pour créateurs
  customFiltered: {
    type: Boolean,
    default: false,
  },
  customFilterReason: {
    type: String,
    maxlength: 200,
  },
}, {
  timestamps: true,
});

// Index pour les requêtes de modération
CommentSchema.index({ track: 1, isDeleted: 1 });
CommentSchema.index({ track: 1, isCreatorFavorite: 1 });
CommentSchema.index({ track: 1, customFiltered: 1 });
CommentSchema.index({ user: 1, isDeleted: 1 });
CommentSchema.index({ deletedBy: 1, deletedAt: 1 });

export default mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema); 