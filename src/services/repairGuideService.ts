import { RepairGuide } from "../types";

export async function findRepairGuides(
  deviceName: string,
  issue: string
): Promise<RepairGuide[]> {
  try {
    const response = await fetch("/api/ifixit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceName, issue }),
    });

    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data?.guides) ? data.guides : [];
  } catch {
    return [];
  }
}
