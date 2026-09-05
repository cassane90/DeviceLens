import { QueryRecord } from "../types";

const HISTORY_KEY = "dl_local_logs";
const MAX_HISTORY = 30;

function isV1Record(value: unknown): value is QueryRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as QueryRecord;
  const result = record.ai_response;
  return Boolean(
    record.id &&
    record.created_at &&
    result &&
    typeof result.summary === "string" &&
    Array.isArray(result.likely_causes) &&
    Array.isArray(result.identification_evidence) &&
    Array.isArray(result.safety_notes) &&
    Array.isArray(result.required_tools) &&
    Array.isArray(result.repair_guides)
  );
}

function read(): QueryRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    const current = parsed.filter(isV1Record);
    if (current.length !== parsed.length) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(current));
    }
    return current;
  } catch {
    return [];
  }
}

export const historyService = {
  list(): QueryRecord[] {
    return read();
  },

  save(record: QueryRecord): QueryRecord[] {
    const storedRecord: QueryRecord = {
      ...record,
      // Diagnosis history should stay lightweight. Photos are not persisted.
      photo_urls: [],
    };

    const next = [storedRecord, ...read().filter(item => item.id !== record.id)].slice(0, MAX_HISTORY);

    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      // If older photo-heavy records filled storage, clear them and keep the latest result.
      try {
        localStorage.removeItem(HISTORY_KEY);
        localStorage.setItem(HISTORY_KEY, JSON.stringify([storedRecord]));
      } catch {
        // History is optional. Do not break diagnosis if storage is unavailable.
      }
    }

    return next;
  },

  clear(): void {
    localStorage.removeItem(HISTORY_KEY);
  },
};
