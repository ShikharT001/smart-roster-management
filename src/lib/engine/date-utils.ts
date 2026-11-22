export function parseDate(dateStr: string): { year: number; month: number; day: number } {
  const parts = dateStr.split("-").map(Number);
  return {
    year: parts[0],
    month: parts[1], // 1-12
    day: parts[2],   // 1-31
  };
}

export function formatDate(year: number, month: number, day: number): string {
  const y = year.toString().padStart(4, "0");
  const m = month.toString().padStart(2, "0");
  const d = day.toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getMonthDates(monthStr: string): string[] {
  const [yearStr, monthPart] = monthStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthPart, 10);
  const totalDays = getDaysInMonth(year, month);

  const dates: string[] = [];
  for (let day = 1; day <= totalDays; day++) {
    dates.push(formatDate(year, month, day));
  }
  return dates;
}

export function getDayOfWeek(dateStr: string): number {
  const { year, month, day } = parseDate(dateStr);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function addDays(dateStr: string, days: number): string {
  const { year, month, day } = parseDate(dateStr);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function diffDays(dateA: string, dateB: string): number {
  const pA = parseDate(dateA);
  const pB = parseDate(dateB);
  const utcA = Date.UTC(pA.year, pA.month - 1, pA.day);
  const utcB = Date.UTC(pB.year, pB.month - 1, pB.day);
  return Math.round((utcA - utcB) / (1000 * 60 * 60 * 24));
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatHumanDate(dateStr: string): string {
  const { year, month, day } = parseDate(dateStr);
  const dow = getDayOfWeek(dateStr);
  return `${DAY_NAMES[dow]} ${day} ${MONTH_NAMES[month - 1]} ${year}`;
}

export function getWeeksInMonth(monthStr: string): string[][] {
  const allDates = getMonthDates(monthStr);
  const weeks: string[][] = [];
  let currentWeek: string[] = [];

  for (const date of allDates) {
    currentWeek.push(date);
    const dow = getDayOfWeek(date);
    // End week on Sunday (0) so weeks run Monday -> Sunday
    if (dow === 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return weeks;
}
