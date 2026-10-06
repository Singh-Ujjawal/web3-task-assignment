import { config } from '../config.js';
import RoomModel from '../models/RoomModel.js';
import { generateRoomCode } from '../utils/identity.js';
import Room from './Room.js';

export default class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
    this.loading = new Map();
  }

  async create(userId, username) {
    let roomId = generateRoomCode();
    while (await RoomModel.exists({ roomId })) {
      roomId = generateRoomCode();
    }
    await RoomModel.create({
      roomId,
      hostId: userId,
      hostName: username,
      videoId: config.defaultVideoId,
      playState: 'paused',
      currentTime: 0
    });
    return roomId;
  }

  async exists(roomId) {
    if (this.rooms.has(roomId)) return true;
    return Boolean(await RoomModel.exists({ roomId }));
  }

  peek(roomId) {
    return this.rooms.get(roomId) || null;
  }

  async get(roomId) {
    const loaded = this.rooms.get(roomId);
    if (loaded) return loaded;

    if (!this.loading.has(roomId)) {
      const task = RoomModel.findOne({ roomId })
        .lean()
        .then((record) => {
          if (!record) return null;
          const room = new Room({
            io: this.io,
            record,
            onChange: (r) => this.persist(r),
            onEmpty: (r) => this.unload(r)
          });
          this.rooms.set(roomId, room);
          return room;
        })
        .finally(() => this.loading.delete(roomId));
      this.loading.set(roomId, task);
    }
    return this.loading.get(roomId);
  }

  unload(room) {
    this.persist(room);
    this.rooms.delete(room.id);
  }

  persist(room) {
    RoomModel.updateOne(
      { roomId: room.id },
      {
        hostId: room.hostId,
        videoId: room.videoId,
        playState: room.playState,
        currentTime: room.position()
      }
    ).catch((err) => console.error('Failed to persist room', room.id, err.message));
  }
}
