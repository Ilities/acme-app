import { useEffect, useState, type FormEvent } from 'react';
import { api, errorMessage } from '../api/client';
import type { Clinic } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { FormField } from '../components/FormField';
import { ErrorMessage, PageHeader } from '../components/PageHeader';
import { useApi } from '../lib/useApi';
import styles from './SettingsPage.module.css';

const TIMEZONES = [
  { value: 'Europe/Helsinki', label: 'Helsinki' },
  { value: 'Europe/Stockholm', label: 'Stockholm' },
  { value: 'Europe/Oslo', label: 'Oslo' },
  { value: 'Europe/Copenhagen', label: 'Copenhagen' },
  { value: 'Europe/Tallinn', label: 'Tallinn' },
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type SettingsForm = Omit<Clinic, 'id' | 'slug' | 'country' | 'plan'>;

function toForm(clinic: Clinic): SettingsForm {
  return {
    name: clinic.name,
    email: clinic.email,
    phone: clinic.phone,
    addressLine: clinic.addressLine,
    city: clinic.city,
    timezone: clinic.timezone,
    opensAt: clinic.opensAt,
    closesAt: clinic.closesAt,
    openDays: clinic.openDays,
    bookingEnabled: clinic.bookingEnabled,
    depositsEnabled: clinic.depositsEnabled,
    depositRefundableHours: clinic.depositRefundableHours,
  };
}

export function SettingsPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'owner';
  const { data, error } = useApi<{ clinic: Clinic }>('/clinic');
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setForm(toForm(data.clinic));
    }
  }, [data]);

  function update<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) {
    setSaved(false);
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function toggleDay(day: number) {
    if (!form) return;
    const openDays = form.openDays.includes(day)
      ? form.openDays.filter((existing) => existing !== day)
      : [...form.openDays, day].sort();
    update('openDays', openDays);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    setSaveError(null);
    setSaving(true);
    try {
      const response = await api.patch<{ clinic: Clinic }>('/clinic', {
        ...form,
        phone: form.phone || null,
        addressLine: form.addressLine || null,
      });
      setForm(toForm(response.clinic));
      setSaved(true);
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const bookingUrl = data ? `${window.location.origin}/book/${data.clinic.slug}` : '';

  return (
    <>
      <PageHeader title="Clinic settings" description="Contact details, opening hours and online booking." />
      <ErrorMessage error={error ?? saveError} />
      {saved && (
        <p className="alert alert-success" role="status">
          Settings saved.
        </p>
      )}
      {form && (
        <form className="stack" onSubmit={handleSubmit}>
          <fieldset className={`card form-grid ${styles.section}`} disabled={!canEdit}>
            <legend className={styles.legend}>Contact details</legend>
            <FormField
              label="Clinic name"
              className="full"
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
              required
            />
            <FormField
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => update('email', event.target.value)}
              required
            />
            <FormField
              label="Phone"
              type="tel"
              value={form.phone ?? ''}
              onChange={(event) => update('phone', event.target.value)}
            />
            <FormField
              label="Street address"
              value={form.addressLine ?? ''}
              onChange={(event) => update('addressLine', event.target.value)}
            />
            <FormField
              label="City"
              value={form.city}
              onChange={(event) => update('city', event.target.value)}
              required
            />
          </fieldset>

          <fieldset className={`card form-grid ${styles.section}`} disabled={!canEdit}>
            <legend className={styles.legend}>Opening hours</legend>
            <div className="field full">
              <label className="label" htmlFor="clinic-timezone">
                Time zone
              </label>
              <select
                id="clinic-timezone"
                className="select"
                value={form.timezone}
                onChange={(event) => update('timezone', event.target.value)}
              >
                {TIMEZONES.map((zone) => (
                  <option key={zone.value} value={zone.value}>
                    {zone.label}
                  </option>
                ))}
              </select>
            </div>
            <FormField
              label="Opens at"
              type="time"
              step={900}
              value={form.opensAt}
              onChange={(event) => update('opensAt', event.target.value)}
              required
            />
            <FormField
              label="Closes at"
              type="time"
              step={900}
              value={form.closesAt}
              onChange={(event) => update('closesAt', event.target.value)}
              required
            />
            <fieldset className={`full ${styles.days}`}>
              <legend className="label">Open on</legend>
              {WEEKDAYS.map((label, index) => {
                const day = index + 1;
                return (
                  <label key={day} className={styles.day}>
                    <input
                      type="checkbox"
                      checked={form.openDays.includes(day)}
                      onChange={() => toggleDay(day)}
                    />
                    {label}
                  </label>
                );
              })}
            </fieldset>
          </fieldset>

          <fieldset className={`card stack ${styles.section}`} disabled={!canEdit}>
            <legend className={styles.legend}>Online booking</legend>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={form.bookingEnabled}
                onChange={(event) => update('bookingEnabled', event.target.checked)}
              />
              Let customers book online
            </label>
            {form.bookingEnabled && (
              <p className="muted">
                Your booking page: <a href={bookingUrl}>{bookingUrl}</a>
              </p>
            )}
          </fieldset>

          {canEdit && (
            <div className="form-actions">
              <button type="submit" className="button" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          )}
        </form>
      )}
    </>
  );
}
