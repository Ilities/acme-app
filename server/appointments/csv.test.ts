import { describe, expect, it } from 'vitest';
import type { AppointmentListItem } from './repository.js';
import { toCsv } from './csv.js';

function item(overrides: Partial<AppointmentListItem> = {}): AppointmentListItem {
  return {
    id: 1,
    // 08:00 UTC is 10:00 in Europe/Helsinki.
    startsAt: '2027-01-12T08:00:00.000Z',
    endsAt: '2027-01-12T09:00:00.000Z',
    timeLabel: 'Tue 12 Jan, 10:00',
    durationMinutes: 60,
    priceCents: 8000,
    status: 'completed',
    source: 'online',
    notes: null,
    service: { id: 1, name: 'Assessment' },
    staff: { id: 2, name: 'Pekka Physio' },
    customer: { id: 3, name: 'Ville Asiakas', email: 'ville@example.com', phone: null },
    deposit: null,
    ...overrides,
  };
}

const HEADER =
  'Date;Time;Customer;Email;Phone;Service;Staff;Status;Price (EUR);Deposit paid (EUR);Notes';

describe('toCsv', () => {
  it('starts with a UTF-8 BOM and the header row', () => {
    const csv = toCsv([], 'Europe/Helsinki');
    expect(csv.startsWith('\uFEFF' + HEADER + '\r\n')).toBe(true);
  });

  it('writes one row per appointment in the clinic time zone', () => {
    const csv = toCsv([item()], 'Europe/Helsinki');
    const rows = csv.split('\r\n');
    expect(rows).toHaveLength(3); // header + row + trailing empty after final CRLF
    expect(rows[1]).toBe(
      '2027-01-12;10:00;Ville Asiakas;ville@example.com;;Assessment;Pekka Physio;Completed;80,00;;',
    );
  });

  it('uses CRLF line endings throughout', () => {
    const csv = toCsv([item(), item({ id: 2 })], 'Europe/Helsinki');
    expect(csv).toContain('\r\n');
    expect(csv).not.toMatch(/[^\r]\n/);
  });

  it('formats dates and times in the Stockholm time zone', () => {
    // 08:00 UTC is 09:00 in Europe/Stockholm.
    const csv = toCsv([item()], 'Europe/Stockholm');
    expect(csv.split('\r\n')[1].startsWith('2027-01-12;09:00;')).toBe(true);
  });

  it('writes prices and paid deposits with a decimal comma and no grouping', () => {
    const csv = toCsv(
      [
        item({
          service: { id: 1, name: 'Package' },
          priceCents: 123456,
          deposit: { amountCents: 2500, status: 'paid', paidAt: '2027-01-01T10:00:00.000Z' },
        }),
      ],
      'Europe/Helsinki',
    );
    expect(csv.split('\r\n')[1]).toContain(';1234,56;25,00;');
  });

  it('leaves the deposit cell empty unless the deposit is paid', () => {
    const csv = toCsv(
      [
        item({ deposit: { amountCents: 2500, status: 'pending', paidAt: null } }),
        item({ id: 2, deposit: { amountCents: 2500, status: 'failed', paidAt: null } }),
      ],
      'Europe/Helsinki',
    );
    const rows = csv.split('\r\n');
    expect(rows[1].endsWith(';;')).toBe(true);
    expect(rows[2].endsWith(';;')).toBe(true);
  });

  it('uses the same status labels as the UI', () => {
    const statuses = ['booked', 'completed', 'cancelled', 'no_show'] as const;
    const csv = toCsv(
      statuses.map((status, index) => item({ id: index + 1, status })),
      'Europe/Helsinki',
    );
    const rows = csv.split('\r\n');
    expect(rows[1]).toContain(';Booked;');
    expect(rows[2]).toContain(';Completed;');
    expect(rows[3]).toContain(';Cancelled;');
    expect(rows[4]).toContain(';No-show;');
  });

  it('quotes cells containing the separator, quotes or line breaks', () => {
    const csv = toCsv(
      [
        item({
          service: { id: 1, name: 'Deep;Tissue Massage' },
          notes: 'Said "see you\r\nnext month"',
        }),
      ],
      'Europe/Helsinki',
    );
    const row = csv.split('\r\n').slice(1).join('\r\n'); // re-join the embedded line break
    expect(row).toContain('"Deep;Tissue Massage"');
    expect(row).toContain('"Said ""see you\r\nnext month"""');
  });

  it('keeps ä, ö and å as UTF-8', () => {
    const csv = toCsv(
      [item({ customer: { id: 3, name: 'Älli Öhman', email: 'alli@example.com', phone: 'åland' } })],
      'Europe/Helsinki',
    );
    expect(csv).toContain('Älli Öhman');
    expect(csv).toContain('åland');
  });

  it('lets plain phone numbers through untouched', () => {
    const csv = toCsv(
      [
        item({
          customer: {
            id: 3,
            name: 'Ville Asiakas',
            email: 'ville@example.com',
            phone: '+358 40 123 4567',
          },
        }),
        item({ id: 2, customer: { id: 4, name: 'Ville Asiakas', email: 'ville@example.com', phone: '040-123 4567' } }),
      ],
      'Europe/Helsinki',
    );
    const rows = csv.split('\r\n');
    expect(rows[1]).toContain(';+358 40 123 4567;');
    expect(rows[2]).toContain(';040-123 4567;');
    expect(csv).not.toContain("'");
  });

  it('neutralises cells that would execute as spreadsheet formulas', () => {
    const csv = toCsv(
      [
        item({
          customer: { id: 3, name: '=SUM(A1:A9)', email: 'ville@example.com', phone: null },
          notes: '@cmd',
        }),
        item({ id: 2, notes: '-A1' }),
      ],
      'Europe/Helsinki',
    );
    const rows = csv.split('\r\n');
    expect(rows[1]).toContain(`'=SUM(A1:A9)`);
    expect(rows[1]).toContain(`'@cmd`);
    expect(rows[2]).toContain(`'-A1`);
  });
});
