const ID_PATTERN = /^[\w-]{11}$/;

export function parseVideoId(input) {
  const value = (input || '').trim();
  if (ID_PATTERN.test(value)) return value;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');
    let candidate = null;
    if (host === 'youtu.be') {
      candidate = url.pathname.slice(1).split('/')[0];
    } else if (host.endsWith('youtube.com')) {
      if (url.pathname === '/watch') {
        candidate = url.searchParams.get('v');
      } else {
        const match = url.pathname.match(/^\/(embed|shorts|live|v)\/([\w-]{11})/);
        candidate = match ? match[2] : null;
      }
    }
    return candidate && ID_PATTERN.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function parseTime(input) {
  const value = (input || '').trim();
  if (!value) return null;
  const parts = value.split(':').map(Number);
  if (parts.some((n) => !Number.isFinite(n) || n < 0) || parts.length > 3) return null;
  return parts.reduce((total, n) => total * 60 + n, 0);
}

export function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

let apiPromise = null;

export function loadYouTubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (previous) previous();
        resolve(window.YT);
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    });
  }
  return apiPromise;
}
