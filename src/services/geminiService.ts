import {
  DeviceCategory,
  DiagnosticAnswer,
  DiagnosisResult,
  IdentificationResult,
} from "../types";

async function postJson<T>(url: string, body: unknown, timeoutMs = 35_000): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || `Request failed (${response.status})`);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Assessment timed out. Please try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function identifyDevice(
  category: DeviceCategory,
  description: string,
  images: string[],
  manualDeviceName?: string
): Promise<IdentificationResult> {
  return postJson<IdentificationResult>("/api/identify", {
    category,
    description,
    images,
    manualDeviceName,
  });
}

export async function runGuidedDiagnosis(args: {
  interactionId: string;
  category: DeviceCategory;
  description: string;
  confirmedDeviceName: string;
  userVerifiedIdentity: boolean;
  identification: IdentificationResult;
  answers: DiagnosticAnswer[];
  extraNotes: string;
}): Promise<DiagnosisResult> {
  return postJson<DiagnosisResult>("/api/diagnose", args, 40_000);
}

export async function cleanupInteraction(interactionId?: string): Promise<void> {
  if (!interactionId) return;

  try {
    await fetch("/api/cleanup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interactionId }),
    });
  } catch {
    // Cleanup is best-effort and must not block the user.
  }
}
