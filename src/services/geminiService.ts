import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { DeviceCategory, DiagnosisResult, ChatMessage } from "../types";
import { supabaseService } from "./supabaseService";

function getAI() {
  return new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
}

export async function runForensicAudit(
  category: DeviceCategory,
  description: string,
  images: string[],
  location?: { latitude: number; longitude: number },
  manualDeviceName?: string
): Promise<DiagnosisResult> {
  const ai = getAI();

  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const locationContext = location
    ? `The user is at coordinates: ${location.latitude}, ${location.longitude}.
       Identify their country. Set 'currency_code' to the local currency.
       Find LOCAL repair shops near those coordinates.
       For parts/tools, include local retailer search links where available.`
    : 'Location unknown — use USD and global retailers (Amazon, eBay, AliExpress).';

  let prompt = `DEVICELENS DIAGNOSTIC PROTOCOL

Context:
- Date: ${currentDate} (Use this to correctly identify the latest devices, e.g. iPhone 17, Galaxy S25, etc.)
- Category selected by user: ${category}
- User description: ${description || 'None provided'}
- ${locationContext}
`;

  if (manualDeviceName) {
    prompt += `
- User claims this is a "${manualDeviceName}". Verify visually. If the evidence strongly matches, use it. If the device is clearly different, correct the identification.
`;
  }

  prompt += `
IDENTIFICATION REQUIREMENTS (be precise):
1. Analyze every visible detail: model numbers, ports (USB-C vs Lightning), camera layout, button placement, screen notch/Dynamic Island/hole-punch, materials, color.
2. Use current date to identify latest released models (iPhone 17, Pixel 9, Galaxy S25, etc.)
3. Set confidence_score < 70 if lighting or angle prevents a certain ID — explain uncertainty in reasoning.
4. Distinguish genuine devices from counterfeit/knock-off variants.

REPAIR HUB REQUIREMENTS:
1. Use Google Search to find REAL, currently operating local repair shops near the coordinates.
2. For the 'uri' field, ALWAYS use a Google Maps search link: https://www.google.com/maps/search/?api=1&query=[shop+name+address]
3. Include rating if available.

DIY GUIDE REQUIREMENTS:
1. Provide exactly 2 YouTube search links in 'diy_guides':
   - Link 1: https://www.youtube.com/results?search_query=[Device+Name]+[Issue]+repair
   - Link 2: https://www.youtube.com/results?search_query=[Device+Name]+[Part]+replacement
2. Do NOT use direct video or article links — search URLs only.

PARTS & TOOLS REQUIREMENTS:
1. Use search URLs only (no direct product links that may break):
   - Amazon: https://www.amazon.com/s?k=[query]
   - AliExpress: https://www.aliexpress.com/wholesale?SearchText=[query]
   - eBay: https://www.ebay.com/sch/i.html?_nkw=[query]
   - Local (if identified): use appropriate local marketplace
2. Each tool and part must have its own unique search link.

VALIDATION:
1. Compare user-selected category (${category}) with the actual device. Set category_mismatch=true if they differ.
2. If the device appears pristine with no visible damage AND the description is vague/empty, set no_visible_issue=true.

Return JSON matching the schema exactly.`;

  const model = ai.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          brand: { type: SchemaType.STRING },
          model: { type: SchemaType.STRING },
          confidence_score: { type: SchemaType.NUMBER },
          risk_level: { type: SchemaType.STRING },
          is_high_voltage: { type: SchemaType.BOOLEAN },
          recommended_action: { type: SchemaType.STRING },
          reasoning: { type: SchemaType.STRING },
          potential_fix_cost_estimate: { type: SchemaType.STRING },
          currency_code: { type: SchemaType.STRING },
          resale_value: {
            type: SchemaType.OBJECT,
            properties: {
              unit_value_fixed: { type: SchemaType.STRING },
              unit_value_broken: { type: SchemaType.STRING },
              profit_potential: { type: SchemaType.STRING },
            },
            required: ["unit_value_fixed", "unit_value_broken", "profit_potential"],
          },
          recommended_repair_hubs: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                name: { type: SchemaType.STRING },
                address: { type: SchemaType.STRING },
                uri: { type: SchemaType.STRING },
                rating: { type: SchemaType.STRING },
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
                title: { type: SchemaType.STRING },
                uri: { type: SchemaType.STRING },
                author: { type: SchemaType.STRING },
                platform: { type: SchemaType.STRING },
                duration: { type: SchemaType.STRING },
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
                name: { type: SchemaType.STRING },
                reason: { type: SchemaType.STRING },
                link: { type: SchemaType.STRING },
              },
              required: ["name", "reason"],
            },
          },
          purchase_options: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                name: { type: SchemaType.STRING },
                price: { type: SchemaType.STRING },
                uri: { type: SchemaType.STRING },
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
                name: { type: SchemaType.STRING },
                part_name: { type: SchemaType.STRING },
                uri: { type: SchemaType.STRING },
              },
              required: ["name", "part_name", "uri"],
            },
          },
          category_mismatch: { type: SchemaType.BOOLEAN },
          identified_category: { type: SchemaType.STRING },
          no_visible_issue: { type: SchemaType.BOOLEAN },
        },
        required: [
          "brand", "model", "confidence_score", "risk_level", "recommended_action",
          "resale_value", "recommended_repair_hubs", "diy_guides", "required_tools",
          "purchase_options", "parts_retailers", "category_mismatch", "identified_category", "no_visible_issue",
        ],
      },
    },
  });

  try {
    const response = await model.generateContent([
      prompt,
      ...images.map(img => {
        const mimeMatch = img.match(/^data:([^;]+);base64,/);
        const mimeType = (mimeMatch?.[1] || 'image/jpeg') as string;
        return { inlineData: { mimeType, data: img.split(',')[1] } };
      }),
    ]);

    const text = response.response.text();
    const sources = response.response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map(chunk => chunk.web?.uri)
      .filter((uri): uri is string => !!uri) || [];

    const result = JSON.parse(text) as DiagnosisResult;

    // Augment with device specs from DB if available
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const specs = await supabaseService.getDeviceSpecs(result.brand, result.model) as any;
      if (specs) {
        (result as unknown as Record<string, unknown>).technical_specs = {
          processor: `${specs.processor_brand} ${specs.num_cores} Cores`,
          screen: `${specs.screen_size}" @ ${specs.refresh_rate}Hz`,
          battery: `${specs.battery_capacity} mAh`,
          camera: `${specs.num_rear_cameras} Rear / ${specs.primary_camera_front}MP Front`,
          os: specs.os,
        };
      }
    } catch {
      // DB lookup failed — proceed with AI result only
    }

    // Ensure all repair hub URIs are valid Google Maps links
    if (result.recommended_repair_hubs) {
      result.recommended_repair_hubs = result.recommended_repair_hubs.map(hub => {
        if (!hub.uri || !hub.uri.includes('google.com/maps') || hub.uri.includes('placeholder')) {
          const query = encodeURIComponent(`${hub.name} ${hub.address}`);
          hub.uri = `https://www.google.com/maps/search/?api=1&query=${query}`;
        }
        return hub;
      });
    }

    result.sources = sources;
    return result;

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("DeviceLens diagnosis error:", msg, err);
    throw new Error(msg);
  }
}

export async function chatWithAssistant(message: string): Promise<ChatMessage> {
  const ai = getAI();
  const model = ai.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: 'You are a DeviceLens support assistant. Help users with device repair questions. Be clear, practical, and friendly.',
  });

  const response = await model.generateContent(message);

  const sources = response.response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.map(chunk => chunk.web?.uri)
    .filter((uri): uri is string => !!uri) || [];

  return {
    role: 'ai',
    text: response.response.text() || "Sorry, I couldn't get a response. Please try again.",
    sources,
  };
}
