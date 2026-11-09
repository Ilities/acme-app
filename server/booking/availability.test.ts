import { describe, expect, it } from 'vitest';
import { computeSlots, type AvailabilityInput } from './availability.js';

const base: AvailabilityInput = {
  date: '2026-02-10',
  timeZone: 'Europe/Helsinki',
  opensAt: '09:00',
  closesAt: '12:00',
  openDays: [1, 2, 3, 4, 5],
  durationMinutes: 60,
  staffIds: [1, 2],
  busy: [],
  now: new Date('2026-02-01T00:00:00Z'),
};

const times = (input: AvailabilityInput) =>
  computeSlots(input).map((slot) => slot.startsAt.toISOString().slice(11, 16));

describe('computeSlots', () => {
  it('offers slots in clinic local time', () => {
    expect(times(base)).toEqual(['07:00', '07:30', '08:00', '08:30', '09:00']);
  });

  it('returns nothing on closed days', () => {
    expect(computeSlots({ ...base, date: '2026-02-14' })).toEqual([]);
  });

  it('removes staff who are busy', () => {
    const slots = computeSlots({
      ...base,
      busy: [
        {
          staffId: 1,
          startsAt: new Date('2026-02-10T07:00:00Z'),
          endsAt: new Date('2026-02-10T08:00:00Z'),
        },
      ],
    });
    expect(slots[0].staffIds).toEqual([2]);
    expect(slots[2].staffIds).toEqual([1, 2]);
  });

  it('drops a slot when everyone is busy', () => {
    const busy = [1, 2].map((staffId) => ({
      staffId,
      startsAt: new Date('2026-02-10T07:00:00Z'),
      endsAt: new Date('2026-02-10T09:00:00Z'),
    }));
    expect(times({ ...base, busy })).toEqual(['09:00']);
  });

  it('respects the minimum notice period', () => {
    const slots = times({ ...base, now: new Date('2026-02-10T06:45:00Z') });
    expect(slots[0]).toBe('08:00');
  });
});
