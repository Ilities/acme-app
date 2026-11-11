import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import type { Clinic } from '../api/types';
import { mockFetch } from '../test/mockFetch';
import { SettingsPage } from './SettingsPage';

const owner = {
  id: 1,
  email: 'aino@kalliophysio.example',
  name: 'Aino Virtanen',
  role: 'owner' as const,
  clinicId: 1,
};

const clinic: Clinic = {
  id: 1,
  name: 'Kallio Physio',
  slug: 'kallio-physio',
  email: 'hello@kalliophysio.example',
  phone: '+358401234567',
  addressLine: 'Hämeentie 1',
  city: 'Helsinki',
  country: 'FI',
  timezone: 'Europe/Helsinki',
  opensAt: '09:00',
  closesAt: '17:00',
  openDays: [1, 2, 3, 4, 5],
  bookingEnabled: true,
  depositsEnabled: false,
  depositRefundableHours: 0,
  plan: 'starter',
};

function renderSettings() {
  mockFetch({
    'GET /api/auth/me': () => ({ body: { user: owner } }),
    'GET /api/clinic': () => ({ body: { clinic } }),
  });
  render(
    <MemoryRouter>
      <AuthProvider>
        <SettingsPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the booking page link and copies it to the clipboard', async () => {
    renderSettings();

    const bookingUrl = `${window.location.origin}/book/${clinic.slug}`;
    expect(await screen.findByRole('link', { name: bookingUrl })).toHaveAttribute('href', bookingUrl);

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));

    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(bookingUrl),
    );
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('does not show the copy link when online booking is disabled', async () => {
    mockFetch({
      'GET /api/auth/me': () => ({ body: { user: owner } }),
      'GET /api/clinic': () => ({
        body: { clinic: { ...clinic, bookingEnabled: false } },
      }),
    });
    render(
      <MemoryRouter>
        <AuthProvider>
          <SettingsPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    await screen.findByText('Let customers book online');
    expect(screen.queryByRole('button', { name: 'Copy link' })).not.toBeInTheDocument();
  });
});
