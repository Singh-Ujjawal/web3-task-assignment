import RoomError from '../domain/RoomError.js';

export default class MessageHandler {
  constructor(socket, manager) {
    this.socket = socket;
    this.manager = manager;
  }

  register() {
    this.bind('join_room', (data) => this.joinRoom(data));
    this.bind('leave_room', () => this.leaveRoom());
    this.bind('play', (data) => this.control('play', data));
    this.bind('pause', (data) => this.control('pause', data));
    this.bind('seek', (data) => this.control('seek', data));
    this.bind('change_video', (data) => this.control('change_video', data));
    this.bind('assign_role', (data) => this.assignRole(data));
    this.bind('remove_participant', (data) => this.removeParticipant(data));
    this.bind('transfer_host', (data) => this.transferHost(data));
    this.bind('request_change', (data) => this.requestChange(data));
    this.bind('approve_request', (data) => this.review(data, true));
    this.bind('reject_request', (data) => this.review(data, false));
    this.bind('chat_message', (data) => this.chat(data));
    this.bind('react', (data) => this.react(data));
    this.socket.on('disconnect', () => this.onDisconnect());
  }

  bind(event, handler) {
    this.socket.on(event, async (payload, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        const result = await handler(payload && typeof payload === 'object' ? payload : {});
        reply({ ok: true, ...(result || {}) });
      } catch (err) {
        if (err instanceof RoomError) {
          this.socket.emit('action_denied', { action: event, reason: err.message });
          reply({ ok: false, error: err.message });
        } else {
          console.error(`Handler ${event} failed`, err);
          reply({ ok: false, error: 'Something went wrong' });
        }
      }
    });
  }

  currentRoom() {
    const { roomId } = this.socket.data;
    const room = roomId ? this.manager.peek(roomId) : null;
    if (!room) throw new RoomError('You are not in a room');
    return room;
  }

  userId() {
    return this.socket.data.userId;
  }

  async joinRoom({ roomId }) {
    if (typeof roomId !== 'string' || !roomId.trim()) throw new RoomError('Room code is required');

    const code = roomId.trim().toUpperCase();
    if (this.socket.data.roomId && this.socket.data.roomId !== code) {
      this.leaveRoom();
    }

    const room = await this.manager.get(code);
    if (!room) throw new RoomError('Room not found');

    const { id: userId, name } = this.socket.data.user;
    const { participant, rejoined } = room.join(userId, name, this.socket.id);

    this.socket.join(room.id);
    this.socket.data.roomId = room.id;
    this.socket.data.userId = userId;

    if (!rejoined) {
      room.broadcast('user_joined', {
        username: participant.username,
        userId,
        role: participant.role,
        participants: room.list()
      });
    }

    return { snapshot: room.snapshotFor(userId) };
  }

  leaveRoom() {
    const { roomId, userId } = this.socket.data;
    const room = roomId ? this.manager.peek(roomId) : null;
    if (room && userId) {
      this.socket.leave(roomId);
      room.leave(userId);
    }
    this.socket.data.roomId = null;
    this.socket.data.userId = null;
  }

  control(action, data) {
    this.currentRoom().control(this.userId(), action, data);
  }

  assignRole({ userId, role }) {
    this.currentRoom().assignRole(this.userId(), userId, role);
  }

  removeParticipant({ userId }) {
    this.currentRoom().removeParticipant(this.userId(), userId);
  }

  transferHost({ userId }) {
    this.currentRoom().transferHost(this.userId(), userId);
  }

  requestChange({ action, payload }) {
    this.currentRoom().submitRequest(this.userId(), action, payload);
  }

  review({ requestId }, approve) {
    this.currentRoom().reviewRequest(this.userId(), requestId, approve);
  }

  chat({ text }) {
    this.currentRoom().addMessage(this.userId(), text);
  }

  react({ emoji }) {
    this.currentRoom().addReaction(this.userId(), emoji);
  }

  onDisconnect() {
    const { roomId, userId } = this.socket.data;
    const room = roomId ? this.manager.peek(roomId) : null;
    if (room && userId) {
      room.handleDisconnect(userId, this.socket.id);
    }
  }
}
