import { toLocalDateString } from '../lib/dates.js';
import type { AppointmentListItem } from './repository.js';

/**
 * CSV for Excel with Finnish and Swedish regional settings: UTF-8 with a BOM
 * (so ä/ö/å survive the double-click open), semicolon separators and comma
 * decimals (the list and decimal separators of those locales), CRLF line
 * endings per RFC 4180.
 */
const BOM = '\uFEFF';
const CRLF = '\r\n';

const HEADER = [
  'Date',
  'Time',
  'Customer',
  'Email',
  'Phone',
  'Service',
  'Staff',
  'Status',
  'Price (EUR)',
  'Deposit paid (EUR)',
  'Notes',
];

const STATUS_LABELS: Record<AppointmentListItem['status'], string> = {
  booked: 'Booked',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

const timeFormatters = new Map<string, Intl.DateTimeFormat>();

function localTime(timeZone: string): Intl.DateTimeFormat {
  let formatter = timeFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    timeFormatters.set(timeZone, formatter);
  }
  return formatter;
}

function euros(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

/**
 * Neutralises spreadsheet formula injection (customer names, emails and notes
 * are partly entered on the public booking page), then quotes cells that
 * contain the separator, a quote or a line break.
 */
function csvCell(value: string | null | undefined): string {
  const text = value ?? '';
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[";\r\n]/.test(guarded) ? `"${guarded.replaceAll('"', '""')}"` : guarded;
}

export function toCsv(items: AppointmentListItem[], timeZone: string): string {
  const rows = [HEADER.join(';')];
  for (const item of items) {
    const startsAt = new Date(item.startsAt);
    rows.push(
      [
        toLocalDateString(startsAt, timeZone),
        localTime(timeZone).format(startsAt),
        item.customer.name,
        item.customer.email,
        item.customer.phone,
        item.service.name,
        item.staff.name,
        STATUS_LABELS[item.status],
        euros(item.service.priceCents),
        item.deposit?.status === 'paid' ? euros(item.deposit.amountCents) : '',
        item.notes,
      ]
        .map(csvCell)
        .join(';'),
    );
  }
  return BOM + rows.join(CRLF) + CRLF;
}
