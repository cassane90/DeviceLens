import { beforeEach, describe, expect, it } from "vitest";
import { cacheService } from "./cacheService";
import { DeviceCategory, DiagnosisResult, RiskLevel } from "../types";

const result: DiagnosisResult = {
  brand: "Apple",
  model: "iPhone 13",
  identified_category: "Smartphone",
  confidence_score: 86,
  identification_evidence: ["Camera layout", "Visible Apple logo"],
  category_mismatch: false,
  no_visible_issue: false,
  risk_level: RiskLevel.MODERATE,
  is_high_voltage: false,
  safety_notes: [],
  summary: "The display appears damaged.",
  likely_causes: [
    {
      cause: "Display assembly damage",
      likelihood: "Likely",
      reason: "Visible cracking is concentrated across the display.",
    },
  ],
  recommended_action: "Back up the phone and have the display inspected.",
  repair_difficulty: "Moderate",
  potential_fix_cost_estimate: "Unknown",
  cost_basis: "Location and parts quality are unknown.",
  common_failures: ["Display damage"],
  required_tools: [{ name: "Precision screwdriver set", reason: "Display removal" }],
  repair_guides: [],
};

describe("cacheService", () => {
  beforeEach(() => localStorage.clear());

  it("normalizes symptoms", () => {
    expect(cacheService.normalizeSymptoms("Screen Cracked Battery Dead")).toBe("battery cracked dead screen");
  });

  it("creates stable hashes for the same image set", () => {
    const images = ["data:image/jpeg;base64,abcdefghijk"];
    expect(cacheService.generateImageHash(images)).toBe(cacheService.generateImageHash(images));
  });

  it("uses the optional device name in the cache key", () => {
    const images = ["data:image/jpeg;base64,abcdefghijk"];
    const a = cacheService.generateKey(DeviceCategory.PHONE, "screen issue", images, undefined, undefined, "iPhone 13");
    const b = cacheService.generateKey(DeviceCategory.PHONE, "screen issue", images, undefined, undefined, "iPhone 14");
    expect(a).not.toBe(b);
  });

  it("round trips a v1 assessment", () => {
    const images = ["data:image/jpeg;base64,abcdefghijk"];
    cacheService.set(DeviceCategory.PHONE, "screen issue", images, result, undefined, undefined, "iPhone 13");
    const restored = cacheService.get(DeviceCategory.PHONE, "screen issue", images, undefined, undefined, "iPhone 13");
    expect(restored?.model).toBe("iPhone 13");
    expect(restored?.likely_causes[0].likelihood).toBe("Likely");
  });

  it("clears DeviceLens v1 cache without touching unrelated storage", () => {
    const images = ["data:image/jpeg;base64,abcdefghijk"];
    cacheService.set(DeviceCategory.PHONE, "screen issue", images, result);
    localStorage.setItem("other_app_key", "keep");
    cacheService.clear();
    expect(localStorage.getItem("other_app_key")).toBe("keep");
    expect(Object.keys(localStorage).filter(key => key.startsWith("dl_v1_cache_"))).toHaveLength(0);
  });
});
