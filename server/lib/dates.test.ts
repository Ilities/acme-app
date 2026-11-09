import { describe, expect, it } from 'vitest';
import {
  addDays,
  formatTime,
  getTimeZoneOffsetMinutes,
  isIsoDate,
  isoWeekday,
  toLocalDateString,
  zonedTimeToUtc,
} from './dates.js';

describe('zonedTimeToUtc', () => {
  it('converts Helsinki winter time', () => {
    expect(zonedTimeToUtc('2026-01-15', '09:00', 'Europe/Helsinki').toISOString()).toBe(
      '2026-01-15T07:00:00.000Z',
    );
  });

  it('converts Helsinki summer time', () => {
    expect(zonedTimeToUtc('2026-07-15', '09:00', 'Europe/Helsinki').toISOString()).toBe(
      '2026-07-15T06:00:00.000Z',
    );
  });

  it('converts Stockholm time', () => {
    expect(zonedTimeToUtc('2026-01-15', '09:00', 'Europe/Stockholm').toISOString()).toBe(
      '2026-01-15T08:00:00.000Z',
    );
  });

  it('handles the day clocks go back', () => {
    expect(zonedTimeToUtc('2026-10-25', '12:00', 'Europe/Stockholm').toISOString()).toBe(
      '2026-10-25T11:00:00.000Z',
    );
  });
});

describe('getTimeZoneOffsetMinutes', () => {
  it('returns the offset from UTC', () => {
    expect(getTimeZoneOffsetMinutes(new Date('2026-01-15T12:00:00Z'), 'Europe/Helsinki')).toBe(120);
    expect(getTimeZoneOffsetMinutes(new Date('2026-07-15T12:00:00Z'), 'Europe/Stockholm')).toBe(
      120,
    );
  });
});

describe('date helpers', () => {
  it('finds the local date in a timezone', () => {
    const lateEvening = new Date('2026-03-02T22:30:00Z');
    expect(toLocalDateString(lateEvening, 'Europe/Helsinki')).toBe('2026-03-03');
    expect(toLocalDateString(lateEvening, 'Europe/Stockholm')).toBe('2026-03-02');
  });

  it('returns ISO weekdays', () => {
    expect(isoWeekday('2026-11-09')).toBe(1);
    expect(isoWeekday('2026-11-15')).toBe(7);
  });

  it('adds days across month boundaries', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('validates ISO dates', () => {
    expect(isIsoDate('2026-02-10')).toBe(true);
    expect(isIsoDate('10.2.2026')).toBe(false);
  });

  it('formats a time in the given timezone', () => {
    expect(formatTime(new Date('2026-01-15T07:00:00Z'), 'Europe/Helsinki')).toBe('09:00');
  });
});
