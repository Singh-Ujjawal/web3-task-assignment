import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    hostId: { type: String, required: true },
    hostName: { type: String, required: true },
    videoId: { type: String, required: true },
    playState: { type: String, enum: ['playing', 'paused'], default: 'paused' },
    currentTime: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export default mongoose.model('Room', roomSchema);
