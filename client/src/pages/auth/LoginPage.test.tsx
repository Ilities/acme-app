import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../../auth/AuthContext';
import { mockFetch } from '../../test/mockFetch';
import { LoginPage } from './LoginPage';

const owner = {
  id: 1,
  email: 'aino@kalliophysio.example',
  name: 'Aino Virtanen',
  role: 'owner',
  clinicId: 1,
};

function renderLogin() {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>Dashboard</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function fillIn(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('LoginPage', () => {
  it('signs in and goes to the dashboard', async () => {
    const fetchSpy = mockFetch({
      'GET /api/auth/me': () => ({ body: { user: null } }),
      'POST /api/auth/sign-in': () => ({ body: { user: owner } }),
    });
    renderLogin();

    fillIn('aino@kalliophysio.example', 'password123');

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/auth/sign-in',
      expect.objectContaining({
        body: JSON.stringify({ email: 'aino@kalliophysio.example', password: 'password123' }),
      }),
    );
  });

  it('uses an email field without autocapitalization', () => {
    mockFetch({ 'GET /api/auth/me': () => ({ body: { user: null } }) });
    renderLogin();

    const email = screen.getByLabelText('Email');
    expect(email).toHaveAttribute('type', 'email');
    expect(email).toHaveAttribute('autocapitalize', 'none');
  });

  it('shows the error from the server', async () => {
    mockFetch({
      'GET /api/auth/me': () => ({ body: { user: null } }),
      'POST /api/auth/sign-in': () => ({
        status: 401,
        body: { error: 'That email and password combination is not right' },
      }),
    });
    renderLogin();

    fillIn('aino@kalliophysio.example', 'wrong');

    expect(await screen.findByRole('alert')).toHaveTextContent('not right');
  });
});
