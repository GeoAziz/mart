/**
 * Timezone and Calendar Boundary Utilities for MAE Retention Intelligence.
 *
 * Enforces Africa/Nairobi (EAT / UTC+3) calendar boundaries for all cohort calculations.
 */

export const RETENTION_TIMEZONE = 'Africa/Nairobi';

/**
 * Converts a UTC Date or ISO timestamp into a YYYY-MM-DD date string in Africa/Nairobi.
 */
export function toNairobiDateString(dateInput: Date | string | number): string {
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date input for timezone conversion: ${dateInput}`);
  }

  // Format in Africa/Nairobi timezone (en-CA gives YYYY-MM-DD format)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: RETENTION_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(date);
}

/**
 * Calculates calendar day difference between two Africa/Nairobi date strings (targetDate - cohortDate).
 */
export function getCalendarDayDiff(cohortDateStr: string, activeDateStr: string): number {
  const cohortUtc = Date.UTC(
    Number(cohortDateStr.slice(0, 4)),
    Number(cohortDateStr.slice(5, 7)) - 1,
    Number(cohortDateStr.slice(8, 10))
  );
  const activeUtc = Date.UTC(
    Number(activeDateStr.slice(0, 4)),
    Number(activeDateStr.slice(5, 7)) - 1,
    Number(activeDateStr.slice(8, 10))
  );

  const diffMs = activeUtc - cohortUtc;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Returns the Monday-based week identifier (e.g. "2026-W45") in Africa/Nairobi.
 */
export function toNairobiWeekString(dateInput: Date | string | number): string {
  const dateStr = toNairobiDateString(dateInput);
  const date = new Date(dateStr + 'T00:00:00Z');

  // ISO week calculation
  const target = new Date(date.valueOf());
  const dayNumber = (date.getUTCDay() + 6) % 7; // Monday = 0
  target.setUTCDate(target.getUTCDate() - dayNumber + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / (7 * 24 * 3600 * 1000));
  const year = date.getUTCFullYear();

  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}
