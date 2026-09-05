const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

const diagnosisSchema = {
  type: 'object',
  properties: {
    brand: { type: 'string' },
    model: { type: 'string' },
    confidence_score: { type: 'number', minimum: 0, maximum: 100 },
    risk_level: { type: 'string', enum: ['Low', 'Moderate', 'High', 'Extreme'] },
    is_high_voltage: { type: 'boolean' },
    recommended_action: { type: 'string' },
    reasoning: { type: 'string' },
    potential_fix_cost_estimate: { type: 'string' },
    currency_code: { type: 'string' },
    resale_value: {
      type: 'object',
      properties: {
        unit_value_fixed: { type: 'string' },
        unit_value_broken: { type: 'string' },
        profit_potential: { type: 'string' }
      },
      required: ['unit_value_fixed', 'unit_value_broken', 'profit_potential']
    },
    diy_guides: {
      type: 'array',
      maxItems: 2,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          uri: { type: 'string' },
          platform: { type: 'string' },
          difficulty: { type: 'string', enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] }
        },
        required: ['title', 'uri', 'platform', 'difficulty']
      }
    },
    required_tools: {
      type: 'array',
      maxItems: 4,
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          reason: { type: 'string' }
        },
        required: ['name', 'reason']
      }
    },
    common_failures: {
      type: 'array',
      maxItems: 4,
      items: { type: 'string' }
    },
    category_mismatch: { type: 'boolean' },
    identified_category: { type: 'string' },
    no_visible_issue: { type: 'boolean' }
  },
  required: [
    'brand',
    'model',
    'confidence_score',
    'risk_level',
    'is_high_voltage',
    'recommended_action',
    'reasoning',
    'potential_fix_cost_estimate',
    'currency_code',
    'resale_value',
    'diy_guides',
    'required_tools',
    'common_failures',
    'category_mismatch',
    'identified_category',
    'no_visible_issue'
  ]
};

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') return JSON.parse(req.body);
  return req.body;
}

function cleanDataUrl(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function normalizeText(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function normalizeResult(raw) {
  const validRisk = ['Low', 'Moderate', 'High', 'Extreme'];
  const risk = validRisk.includes(raw?.risk_level) ? raw.risk_level : 'Moderate';
  const confidence = Number(raw?.confidence_score);

  return {
    brand: normalizeText(raw?.brand, 'Unknown'),
    model: normalizeText(raw?.model, 'Unknown device'),
    confidence_score: Number.isFinite(confidence) ? Math.max(0, Math.min(100, Math.round(confidence))) : 0,
    risk_level: risk,
    is_high_voltage: Boolean(raw?.is_high_voltage),
    recommended_action: normalizeText(raw?.recommended_action, 'Get a professional inspection before proceeding.'),
    reasoning: normalizeText(raw?.reasoning, 'The available information was not enough for a detailed explanation.'),
    potential_fix_cost_estimate: normalizeText(raw?.potential_fix_cost_estimate, 'Unknown'),
    currency_code: normalizeText(raw?.currency_code, 'USD').toUpperCase().slice(0, 3),
    resale_value: {
      unit_value_fixed: normalizeText(raw?.resale_value?.unit_value_fixed, 'Unknown'),
      unit_value_broken: normalizeText(raw?.resale_value?.unit_value_broken, 'Unknown'),
      profit_potential: normalizeText(raw?.resale_value?.profit_potential, 'Unknown')
    },
    recommended_repair_hubs: [],
    diy_guides: Array.isArray(raw?.diy_guides) ? raw.diy_guides.slice(0, 2) : [],
    required_tools: Array.isArray(raw?.required_tools) ? raw.required_tools.slice(0, 4) : [],
    purchase_options: [],
    parts_retailers: [],
    common_failures: Array.isArray(raw?.common_failures) ? raw.common_failures.slice(0, 4) : [],
    category_mismatch: Boolean(raw?.category_mismatch),
    identified_category: normalizeText(raw?.identified_category, 'Unknown'),
    no_visible_issue: Boolean(raw?.no_visible_issue),
    sources: []
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'DeviceLens diagnosis is not configured yet. GEMINI_API_KEY is missing on the server.'
    });
  }

  let body;
  try {
    body = parseBody(req);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const {
    category,
    description = '',
    images = [],
    location,
    manualDeviceName = '',
    locale = '',
    timezone = ''
  } = body || {};

  if (!category || typeof category !== 'string') {
    return res.status(400).json({ error: 'A device category is required.' });
  }

  if (!Array.isArray(images) || images.length < 1 || images.length > 5) {
    return res.status(400).json({ error: 'Provide between 1 and 5 device images.' });
  }

  const parsedImages = images.map(cleanDataUrl).filter(Boolean);
  if (parsedImages.length !== images.length) {
    return res.status(400).json({ error: 'All uploads must be valid image data.' });
  }

  const approximateSize = images.reduce((total, image) => total + String(image).length, 0);
  if (approximateSize > 4_000_000) {
    return res.status(413).json({ error: 'The uploaded images are too large. Remove one image or use smaller photos.' });
  }

  const safeDescription = normalizeText(description).slice(0, 1200);
  const safeManualName = normalizeText(manualDeviceName).slice(0, 120);
  const lat = Number(location?.latitude);
  const lng = Number(location?.longitude);
  const hasLocation = Number.isFinite(lat) && Number.isFinite(lng);

  const locationContext = hasLocation
    ? `Approximate user coordinates: ${lat.toFixed(3)}, ${lng.toFixed(3)}.`
    : 'User location is unavailable.';

  const prompt = [
    'You are the diagnostic reasoning engine for DeviceLens.',
    'Analyze the supplied photos and user description conservatively.',
    '',
    'Important accuracy rules:',
    '- Do not pretend to see details that are not visible.',
    '- If brand or exact model is uncertain, say Unknown or use a broader model family and lower confidence.',
    '- Confidence is 0 to 100 and must reflect visible evidence, not optimism.',
    '- If the photos show no clear fault and the user gave no useful symptom, set no_visible_issue=true and recommend gathering more symptoms.',
    '- Treat swollen batteries, exposed mains wiring, CRT internals, microwave internals, large capacitors, power supplies, and similar hazards as high-voltage/high-risk.',
    '- Do not invent repair shops, ratings, URLs, sellers, or exact product listings. Other services handle those.',
    '- Cost and resale values are rough AI estimates only. Prefer broad ranges. Use Unknown when you cannot make a defensible estimate.',
    '- Do not claim a repair is guaranteed.',
    '- DIY guide titles should describe what to search for. Use an empty URI because DeviceLens resolves real video links separately.',
    '',
    `Selected category: ${category}`,
    safeManualName ? `User-provided device name: ${safeManualName}. Verify it against the photos rather than blindly trusting it.` : 'No device name supplied.',
    safeDescription ? `Reported issue: ${safeDescription}` : 'No issue description supplied.',
    locationContext,
    locale ? `Browser locale: ${String(locale).slice(0, 30)}.` : '',
    timezone ? `Browser timezone: ${String(timezone).slice(0, 60)}.` : '',
    '',
    'For currency_code, use the most likely local ISO 4217 currency when location/timezone makes that clear. Otherwise use USD.',
    'For potential_fix_cost_estimate and resale_value fields, use compact ranges such as "GHS 600-900" or "USD 80-120".',
    'For profit_potential, use Unknown if the inputs are too uncertain to calculate responsibly.',
    'Return only the structured JSON requested by the schema.'
  ].filter(Boolean).join('\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 28_000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                ...parsedImages.map(image => ({
                  inlineData: {
                    mimeType: image.mimeType,
                    data: image.data
                  }
                }))
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
            responseSchema: diagnosisSchema
          }
        })
      }
    );

    clearTimeout(timer);

    if (!response.ok) {
      const details = await response.text();
      console.error('[DeviceLens] Gemini error', response.status, details.slice(0, 600));
      if (response.status === 429) {
        return res.status(429).json({ error: 'Diagnosis capacity reached. Try again shortly.' });
      }
      return res.status(502).json({ error: 'The diagnosis service returned an error.' });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts
      ?.map(part => part?.text || '')
      .join('')
      .trim();

    if (!text) {
      return res.status(502).json({ error: 'The diagnosis service returned an empty result.' });
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error('[DeviceLens] Gemini returned non-JSON output');
      return res.status(502).json({ error: 'The diagnosis result could not be read.' });
    }

    return res.status(200).json(normalizeResult(parsed));
  } catch (error) {
    clearTimeout(timer);
    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'Diagnosis timed out. Please try again.' });
    }
    console.error('[DeviceLens] diagnose handler failed', error);
    return res.status(500).json({ error: 'Diagnosis failed unexpectedly.' });
  }
}
