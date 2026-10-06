export default class RoomError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RoomError';
  }
}
