import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { mockFetch } from '../../test/mockFetch';
import { ForgotPasswordPage } from './ForgotPasswordPage';

function renderForgotPassword() {
  render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/login" element={<p>Login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ForgotPasswordPage', () => {
  it('uses an email field so mobile keyboards do not autocapitalize', () => {
    renderForgotPassword();

    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
  });

  it('sends the reset request and shows the confirmation', async () => {
    const fetchSpy = mockFetch({
      'POST /api/auth/password-reset': () => ({ body: { ok: true } }),
    });
    renderForgotPassword();

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'aino@kalliophysio.example' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByText('Check your email')).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/auth/password-reset',
      expect.objectContaining({
        body: JSON.stringify({ email: 'aino@kalliophysio.example' }),
      }),
    );
  });
});
