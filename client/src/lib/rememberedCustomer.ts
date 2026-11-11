export const BOOKING_CUSTOMER_STORAGE_KEY = 'acme-book:booking-customer';

export interface RememberedCustomer {
  name: string;
  email: string;
  phone: string;
}

const EMPTY_CUSTOMER: RememberedCustomer = { name: '', email: '', phone: '' };

/**
 * The customer's details from their last booking on this device, if any.
 * Stored only in the browser; nothing is sent to or kept on the server.
 */
export function loadRememberedCustomer(): RememberedCustomer {
  try {
    const raw = window.localStorage.getItem(BOOKING_CUSTOMER_STORAGE_KEY);
    if (!raw) return EMPTY_CUSTOMER;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return EMPTY_CUSTOMER;

    const candidate = parsed as Record<string, unknown>;
    const field = (value: unknown) => (typeof value === 'string' ? value : '');
    return { name: field(candidate.name), email: field(candidate.email), phone: field(candidate.phone) };
  } catch {
    // Unavailable (blocked or full storage) or unreadable data: pretend nothing was remembered.
    return EMPTY_CUSTOMER;
  }
}

export function rememberCustomer(customer: RememberedCustomer): void {
  try {
    window.localStorage.setItem(BOOKING_CUSTOMER_STORAGE_KEY, JSON.stringify(customer));
  } catch {
    // Best effort only: a booking must never fail because the details could not be stored.
  }
}
