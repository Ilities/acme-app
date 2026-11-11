import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import type { AppointmentListItem, AppointmentStatus } from '../api/types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState, ErrorMessage, PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { formatDuration, formatMoney } from '../lib/format';
import { useApi, useDebouncedValue } from '../lib/useApi';
import styles from './AppointmentsPage.module.css';

type Scope = 'upcoming' | 'past';

interface PendingStatusChange {
  appointment: AppointmentListItem;
  next: 'cancelled' | 'no_show';
}

const STATUS_OPTIONS: { value: '' | AppointmentStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'booked', label: 'Booked' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No-show' },
];

/** A booked appointment in the past can be completed or marked a no-show; a future one cancelled. */
const hasStarted = (startsAt: string) => new Date(startsAt).getTime() < Date.now();

export function AppointmentsPage() {
  const [scope, setScope] = useState<Scope>('upcoming');
  const [status, setStatus] = useState<'' | AppointmentStatus>('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<PendingStatusChange | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  const rangeActive = from !== '' || to !== '';
  const params = new URLSearchParams();
  if (rangeActive) {
    if (from) params.set('from', from);
    if (to) params.set('to', to);
  } else {
    params.set('scope', scope);
  }
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

  async function confirmStatusChange() {
    if (!pendingStatusChange) {
      return;
    }
    setSavingStatus(true);
    await updateStatus(pendingStatusChange.appointment.id, pendingStatusChange.next);
    setSavingStatus(false);
    setPendingStatusChange(null);
  }

  const appointments = data?.appointments ?? [];

  return (
    <>
      <PageHeader
        title="Appointments"
        actions={
          <>
            {appointments.length > 0 && (
              <a className="button button-secondary" href={`/api/appointments/export?${params.toString()}`} download>
                Export CSV
              </a>
            )}
            <Link to="/appointments/new" className="button">
              New appointment
            </Link>
          </>
        }
      />

      <div className={styles.toolbar}>
        <div className={styles.tabs} role="group" aria-label="Show">
          {(['upcoming', 'past'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={scope === value && !rangeActive ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              aria-pressed={scope === value && !rangeActive}
              onClick={() => setScope(value)}
            >
              {value === 'upcoming' ? 'Upcoming' : 'Past'}
            </button>
          ))}
        </div>
        <div className={styles.filters}>
          <label htmlFor="appointment-search" className="visually-hidden">
            Search appointments by name, phone or email
          </label>
          <input
            id="appointment-search"
            type="search"
            className="input"
            placeholder="Search by name, phone or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className={styles.dateField}>
            <label htmlFor="appointment-from">From</label>
            <input
              id="appointment-from"
              type="date"
              className="input"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div className={styles.dateField}>
            <label htmlFor="appointment-to">To</label>
            <input
              id="appointment-to"
              type="date"
              className="input"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
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
          {search || status || rangeActive
            ? 'Try a different search, status or date range.'
            : 'New bookings will show up here.'}
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
                    <td>
                      <div>{appointment.service.name}</div>
                      {appointment.deposit?.status === 'paid' && (
                        <div className="muted">
                          Deposit {formatMoney(appointment.deposit.amountCents)} paid
                        </div>
                      )}
                    </td>
                    <td>{appointment.staff.name}</td>
                    <td>
                      <StatusBadge status={appointment.status} />
                    </td>
                    <td className={styles.actions}>
                      {appointment.status === 'booked' && hasStarted(appointment.startsAt) && (
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
                            onClick={() => setPendingStatusChange({ appointment, next: 'no_show' })}
                          >
                            No-show
                          </button>
                        </>
                      )}
                      {appointment.status === 'booked' && !hasStarted(appointment.startsAt) && (
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          onClick={() => setPendingStatusChange({ appointment, next: 'cancelled' })}
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

      {pendingStatusChange && (
        <ConfirmDialog
          title={pendingStatusChange.next === 'no_show' ? 'Mark as no-show?' : 'Cancel appointment?'}
          confirmLabel={pendingStatusChange.next === 'no_show' ? 'Mark no-show' : 'Cancel appointment'}
          onConfirm={confirmStatusChange}
          onCancel={() => setPendingStatusChange(null)}
          busy={savingStatus}
          destructive={pendingStatusChange.next === 'cancelled'}
        >
          {pendingStatusChange.next === 'no_show'
            ? `Mark ${pendingStatusChange.appointment.customer.name}'s appointment on ${pendingStatusChange.appointment.timeLabel} as a no-show?`
            : `Cancel ${pendingStatusChange.appointment.customer.name}'s appointment on ${pendingStatusChange.appointment.timeLabel}?`}
        </ConfirmDialog>
      )}
    </>
  );
}
