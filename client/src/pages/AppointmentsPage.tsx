import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import type { AppointmentListItem, AppointmentStatus } from '../api/types';
import { EmptyState, ErrorMessage, PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { formatDuration } from '../lib/format';
import { useApi, useDebouncedValue } from '../lib/useApi';
import styles from './AppointmentsPage.module.css';

type Scope = 'upcoming' | 'past';

const STATUS_OPTIONS: { value: '' | AppointmentStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'booked', label: 'Booked' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No-show' },
];

export function AppointmentsPage() {
  const [scope, setScope] = useState<Scope>('upcoming');
  const [status, setStatus] = useState<'' | AppointmentStatus>('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [actionError, setActionError] = useState<string | null>(null);

  const params = new URLSearchParams({ scope });
  if (status) params.set('status', status);
  if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());

  const { data, error, loading, reload } = useApi<{ appointments: AppointmentListItem[] }>(
    `/appointments?${params.toString()}`,
  );

  async function updateStatus(id: number, next: AppointmentStatus) {
    setActionError(null);
    try {
      await api.patch(`/appointments/${id}`, { status: next });
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  const appointments = data?.appointments ?? [];

  return (
    <>
      <PageHeader
        title="Appointments"
        actions={
          <Link to="/appointments/new" className="button">
            New appointment
          </Link>
        }
      />

      <div className={styles.toolbar}>
        <div className={styles.tabs} role="group" aria-label="Show">
          {(['upcoming', 'past'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={scope === value ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              aria-pressed={scope === value}
              onClick={() => setScope(value)}
            >
              {value === 'upcoming' ? 'Upcoming' : 'Past'}
            </button>
          ))}
        </div>
        <div className={styles.filters}>
          <input
            type="search"
            className="input"
            placeholder="Search by customer name"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <label className="visually-hidden" htmlFor="status-filter">
            Status
          </label>
          <select
            id="status-filter"
            className="select"
            value={status}
            onChange={(event) => setStatus(event.target.value as '' | AppointmentStatus)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ErrorMessage error={error ?? actionError} />

      {loading && !data && <p className="muted">Loading…</p>}

      {data && appointments.length === 0 && (
        <EmptyState title="No appointments found">
          {search || status ? 'Try a different search or status.' : 'New bookings will show up here.'}
        </EmptyState>
      )}

      {appointments.length > 0 && (
        <>
          <p className={`muted ${styles.count}`}>
            {appointments.length} {appointments.length === 1 ? 'appointment' : 'appointments'}
          </p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Service</th>
                  <th scope="col">Staff</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td>
                      <div className={styles.time}>{appointment.timeLabel}</div>
                      <div className="muted">{formatDuration(appointment.durationMinutes)}</div>
                    </td>
                    <td>
                      <div>{appointment.customer.name}</div>
                      <div className="muted">{appointment.customer.phone ?? appointment.customer.email}</div>
                    </td>
                    <td>{appointment.service.name}</td>
                    <td>{appointment.staff.name}</td>
                    <td>
                      <StatusBadge status={appointment.status} />
                    </td>
                    <td className={styles.actions}>
                      {appointment.status === 'booked' && scope === 'past' && (
                        <>
                          <button
                            type="button"
                            className="button button-secondary button-small"
                            onClick={() => updateStatus(appointment.id, 'completed')}
                          >
                            Mark completed
                          </button>
                          <button
                            type="button"
                            className="button button-secondary button-small"
                            onClick={() => updateStatus(appointment.id, 'no_show')}
                          >
                            No-show
                          </button>
                        </>
                      )}
                      {appointment.status === 'booked' && scope === 'upcoming' && (
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          onClick={() => updateStatus(appointment.id, 'cancelled')}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
