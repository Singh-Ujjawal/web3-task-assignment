import { useState } from 'react';
import { parseTime, parseVideoId } from '../utils/youtube.js';

export default function Controls({ canControl, onPlay, onPause, onSeek, onChangeVideo }) {
  const [link, setLink] = useState('');
  const [seekValue, setSeekValue] = useState('');
  const [problem, setProblem] = useState('');

  const submitVideo = (e) => {
    e.preventDefault();
    const videoId = parseVideoId(link);
    if (!videoId) {
      setProblem('Enter a valid YouTube link');
      return;
    }
    setProblem('');
    onChangeVideo(videoId);
    setLink('');
  };

  const submitSeek = (e) => {
    e.preventDefault();
    const time = parseTime(seekValue);
    if (time === null) {
      setProblem('Use seconds or mm:ss for the position');
      return;
    }
    setProblem('');
    onSeek(time);
    setSeekValue('');
  };

  return (
    <section className="panel">
      <h3>{canControl ? 'Controls' : 'Request a change'}</h3>
      {!canControl && (
        <p className="muted">A host or moderator has to approve before your change takes effect.</p>
      )}
      <div className="row wrap">
        {!canControl && (
          <>
            <button className="btn ghost" onClick={onPlay}>
              Request play
            </button>
            <button className="btn ghost" onClick={onPause}>
              Request pause
            </button>
          </>
        )}
      </div>
      <form className="row" onSubmit={submitSeek}>
        <input value={seekValue} onChange={(e) => setSeekValue(e.target.value)} placeholder="Seek to (e.g. 1:30)" />
        <button className="btn" type="submit">
          {canControl ? 'Seek' : 'Request seek'}
        </button>
      </form>
      <form className="row" onSubmit={submitVideo}>
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste a YouTube URL" />
        <button className="btn" type="submit">
          {canControl ? 'Change video' : 'Request video'}
        </button>
      </form>
      {problem && <p className="error">{problem}</p>}
    </section>
  );
}
