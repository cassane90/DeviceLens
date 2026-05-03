const KEY = 'dl_scan_usage';
const FREE_LIMIT = 20;
const PRO_LIMIT = 250;

interface ScanUsage {
  date: string;   // YYYY-MM-DD
  count: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function getUsage(): ScanUsage {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ScanUsage;
      if (parsed.date === today()) return parsed;
    }
  } catch { /* ignore */ }
  return { date: today(), count: 0 };
}

function saveUsage(u: ScanUsage) {
  localStorage.setItem(KEY, JSON.stringify(u));
}

export function getScansUsedToday(): number {
  return getUsage().count;
}

export function getDailyLimit(isPremium: boolean): number {
  return isPremium ? PRO_LIMIT : FREE_LIMIT;
}

export function canScan(isPremium: boolean): boolean {
  return getScansUsedToday() < getDailyLimit(isPremium);
}

export function recordScan() {
  const u = getUsage();
  saveUsage({ date: u.date, count: u.count + 1 });
}

export function msUntilReset(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

export function timeUntilReset(): string {
  const ms = msUntilReset();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
