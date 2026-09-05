function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') return JSON.parse(req.body);
  return req.body;
}

function searchUrl(query) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body;
  try {
    body = parseBody(req);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const queries = Array.isArray(body?.queries)
    ? body.queries.filter(query => typeof query === 'string').map(query => query.trim()).filter(Boolean).slice(0, 4)
    : [];

  if (!queries.length) {
    return res.status(200).json({ urls: [] });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ urls: queries.map(searchUrl), configured: false });
  }

  const urls = await Promise.all(queries.map(async query => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6_000);

    try {
      const url = new URL('https://www.googleapis.com/youtube/v3/search');
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('type', 'video');
      url.searchParams.set('maxResults', '1');
      url.searchParams.set('safeSearch', 'moderate');
      url.searchParams.set('q', query);
      url.searchParams.set('key', apiKey);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!response.ok) return searchUrl(query);
      const data = await response.json();
      const videoId = data?.items?.[0]?.id?.videoId;
      return videoId
        ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`
        : searchUrl(query);
    } catch {
      clearTimeout(timer);
      return searchUrl(query);
    }
  }));

  return res.status(200).json({ urls, configured: true });
}
