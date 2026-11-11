import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../../api/client';
import { FormField } from '../../components/FormField';
import { AuthLayout } from './AuthLayout';
import styles from './AuthPages.module.css';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/auth/password-reset', { email });
      setSentTo(email);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (sentTo) {
    return (
      <AuthLayout
        title="Check your email"
        footer={<Link to="/login">Back to sign in</Link>}
      >
        <p>
          We sent a link to <strong>{sentTo}</strong>. Follow it to choose a new password. The link
          expires in one hour.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the email you use to sign in and we'll send you a reset link."
      footer={<Link to="/login">Back to sign in</Link>}
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
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <button type="submit" className="button" disabled={submitting || email.length === 0}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </AuthLayout>
  );
}
