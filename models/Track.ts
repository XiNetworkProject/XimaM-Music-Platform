import mongoose, { Schema, Document } from 'mongoose';

export interface ITrack extends Document {
  title: string;
  artist: mongoose.Types.ObjectId;
  album?: string;
  duration: number;
  audioUrl: string;
  coverUrl?: string;
  audioPublicId?: string;
  coverPublicId?: string;
  genre: string[];
  tags: string[];
  description?: string;
  lyrics?: string;
  plays: number;
  likes: mongoose.Types.ObjectId[];
  comments: mongoose.Types.ObjectId[];
  isExplicit: boolean;
  isPublic: boolean;
  copyright: {
    owner: string;
    year: number;
    rights: string;
  };
  waveform?: number[];
  createdAt: Date;
  updatedAt: Date;
}

const TrackSchema = new Schema<ITrack>({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  artist: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  album: {
    type: String,
    trim: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  audioUrl: {
    type: String,
    required: true,
  },
  coverUrl: {
    type: String,
  },
  audioPublicId: {
    type: String,
  },
  coverPublicId: {
    type: String,
  },
  genre: [{
    type: String,
    trim: true,
  }],
  tags: [{
    type: String,
    trim: true,
  }],
  description: {
    type: String,
    maxlength: 1000,
  },
  lyrics: {
    type: String,
  },
  plays: {
    type: Number,
    default: 0,
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  comments: [{
    type: Schema.Types.ObjectId,
    ref: 'Comment',
  }],
  isExplicit: {
    type: Boolean,
    default: false,
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  copyright: {
    owner: {
      type: String,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    rights: {
      type: String,
      required: true,
    },
  },
  waveform: [{
    type: Number,
  }],
}, {
  timestamps: true,
});

TrackSchema.index({ title: 'text', description: 'text', tags: 'text' });
TrackSchema.index({ artist: 1 });
TrackSchema.index({ genre: 1 });
TrackSchema.index({ createdAt: -1 });

export default mongoose.models.Track || mongoose.model<ITrack>('Track', TrackSchema); 