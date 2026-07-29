const YANGON_RESET_HOUR = 2;
const YANGON_OFFSET_MS = 6.5 * 60 * 60 * 1000;

function formatDateKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateKeyToLocalNoon(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00`);
}

export function getYangonResetDateKey(now = new Date()): string {
  const shifted = new Date(now.getTime() - YANGON_RESET_HOUR * 60 * 60 * 1000);
  try {
    return formatDateKeyInTimeZone(shifted, "Asia/Yangon");
  } catch {
    return new Date(shifted.getTime() + YANGON_OFFSET_MS).toISOString().split("T")[0];
  }
}
