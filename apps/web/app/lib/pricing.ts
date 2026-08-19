export type SpecialDateRate = {
  fromDate: string;
  toDate: string;
  boardingRate?: number;
  daycareRate?: number;
};

export type PricingSettings = {
  boardingRate: number;
  daycareRate: number;
  specialDateRates?: SpecialDateRate[];
};

function safeRate(value: unknown, fallback: number) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : fallback;
}

export function normalizeSpecialDateRates(value: unknown): SpecialDateRate[] {
  if (!Array.isArray(value)) return [];
  const byRange = new Map<string, SpecialDateRate>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Record<string, unknown>;
    const legacyDate = typeof candidate.date === "string" ? candidate.date : "";
    const fromDate = typeof candidate.fromDate === "string" ? candidate.fromDate : legacyDate;
    const toDate = typeof candidate.toDate === "string" ? candidate.toDate : fromDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate) || toDate < fromDate) continue;
    const boardingRate = Number(candidate.boardingRate);
    const daycareRate = Number(candidate.daycareRate);
    byRange.set(`${fromDate}:${toDate}`, {
      fromDate,
      toDate,
      ...(Number.isFinite(boardingRate) && boardingRate >= 0 ? { boardingRate } : {}),
      ...(Number.isFinite(daycareRate) && daycareRate >= 0 ? { daycareRate } : {})
    });
  }
  return [...byRange.values()].sort((a, b) => a.fromDate.localeCompare(b.fromDate) || a.toDate.localeCompare(b.toDate));
}

export function dateKeysInclusive(startDate: string, endDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate) return [];
  const [year, month, day] = startDate.split("-").map(Number);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  const dates: string[] = [];
  for (let cursor = Date.UTC(year, month - 1, day); cursor <= end; cursor += 86400000) {
    dates.push(new Date(cursor).toISOString().slice(0, 10));
  }
  return dates;
}

export function rateForDate(service: "overnight" | "daycare", date: string, settings: PricingSettings) {
  const special = normalizeSpecialDateRates(settings.specialDateRates)
    .find((item) => date >= item.fromDate && date <= item.toDate);
  return service === "overnight"
    ? safeRate(special?.boardingRate, safeRate(settings.boardingRate, 35))
    : safeRate(special?.daycareRate, safeRate(settings.daycareRate, 5));
}

export function calculateServiceSubtotal(input: {
  service: "overnight" | "daycare";
  startDate: string;
  endDate: string;
  hours: number;
  petCount: number;
  settings: PricingSettings;
}) {
  const petCount = Math.max(0, Math.floor(input.petCount));
  if (petCount === 0) return 0;
  if (input.service === "daycare") {
    return Math.max(0, input.hours) * petCount * rateForDate("daycare", input.startDate, input.settings);
  }
  return dateKeysInclusive(input.startDate, input.endDate)
    .reduce((sum, date) => sum + rateForDate("overnight", date, input.settings) * petCount, 0);
}
