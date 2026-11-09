import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it.each([
    ['booked', 'Booked'],
    ['no_show', 'No-show'],
    ['failed', 'Failed'],
    ['inactive', 'Inactive'],
  ] as const)('shows %s as "%s"', (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
