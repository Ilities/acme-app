const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = partsFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    partsFormatterCache.set(timeZone, formatter);
  }
  return formatter;
}

export function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = partsFormatter(timeZone).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  const wholeSeconds = Math.floor(date.getTime() / 1000) * 1000;
  return Math.round((asUtc - wholeSeconds) / MINUTE_MS);
}

/** Converts a wall-clock date and time in `timeZone` to a UTC instant. */
export function zonedTimeToUtc(isoDate: string, time: string, timeZone: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const wallClock = Date.UTC(year, month - 1, day, hours, minutes);

  const firstOffset = getTimeZoneOffsetMinutes(new Date(wallClock), timeZone);
  const candidate = wallClock - firstOffset * MINUTE_MS;
  const secondOffset = getTimeZoneOffsetMinutes(new Date(candidate), timeZone);

  return new Date(wallClock - secondOffset * MINUTE_MS);
}

export function toLocalDateString(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** ISO weekday (1 = Monday ... 7 = Sunday) for a YYYY-MM-DD date. */
export function isoWeekday(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * DAY_MS).toISOString().slice(0, 10);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MINUTE_MS);
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function formatDateTime(date: Date, timeZone = 'UTC'): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatTime(date: Date, timeZone = 'UTC'): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
