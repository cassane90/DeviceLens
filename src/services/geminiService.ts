import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { DeviceCategory, DiagnosisResult, ChatMessage } from "../types";

const AMAZON_TAG = 'devicelens-20';

function amazonSearch(query: string): string {
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${AMAZON_TAG}`;
}

function ebaySearch(query: string): string {
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
}

function getAI() {
  return new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
}

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
    : 'Location unknown — use USD.';

  const deviceHint = manualDeviceName ? `\nUser says device is: "${manualDeviceName}" — verify visually` : '';
  const issueHint = description ? `\nIssue: "${description}"` : '';

  const promptLines = [
    `DEVICELENS DIAGNOSTIC — ${month}`,
    `Category: ${category}${issueHint}${deviceHint}`,
    locationCtx,
    '',
    'IDENTIFICATION:',
    '1. Examine every visible detail: camera layout, screen notch/Dynamic Island/punch-hole, port type (USB-C/Lightning), buttons, materials, logo, any visible text.',
    `2. Use ${month} context for latest models (iPhone 17, Galaxy S25, Pixel 9, etc.)`,
    `3. category_mismatch=true if identified device differs from "${category}".`,
    '4. no_visible_issue=true if device looks undamaged and description is blank or vague.',
    '',
    'CONFIDENCE SCORE — count how many of these identifiers you can confirm (each ~14 pts):',
    '[ ] Camera module layout (lens count, flash, LiDAR position)',
    '[ ] Screen style (Dynamic Island / notch shape / punch-hole / no notch)',
    '[ ] Bottom port type (USB-C / Lightning / Micro-USB)',
    '[ ] Button layout (volume, power, mute/action button positions)',
    '[ ] Brand logo visible and readable',
    '[ ] Back material (glass, matte, frosted, plastic, titanium)',
    '[ ] Model/serial text directly readable on device',
    'Score = confirmed_count / 7 x 100, round to nearest 5. Cap at 95 unless serial/model text is readable (then 98).',
    'List confirmed identifiers in reasoning.',
    '',
    'RESALE VALUE — realistic current market estimates:',
    'Flagships (current gen): 60-80% retail working. 2yr-old flagships: 35-55%. Budget phones lose 50-70% in year 1.',
    '- unit_value_broken: eBay sold-listings price for this exact model as-is/broken today',
    '- unit_value_fixed: Swappa/eBay average for working unit in described condition',
    '- profit_potential: unit_value_fixed minus typical repair cost for this issue',
    'Format as numbers only (e.g. "420"). Explain valuation basis briefly in reasoning.',
    '',
    'REPAIR HUBS: exactly 2. URI: https://www.google.com/maps/search/?api=1&query=SHOP+NAME+CITY',
    'DIY GUIDES: exactly 2. URI: https://www.youtube.com/results?search_query=EXACT+DEVICE+MODEL+ISSUE+repair',
    'TOOLS/PARTS: list names and reasons accurately. Max: 3 tools, 2 parts, 2 purchase options.',
    '',
    'Return JSON matching schema exactly. Short strings, no padding.',
  ];

  const prompt = promptLines.join('\n');

  const model = ai.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          brand:               { type: SchemaType.STRING },
          model:               { type: SchemaType.STRING },
          confidence_score:    { type: SchemaType.NUMBER },
          risk_level:          { type: SchemaType.STRING },
          recommended_action:  { type: SchemaType.STRING },
          reasoning:           { type: SchemaType.STRING },
          currency_code:       { type: SchemaType.STRING },
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
          common_failures:     { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          category_mismatch:   { type: SchemaType.BOOLEAN },
          identified_category: { type: SchemaType.STRING },
          no_visible_issue:    { type: SchemaType.BOOLEAN },
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
    const deviceQuery = `${result.brand} ${result.model}`.trim();

    // Sanitise repair hub URIs to always be valid Google Maps search links
    if (result.recommended_repair_hubs?.length) {
      result.recommended_repair_hubs = result.recommended_repair_hubs.map(hub => {
        if (!hub.uri?.includes('google.com/maps')) {
          hub.uri = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hub.name} ${hub.address}`)}`;
        }
        return hub;
      });
    }

    // Override all product links with Amazon/eBay search URLs — zero 404s, affiliate tag always present
    result.parts_retailers = (result.parts_retailers ?? []).map((part, i) => ({
      ...part,
      name: i === 0 ? 'Amazon' : 'eBay',
      uri: i === 0
        ? amazonSearch(`${part.part_name} compatible ${deviceQuery}`)
        : ebaySearch(`${part.part_name} ${deviceQuery}`),
    }));

    result.required_tools = (result.required_tools ?? []).map(tool => ({
      ...tool,
      link: amazonSearch(tool.name),
    }));

    result.purchase_options = (result.purchase_options ?? []).map(opt => ({
      ...opt,
      uri: opt.is_new
        ? amazonSearch(`${deviceQuery} new`)
        : amazonSearch(`${deviceQuery} used refurbished`),
    }));

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
    text: response.response.text() || "Sorry, I could not get a response. Please try again.",
  };
}
