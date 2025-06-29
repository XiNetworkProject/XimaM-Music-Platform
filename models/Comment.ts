import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  author: mongoose.Types.ObjectId;
  track: mongoose.Types.ObjectId;
  content: string;
  likes: mongoose.Types.ObjectId[];
  replies: mongoose.Types.ObjectId[];
  parentComment?: mongoose.Types.ObjectId;
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>({
  author: {
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
  isEdited: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

CommentSchema.index({ track: 1, createdAt: -1 });
CommentSchema.index({ author: 1 });
CommentSchema.index({ parentComment: 1 });

export default mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema); 