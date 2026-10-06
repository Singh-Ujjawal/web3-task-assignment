# YouTube Watch Party

Watch YouTube videos together in real time. Create a room, share the code or link, and everyone sees the same play/pause state, seek position and video.

**Live demo:** `https://web3-task-assignment.onrender.com/`

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | React 18, Vite, React Router |
| Backend | Node.js, Express |
| Real-time | Socket.IO (WebSockets) |
| Auth | JWT, bcrypt password hashing |
| Database | MongoDB (Mongoose) |
| Video | YouTube IFrame Player API |

## Features

- Email/password sign up and login with JWT; REST routes and the WebSocket handshake both verify the token
- Emoji reactions that float over the video for everyone
- Create a room (creator becomes Host) or join with a room code / invite link
- Synchronized play, pause, seek and change-video
- Roles: Host, Moderator, Participant, Viewer
  - Host: everything, plus assign roles, remove participants, transfer host
  - Moderator: play, pause, seek, change video, approve requests
  - Participant / Viewer: watch, chat, and request changes
- Participants can request a play/pause/seek/video change; Host or Moderators approve or reject it
- Live participant list with roles, chat, toast notifications
- Rooms persisted in MongoDB; refresh/reconnect keeps your role (8s grace before removal)
- Host leaving auto-promotes a moderator (or the longest-present member)

## Running locally

Requirements: Node 18+, a MongoDB instance (local or Atlas).

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` and `/socket.io` to the backend on port 5001.

### Environment variables

Server (`server/.env`):

| Name | Description |
| --- | --- |
| `PORT` | HTTP port (default 5001) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string used to sign tokens |
| `CLIENT_ORIGIN` | Allowed CORS origin(s), comma separated. `*` by default |

Client (`client/.env`, optional): `VITE_SERVER_URL` is only needed when the backend is hosted on a different origin than the frontend.

## Production / deployment (Render)

The Express server serves the built React app, so one web service is enough.

1. Create a free MongoDB Atlas cluster and copy its connection string.
2. Push this repo to GitHub, then create a Render **Web Service** from it (or use the included `render.yaml`).
3. Build command: `npm run build`  Start command: `npm start`
4. Set `MONGODB_URI` and `JWT_SECRET` in the service environment.
5. Deploy and paste the public URL at the top of this README.

## Architecture

```
React (Vite) ──HTTP──▶ Express  POST /api/rooms, GET /api/rooms/:id
     │
     └──WebSocket (Socket.IO)──▶ MessageHandler ──▶ RoomManager ──▶ Room ──▶ Participant
                                                         │
                                                      MongoDB (room id, host, video, play state)
```

- `server/src/domain/Room.js` owns all room state (participants, playback, requests, chat) and every rule. It validates the actor's role through `permissions.js` before mutating state, then broadcasts to the Socket.IO room.
- `RoomManager` creates rooms, lazily loads them from MongoDB, and persists changes.
- `MessageHandler` is created per socket, binds the events and converts `RoomError`s into `action_denied` messages.
- Clients never trust each other: only the server broadcasts `sync_state`, and it rejects control events from roles that lack permission.

### How sync works

The server stores `{ playState, baseTime, updatedAt }`. While playing, the current position is `baseTime + (now - updatedAt)`, so late joiners start at the right spot. Host/moderator players report user actions (play, pause, a seek jump detected by polling) over the socket; the server updates its state and broadcasts `sync_state`. Every client applies it to its YouTube player, correcting only when drift exceeds 1.5s, and suppresses its own echo events for a short window so programmatic changes are not re-emitted. Participants and viewers have the player controls hidden and covered by an overlay.

### Authentication

Users register or log in over `/api/auth/*`; passwords are hashed with bcrypt and the server returns a signed JWT (7 days). The client stores it in localStorage and sends it as a Bearer header for REST calls and in `socket.handshake.auth` for Socket.IO. A Socket.IO middleware verifies it before the connection is accepted, so every socket is tied to a real user id, and the server ignores any identity sent in event payloads. A user keeps the same id across refreshes, so the host keeps their role.

### Socket events

Client → server: `join_room`, `leave_room`, `play`, `pause`, `seek`, `change_video`, `assign_role`, `remove_participant`, `transfer_host`, `request_change`, `approve_request`, `reject_request`, `chat_message`, `react`

Server → clients: `sync_state`, `user_joined`, `user_left`, `role_assigned`, `participant_removed`, `host_transferred`, `requests_updated`, `request_resolved`, `chat_message`, `reaction`, `action_denied`

## Trade-offs

- Room state lives in server memory (persisted to MongoDB on change), so a single instance is assumed. Scaling horizontally would need the Socket.IO Redis adapter and moving live state into Redis.
- Seek detection on the host side is polling based because the IFrame API has no seek event.
- Browsers may block autoplay for tabs the user has not interacted with; the **Resync** button fixes this.
