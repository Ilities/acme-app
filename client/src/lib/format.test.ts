import { describe, expect, it } from 'vitest';
import { formatClinicAddress, formatDuration, formatMoney } from './format';

describe('formatMoney', () => {
  it('formats cents as euros', () => {
    expect(formatMoney(7900)).toBe('€79.00');
    expect(formatMoney(9915)).toBe('€99.15');
  });
});

describe('formatDuration', () => {
  it('formats minutes and hours', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(90)).toBe('1 h 30 min');
  });
});

describe('formatClinicAddress', () => {
  it('puts the street address and the city on one line', () => {
    expect(formatClinicAddress('Fredrikinkatu 22', 'Helsinki')).toBe('Fredrikinkatu 22, Helsinki');
  });

  it('leaves out the street address when the clinic has none', () => {
    expect(formatClinicAddress(null, 'Helsinki')).toBe('Helsinki');
  });
});
