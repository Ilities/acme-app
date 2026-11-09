import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '../api/client';
import type { Service } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { FormField } from '../components/FormField';
import { EmptyState, ErrorMessage, PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { formatDuration, formatMoney } from '../lib/format';
import { useApi } from '../lib/useApi';

const DURATIONS = [15, 30, 45, 60, 75, 90, 120];

export function ServicesPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';
  const { data, error, reload } = useApi<{ services: Service[] }>('/services');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('60');
  const [price, setPrice] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  function resetForm() {
    setName('');
    setDescription('');
    setDuration('60');
    setPrice('');
    setFormError(null);
    setShowForm(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const priceCents = Math.round(Number(price.replace(',', '.')) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 0) {
      setFormError('Enter a valid price.');
      return;
    }
    try {
      await api.post('/services', {
        name,
        description,
        durationMinutes: Number(duration),
        priceCents,
      });
      resetForm();
      reload();
    } catch (err) {
      setFormError(errorMessage(err));
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
              <button type="button" className="button button-secondary" onClick={resetForm}>
                Cancel
              </button>
              <button type="submit" className="button">
                Save
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
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          onClick={() => toggleActive(service)}
                        >
                          {service.active ? 'Hide' : 'Show'}
                        </button>
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
