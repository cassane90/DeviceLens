import { QueryRecord } from "../types";

const HISTORY_KEY = "dl_local_logs";
const MAX_HISTORY = 30;

function read(): QueryRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
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
