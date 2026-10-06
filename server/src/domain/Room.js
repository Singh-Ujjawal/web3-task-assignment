import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { parseVideoId } from '../utils/youtube.js';
import Participant from './Participant.js';
import RoomError from './RoomError.js';
import { ASSIGNABLE_ROLES, CONTROL_ACTIONS, ROLES, can } from './permissions.js';

const REACTIONS = ['👍', '❤️', '😂', '😮', '👏', '🔥', '😢', '🎉'];

export default class Room {
  constructor({ io, record, onChange, onEmpty }) {
    this.io = io;
    this.id = record.roomId;
    this.hostId = record.hostId;
    this.videoId = record.videoId;
    this.playState = record.playState;
    this.baseTime = record.currentTime;
    this.updatedAt = Date.now();
    this.onChange = onChange;
    this.onEmpty = onEmpty;
    this.participants = new Map();
    this.requests = new Map();
    this.messages = [];
    this.lastReaction = new Map();
  }

  position() {
    if (this.playState === 'playing') {
      return this.baseTime + (Date.now() - this.updatedAt) / 1000;
    }
    return this.baseTime;
  }

  playback() {
    return {
      playState: this.playState,
      currentTime: this.position(),
      videoId: this.videoId
    };
  }

  list() {
    return [...this.participants.values()]
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((p) => p.toJSON());
  }

  pendingRequests() {
    return [...this.requests.values()];
  }

  broadcast(event, payload) {
    this.io.to(this.id).emit(event, payload);
  }

  broadcastPlayback(meta) {
    this.broadcast('sync_state', { ...this.playback(), ...meta });
  }

  snapshotFor(userId) {
    return {
      roomId: this.id,
      me: this.participants.get(userId).toJSON(),
      participants: this.list(),
      playback: this.playback(),
      requests: this.pendingRequests(),
      messages: this.messages
    };
  }

  actor(userId) {
    const participant = this.participants.get(userId);
    if (!participant) throw new RoomError('You are not part of this room');
    return participant;
  }

  authorize(userId, action) {
    const participant = this.actor(userId);
    if (!can(participant.role, action)) {
      throw new RoomError(`Your role (${participant.role}) is not allowed to do that`);
    }
    return participant;
  }

  join(userId, username, socketId) {
    const existing = this.participants.get(userId);
    if (existing) {
      existing.reconnect(socketId, username);
      return { participant: existing, rejoined: true };
    }
    const role = userId === this.hostId ? ROLES.HOST : ROLES.PARTICIPANT;
    const participant = new Participant({ userId, username, role, socketId });
    this.participants.set(userId, participant);
    return { participant, rejoined: false };
  }

  handleDisconnect(userId, socketId) {
    const participant = this.participants.get(userId);
    if (!participant || participant.socketId !== socketId) return;
    participant.scheduleDrop(config.reconnectGraceMs, () => this.leave(userId));
  }

  leave(userId) {
    const participant = this.participants.get(userId);
    if (!participant) return;
    participant.cancelDrop();
    this.participants.delete(userId);
    this.dropRequestsFrom(userId);

    let successor = null;
    if (participant.role === ROLES.HOST) {
      successor = this.promoteSuccessor();
    }

    this.broadcast('user_left', {
      username: participant.username,
      userId,
      participants: this.list()
    });

    if (successor) {
      this.broadcast('host_transferred', {
        previousHostId: userId,
        newHostId: successor.userId,
        username: successor.username,
        participants: this.list()
      });
    }

    this.broadcast('requests_updated', { requests: this.pendingRequests() });

    if (this.participants.size === 0) {
      this.onEmpty(this);
    }
  }

  promoteSuccessor() {
    const remaining = [...this.participants.values()].sort((a, b) => a.joinedAt - b.joinedAt);
    const next = remaining.find((p) => p.role === ROLES.MODERATOR) || remaining[0];
    if (!next) return null;
    next.role = ROLES.HOST;
    this.hostId = next.userId;
    this.onChange(this);
    return next;
  }

  dropRequestsFrom(userId) {
    for (const [id, request] of this.requests) {
      if (request.userId === userId) this.requests.delete(id);
    }
  }

  normalizePayload(action, payload = {}) {
    if (action === 'seek') {
      const time = Number(payload.time);
      if (!Number.isFinite(time) || time < 0) throw new RoomError('Invalid seek time');
      return { time };
    }
    if (action === 'change_video') {
      const videoId = parseVideoId(payload.videoId);
      if (!videoId) throw new RoomError('Invalid YouTube link or video id');
      return { videoId };
    }
    if (action === 'play' || action === 'pause') {
      const time = Number(payload.time);
      return Number.isFinite(time) && time >= 0 ? { time } : {};
    }
    throw new RoomError('Unknown action');
  }

  applyControl(action, payload) {
    const time = payload.time !== undefined ? payload.time : this.position();
    switch (action) {
      case 'play':
        this.baseTime = time;
        this.playState = 'playing';
        break;
      case 'pause':
        this.baseTime = time;
        this.playState = 'paused';
        break;
      case 'seek':
        this.baseTime = time;
        break;
      case 'change_video':
        this.videoId = payload.videoId;
        this.baseTime = 0;
        this.playState = 'playing';
        break;
      default:
        throw new RoomError('Unknown action');
    }
    this.updatedAt = Date.now();
    this.onChange(this);
  }

  control(userId, action, rawPayload) {
    const actor = this.authorize(userId, action);
    const payload = this.normalizePayload(action, rawPayload);
    this.applyControl(action, payload);
    this.broadcastPlayback({ action, by: actor.username });
  }

  submitRequest(userId, action, rawPayload) {
    const actor = this.authorize(userId, 'request_change');
    if (!CONTROL_ACTIONS.includes(action)) throw new RoomError('Unknown action');
    const payload = this.normalizePayload(action, rawPayload);
    const mine = this.pendingRequests().filter((r) => r.userId === userId);
    if (mine.length >= config.maxPendingPerUser) {
      throw new RoomError('You have too many pending requests');
    }
    const request = {
      id: randomUUID(),
      userId,
      username: actor.username,
      action,
      payload: action === 'play' || action === 'pause' ? {} : payload,
      createdAt: Date.now()
    };
    this.requests.set(request.id, request);
    this.broadcast('requests_updated', { requests: this.pendingRequests() });
  }

  reviewRequest(userId, requestId, approve) {
    const reviewer = this.authorize(userId, 'review_request');
    const request = this.requests.get(requestId);
    if (!request) throw new RoomError('Request no longer exists');
    this.requests.delete(requestId);

    if (approve) {
      this.applyControl(request.action, request.payload);
      this.broadcastPlayback({
        action: request.action,
        by: `${request.username} (approved by ${reviewer.username})`
      });
    }

    this.broadcast('request_resolved', {
      requestId,
      userId: request.userId,
      username: request.username,
      action: request.action,
      approved: approve,
      reviewer: reviewer.username
    });
    this.broadcast('requests_updated', { requests: this.pendingRequests() });
  }

  assignRole(userId, targetId, role) {
    this.authorize(userId, 'assign_role');
    if (!ASSIGNABLE_ROLES.includes(role)) throw new RoomError('Invalid role');
    const target = this.participants.get(targetId);
    if (!target) throw new RoomError('Participant not found');
    if (target.role === ROLES.HOST) throw new RoomError('The host role cannot be changed');
    target.role = role;
    this.broadcast('role_assigned', {
      userId: target.userId,
      username: target.username,
      role,
      participants: this.list()
    });
  }

  removeParticipant(userId, targetId) {
    this.authorize(userId, 'remove_participant');
    const target = this.participants.get(targetId);
    if (!target) throw new RoomError('Participant not found');
    if (target.userId === userId) throw new RoomError('The host cannot remove themselves');

    target.cancelDrop();
    this.participants.delete(targetId);
    this.dropRequestsFrom(targetId);

    this.broadcast('participant_removed', {
      userId: target.userId,
      username: target.username,
      participants: this.list()
    });
    this.broadcast('requests_updated', { requests: this.pendingRequests() });

    const targetSocket = this.io.sockets.sockets.get(target.socketId);
    if (targetSocket) {
      targetSocket.leave(this.id);
      targetSocket.data.roomId = null;
    }
  }

  transferHost(userId, targetId) {
    const current = this.authorize(userId, 'transfer_host');
    const target = this.participants.get(targetId);
    if (!target) throw new RoomError('Participant not found');
    if (target.userId === userId) throw new RoomError('You are already the host');

    current.role = ROLES.MODERATOR;
    target.role = ROLES.HOST;
    this.hostId = target.userId;
    this.onChange(this);

    this.broadcast('host_transferred', {
      previousHostId: current.userId,
      newHostId: target.userId,
      username: target.username,
      participants: this.list()
    });
  }

  addMessage(userId, text) {
    const sender = this.authorize(userId, 'chat');
    const clean = typeof text === 'string' ? text.trim().slice(0, 500) : '';
    if (!clean) throw new RoomError('Message is empty');
    const message = {
      id: randomUUID(),
      userId,
      username: sender.username,
      role: sender.role,
      text: clean,
      at: Date.now()
    };
    this.messages.push(message);
    if (this.messages.length > config.maxChatHistory) this.messages.shift();
    this.broadcast('chat_message', message);
  }

  addReaction(userId, emoji) {
    const sender = this.authorize(userId, 'react');
    if (!REACTIONS.includes(emoji)) throw new RoomError('Unsupported reaction');
    const now = Date.now();
    if (now - (this.lastReaction.get(userId) || 0) < config.reactionCooldownMs) return;
    this.lastReaction.set(userId, now);
    this.broadcast('reaction', {
      id: randomUUID(),
      userId,
      username: sender.username,
      emoji
    });
  }
}
