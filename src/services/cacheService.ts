import { DeviceCategory, DiagnosisResult } from "../types";

const CACHE_KEY_PREFIX = "dl_cache_";
const CACHE_EXPIRY_MS = 1000 * 60 * 60 * 24 * 7;

interface CacheEntry {
  timestamp: number;
  result: DiagnosisResult;
}

function hashText(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

export const cacheService = {
  normalizeSymptoms(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .split(/\s+/)
      .filter(word => word.length > 2)
      .sort()
      .join(" ")
      .trim();
  },

  generateImageHash(images: string[]): string {
    if (!images?.length) return "no_image";

    const combined = images.map(image => {
      const length = image.length;
      const middle = Math.floor(length / 2);
      return [
        String(length),
        image.slice(0, 120),
        image.slice(Math.max(0, middle - 60), middle + 60),
        image.slice(Math.max(0, length - 120)),
      ].join("|");
    }).join("::");

    return hashText(combined);
  },

  generateKey(
    category: DeviceCategory,
    symptoms: string,
    images: string[],
    lat?: number,
    lng?: number,
    manualDeviceName = ""
  ): string {
    const normalized = this.normalizeSymptoms(symptoms);
    const manual = this.normalizeSymptoms(manualDeviceName);
    const imgHash = this.generateImageHash(images);
    const hasLocation = Number.isFinite(lat) && Number.isFinite(lng);
    const locKey = hasLocation ? `_${lat!.toFixed(2)}_${lng!.toFixed(2)}` : "_global";
    return `${CACHE_KEY_PREFIX}${category}_${manual}_${normalized}_${imgHash}${locKey}`;
  },

  get(
    category: DeviceCategory,
    symptoms: string,
    images: string[],
    lat?: number,
    lng?: number,
    manualDeviceName = ""
  ): DiagnosisResult | null {
    const key = this.generateKey(category, symptoms, images, lat, lng, manualDeviceName);
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    try {
      const entry: CacheEntry = JSON.parse(stored);
      if (!entry?.result || typeof entry.timestamp !== "number") {
        localStorage.removeItem(key);
        return null;
      }

      if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) {
        localStorage.removeItem(key);
        return null;
      }

      return entry.result;
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  },

  set(
    category: DeviceCategory,
    symptoms: string,
    images: string[],
    result: DiagnosisResult,
    lat?: number,
    lng?: number,
    manualDeviceName = ""
  ): void {
    const key = this.generateKey(category, symptoms, images, lat, lng, manualDeviceName);
    const entry: CacheEntry = { timestamp: Date.now(), result };

    try {
      localStorage.setItem(key, JSON.stringify(entry));
    } catch {
      // Caching is optional. Diagnosis should still succeed.
    }
  },

  clear(): void {
    Object.keys(localStorage)
      .filter(key => key.startsWith(CACHE_KEY_PREFIX))
      .forEach(key => localStorage.removeItem(key));
  },
};
