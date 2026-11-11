import { describe, expect, it } from 'vitest';
import { formatDateTime, formatDuration, formatMoney } from './format';

describe('formatMoney', () => {
  it('formats cents as euros', () => {
    expect(formatMoney(7900)).toBe('€79.00');
    expect(formatMoney(9915)).toBe('€99.15');
  });
});

describe('formatDateTime', () => {
  it('includes the date and the time of day', () => {
    const formatted = formatDateTime('2026-11-11T14:30:00Z');
    expect(formatted).toContain('2026');
    expect(formatted).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe('formatDuration', () => {
  it('formats minutes and hours', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(90)).toBe('1 h 30 min');
  });
});
