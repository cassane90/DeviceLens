export default function handler(_req, res) {
  return res.status(200).json({
    ok: true,
    version: "1",
    diagnosis: Boolean(process.env.GEMINI_API_KEY),
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash"
  });
}
