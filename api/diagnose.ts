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
      maxItems: 5,
      items: { type: "string" }
    },
    category_mismatch: { type: "boolean" },
    no_visible_issue: { type: "boolean" },

    risk_level: { type: "string", enum: ["Low", "Moderate", "High", "Extreme"] },
    is_high_voltage: { type: "boolean" },
    safety_notes: {
      type: "array",
      maxItems: 5,
      items: { type: "string" }
    },

    summary: { type: "string" },
    likely_causes: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          cause: { type: "string" },
          likelihood: { type: "string", enum: ["Likely", "Possible", "Uncertain"] },
          reason: { type: "string" }
        },
        required: ["cause", "likelihood", "reason"]
      }
    },
    recommended_action: { type: "string" },
    repair_difficulty: {
      type: "string",
      enum: ["Easy", "Moderate", "Difficult", "Professional only"]
    },
    potential_fix_cost_estimate: { type: "string" },
    cost_basis: { type: "string" },
    common_failures: {
      type: "array",
      maxItems: 5,
      items: { type: "string" }
    },
    required_tools: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          reason: { type: "string" }
        },
        required: ["name", "reason"]
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
    "no_visible_issue",
    "risk_level",
    "is_high_voltage",
    "safety_notes",
    "summary",
    "likely_causes",
    "recommended_action",
    "repair_difficulty",
    "potential_fix_cost_estimate",
    "cost_basis",
    "common_failures",
    "required_tools"
  ]
};

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") return JSON.parse(req.body);
  return req.body;
}

function cleanImage(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return {
    type: "image",
    mime_type: match[1],
    data: match[2]
  };
}

function text(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalize(raw) {
  const risks = ["Low", "Moderate", "High", "Extreme"];
  const difficulties = ["Easy", "Moderate", "Difficult", "Professional only"];
  const confidence = Number(raw?.confidence_score);

  return {
    brand: text(raw?.brand, "Unknown"),
    model: text(raw?.model, "Unknown device"),
    identified_category: text(raw?.identified_category, "Unknown"),
    confidence_score: Number.isFinite(confidence)
      ? Math.max(0, Math.min(100, Math.round(confidence)))
      : 0,
    identification_evidence: Array.isArray(raw?.identification_evidence)
      ? raw.identification_evidence.slice(0, 5).map(item => text(item)).filter(Boolean)
      : [],
    category_mismatch: Boolean(raw?.category_mismatch),
    no_visible_issue: Boolean(raw?.no_visible_issue),

    risk_level: risks.includes(raw?.risk_level) ? raw.risk_level : "Moderate",
    is_high_voltage: Boolean(raw?.is_high_voltage),
    safety_notes: Array.isArray(raw?.safety_notes)
      ? raw.safety_notes.slice(0, 5).map(item => text(item)).filter(Boolean)
      : [],

    summary: text(raw?.summary, "The available information is not enough for a confident assessment."),
    likely_causes: Array.isArray(raw?.likely_causes)
      ? raw.likely_causes.slice(0, 4).map(item => ({
          cause: text(item?.cause, "Unknown cause"),
          likelihood: ["Likely", "Possible", "Uncertain"].includes(item?.likelihood)
            ? item.likelihood
            : "Uncertain",
          reason: text(item?.reason, "Insufficient evidence to rank this cause confidently.")
        }))
      : [{
          cause: "Unknown cause",
          likelihood: "Uncertain",
          reason: "The supplied evidence is not enough to identify a likely cause."
        }],
    recommended_action: text(raw?.recommended_action, "Get a qualified technician to inspect the device."),
    repair_difficulty: difficulties.includes(raw?.repair_difficulty)
      ? raw.repair_difficulty
      : "Professional only",
    potential_fix_cost_estimate: text(raw?.potential_fix_cost_estimate, "Unknown"),
    cost_basis: text(raw?.cost_basis, "No reliable cost basis available from the supplied evidence."),
    common_failures: Array.isArray(raw?.common_failures)
      ? raw.common_failures.slice(0, 5).map(item => text(item)).filter(Boolean)
      : [],
    required_tools: Array.isArray(raw?.required_tools)
      ? raw.required_tools.slice(0, 5).map(item => ({
          name: text(item?.name),
          reason: text(item?.reason)
        })).filter(item => item.name)
      : [],
    repair_guides: []
  };
}

function outputText(data) {
  const modelStep = Array.isArray(data?.steps)
    ? [...data.steps].reverse().find(step => step?.type === "model_output")
    : null;

  const block = Array.isArray(modelStep?.content)
    ? modelStep.content.find(item => item?.type === "text")
    : null;

  return typeof block?.text === "string" ? block.text.trim() : "";
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
  const manualName = text(body?.manualDeviceName).slice(0, 120);
  const images = Array.isArray(body?.images) ? body.images : [];

  if (!category) {
    return res.status(400).json({ error: "A device category is required." });
  }

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
    "You are DeviceLens, an AI-assisted electronics triage system.",
    "Your job is not to sound certain. Your job is to help the user decide what to do next safely.",
    "",
    "Core rules:",
    "- Use only evidence visible in the supplied images plus symptoms explicitly provided by the user.",
    "- Never invent text, serial numbers, ports, damage, symptoms, measurements, or internal faults that are not supported.",
    "- Exact model identification must be conservative. If you can only support a family or brand, say so and lower confidence.",
    "- identification_evidence must list concrete visible clues you actually used.",
    "- A high confidence score requires multiple independent visible clues.",
    "- A photo cannot prove most internal failures. Distinguish likely causes from confirmed faults.",
    "- no_visible_issue=true when the images do not show an obvious problem and symptoms are absent or too vague.",
    "- category_mismatch=true if the selected category conflicts with the device shown.",
    "- Flag swollen batteries, burning, smoke, liquid near powered electronics, damaged mains wiring, exposed high-voltage sections, CRTs, microwaves, power supplies, large capacitors, or similar hazards.",
    "- If the user may need to open hazardous hardware, use Professional only.",
    "- Cost estimates must be rough ranges, never fake precision.",
    "- Do not invent local shops, ratings, market listings, video URLs, parts sellers, or source citations.",
    "- Do not call an estimate a diagnosis or guarantee.",
    "",
    `Selected category: ${category}`,
    manualName
      ? `User says the device may be: ${manualName}. Verify this against the images. Do not simply repeat it.`
      : "The user did not provide a device name.",
    description
      ? `Reported symptoms/context: ${description}`
      : "The user did not provide symptom details.",
    "",
    "Output guidance:",
    "- summary: 1 to 3 clear sentences explaining what the evidence supports.",
    "- likely_causes: rank up to 4 causes. Use Uncertain freely.",
    "- recommended_action: one practical next action.",
    "- repair_difficulty: Easy, Moderate, Difficult, or Professional only.",
    "- potential_fix_cost_estimate: a rough range with currency when defensible. If location/currency is unknown or the fault is too uncertain, say Unknown instead of guessing.",
    "- cost_basis: explain briefly why the estimate is broad or what typical work it assumes.",
    "- common_failures: model/family failure points worth checking, not claims that this specific unit has them.",
    "- required_tools: only tools relevant to the likely repair path.",
    "- safety_notes: include only relevant warnings; an empty list is acceptable for low-risk cases."
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
        }
      })
    });

    clearTimeout(timer);

    if (!response.ok) {
      const details = await response.text();
      console.error("[DeviceLens] Gemini error", response.status, details.slice(0, 700));

      if (response.status === 429) {
        return res.status(429).json({ error: "Gemini quota reached. Try again later." });
      }

      return res.status(502).json({ error: "The assessment service returned an error." });
    }

    const data = await response.json();
    const rawText = outputText(data);

    if (!rawText) {
      return res.status(502).json({ error: "The assessment service returned no readable result." });
    }

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      console.error("[DeviceLens] structured output was not valid JSON");
      return res.status(502).json({ error: "The assessment result could not be read." });
    }

    return res.status(200).json(normalize(parsed));
  } catch (error) {
    clearTimeout(timer);

    if (error?.name === "AbortError") {
      return res.status(504).json({ error: "Assessment timed out. Please try again." });
    }

    console.error("[DeviceLens] diagnose route failed", error);
    return res.status(500).json({ error: "Assessment failed unexpectedly." });
  }
}
