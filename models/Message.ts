import mongoose, { Schema, Document } from 'mongoose';

export type MessageType = 'text' | 'image' | 'video' | 'audio';

export interface IMessage extends Document {
  conversation: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  type: MessageType;
  content: string; // texte ou URL du fichier
  duration?: number; // pour audio/vidéo
  seenBy: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  conversation: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
  },
  seenBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: [],
  }],
}, {
  timestamps: { createdAt: true, updatedAt: false },
});

MessageSchema.index({ conversation: 1, createdAt: 1 });

const Message = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);

export default Message; 