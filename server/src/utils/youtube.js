const ID_PATTERN = /^[\w-]{11}$/;

export function parseVideoId(input) {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  if (ID_PATTERN.test(value)) return value;

  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '');
  let candidate = null;

  if (host === 'youtu.be') {
    candidate = url.pathname.slice(1).split('/')[0];
  } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    if (url.pathname === '/watch') {
      candidate = url.searchParams.get('v');
    } else {
      const match = url.pathname.match(/^\/(embed|shorts|live|v)\/([\w-]{11})/);
      candidate = match ? match[2] : null;
    }
  }

  return candidate && ID_PATTERN.test(candidate) ? candidate : null;
}
