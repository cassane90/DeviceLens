import { DeviceCategory, DiagnosisResult } from "../types";

export async function runForensicAudit(
  category: DeviceCategory,
  description: string,
  images: string[],
  _location?: { latitude: number; longitude: number },
  manualDeviceName?: string
): Promise<DiagnosisResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 35_000);

  try {
    const response = await fetch("/api/diagnose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        category,
        description,
        images,
        manualDeviceName,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || `Assessment failed (${response.status})`);
    }

    return payload as DiagnosisResult;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Assessment timed out. Please try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}
