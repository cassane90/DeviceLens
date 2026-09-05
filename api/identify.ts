const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const schema = {
  type: "object",
  properties: {
    brand: { type: "string" },
    model: { type: "string" },
    identified_category: { type: "string" },
    confidence_score: { type: "number", minimum: 0, maximum: 100 },
    identification_evidence: {
      type: "array",
      maxItems: 6,
      items: { type: "string" }
    },
    category_mismatch: { type: "boolean" },
    needs_verification: { type: "boolean" },
    verification_request: { type: "string" },
    safety_stop: { type: "boolean" },
    safety_message: { type: "string" },
    diagnostic_questions: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          question: { type: "string" },
          why_it_matters: { type: "string" },
          options: {
            type: "array",
            minItems: 2,
            maxItems: 6,
            items: { type: "string" }
          }
        },
        required: ["id", "question", "why_it_matters", "options"]
      }
    }
  },
  required: [
    "brand",
    "model",
    "identified_category",
    "confidence_score",
    "identification_evidence",
    "category_mismatch",
    "needs_verification",
    "verification_request",
    "safety_stop",
    "safety_message",
    "diagnostic_questions"
  ]
};

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") return JSON.parse(req.body);
  return req.body;
}

function text(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function cleanImage(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return { type: "image", mime_type: match[1], data: match[2] };
}

function outputText(data) {
  const step = Array.isArray(data?.steps)
    ? [...data.steps].reverse().find(item => item?.type === "model_output")
    : null;
  const block = Array.isArray(step?.content)
    ? step.content.find(item => item?.type === "text")
    : null;
  return typeof block?.text === "string" ? block.text.trim() : "";
}

function confidenceLabel(score) {
  if (score >= 88) return "High confidence";
  if (score >= 65) return "Likely";
  return "Uncertain";
}

function normalize(raw, interactionId) {
  const score = Number(raw?.confidence_score);
  const confidence = Number.isFinite(score)
    ? Math.max(0, Math.min(100, Math.round(score)))
    : 0;

  return {
    interaction_id: interactionId,
    brand: text(raw?.brand, "Unknown"),
    model: text(raw?.model, "Unknown device"),
    identified_category: text(raw?.identified_category, "Unknown"),
    confidence_score: confidence,
    confidence_label: confidenceLabel(confidence),
    identification_evidence: Array.isArray(raw?.identification_evidence)
      ? raw.identification_evidence.slice(0, 6).map(item => text(item)).filter(Boolean)
      : [],
    category_mismatch: Boolean(raw?.category_mismatch),
    needs_verification: Boolean(raw?.needs_verification) || confidence < 88,
    verification_request: text(
      raw?.verification_request,
      confidence < 88
        ? "If possible, add or enter an exact model number from a label, About screen, BIOS, or model plate."
        : ""
    ),
    safety_stop: Boolean(raw?.safety_stop),
    safety_message: text(raw?.safety_message),
    diagnostic_questions: Array.isArray(raw?.diagnostic_questions)
      ? raw.diagnostic_questions.slice(0, 6).map((item, index) => ({
          id: text(item?.id, `q${index + 1}`),
          question: text(item?.question, "What happens when you try to use the device?"),
          why_it_matters: text(item?.why_it_matters, "This helps narrow the likely fault."),
          options: Array.isArray(item?.options)
            ? item.options.slice(0, 6).map(option => text(option)).filter(Boolean)
            : ["Yes", "No", "Not sure"]
        }))
      : []
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "DeviceLens is not configured. GEMINI_API_KEY is missing." });
  }

  let body;
  try {
    body = parseBody(req);
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const category = text(body?.category);
  const description = text(body?.description).slice(0, 1200);
  const manualDeviceName = text(body?.manualDeviceName).slice(0, 120);
  const images = Array.isArray(body?.images) ? body.images : [];

  if (!category) return res.status(400).json({ error: "A device category is required." });
  if (images.length < 1 || images.length > 5) {
    return res.status(400).json({ error: "Provide between 1 and 5 images." });
  }

  const cleanImages = images.map(cleanImage);
  if (cleanImages.some(image => !image)) {
    return res.status(400).json({ error: "Every upload must be a valid image." });
  }

  const totalLength = images.reduce((sum, image) => sum + String(image).length, 0);
  if (totalLength > 5_500_000) {
    return res.status(413).json({ error: "The photos are too large. Use fewer or smaller images." });
  }

  const prompt = [
    "You are DeviceLens. This is STAGE 1: device identification and diagnostic-question selection.",
    "Do not diagnose the final fault yet.",
    "",
    "IDENTIFICATION RULES:",
    "- Use only visible evidence from the supplied images and explicit user text.",
    "- Never invent a logo, model number, port, label, serial number, button, damage pattern, or other visual clue.",
    "- Exact model identification requires model-specific evidence. Similar-looking devices must not receive high confidence just because they resemble one another.",
    "- A user-provided device name is a hint, not proof. Check whether the images support it.",
    "- confidence_score measures exact identity confidence, not general category confidence.",
    "- 88+ should require several independent model-specific clues or a clearly readable model identifier.",
    "- If only a product family can be supported, put the family in model and keep confidence below 88.",
    "- If identity is weak, needs_verification=true and ask for the most useful exact identifier: model plate, rear/bottom label, Settings/About screen, BIOS/System Information, service tag, or equivalent.",
    "",
    "SAFETY SCREEN:",
    "- safety_stop=true if the images or user report show swollen battery, smoke, burning, sparking, exposed mains wiring, severe liquid exposure while powered, CRT/microwave/high-voltage internals, or another situation where further user testing could be unsafe.",
    "- If safety_stop=true, diagnostic questions must not instruct the user to open, power, charge, or manipulate dangerous hardware.",
    "",
    "DIAGNOSTIC QUESTIONS:",
    "- Generate 3 to 6 short questions that would materially distinguish between plausible INTERNAL and EXTERNAL faults.",
    "- Questions should be answerable by observation or safe non-invasive checks.",
    "- Tailor them to the device type and reported symptoms.",
    "- Good examples include power behavior, charging behavior, error messages, BIOS/device detection, fan behavior, display/backlight behavior, boot loops, battery condition, audio/beep codes, temperatures, and whether a known-good cable/charger changes anything.",
    "- Do not ask the user to disassemble dangerous hardware.",
    "- Each question needs 2 to 6 useful answer options. Include 'Not sure' when appropriate.",
    "",
    `User-selected category: ${category}`,
    manualDeviceName
      ? `User-provided possible identity: ${manualDeviceName}`
      : "No device name was provided.",
    description
      ? `Reported symptoms/context: ${description}`
      : "No symptom description was provided."
  ].join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 32_000);

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        input: [
          { type: "text", text: prompt },
          ...cleanImages
        ],
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema
        },
        generation_config: {
          temperature: 0.1
        },
        store: true
      })
    });

    clearTimeout(timer);

    if (!response.ok) {
      const details = await response.text();
      console.error("[DeviceLens] identify error", response.status, details.slice(0, 700));
      if (response.status === 429) {
        return res.status(429).json({ error: "Gemini quota reached. Try again later." });
      }
      return res.status(502).json({ error: "The identification service returned an error." });
    }

    const data = await response.json();
    const rawText = outputText(data);
    if (!rawText || !data?.id) {
      return res.status(502).json({ error: "The identification service returned an incomplete result." });
    }

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return res.status(502).json({ error: "The identification result could not be read." });
    }

    return res.status(200).json(normalize(parsed, data.id));
  } catch (error) {
    clearTimeout(timer);
    if (error?.name === "AbortError") {
      return res.status(504).json({ error: "Identification timed out. Please try again." });
    }
    console.error("[DeviceLens] identify route failed", error);
    return res.status(500).json({ error: "Identification failed unexpectedly." });
  }
}
