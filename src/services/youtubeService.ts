function ytSearch(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export async function enrichDiyGuides(
  guides: { title: string; uri: string; platform: string; difficulty: string }[],
  deviceName: string,
  issue: string
): Promise<typeof guides> {
  if (!guides?.length) return guides;

  const queries = guides.map(g => {
    const firstWord = deviceName.toLowerCase().split(" ")[0];
    return g.title.toLowerCase().includes(firstWord)
      ? g.title
      : `${deviceName} ${issue || g.title} repair`;
  });

  let urls = queries.map(ytSearch);

  try {
    const response = await fetch("/api/youtube", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries }),
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data?.urls) && data.urls.length === queries.length) {
        urls = data.urls;
      }
    }
  } catch {
    // Keep safe YouTube search fallbacks.
  }

  return guides.map((g, i) => ({
    ...g,
    uri: urls[i],
    platform: "youtube" as const,
  }));
}
