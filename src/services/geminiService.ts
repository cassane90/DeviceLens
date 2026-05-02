import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { DeviceCategory, DiagnosisResult, ChatMessage } from "../types";

function getAI() {
  return new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
}

// Strict 15-second timeout — rejects with a user-friendly message
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Analysis timed out — please try again.')), ms)
    ),
  ]);
}

export async function runForensicAudit(
  category: DeviceCategory,
  description: string,
  images: string[],
  location?: { latitude: number; longitude: number },
  manualDeviceName?: string
): Promise<DiagnosisResult> {
  const ai = getAI();

  const month = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  const locationCtx = location
    ? `User coords: ${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}. Find 2 real local repair shops nearby. Use local currency.`
    : 'Location unknown — use USD, global retailers (Amazon/eBay/AliExpress).';

  const prompt = `DEVICELENS DIAGNOSTIC — ${month}
Category: ${category}${description ? `\nIssue: "${description}"` : ''}${manualDeviceName ? `\nUser says device is: "${manualDeviceName}" — verify visually` : ''}
${locationCtx}

RULES (follow exactly):
1. Identify brand/model from visual details: ports, notch type, camera layout, button placement, materials.
2. Use ${month} to identify latest models (iPhone 17, Galaxy S25, Pixel 9, etc.)
3. Set confidence_score < 70 if you cannot be certain. Explain in reasoning.
4. category_mismatch=true if identified device ≠ selected category "${category}".
5. no_visible_issue=true if device looks undamaged and description is blank/vague.
6. Repair hubs: exactly 2 results. URI = Google Maps search: https://www.google.com/maps/search/?api=1&query=SHOP+NAME+ADDRESS
7. DIY guides: exactly 2 YouTube search links: https://www.youtube.com/results?search_query=DEVICE+ISSUE+repair
8. required_tools: max 3 items. purchase_options: max 2 items. parts_retailers: max 2 items.
9. All link fields = search URLs only (no direct product links).

Return JSON matching schema exactly. Be concise — short strings, no padding.`;

  const model = ai.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          brand:                      { type: SchemaType.STRING },
          model:                      { type: SchemaType.STRING },
          confidence_score:           { type: SchemaType.NUMBER },
          risk_level:                 { type: SchemaType.STRING },
          recommended_action:         { type: SchemaType.STRING },
          reasoning:                  { type: SchemaType.STRING },
          currency_code:              { type: SchemaType.STRING },
          resale_value: {
            type: SchemaType.OBJECT,
            properties: {
              unit_value_fixed:  { type: SchemaType.STRING },
              unit_value_broken: { type: SchemaType.STRING },
              profit_potential:  { type: SchemaType.STRING },
            },
            required: ["unit_value_fixed", "unit_value_broken", "profit_potential"],
          },
          recommended_repair_hubs: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                name:      { type: SchemaType.STRING },
                address:   { type: SchemaType.STRING },
                uri:       { type: SchemaType.STRING },
                rating:    { type: SchemaType.STRING },
                specialty: { type: SchemaType.STRING },
              },
              required: ["name", "address", "uri"],
            },
          },
          diy_guides: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                title:      { type: SchemaType.STRING },
                uri:        { type: SchemaType.STRING },
                platform:   { type: SchemaType.STRING },
                difficulty: { type: SchemaType.STRING },
              },
              required: ["title", "uri", "platform", "difficulty"],
            },
          },
          required_tools: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                name:   { type: SchemaType.STRING },
                reason: { type: SchemaType.STRING },
                link:   { type: SchemaType.STRING },
              },
              required: ["name", "reason"],
            },
          },
          purchase_options: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                name:   { type: SchemaType.STRING },
                price:  { type: SchemaType.STRING },
                uri:    { type: SchemaType.STRING },
                is_new: { type: SchemaType.BOOLEAN },
              },
              required: ["name", "price", "uri", "is_new"],
            },
          },
          parts_retailers: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                name:      { type: SchemaType.STRING },
                part_name: { type: SchemaType.STRING },
                uri:       { type: SchemaType.STRING },
              },
              required: ["name", "part_name", "uri"],
            },
          },
          common_failures:    { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          category_mismatch:  { type: SchemaType.BOOLEAN },
          identified_category:{ type: SchemaType.STRING },
          no_visible_issue:   { type: SchemaType.BOOLEAN },
        },
        required: [
          "brand", "model", "confidence_score", "risk_level",
          "recommended_action", "reasoning", "currency_code",
          "resale_value", "recommended_repair_hubs", "diy_guides",
          "required_tools", "purchase_options", "parts_retailers",
          "category_mismatch", "identified_category", "no_visible_issue",
        ],
      },
    },
  });

  const imageParts = images.map(img => {
    const mime = (img.match(/^data:([^;]+);base64,/) ?? [])[1] ?? 'image/jpeg';
    return { inlineData: { mimeType: mime, data: img.split(',')[1] } };
  });

  try {
    const response = await withTimeout(
      model.generateContent([prompt, ...imageParts]),
      15000
    );

    const result = JSON.parse(response.response.text()) as DiagnosisResult;

    // Sanitise repair hub URIs to always be valid Google Maps search links
    if (result.recommended_repair_hubs?.length) {
      result.recommended_repair_hubs = result.recommended_repair_hubs.map(hub => {
        if (!hub.uri?.includes('google.com/maps')) {
          hub.uri = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hub.name} ${hub.address}`)}`;
        }
        return hub;
      });
    }

    return result;

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[DeviceLens] diagnosis error:', msg);
    throw new Error(msg);
  }
}

export async function chatWithAssistant(message: string): Promise<ChatMessage> {
  const ai = getAI();
  const model = ai.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    systemInstruction: 'You are a DeviceLens support assistant. Help users with device repair questions. Be clear, practical, and concise.',
  });
  const response = await withTimeout(model.generateContent(message), 10000);
  return {
    role: 'ai',
    text: response.response.text() || "Sorry, I couldn't get a response. Please try again.",
  };
}
