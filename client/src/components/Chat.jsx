import { useEffect, useRef, useState } from 'react';

export default function Chat({ messages, me, onSend }) {
  const [text, setText] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  return (
    <section className="panel chat">
      <h3>Chat</h3>
      <div className="chat-log">
        {messages.length === 0 && <p className="muted">No messages yet</p>}
        {messages.map((m) => (
          <div key={m.id} className={`chat-line ${m.userId === me ? 'mine' : ''}`}>
            <strong>{m.username}</strong>
            <span>{m.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form className="row" onSubmit={submit}>
        <input value={text} maxLength={500} onChange={(e) => setText(e.target.value)} placeholder="Say something" />
        <button className="btn" type="submit">
          Send
        </button>
      </form>
    </section>
  );
}
