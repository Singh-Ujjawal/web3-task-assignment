const ROLE_LABEL = {
  host: 'Host',
  moderator: 'Moderator',
  participant: 'Participant',
  viewer: 'Viewer'
};

export default function ParticipantList({ participants, me, myRole, onAssign, onRemove, onTransfer }) {
  const isHost = myRole === 'host';

  return (
    <section className="panel">
      <h3>Participants ({participants.length})</h3>
      <ul className="people">
        {participants.map((p) => {
          const self = p.userId === me;
          const manageable = isHost && !self && p.role !== 'host';
          return (
            <li key={p.userId}>
              <div className="person-main">
                <span className="avatar">{p.username.slice(0, 1).toUpperCase()}</span>
                <span className="person-name">
                  {p.username}
                  {self && <em> (you)</em>}
                </span>
                <span className={`badge role-${p.role}`}>{ROLE_LABEL[p.role]}</span>
              </div>
              {manageable && (
                <div className="person-actions">
                  <select value={p.role} onChange={(e) => onAssign(p.userId, e.target.value)}>
                    <option value="participant">Participant</option>
                    <option value="viewer">Viewer</option>
                    <option value="moderator">Moderator</option>
                  </select>
                  <button className="btn ghost small" onClick={() => onTransfer(p.userId)}>
                    Make host
                  </button>
                  <button className="btn danger small" onClick={() => onRemove(p.userId)}>
                    Remove
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
