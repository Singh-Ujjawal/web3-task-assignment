import { formatTime } from '../utils/youtube.js';

function describe(request) {
  switch (request.action) {
    case 'play':
      return 'play the video';
    case 'pause':
      return 'pause the video';
    case 'seek':
      return `jump to ${formatTime(request.payload.time)}`;
    case 'change_video':
      return `switch to video ${request.payload.videoId}`;
    default:
      return request.action;
  }
}

export default function RequestPanel({ requests, me, canReview, onApprove, onReject }) {
  const visible = canReview ? requests : requests.filter((r) => r.userId === me);

  if (visible.length === 0) return null;

  return (
    <section className="panel">
      <h3>{canReview ? 'Pending requests' : 'Your pending requests'}</h3>
      <ul className="requests">
        {visible.map((r) => (
          <li key={r.id}>
            <span>
              <strong>{r.userId === me ? 'You' : r.username}</strong> want to {describe(r)}
            </span>
            {canReview ? (
              <span className="row">
                <button className="btn small" onClick={() => onApprove(r.id)}>
                  Approve
                </button>
                <button className="btn ghost small" onClick={() => onReject(r.id)}>
                  Reject
                </button>
              </span>
            ) : (
              <span className="muted">Waiting for approval</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
