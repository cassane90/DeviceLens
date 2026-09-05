import { DeviceCategory, DiagnosisResult } from "../types";

const AMAZON_TAG = "devicelens-20";

function amazonSearch(query: string): string {
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${AMAZON_TAG}`;
}

function ebaySearch(query: string): string {
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
}

function normalizeResult(result: DiagnosisResult): DiagnosisResult {
  const deviceQuery = `${result.brand} ${result.model}`.trim();

  result.recommended_repair_hubs = Array.isArray(result.recommended_repair_hubs)
    ? result.recommended_repair_hubs
    : [];

  result.required_tools = (result.required_tools ?? []).map(tool => ({
    ...tool,
    link: amazonSearch(tool.name),
  }));

  result.parts_retailers = (result.parts_retailers ?? []).map((part, i) => ({
    ...part,
    name: i === 0 ? "Amazon" : "eBay",
    uri: i === 0
      ? amazonSearch(`${part.part_name} compatible ${deviceQuery}`)
      : ebaySearch(`${part.part_name} ${deviceQuery}`),
  }));

  result.purchase_options = (result.purchase_options ?? []).map(opt => ({
    ...opt,
    uri: opt.is_new
      ? amazonSearch(`${deviceQuery} new`)
      : ebaySearch(`${deviceQuery} used refurbished`),
  }));

  return result;
}

export async function runForensicAudit(
  category: DeviceCategory,
  description: string,
  images: string[],
  location?: { latitude: number; longitude: number },
  manualDeviceName?: string
): Promise<DiagnosisResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 32_000);

  try {
    const response = await fetch("/api/diagnose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        category,
        description,
        images,
        location,
        manualDeviceName,
        locale: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || `Diagnosis failed (${response.status})`);
    }

    return normalizeResult(payload as DiagnosisResult);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Diagnosis timed out. Please try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}
