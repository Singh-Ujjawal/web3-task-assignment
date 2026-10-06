import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Chat from '../components/Chat.jsx';
import Controls from '../components/Controls.jsx';
import ParticipantList from '../components/ParticipantList.jsx';
import Player from '../components/Player.jsx';
import ReactionBar from '../components/ReactionBar.jsx';
import ReactionOverlay from '../components/ReactionOverlay.jsx';
import RequestPanel from '../components/RequestPanel.jsx';
import useRoom from '../hooks/useRoom.js';

function RoomView({ roomId }) {
  const navigate = useNavigate();
  const room = useRoom(roomId);
  const [copied, setCopied] = useState(false);

  const canControl = room.myRole === 'host' || room.myRole === 'moderator';

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (room.status === 'error') {
    return (
      <main className="home">
        <div className="card">
          <h1>Cannot join</h1>
          <p className="error">{room.error}</p>
          <button className="btn block" onClick={() => navigate('/')}>
            Back home
          </button>
        </div>
      </main>
    );
  }

  if (room.status === 'removed') {
    return (
      <main className="home">
        <div className="card">
          <h1>Removed</h1>
          <p className="muted">The host removed you from this room.</p>
          <button className="btn block" onClick={() => navigate('/')}>
            Back home
          </button>
        </div>
      </main>
    );
  }

  if (room.status !== 'joined' || !room.playback) {
    return (
      <main className="home">
        <p className="muted">Joining room...</p>
      </main>
    );
  }

  const send = (event, payload) => room.emit(event, payload);

  const control = {
    play: (time) => (canControl ? send('play', { time }) : send('request_change', { action: 'play' })),
    pause: (time) => (canControl ? send('pause', { time }) : send('request_change', { action: 'pause' })),
    seek: (time) =>
      canControl ? send('seek', { time }) : send('request_change', { action: 'seek', payload: { time } }),
    video: (videoId) =>
      canControl
        ? send('change_video', { videoId })
        : send('request_change', { action: 'change_video', payload: { videoId } })
  };

  return (
    <div className="room">
      <header className="topbar">
        <div>
          <strong>Watch Party</strong>
          <span className="code">Room {roomId}</span>
        </div>
        <div className="row">
          <span className={`badge role-${room.myRole}`}>{room.myRole}</span>
          <button className="btn ghost small" onClick={copyLink}>
            {copied ? 'Copied' : 'Copy invite link'}
          </button>
          <button className="btn ghost small" onClick={() => navigate('/')}>
            Leave
          </button>
        </div>
      </header>

      <div className="layout">
        <div className="stage">
          <div className="player-wrap">
            <Player
              playback={room.playback}
              canControl={canControl}
              onPlay={(t) => control.play(t)}
              onPause={(t) => control.pause(t)}
              onSeek={(t) => control.seek(t)}
            />
            <ReactionOverlay reactions={room.reactions} />
          </div>
          <ReactionBar onReact={(emoji) => send('react', { emoji })} />
          <Controls
            canControl={canControl}
            onPlay={() => control.play()}
            onPause={() => control.pause()}
            onSeek={control.seek}
            onChangeVideo={control.video}
          />
        </div>

        <aside className="side">
          <ParticipantList
            participants={room.participants}
            me={room.me}
            myRole={room.myRole}
            onAssign={(userId, role) => send('assign_role', { userId, role })}
            onRemove={(userId) => send('remove_participant', { userId })}
            onTransfer={(userId) => send('transfer_host', { userId })}
          />
          <RequestPanel
            requests={room.requests}
            me={room.me}
            canReview={canControl}
            onApprove={(requestId) => send('approve_request', { requestId })}
            onReject={(requestId) => send('reject_request', { requestId })}
          />
          <Chat messages={room.messages} me={room.me} onSend={(text) => send('chat_message', { text })} />
        </aside>
      </div>

      <div className="toasts">
        {room.toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone}`}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Room() {
  const { roomId } = useParams();
  const code = roomId.toUpperCase();
  return <RoomView key={code} roomId={code} />;
}
