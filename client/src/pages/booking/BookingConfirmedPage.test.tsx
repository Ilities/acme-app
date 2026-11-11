import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { BookingConfirmation } from '../../api/types';
import { BookingConfirmedPage } from './BookingConfirmedPage';

function booking(overrides: Partial<BookingConfirmation> = {}): BookingConfirmation {
  return {
    appointmentId: 9,
    clinicName: 'Test Clinic',
    clinicAddressLine: 'Fredrikinkatu 22',
    clinicCity: 'Helsinki',
    clinicPhone: '+358 9 123 4567',
    serviceName: 'Assessment',
    staffName: 'Pekka Physio',
    when: 'Friday, 20 November at 09:00',
    depositPaidCents: null,
    ...overrides,
  };
}

function renderConfirmed(bookingConfirmation: BookingConfirmation) {
  render(
    <MemoryRouter
      initialEntries={[
        { pathname: '/book/test-clinic/confirmed', state: { booking: bookingConfirmation } },
      ]}
    >
      <Routes>
        <Route path="/book/:slug/confirmed" element={<BookingConfirmedPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BookingConfirmedPage', () => {
  it('shows the address and phone under the time', () => {
    renderConfirmed(booking());

    const time = screen.getByText('Friday, 20 November at 09:00');
    const address = screen.getByText('Fredrikinkatu 22, Helsinki');
    expect(address).toBeInTheDocument();
    expect(screen.getByText('Phone: +358 9 123 4567')).toBeInTheDocument();
    expect(time.compareDocumentPosition(address) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows only the address when the clinic has no phone number', () => {
    renderConfirmed(booking({ clinicPhone: null }));

    expect(screen.getByText('Fredrikinkatu 22, Helsinki')).toBeInTheDocument();
    expect(screen.queryByText(/Phone:/)).not.toBeInTheDocument();
  });

  it('shows the city on its own when the clinic has no street address', () => {
    renderConfirmed(booking({ clinicAddressLine: null }));

    expect(screen.getByText('Helsinki')).toBeInTheDocument();
  });
});
