import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormField } from './FormField';

describe('FormField', () => {
  it('associates the label with the input', () => {
    render(<FormField label="Clinic name" defaultValue="Studio Lumo" />);

    expect(screen.getByLabelText('Clinic name')).toHaveValue('Studio Lumo');
  });

  it('describes the input with its hint and error', () => {
    render(<FormField label="Password" hint="At least 8 characters." error="Too short" />);

    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('At least 8 characters. Too short');
  });
});
