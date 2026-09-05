export enum DeviceCategory {
  LAPTOP = "Laptop",
  PHONE = "Smartphone",
  CONSOLE = "Game Console",
  TABLET = "Tablet",
  APPLIANCE = "Appliance",
  DESKTOP = "Desktop Computer",
  OTHER = "Other Electronic",
}

export enum RiskLevel {
  LOW = "Low",
  MODERATE = "Moderate",
  HIGH = "High",
  EXTREME = "Extreme",
}

export type RepairDifficulty = "Easy" | "Moderate" | "Difficult" | "Professional only";

export interface LikelyCause {
  cause: string;
  likelihood: "Likely" | "Possible" | "Uncertain";
  reason: string;
}

export interface RepairTool {
  name: string;
  reason: string;
}

export interface RepairGuide {
  title: string;
  url: string;
  source: "iFixit";
  summary?: string;
  image?: string;
}

export interface DiagnosisResult {
  brand: string;
  model: string;
  identified_category: string;
  confidence_score: number;
  identification_evidence: string[];
  category_mismatch: boolean;
  no_visible_issue: boolean;

  risk_level: RiskLevel;
  is_high_voltage: boolean;
  safety_notes: string[];

  summary: string;
  likely_causes: LikelyCause[];
  recommended_action: string;
  repair_difficulty: RepairDifficulty;
  potential_fix_cost_estimate: string;
  cost_basis: string;
  common_failures: string[];
  required_tools: RepairTool[];

  repair_guides: RepairGuide[];
}

export interface QueryRecord {
  id: string;
  created_at: string;
  category: DeviceCategory;
  description: string;
  device_name?: string;
  photo_urls: string[];
  ai_response: DiagnosisResult;
}

export type ThemeMode = "light" | "dark";
