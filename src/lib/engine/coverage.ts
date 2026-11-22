import { ProcessData, HolidayData, CoverageOverrideData } from "./types";
import { getDayOfWeek } from "./date-utils";

export function findHoliday(dateStr: string, holidays: HolidayData[]): HolidayData | undefined {
  return holidays.find((h) => h.date === dateStr);
}

export function isHoliday(dateStr: string, holidays: HolidayData[]): boolean {
  return findHoliday(dateStr, holidays) !== undefined;
}

export function requiredCoverage(
  process: ProcessData,
  dateStr: string,
  holidays: HolidayData[],
  overrides: CoverageOverrideData[]
): number {
  // 1. Check for specific date override
  const dateOverride = overrides.find(
    (o) => o.processId === process.id && o.date === dateStr
  );
  if (dateOverride !== undefined) {
    return Math.max(0, dateOverride.minStaff);
  }

  // 2. Check for weekday override (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const dow = getDayOfWeek(dateStr);
  const weekdayOverride = overrides.find(
    (o) => o.processId === process.id && o.weekday === dow && (!o.date || o.date === null)
  );
  if (weekdayOverride !== undefined) {
    return Math.max(0, weekdayOverride.minStaff);
  }

  // 3. Fall back to standard CalendarRule
  const holiday = isHoliday(dateStr, holidays);
  const isSunday = dow === 0;

  switch (process.calendarRule) {
    case "ALL_365":
      // Runs every single day, including Sundays and public holidays
      return process.minStaffDefault;

    case "ALL_EXCEPT_HOLIDAYS":
      // Runs every day (including Sundays), but closes on public holidays
      if (holiday) {
        return 0;
      }
      return process.minStaffDefault;

    case "EXCEPT_SUNDAYS_AND_HOLIDAYS":
      // Runs Monday through Saturday; closes on Sundays and public holidays
      if (isSunday || holiday) {
        return 0;
      }
      return process.minStaffDefault;

    default:
      return process.minStaffDefault;
  }
}

export function isProcessOpenOnDate(
  process: ProcessData,
  dateStr: string,
  holidays: HolidayData[],
  overrides: CoverageOverrideData[]
): boolean {
  return requiredCoverage(process, dateStr, holidays, overrides) > 0;
}
