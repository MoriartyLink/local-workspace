const DAYS_PER_WEEK = 7;
const WEEKS_PER_ITERATION = 6;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type ProjectIteration =
  | { status: "active"; iteration: number; week: number; elapsedWeeks: number }
  | { status: "upcoming"; daysUntilStart: number };

function dateKeyToUtcTime(dateKey: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  const time = Date.UTC(year, month - 1, day);
  const parsed = new Date(time);
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) return null;
  return time;
}

export function getProjectIteration(startDate: string | undefined, currentDate: string): ProjectIteration | null {
  if (!startDate) return null;
  const startTime = dateKeyToUtcTime(startDate);
  const currentTime = dateKeyToUtcTime(currentDate);
  if (startTime === null || currentTime === null) return null;

  const elapsedDays = Math.floor((currentTime - startTime) / MS_PER_DAY);
  if (elapsedDays < 0) return { status: "upcoming", daysUntilStart: Math.abs(elapsedDays) };

  const elapsedWeeks = Math.floor(elapsedDays / DAYS_PER_WEEK);
  return {
    status: "active",
    iteration: Math.floor(elapsedWeeks / WEEKS_PER_ITERATION) + 1,
    week: (elapsedWeeks % WEEKS_PER_ITERATION) + 1,
    elapsedWeeks,
  };
}
