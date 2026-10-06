export default class Participant {
  constructor({ userId, username, role, socketId }) {
    this.userId = userId;
    this.username = username;
    this.role = role;
    this.socketId = socketId;
    this.joinedAt = Date.now();
    this.dropTimer = null;
  }

  reconnect(socketId, username) {
    this.cancelDrop();
    this.socketId = socketId;
    this.username = username;
  }

  scheduleDrop(delay, callback) {
    this.cancelDrop();
    this.dropTimer = setTimeout(callback, delay);
  }

  cancelDrop() {
    if (this.dropTimer) {
      clearTimeout(this.dropTimer);
      this.dropTimer = null;
    }
  }

  toJSON() {
    return {
      userId: this.userId,
      username: this.username,
      role: this.role,
      joinedAt: this.joinedAt
    };
  }
}
