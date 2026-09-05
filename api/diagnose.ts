const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const schema = {
  type: "object",
  properties: {
    brand: { type: "string" },
    model: { type: "string" },
    identified_category: { type: "string" },
    confidence_score: { type: "number", minimum: 0, maximum: 100 },
    identification_evidence: { type: "array", maxItems: 6, items: { type: "string" } },
    category_mismatch: { type: "boolean" },
    no_visible_issue: { type: "boolean" },

    risk_level: { type: "string", enum: ["Low", "Moderate", "High", "Extreme"] },
    is_high_voltage: { type: "boolean" },
    safety_notes: { type: "array", maxItems: 6, items: { type: "string" } },

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
    diagnostic_evidence: { type: "array", maxItems: 8, items: { type: "string" } },
    unresolved_uncertainties: { type: "array", maxItems: 6, items: { type: "string" } },
    recommended_action: { type: "string" },
    repair_difficulty: { type: "string", enum: ["Easy", "Moderate", "Difficult", "Professional only"] },
    potential_fix_cost_estimate: { type: "string" },
    cost_basis: { type: "string" },
    common_failures: { type: "array", maxItems: 5, items: { type: "string" } },
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
    "brand","model","identified_category","confidence_score","identification_evidence",
    "category_mismatch","no_visible_issue","risk_level","is_high_voltage","safety_notes",
    "summary","likely_causes","diagnostic_evidence","unresolved_uncertainties",
    "recommended_action","repair_difficulty","potential_fix_cost_estimate","cost_basis",
    "common_failures","required_tools"
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

function outputText(data) {
  const step = Array.isArray(data?.steps)
    ? [...data.steps].reverse().find(item => item?.type === "model_output")
    : null;
  const block = Array.isArray(step?.content)
    ? step.content.find(item => item?.type === "text")
    : null;
  return typeof block?.text === "string" ? block.text.trim() : "";
}

function identityStatus(score, verified) {
  if (verified) return "User verified";
  if (score >= 88) return "High confidence";
  if (score >= 65) return "Likely";
  return "Uncertain";
}

function normalize(raw, verified) {
  const risks = ["Low", "Moderate", "High", "Extreme"];
  const difficulties = ["Easy", "Moderate", "Difficult", "Professional only"];
  const score = Number(raw?.confidence_score);
  const confidence = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;

  return {
    brand: text(raw?.brand, "Unknown"),
    model: text(raw?.model, "Unknown device"),
    identified_category: text(raw?.identified_category, "Unknown"),
    confidence_score: confidence,
    identity_status: identityStatus(confidence, verified),
    identification_evidence: Array.isArray(raw?.identification_evidence)
      ? raw.identification_evidence.slice(0, 6).map(text).filter(Boolean) : [],
    category_mismatch: Boolean(raw?.category_mismatch),
    no_visible_issue: Boolean(raw?.no_visible_issue),
    risk_level: risks.includes(raw?.risk_level) ? raw.risk_level : "Moderate",
    is_high_voltage: Boolean(raw?.is_high_voltage),
    safety_notes: Array.isArray(raw?.safety_notes)
      ? raw.safety_notes.slice(0, 6).map(text).filter(Boolean) : [],
    summary: text(raw?.summary, "The available evidence is not enough for a confident assessment."),
    likely_causes: Array.isArray(raw?.likely_causes)
      ? raw.likely_causes.slice(0, 4).map(item => ({
          cause: text(item?.cause, "Unknown cause"),
          likelihood: ["Likely","Possible","Uncertain"].includes(item?.likelihood) ? item.likelihood : "Uncertain",
          reason: text(item?.reason, "Insufficient evidence.")
        }))
      : [{ cause: "Unknown cause", likelihood: "Uncertain", reason: "Insufficient evidence." }],
    diagnostic_evidence: Array.isArray(raw?.diagnostic_evidence)
      ? raw.diagnostic_evidence.slice(0, 8).map(text).filter(Boolean) : [],
    unresolved_uncertainties: Array.isArray(raw?.unresolved_uncertainties)
      ? raw.unresolved_uncertainties.slice(0, 6).map(text).filter(Boolean) : [],
    recommended_action: text(raw?.recommended_action, "Have a qualified technician inspect the device."),
    repair_difficulty: difficulties.includes(raw?.repair_difficulty) ? raw.repair_difficulty : "Professional only",
    potential_fix_cost_estimate: text(raw?.potential_fix_cost_estimate, "Unknown"),
    cost_basis: text(raw?.cost_basis, "No reliable cost basis available."),
    common_failures: Array.isArray(raw?.common_failures)
      ? raw.common_failures.slice(0, 5).map(text).filter(Boolean) : [],
    required_tools: Array.isArray(raw?.required_tools)
      ? raw.required_tools.slice(0, 5).map(item => ({
          name: text(item?.name),
          reason: text(item?.reason)
        })).filter(item => item.name)
      : [],
    repair_guides: []
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "DeviceLens is not configured. GEMINI_API_KEY is missing." });

  let body;
  try {
    body = parseBody(req);
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const interactionId = text(body?.interactionId);
  const category = text(body?.category);
  const description = text(body?.description).slice(0, 1200);
  const confirmedDeviceName = text(body?.confirmedDeviceName).slice(0, 140);
  const extraNotes = text(body?.extraNotes).slice(0, 1200);
  const userVerifiedIdentity = Boolean(body?.userVerifiedIdentity);
  const identification = body?.identification || {};
  const answers = Array.isArray(body?.answers) ? body.answers.slice(0, 8) : [];

  if (!interactionId) return res.status(400).json({ error: "The identification session is missing. Start the scan again." });

  const answerText = answers
    .map(item => `Q: ${text(item?.question)}\nA: ${text(item?.answer)}`)
    .filter(Boolean)
    .join("\n\n");

  const prompt = [
    "This is STAGE 2 of DeviceLens. Produce the FINAL guided diagnostic assessment.",
    "You have the original image-identification context from the previous interaction.",
    "",
    "Use all of these evidence classes:",
    "1. original device photos and visual evidence",
    "2. original symptom description",
    "3. the stage-one identification result",
    "4. the user's answers to targeted diagnostic questions",
    "5. any extra notes",
    "",
    "STRICT ACCURACY RULES:",
    "- Never turn a plausible cause into a confirmed fault without evidence.",
    "- Internal faults that cannot be observed directly must remain hypotheses.",
    "- diagnostic_evidence must list which user observations or safe checks actually support the assessment.",
    "- unresolved_uncertainties must explicitly state what still cannot be known remotely.",
    "- If evidence conflicts, lower confidence and say so.",
    "- If the user confirmed an exact model from a model plate, About screen, BIOS, service tag, or equivalent, use that identity but do not treat it as proof of the fault.",
    "- Do not invent readings, error codes, test results, market prices, repair-shop data, or source citations.",
    "- Cost must be a rough range only when defensible. Otherwise say Unknown.",
    "- Prioritize safety over DIY instructions.",
    "",
    `Original category: ${category}`,
    `Original symptoms: ${description || "None provided"}`,
    `Stage-one identity: ${text(identification?.brand, "Unknown")} ${text(identification?.model, "Unknown")}`,
    `Stage-one exact-model confidence: ${Number(identification?.confidence_score) || 0}%`,
    `User-confirmed device identity: ${confirmedDeviceName || "Not provided"}`,
    `Identity explicitly verified by user: ${userVerifiedIdentity ? "Yes" : "No"}`,
    "",
    "Targeted diagnostic answers:",
    answerText || "No answers supplied.",
    "",
    `Additional notes: ${extraNotes || "None"}`,
    "",
    "Return a conservative final assessment. Rank causes. Explain evidence. Preserve uncertainty."
  ].join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 38_000);

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
        previous_interaction_id: interactionId,
        input: prompt,
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema
        },
        generation_config: { temperature: 0.1 },
        store: false
      })
    });

    clearTimeout(timer);

    if (!response.ok) {
      const details = await response.text();
      console.error("[DeviceLens] guided diagnosis error", response.status, details.slice(0, 700));
      if (response.status === 429) return res.status(429).json({ error: "Gemini quota reached. Try again later." });
      return res.status(502).json({ error: "The final assessment service returned an error." });
    }

    const data = await response.json();
    const rawText = outputText(data);
    if (!rawText) return res.status(502).json({ error: "The final assessment returned no readable result." });

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return res.status(502).json({ error: "The final assessment could not be read." });
    }

    const normalized = normalize(parsed, userVerifiedIdentity);
    if (userVerifiedIdentity && confirmedDeviceName) {
      const parts = confirmedDeviceName.split(/\s+/);
      normalized.brand = parts[0] || normalized.brand;
      normalized.model = parts.slice(1).join(" ") || normalized.model;
      normalized.confidence_score = Math.max(normalized.confidence_score, 95);
      normalized.identity_status = "User verified";
    }

    return res.status(200).json(normalized);
  } catch (error) {
    clearTimeout(timer);
    if (error?.name === "AbortError") return res.status(504).json({ error: "Final assessment timed out. Please try again." });
    console.error("[DeviceLens] guided diagnose route failed", error);
    return res.status(500).json({ error: "Final assessment failed unexpectedly." });
  }
}
