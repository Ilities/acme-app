import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { todayIso } from '../../lib/format';
import { mockFetch } from '../../test/mockFetch';
import { BookingPage } from './BookingPage';

type Deposit = { amountCents: number; refundableHours: number } | null;

function bookingPage(deposit: Deposit) {
  return {
    clinic: {
      name: 'Test Clinic',
      slug: 'test-clinic',
      city: 'Helsinki',
      addressLine: null,
      phone: null,
      timezone: 'Europe/Helsinki',
      opensAt: '09:00',
      closesAt: '17:00',
      openDays: [1, 2, 3, 4, 5],
    },
    services: [
      {
        id: 1,
        name: 'Assessment',
        description: '',
        durationMinutes: 60,
        priceCents: 8000,
        deposit,
      },
    ],
    staff: [{ id: 2, name: 'Pekka Physio', title: 'Physiotherapist' }],
  };
}

const slots = [{ startsAt: '2026-11-20T07:00:00.000Z', label: '09:00', staffIds: [2] }];

function availabilityRoute() {
  return {
    [`GET /api/public/clinics/test-clinic/availability?serviceId=1&date=${todayIso()}`]: () => ({
      body: { date: todayIso(), slots },
    }),
  };
}

function renderBooking() {
  render(
    <MemoryRouter initialEntries={['/book/test-clinic']}>
      <Routes>
        <Route path="/book/:slug" element={<BookingPage />} />
        <Route path="/book/:slug/confirmed" element={<p>Confirmed page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function chooseServiceAndSlot() {
  fireEvent.click(await screen.findByRole('radio', { name: /Assessment/ }));
  fireEvent.click(await screen.findByRole('radio', { name: '09:00' }));
}

function fillDetails() {
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Maija Meikäläinen' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'maija@example.com' } });
}

describe('BookingPage', () => {
  it('collects a card and pays the deposit when the service asks for one', async () => {
    const fetchSpy = mockFetch({
      'GET /api/public/clinics/test-clinic': () => ({
        body: bookingPage({ amountCents: 2000, refundableHours: 24 }),
      }),
      ...availabilityRoute(),
      'POST /api/public/clinics/test-clinic/bookings': () => ({
        status: 201,
        body: {
          booking: {
            appointmentId: 9,
            clinicName: 'Test Clinic',
            serviceName: 'Assessment',
            staffName: 'Pekka Physio',
            when: 'Friday, 20 November at 09:00',
            depositPaidCents: 2000,
          },
        },
      }),
    });
    renderBooking();
    await chooseServiceAndSlot();

    expect(screen.getByText('Deposit due now: €20.00')).toBeInTheDocument();

    fillDetails();
    fireEvent.change(screen.getByLabelText('Card number'), {
      target: { value: '4242424242424242' },
    });
    fireEvent.change(screen.getByLabelText('Expiry'), { target: { value: '12/28' } });
    fireEvent.change(screen.getByLabelText('CVC'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pay €20.00 deposit and book' }));

    expect(await screen.findByText('Confirmed page')).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/public/clinics/test-clinic/bookings',
      expect.objectContaining({
        body: JSON.stringify({
          serviceId: 1,
          startsAt: '2026-11-20T07:00:00.000Z',
          customer: { name: 'Maija Meikäläinen', email: 'maija@example.com', phone: null },
          card: { number: '4242424242424242', cvc: '123', expMonth: 12, expYear: 2028 },
        }),
      }),
    );
  });

  it('shows the decline message and stays on the page', async () => {
    mockFetch({
      'GET /api/public/clinics/test-clinic': () => ({
        body: bookingPage({ amountCents: 2000, refundableHours: 24 }),
      }),
      ...availabilityRoute(),
      'POST /api/public/clinics/test-clinic/bookings': () => ({
        status: 402,
        body: { error: 'Your card was declined. Please try another card.' },
      }),
    });
    renderBooking();
    await chooseServiceAndSlot();

    fillDetails();
    fireEvent.change(screen.getByLabelText('Card number'), {
      target: { value: '4000000000000002' },
    });
    fireEvent.change(screen.getByLabelText('Expiry'), { target: { value: '12/28' } });
    fireEvent.change(screen.getByLabelText('CVC'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pay €20.00 deposit and book' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Your card was declined');
    expect(screen.queryByText('Confirmed page')).not.toBeInTheDocument();
  });

  it('blocks submitting when the expiry date is malformed', async () => {
    const fetchSpy = mockFetch({
      'GET /api/public/clinics/test-clinic': () => ({
        body: bookingPage({ amountCents: 2000, refundableHours: 0 }),
      }),
      ...availabilityRoute(),
    });
    renderBooking();
    await chooseServiceAndSlot();

    fillDetails();
    fireEvent.change(screen.getByLabelText('Card number'), {
      target: { value: '4242424242424242' },
    });
    fireEvent.change(screen.getByLabelText('Expiry'), { target: { value: '1228' } });
    fireEvent.change(screen.getByLabelText('CVC'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pay €20.00 deposit and book' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter the expiry date as MM/YY.');
    const calls = fetchSpy.mock.calls.filter(([path]) => String(path).endsWith('/bookings'));
    expect(calls).toHaveLength(0);
  });

  it('books without card details when no deposit is due', async () => {
    const fetchSpy = mockFetch({
      'GET /api/public/clinics/test-clinic': () => ({ body: bookingPage(null) }),
      ...availabilityRoute(),
      'POST /api/public/clinics/test-clinic/bookings': () => ({
        status: 201,
        body: {
          booking: {
            appointmentId: 9,
            clinicName: 'Test Clinic',
            serviceName: 'Assessment',
            staffName: 'Pekka Physio',
            when: 'Friday, 20 November at 09:00',
            depositPaidCents: null,
          },
        },
      }),
    });
    renderBooking();
    await chooseServiceAndSlot();

    expect(screen.queryByLabelText('Card number')).not.toBeInTheDocument();

    fillDetails();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm booking' }));

    expect(await screen.findByText('Confirmed page')).toBeInTheDocument();
    const bookingCall = fetchSpy.mock.calls.find(([path]) => String(path).endsWith('/bookings'));
    expect(bookingCall).toBeDefined();
    expect(JSON.parse(String(bookingCall?.[1]?.body))).not.toHaveProperty('card');
  });
});
