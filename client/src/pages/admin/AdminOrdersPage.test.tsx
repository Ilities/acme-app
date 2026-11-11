import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockFetch } from '../../test/mockFetch';
import { AdminOrdersPage } from './AdminOrdersPage';

const orders = [
  {
    id: 1,
    clinicId: 1,
    clinicName: 'Kallio Physiotherapy',
    plan: 'clinic',
    amountCents: 9796,
    currency: 'EUR',
    status: 'paid',
    createdAt: '2026-11-01T10:00:00Z',
    noteCount: 2,
  },
  {
    id: 2,
    clinicId: 2,
    clinicName: 'Studio Lumo',
    plan: 'starter',
    amountCents: 2900,
    currency: 'EUR',
    status: 'pending',
    createdAt: '2026-11-02T10:00:00Z',
    noteCount: 0,
  },
];

describe('AdminOrdersPage', () => {
  it('shows the note count for each order', async () => {
    mockFetch({
      'GET /api/admin/orders': () => ({
        body: { orders, paidThisMonthCents: 9796 },
      }),
    });
    render(<AdminOrdersPage />);

    expect(await screen.findByRole('button', { name: 'Notes (2)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notes' })).toBeInTheDocument();
  });

  it('loads the notes panel when a row is expanded', async () => {
    mockFetch({
      'GET /api/admin/orders': () => ({
        body: { orders, paidThisMonthCents: 9796 },
      }),
      'GET /api/admin/orders/1/notes': () => ({
        body: {
          notes: [
            {
              id: 1,
              body: 'Refunded the setup fee as a goodwill discount.',
              authorName: 'Ada Admin',
              createdAt: '2026-11-11T14:30:00Z',
            },
          ],
        },
      }),
    });
    render(<AdminOrdersPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Notes (2)' }));

    expect(
      await screen.findByText('Refunded the setup fee as a goodwill discount.'),
    ).toBeInTheDocument();
  });
});
