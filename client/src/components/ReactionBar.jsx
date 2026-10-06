export const REACTIONS = ['👍', '❤️', '😂', '😮', '👏', '🔥', '😢', '🎉'];

export default function ReactionBar({ onReact }) {
  return (
    <div className="reaction-bar">
      {REACTIONS.map((emoji) => (
        <button key={emoji} className="reaction-btn" onClick={() => onReact(emoji)} aria-label={`React ${emoji}`}>
          {emoji}
        </button>
      ))}
    </div>
  );
}
