const YT_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

function ytSearch(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

async function findYouTubeVideo(query: string): Promise<string> {
  if (!YT_API_KEY) return ytSearch(query);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const url = `https://www.googleapis.com/youtube/v3/search?part=id&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${YT_API_KEY}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return ytSearch(query);
    const data = await res.json() as { items?: { id?: { videoId?: string } }[] };
    const videoId = data.items?.[0]?.id?.videoId;
    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : ytSearch(query);
  } catch {
    return ytSearch(query);
  }
}

export async function enrichDiyGuides(
  guides: { title: string; uri: string; platform: string; difficulty: string }[],
  deviceName: string,
  issue: string
): Promise<typeof guides> {
  if (!guides?.length) return guides;
  const queries = guides.map(g => {
    const firstWord = deviceName.toLowerCase().split(' ')[0];
    return g.title.toLowerCase().includes(firstWord)
      ? g.title
      : `${deviceName} ${issue || g.title} repair`;
  });
  const results = await Promise.all(queries.map(q => findYouTubeVideo(q)));
  return guides.map((g, i) => ({
    ...g,
    uri: results[i],
    platform: 'youtube' as const,
  }));
}
