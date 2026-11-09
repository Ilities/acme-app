import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../../api/client';
import { homePathFor, useAuth } from '../../auth/AuthContext';
import { FormField } from '../../components/FormField';
import { AuthLayout } from './AuthLayout';
import styles from './AuthPages.module.css';

export function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to={homePathFor(user)} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const signedIn = await signIn(email, password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(signedIn.role === 'acme_admin' ? homePathFor(signedIn) : (from ?? '/'), {
        replace: true,
      });
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Manage your clinic's bookings, staff and services."
      footer={<Link to="/forgot-password">Forgot your password?</Link>}
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}
        <FormField
          label="Email"
          type="email"
          name="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <FormField
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button type="submit" className="button" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
}
