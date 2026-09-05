export default function handler(_req, res) {
  return res.status(200).json({
    ok: true,
    services: {
      diagnosis: Boolean(process.env.GEMINI_API_KEY),
      places: Boolean(process.env.GOOGLE_PLACES_API_KEY),
      youtube: Boolean(process.env.YOUTUBE_API_KEY)
    }
  });
}
