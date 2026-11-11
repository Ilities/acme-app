import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BOOKING_CUSTOMER_STORAGE_KEY,
  loadRememberedCustomer,
  rememberCustomer,
} from './rememberedCustomer';

const EMPTY = { name: '', email: '', phone: '' };

describe('rememberedCustomer', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty details when nothing was booked on this device', () => {
    expect(loadRememberedCustomer()).toEqual(EMPTY);
  });

  it('round-trips the details of the last booking', () => {
    rememberCustomer({ name: 'Maija Meikäläinen', email: 'maija@example.com', phone: '+358 40 555 1234' });

    expect(loadRememberedCustomer()).toEqual({
      name: 'Maija Meikäläinen',
      email: 'maija@example.com',
      phone: '+358 40 555 1234',
    });
  });

  it('ignores unreadable stored data', () => {
    localStorage.setItem(BOOKING_CUSTOMER_STORAGE_KEY, 'not json');

    expect(loadRememberedCustomer()).toEqual(EMPTY);
  });

  it('ignores stored data with the wrong shape', () => {
    localStorage.setItem(BOOKING_CUSTOMER_STORAGE_KEY, JSON.stringify({ name: 42, email: 'a@b.example' }));

    const details = loadRememberedCustomer();
    expect(details.name).toBe('');
    expect(details.email).toBe('a@b.example');
    expect(details.phone).toBe('');
  });

  it('never throws when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage is disabled', 'SecurityError');
    });

    expect(() => rememberCustomer({ name: 'A', email: 'a@example.com', phone: '' })).not.toThrow();
    expect(loadRememberedCustomer()).toEqual(EMPTY);
  });
});
