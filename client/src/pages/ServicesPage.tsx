import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '../api/client';
import type { Service } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { FormField } from '../components/FormField';
import { EmptyState, ErrorMessage, PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { formatDuration, formatMoney } from '../lib/format';
import { useApi } from '../lib/useApi';
import styles from './ServicesPage.module.css';

// The API accepts any whole 15 minutes from 15 to 240, so an edited service can
// always be shown with the duration it already has.
const DURATIONS = Array.from({ length: 16 }, (_, index) => (index + 1) * 15);

/** €69 for 6900 cents, €69.50 for 6950 — the price field is in euros. */
function eurosOf(cents: number): string {
  const euros = cents / 100;
  return Number.isInteger(euros) ? String(euros) : euros.toFixed(2);
}

export function ServicesPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';
  const { data, error, reload } = useApi<{ services: Service[] }>('/services');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('60');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function resetForm() {
    setName('');
    setDescription('');
    setDuration('60');
    setPrice('');
    setFormError(null);
    setEditing(null);
    setShowForm(false);
  }

  function startEditing(service: Service) {
    setEditing(service);
    setName(service.name);
    setDescription(service.description);
    setDuration(String(service.durationMinutes));
    setPrice(eurosOf(service.priceCents));
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const priceCents = Math.round(Number(price.replace(',', '.')) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 0) {
      setFormError('Enter a valid price.');
      return;
    }
    const body = {
      name,
      description,
      durationMinutes: Number(duration),
      priceCents,
    };
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/services/${editing.id}`, body);
      } else {
        await api.post('/services', body);
      }
      resetForm();
      reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(service: Service) {
    try {
      await api.patch(`/services/${service.id}`, { active: !service.active });
      reload();
    } catch (err) {
      setFormError(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Services"
        description="What customers can book, how long it takes and what it costs."
        actions={
          isOwner &&
          !showForm && (
            <button type="button" className="button" onClick={() => setShowForm(true)}>
              Add service
            </button>
          )
        }
      />
      <div className="stack">
        <ErrorMessage error={error ?? formError} />

        {showForm && (
          <form className="card form-grid" onSubmit={handleSubmit}>
            <h2 className="full">{editing ? `Edit ${editing.name}` : 'New service'}</h2>
            <FormField
              label="Name"
              className="full"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <div className="field">
              <label className="label" htmlFor="service-duration">
                Duration
              </label>
              <select
                id="service-duration"
                className="select"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
              >
                {DURATIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {formatDuration(minutes)}
                  </option>
                ))}
              </select>
            </div>
            <FormField
              label="Price (€)"
              inputMode="decimal"
              hint={
                editing
                  ? 'Applies to new bookings. Appointments already booked keep the price they were booked at.'
                  : undefined
              }
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              required
            />
            <div className="field full">
              <label className="label" htmlFor="service-description">
                Description
              </label>
              <textarea
                id="service-description"
                className="textarea"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="form-actions full">
              <button
                type="button"
                className="button button-secondary"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="button" disabled={saving}>
                {editing ? 'Save changes' : 'Save'}
              </button>
            </div>
          </form>
        )}

        {data?.services.length === 0 && (
          <EmptyState title="No services yet">
            Add your first service to start taking bookings.
          </EmptyState>
        )}

        {data && data.services.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Service</th>
                  <th scope="col">Duration</th>
                  <th scope="col" className="numeric">
                    Price
                  </th>
                  <th scope="col">Status</th>
                  {isOwner && (
                    <th scope="col">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.services.map((service) => (
                  <tr key={service.id}>
                    <td>
                      <div>{service.name}</div>
                      {service.description && <div className="muted">{service.description}</div>}
                    </td>
                    <td>{formatDuration(service.durationMinutes)}</td>
                    <td className="numeric">{formatMoney(service.priceCents)}</td>
                    <td>
                      <StatusBadge status={service.active ? 'active' : 'inactive'} />
                    </td>
                    {isOwner && (
                      <td className="numeric">
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className="button button-secondary button-small"
                            onClick={() => startEditing(service)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="button button-secondary button-small"
                            onClick={() => toggleActive(service)}
                          >
                            {service.active ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
