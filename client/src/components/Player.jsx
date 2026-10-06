import { useCallback, useEffect, useRef } from 'react';
import { loadYouTubeApi } from '../utils/youtube.js';

const SUPPRESS_MS = 1200;
const DRIFT_LIMIT = 1.5;
const SEEK_JUMP = 2;

export default function Player({ playback, canControl, onPlay, onPause, onSeek }) {
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const readyRef = useRef(false);
  const playbackRef = useRef(playback);
  const suppressUntil = useRef(0);
  const tracker = useRef({ time: 0, at: Date.now() });
  const handlers = useRef({ onPlay, onPause, onSeek });

  handlers.current = { onPlay, onPause, onSeek };
  playbackRef.current = playback;

  const targetTime = (state) => {
    if (state.playState === 'playing') {
      return state.currentTime + (Date.now() - state.receivedAt) / 1000;
    }
    return state.currentTime;
  };

  const applyState = useCallback(() => {
    const player = playerRef.current;
    const state = playbackRef.current;
    if (!player || !readyRef.current || !state) return;

    suppressUntil.current = Date.now() + SUPPRESS_MS;
    const target = targetTime(state);
    const loadedId = player.getVideoData && player.getVideoData().video_id;

    if (loadedId !== state.videoId) {
      if (state.playState === 'playing') {
        player.loadVideoById({ videoId: state.videoId, startSeconds: target });
      } else {
        player.cueVideoById({ videoId: state.videoId, startSeconds: target });
      }
      tracker.current = { time: target, at: Date.now() };
      return;
    }

    if (Math.abs(player.getCurrentTime() - target) > DRIFT_LIMIT) {
      player.seekTo(target, true);
    }

    const current = player.getPlayerState();
    if (state.playState === 'playing' && current !== 1 && current !== 3) {
      player.playVideo();
    } else if (state.playState === 'paused' && (current === 1 || current === 3)) {
      player.pauseVideo();
    }
    tracker.current = { time: target, at: Date.now() };
  }, []);

  useEffect(() => {
    let cancelled = false;
    readyRef.current = false;

    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current) return;
      const mount = document.createElement('div');
      hostRef.current.innerHTML = '';
      hostRef.current.appendChild(mount);

      playerRef.current = new YT.Player(mount, {
        width: '100%',
        height: '100%',
        videoId: playbackRef.current.videoId,
        playerVars: {
          controls: canControl ? 1 : 0,
          disablekb: canControl ? 0 : 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1
        },
        events: {
          onReady: () => {
            readyRef.current = true;
            applyState();
          },
          onStateChange: (event) => {
            if (!canControl || Date.now() < suppressUntil.current) return;
            const time = event.target.getCurrentTime();
            if (event.data === 1) {
              handlers.current.onPlay(time);
            } else if (event.data === 2) {
              handlers.current.onPause(time);
            }
          }
        }
      });
    });

    return () => {
      cancelled = true;
      readyRef.current = false;
      if (playerRef.current && playerRef.current.destroy) playerRef.current.destroy();
      playerRef.current = null;
    };
  }, [canControl, applyState]);

  useEffect(() => {
    applyState();
  }, [playback, applyState]);

  useEffect(() => {
    if (!canControl) return undefined;
    const timer = setInterval(() => {
      const player = playerRef.current;
      if (!player || !readyRef.current || !player.getCurrentTime) return;
      const now = Date.now();
      const state = player.getPlayerState();
      const playing = state === 1;
      const { time, at } = tracker.current;
      const expected = playing ? time + (now - at) / 1000 : time;
      const actual = player.getCurrentTime();
      if (now > suppressUntil.current && Math.abs(actual - expected) > SEEK_JUMP) {
        handlers.current.onSeek(actual);
      }
      tracker.current = { time: actual, at: now };
    }, 500);
    return () => clearInterval(timer);
  }, [canControl]);

  const resync = () => {
    applyState();
  };

  return (
    <div className="player-shell">
      <div className="player-frame">
        <div ref={hostRef} className="player-host" />
        {!canControl && <div className="player-shield" />}
      </div>
      <div className="player-bar">
        <span className="muted">
          {canControl ? 'You control playback for everyone' : 'Playback is controlled by the host and moderators'}
        </span>
        <button className="btn ghost small" onClick={resync}>
          Resync
        </button>
      </div>
    </div>
  );
}
