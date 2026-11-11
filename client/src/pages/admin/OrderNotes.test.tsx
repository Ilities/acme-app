import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockFetch } from '../../test/mockFetch';
import { OrderNotes } from './OrderNotes';

const existingNote = {
  id: 1,
  body: 'Paid by bank transfer.',
  authorName: 'Ada Admin',
  createdAt: '2026-11-11T14:30:00Z',
};

describe('OrderNotes', () => {
  it('shows existing notes with their author and time', async () => {
    mockFetch({
      'GET /api/admin/orders/1/notes': () => ({ body: { notes: [existingNote] } }),
    });
    render(<OrderNotes orderId={1} onAdded={() => {}} />);

    expect(await screen.findByText('Paid by bank transfer.')).toBeInTheDocument();
    expect(screen.getByText(/Ada Admin/)).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it('posts a new note and shows it', async () => {
    let notes = [existingNote];
    const onAdded = vi.fn();
    mockFetch({
      'GET /api/admin/orders/1/notes': () => ({ body: { notes } }),
      'POST /api/admin/orders/1/notes': (body) => {
        const note = {
          id: 2,
          body: (body as { body: string }).body,
          authorName: 'Ada Admin',
          createdAt: '2026-11-12T09:00:00Z',
        };
        notes = [note, ...notes];
        return { status: 201, body: { note } };
      },
    });
    render(<OrderNotes orderId={1} onAdded={onAdded} />);

    fireEvent.change(screen.getByLabelText('Add a note'), {
      target: { value: 'Sent the invoice to their accountant.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }));

    expect(await screen.findByText('Sent the invoice to their accountant.')).toBeInTheDocument();
    expect(onAdded).toHaveBeenCalled();
  });

  it('shows the validation error from the server', async () => {
    mockFetch({
      'GET /api/admin/orders/1/notes': () => ({ body: { notes: [] } }),
      'POST /api/admin/orders/1/notes': () => ({
        status: 400,
        body: { error: 'Please check the highlighted fields' },
      }),
    });
    render(<OrderNotes orderId={1} onAdded={() => {}} />);

    fireEvent.change(screen.getByLabelText('Add a note'), { target: { value: ' ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Please check the highlighted fields');
  });
});
