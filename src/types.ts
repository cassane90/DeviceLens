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
export type IdentityStatus = "High confidence" | "Likely" | "Uncertain" | "User verified";

export interface DiagnosticQuestion {
  id: string;
  question: string;
  why_it_matters: string;
  options: string[];
}

export interface IdentificationResult {
  interaction_id: string;
  brand: string;
  model: string;
  identified_category: string;
  confidence_score: number;
  confidence_label: Exclude<IdentityStatus, "User verified">;
  identification_evidence: string[];
  category_mismatch: boolean;
  needs_verification: boolean;
  verification_request: string;
  safety_stop: boolean;
  safety_message: string;
  diagnostic_questions: DiagnosticQuestion[];
}

export interface DiagnosticAnswer {
  question: string;
  answer: string;
}

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
  identity_status: IdentityStatus;
  identification_evidence: string[];
  category_mismatch: boolean;
  no_visible_issue: boolean;

  risk_level: RiskLevel;
  is_high_voltage: boolean;
  safety_notes: string[];

  summary: string;
  likely_causes: LikelyCause[];
  diagnostic_evidence: string[];
  unresolved_uncertainties: string[];
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
