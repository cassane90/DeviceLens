function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") return JSON.parse(req.body);
  return req.body;
}

async function searchIFixit(query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);

  try {
    const url = `https://www.ifixit.com/api/2.0/suggest/${encodeURIComponent(query)}?doctypes=guide,device`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "DeviceLens/1.0 (repair-guide lookup)",
        "Accept": "application/json"
      }
    });

    clearTimeout(timer);
    if (!response.ok) return [];

    const data = await response.json();
    return Array.isArray(data?.results) ? data.results : [];
  } catch {
    clearTimeout(timer);
    return [];
  }
}

function normalizeGuide(item) {
  if (!item || item.dataType !== "guide" || !item.url) return null;

  return {
    title: String(item.title || item.subject || "Repair guide"),
    url: String(item.url),
    source: "iFixit",
    summary: typeof item.summary === "string" ? item.summary.slice(0, 180) : "",
    image: item?.image?.thumbnail || item?.image?.mini || ""
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body;
  try {
    body = parseBody(req);
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const deviceName = typeof body?.deviceName === "string" ? body.deviceName.trim().slice(0, 120) : "";
  const issue = typeof body?.issue === "string" ? body.issue.trim().slice(0, 180) : "";

  if (!deviceName) return res.status(200).json({ guides: [] });

  const firstQuery = [deviceName, issue].filter(Boolean).join(" ");
  const first = await searchIFixit(firstQuery);

  let merged = first;
  if (first.filter(item => item?.dataType === "guide").length < 2 && issue) {
    const fallback = await searchIFixit(deviceName);
    merged = [...first, ...fallback];
  }

  const seen = new Set();
  const guides = merged
    .map(normalizeGuide)
    .filter(Boolean)
    .filter(guide => {
      if (seen.has(guide.url)) return false;
      seen.add(guide.url);
      return true;
    })
    .slice(0, 4);

  return res.status(200).json({ guides });
}
