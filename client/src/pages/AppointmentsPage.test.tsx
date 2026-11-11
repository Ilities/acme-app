import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { AppointmentListItem } from '../api/types';
import { mockFetch } from '../test/mockFetch';
import { AppointmentsPage } from './AppointmentsPage';

const appointment: AppointmentListItem = {
  id: 1,
  startsAt: '2026-10-06T07:00:00.000Z',
  endsAt: '2026-10-06T08:00:00.000Z',
  timeLabel: 'Tue 6 Oct, 10:00',
  durationMinutes: 60,
  priceCents: 8000,
  status: 'booked',
  source: 'staff',
  notes: null,
  service: { id: 1, name: 'Assessment' },
  staff: { id: 2, name: 'Pekka Physio' },
  customer: { id: 3, name: 'Ville Asiakas', email: 'ville@example.com', phone: null },
  deposit: null,
};

function renderPage() {
  render(
    <MemoryRouter>
      <AppointmentsPage />
    </MemoryRouter>,
  );
}

describe('AppointmentsPage', () => {
  it('describes the supported appointment search fields', () => {
    mockFetch({
      'GET /api/appointments?scope=upcoming': () => ({ body: { appointments: [] } }),
    });
    renderPage();

    expect(screen.getByRole('searchbox', { name: 'Search appointments by name, phone or email' })).toHaveAttribute(
      'placeholder',
      'Search by name, phone or email',
    );
  });

  it('links the export to the current view by default', async () => {
    mockFetch({
      'GET /api/appointments?scope=upcoming': () => ({ body: { appointments: [appointment] } }),
    });
    renderPage();

    const exportLink = await screen.findByRole('link', { name: 'Export CSV' });
    expect(exportLink.getAttribute('href')).toBe('/api/appointments/export?scope=upcoming');
  });

  it('asks before cancelling and waits for confirmation', async () => {
    const futureAppointment: AppointmentListItem = {
      ...appointment,
      id: 2,
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      timeLabel: 'Thu 12 Nov, 14:00',
      customer: { ...appointment.customer, name: 'Anna Svensson' },
    };
    const fetchSpy = mockFetch({
      'GET /api/appointments?scope=upcoming': () => ({ body: { appointments: [futureAppointment] } }),
      'PATCH /api/appointments/2': () => ({ body: {} }),
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent("Cancel Anna Svensson's appointment on Thu 12 Nov, 14:00?");
    const patchCalls = () =>
      fetchSpy.mock.calls.filter(([, init]) => (init?.method ?? 'GET') === 'PATCH');
    expect(patchCalls()).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(patchCalls()).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel appointment' }));

    await waitFor(() => expect(patchCalls()).toHaveLength(1));
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/appointments/2',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) }),
    );
  });

  it('asks before marking an appointment as a no-show', async () => {
    const fetchSpy = mockFetch({
      'GET /api/appointments?scope=upcoming': () => ({ body: { appointments: [appointment] } }),
      'PATCH /api/appointments/1': () => ({ body: {} }),
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'No-show' }));

    expect(screen.getByRole('dialog')).toHaveTextContent(
      "Mark Ville Asiakas's appointment on Tue 6 Oct, 10:00 as a no-show?",
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mark no-show' }));

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/appointments/1',
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'no_show' }) }),
      ),
    );
  });

  it('switches the list and the export link to the date range', async () => {
    const fetchSpy = mockFetch({
      'GET /api/appointments?scope=upcoming': () => ({ body: { appointments: [appointment] } }),
      'GET /api/appointments?from=2026-10-01&to=2026-10-31': () => ({
        body: { appointments: [appointment] },
      }),
    });
    renderPage();
    await screen.findByRole('link', { name: 'Export CSV' });

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-31' } });

    expect(await screen.findByRole('link', { name: 'Export CSV' })).toHaveAttribute(
      'href',
      '/api/appointments/export?from=2026-10-01&to=2026-10-31',
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/appointments?from=2026-10-01&to=2026-10-31',
      expect.anything(),
    );
    expect(screen.getByRole('button', { name: 'Upcoming' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Past' })).toHaveAttribute('aria-pressed', 'false');
  });
});
