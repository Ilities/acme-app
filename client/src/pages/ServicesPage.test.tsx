import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { CurrentUser, Service } from '../api/types';
import { AuthProvider } from '../auth/AuthContext';
import { mockFetch } from '../test/mockFetch';
import { ServicesPage } from './ServicesPage';

const massage: Service = {
  id: 3,
  name: 'Sports massage',
  description: 'Deep tissue massage focused on recovery.',
  durationMinutes: 60,
  priceCents: 7500,
  depositType: 'none',
  depositValue: null,
  active: true,
};

const runningAnalysis: Service = {
  ...massage,
  id: 4,
  name: 'Running analysis',
  description: '',
  durationMinutes: 150,
  priceCents: 6950,
};

const owner = {
  id: 1,
  email: 'aino@kalliophysio.example',
  name: 'Aino Virtanen',
  role: 'owner' as const,
  clinicId: 1,
};

const staff = {
  id: 2,
  email: 'mikko@kalliophysio.example',
  name: 'Mikko Laine',
  role: 'staff' as const,
  clinicId: 1,
};

const updateService = (body: unknown) => ({ body: { service: { ...massage, ...(body as object) } } });

function renderPage(
  user: CurrentUser,
  services: Service[] = [massage],
  extra: Parameters<typeof mockFetch>[0] = {},
) {
  const fetchSpy = mockFetch({
    'GET /api/auth/me': () => ({ body: { user } }),
    'GET /api/services': () => ({ body: { services } }),
    ...extra,
  });

  render(
    <MemoryRouter>
      <AuthProvider>
        <ServicesPage />
      </AuthProvider>
    </MemoryRouter>,
  );

  return fetchSpy;
}

function sentTo(fetchSpy: ReturnType<typeof mockFetch>, method: string, path: string) {
  return fetchSpy.mock.calls.filter(
    ([input, init]) => input === path && (init?.method ?? 'GET') === method,
  );
}

function lastBody(fetchSpy: ReturnType<typeof mockFetch>, path: string) {
  const call = sentTo(fetchSpy, 'PATCH', path).at(-1);
  return JSON.parse(String(call?.[1]?.body));
}

describe('ServicesPage', () => {
  it('opens the edit form with the current values of that service', async () => {
    renderPage(owner, [massage, runningAnalysis]);

    fireEvent.click((await screen.findAllByRole('button', { name: 'Edit' }))[0]);

    expect(screen.getByRole('heading', { name: 'Edit Sports massage' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Sports massage');
    expect(screen.getByLabelText('Price (€)')).toHaveValue('75');
    expect(screen.getByLabelText('Duration')).toHaveValue('60');
    expect(screen.getByLabelText('Description')).toHaveValue('Deep tissue massage focused on recovery.');
  });

  it('shows a price with cents and a duration the old option list did not have', async () => {
    renderPage(owner, [massage, runningAnalysis]);

    fireEvent.click((await screen.findAllByRole('button', { name: 'Edit' }))[1]);

    expect(screen.getByLabelText('Price (€)')).toHaveValue('69.50');
    expect(screen.getByLabelText('Duration')).toHaveValue('150');
  });

  it('saves the new name, price and duration and reloads the list', async () => {
    const fetchSpy = renderPage(owner, [massage], { 'PATCH /api/services/3': updateService });

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Sports massage 45' } });
    fireEvent.change(screen.getByLabelText('Price (€)'), { target: { value: '85' } });
    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: '45' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(sentTo(fetchSpy, 'PATCH', '/api/services/3')).toHaveLength(1));
    expect(lastBody(fetchSpy, '/api/services/3')).toEqual({
      name: 'Sports massage 45',
      description: 'Deep tissue massage focused on recovery.',
      durationMinutes: 45,
      priceCents: 8500,
    });
    await waitFor(() => expect(sentTo(fetchSpy, 'GET', '/api/services')).toHaveLength(2));
    expect(screen.queryByRole('heading', { name: /Edit/ })).not.toBeInTheDocument();
  });

  it('keeps the form open and shows the server error when the update is rejected', async () => {
    renderPage(owner, [massage], {
      'PATCH /api/services/3': () => ({
        status: 400,
        body: { error: 'Please check the highlighted fields' },
      }),
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Please check the highlighted fields')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Edit Sports massage' })).toBeInTheDocument();
  });

  it('refuses a price that is not a number before asking the server', async () => {
    const fetchSpy = renderPage(owner, [massage], { 'PATCH /api/services/3': updateService });

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Price (€)'), { target: { value: 'seven' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Enter a valid price.')).toBeInTheDocument();
    expect(sentTo(fetchSpy, 'PATCH', '/api/services/3')).toHaveLength(0);
  });

  it('closes the form on cancel without updating anything', async () => {
    const fetchSpy = renderPage(owner, [massage], { 'PATCH /api/services/3': updateService });

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('heading', { name: /Edit/ })).not.toBeInTheDocument();
    expect(sentTo(fetchSpy, 'PATCH', '/api/services/3')).toHaveLength(0);
  });

  it('still hides and shows a service', async () => {
    const fetchSpy = renderPage(owner, [massage], { 'PATCH /api/services/3': updateService });

    fireEvent.click(await screen.findByRole('button', { name: 'Hide' }));

    await waitFor(() => expect(sentTo(fetchSpy, 'PATCH', '/api/services/3')).toHaveLength(1));
    expect(lastBody(fetchSpy, '/api/services/3')).toEqual({ active: false });
  });

  it('adds a new service through the same form', async () => {
    const fetchSpy = renderPage(owner, [], {
      'POST /api/services': () => ({ status: 201, body: { service: massage } }),
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Add service' }));
    expect(screen.getByRole('heading', { name: 'New service' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Sports massage' } });
    fireEvent.change(screen.getByLabelText('Price (€)'), { target: { value: '75' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(sentTo(fetchSpy, 'POST', '/api/services')).toHaveLength(1));
  });

  it('gives staff no way to add or edit a service', async () => {
    renderPage(staff);

    await screen.findByText('Sports massage');
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hide' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add service' })).not.toBeInTheDocument();
  });
});
