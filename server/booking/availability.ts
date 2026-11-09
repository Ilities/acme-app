import { overlaps, type BusyInterval } from '../appointments/repository.js';
import { addMinutes, isoWeekday, zonedTimeToUtc } from '../lib/dates.js';

export interface AvailabilityInput {
  date: string;
  timeZone: string;
  opensAt: string;
  closesAt: string;
  openDays: number[];
  durationMinutes: number;
  staffIds: number[];
  busy: BusyInterval[];
  now: Date;
  stepMinutes?: number;
  minNoticeMinutes?: number;
}

export interface Slot {
  startsAt: Date;
  endsAt: Date;
  staffIds: number[];
}

export const DEFAULT_STEP_MINUTES = 30;
export const DEFAULT_MIN_NOTICE_MINUTES = 60;

export function computeSlots(input: AvailabilityInput): Slot[] {
  if (!input.openDays.includes(isoWeekday(input.date)) || input.staffIds.length === 0) {
    return [];
  }

  const step = input.stepMinutes ?? DEFAULT_STEP_MINUTES;
  const earliest = addMinutes(input.now, input.minNoticeMinutes ?? DEFAULT_MIN_NOTICE_MINUTES);
  const dayStart = zonedTimeToUtc(input.date, input.opensAt, input.timeZone);
  const dayEnd = zonedTimeToUtc(input.date, input.closesAt, input.timeZone);

  const slots: Slot[] = [];
  for (
    let startsAt = dayStart;
    addMinutes(startsAt, input.durationMinutes) <= dayEnd;
    startsAt = addMinutes(startsAt, step)
  ) {
    if (startsAt < earliest) {
      continue;
    }
    const endsAt = addMinutes(startsAt, input.durationMinutes);
    const staffIds = input.staffIds.filter(
      (staffId) =>
        !input.busy.some((busy) => busy.staffId === staffId && overlaps(busy, startsAt, endsAt)),
    );
    if (staffIds.length > 0) {
      slots.push({ startsAt, endsAt, staffIds });
    }
  }
  return slots;
}
