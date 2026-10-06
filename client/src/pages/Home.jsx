import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom, roomExists } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Home() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setBusy(true);
    setError('');
    try {
      const roomId = await createRoom();
      navigate(`/room/${roomId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    const roomId = code.trim().toUpperCase();
    if (!roomId) {
      setError('Enter a room code');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (await roomExists(roomId)) {
        navigate(`/room/${roomId}`);
      } else {
        setError('No room found with that code');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="home">
      <div className="card">
        <h1>Watch Party</h1>
        <p className="muted">
          Signed in as <strong>{user.name}</strong> ·{' '}
          <button className="link" onClick={signOut}>
            Log out
          </button>
        </p>

        <button className="btn block" disabled={busy} onClick={handleCreate}>
          Create a room
        </button>

        <div className="divider">
          <span>or join one</span>
        </div>

        <form className="row" onSubmit={handleJoin}>
          <input value={code} maxLength={8} onChange={(e) => setCode(e.target.value)} placeholder="Room code" />
          <button className="btn ghost" disabled={busy} type="submit">
            Join
          </button>
        </form>

        {error && <p className="error">{error}</p>}
      </div>
    </main>
  );
}
