import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[]; // 2 utilisateurs
  accepted: boolean; // true si la demande est acceptée
  lastMessage?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>({
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  accepted: {
    type: Boolean,
    default: false,
  },
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
  },
}, {
  timestamps: true,
});

ConversationSchema.index({ participants: 1 });

const Conversation = mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);

export default Conversation; 