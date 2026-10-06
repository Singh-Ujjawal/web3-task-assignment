export default function ReactionOverlay({ reactions }) {
  return (
    <div className="reaction-overlay">
      {reactions.map((r) => (
        <div key={r.id} className="floating-reaction" style={{ left: `${r.left}%` }}>
          <span className="emoji">{r.emoji}</span>
          <span className="who">{r.username}</span>
        </div>
      ))}
    </div>
  );
}
