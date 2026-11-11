import { fireEvent, render, screen } from '@testing-library/react';
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
  status: 'booked',
  source: 'staff',
  notes: null,
  service: { id: 1, name: 'Assessment', priceCents: 8000 },
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
  it('links the export to the current view by default', async () => {
    mockFetch({
      'GET /api/appointments?scope=upcoming': () => ({ body: { appointments: [appointment] } }),
    });
    renderPage();

    const exportLink = await screen.findByRole('link', { name: 'Export CSV' });
    expect(exportLink.getAttribute('href')).toBe('/api/appointments/export?scope=upcoming');
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
