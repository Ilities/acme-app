import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '../../api/client';
import { FormField } from '../../components/FormField';
import { AuthLayout } from './AuthLayout';
import styles from './AuthPages.module.css';

const MIN_LENGTH = 8;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/password-reset/confirm', { token, password });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Link not valid" footer={<Link to="/forgot-password">Request a new link</Link>}>
        <p>This password reset link is missing its token. Please request a new one.</p>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="Password updated" footer={<Link to="/login">Sign in</Link>}>
        <p>Your password has been changed. You can now sign in with your new password.</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password">
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}
        <FormField
          label="New password"
          type="password"
          autoComplete="new-password"
          hint={`At least ${MIN_LENGTH} characters.`}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <FormField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          required
        />
        <button type="submit" className="button" disabled={submitting}>
          {submitting ? 'Saving…' : 'Set new password'}
        </button>
      </form>
    </AuthLayout>
  );
}
