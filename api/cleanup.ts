function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") return JSON.parse(req.body);
  return req.body;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(204).end();

  let body;
  try {
    body = parseBody(req);
  } catch {
    return res.status(204).end();
  }

  const id = typeof body?.interactionId === "string" ? body.interactionId.trim() : "";
  if (!id || !id.startsWith("v1_")) return res.status(204).end();

  try {
    await fetch(
      `https://generativelanguage.googleapis.com/v1beta/interactions/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: { "x-goog-api-key": apiKey }
      }
    );
  } catch {
    // Best effort cleanup.
  }

  return res.status(204).end();
}
