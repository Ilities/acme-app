import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, errorMessage } from '../../api/client';
import type { AvailableSlot, BookingConfirmation, BookingPageData } from '../../api/types';
import { FormField } from '../../components/FormField';
import { ErrorMessage } from '../../components/PageHeader';
import { formatDuration, formatMoney, todayIso } from '../../lib/format';
import { useApi } from '../../lib/useApi';
import styles from './BookingPage.module.css';

export function BookingPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const page = useApi<BookingPageData>(`/public/clinics/${slug}`);

  const [serviceId, setServiceId] = useState<number | null>(null);
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState(todayIso());
  const [slot, setSlot] = useState<AvailableSlot | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const availabilityParams =
    serviceId === null
      ? null
      : new URLSearchParams({
          serviceId: String(serviceId),
          date,
          ...(staffId ? { staffId } : {}),
        });
  const availability = useApi<{ slots: AvailableSlot[] }>(
    availabilityParams ? `/public/clinics/${slug}/availability?${availabilityParams}` : null,
  );

  function chooseService(id: number) {
    setServiceId(id);
    setSlot(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (serviceId === null || !slot) return;
    setBookingError(null);
    setSubmitting(true);
    try {
      const response = await api.post<{ booking: BookingConfirmation }>(
        `/public/clinics/${slug}/bookings`,
        {
          serviceId,
          staffId: staffId ? Number(staffId) : undefined,
          startsAt: slot.startsAt,
          customer: { name, email, phone: phone || null },
        },
      );
      navigate(`/book/${slug}/confirmed`, { state: { booking: response.booking } });
    } catch (err) {
      setBookingError(errorMessage(err));
      setSubmitting(false);
      availability.reload();
    }
  }

  if (page.error) {
    return (
      <div className={styles.page}>
        <ErrorMessage error={page.error} />
      </div>
    );
  }

  const data = page.data;
  if (!data) {
    return <div className={styles.page}>Loading…</div>;
  }

  const service = data.services.find((candidate) => candidate.id === serviceId);
  const slots = availability.data?.slots ?? [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{data.clinic.name}</h1>
        <p className="muted">
          {[data.clinic.addressLine, data.clinic.city].filter(Boolean).join(', ')}
          {data.clinic.phone && ` · ${data.clinic.phone}`}
        </p>
      </header>

      <form className={styles.steps} onSubmit={handleSubmit}>
        <section className="card stack">
          <h2>1. Choose a service</h2>
          <div className={styles.services} role="radiogroup" aria-label="Service">
            {data.services.map((option) => (
              <label
                key={option.id}
                className={
                  option.id === serviceId ? `${styles.service} ${styles.selected}` : styles.service
                }
              >
                <input
                  type="radio"
                  name="service"
                  className="visually-hidden"
                  checked={option.id === serviceId}
                  onChange={() => chooseService(option.id)}
                />
                <span className={styles.serviceName}>{option.name}</span>
                <span className="muted">
                  {formatDuration(option.durationMinutes)} · {formatMoney(option.priceCents)}
                </span>
                {option.description && <span className={styles.serviceDescription}>{option.description}</span>}
              </label>
            ))}
          </div>
        </section>

        {service && (
          <section className="card stack">
            <h2>2. Pick a time</h2>
            <div className={styles.timeFilters}>
              <div className="field">
                <label className="label" htmlFor="booking-staff">
                  With
                </label>
                <select
                  id="booking-staff"
                  className="select"
                  value={staffId}
                  onChange={(event) => {
                    setStaffId(event.target.value);
                    setSlot(null);
                  }}
                >
                  <option value="">Anyone available</option>
                  {data.staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} – {member.title}
                    </option>
                  ))}
                </select>
              </div>
              <FormField
                label="Date"
                type="date"
                min={todayIso()}
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  setSlot(null);
                }}
              />
            </div>

            {availability.loading && <p className="muted">Finding free times…</p>}
            {!availability.loading && slots.length === 0 && (
              <p className="muted">No free times on this day. Try another date.</p>
            )}
            {slots.length > 0 && (
              <div className={styles.slots} role="radiogroup" aria-label="Available times">
                {slots.map((option) => (
                  <button
                    key={option.startsAt}
                    type="button"
                    role="radio"
                    aria-checked={slot?.startsAt === option.startsAt}
                    className={
                      slot?.startsAt === option.startsAt ? `${styles.slot} ${styles.selected}` : styles.slot
                    }
                    onClick={() => setSlot(option)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {service && slot && (
          <section className="card stack">
            <h2>3. Your details</h2>
            <ErrorMessage error={bookingError} />
            <FormField
              label="Full name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <FormField
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <input
              type="tel"
              className="input"
              autoComplete="tel"
              placeholder="Phone (optional)"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <p className="muted">
              {service.name} at {slot.label} on {new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
            <button type="submit" className="button" disabled={submitting}>
              {submitting ? 'Booking…' : 'Confirm booking'}
            </button>
          </section>
        )}
      </form>

      <footer className={styles.footer}>Online booking by Acme Book</footer>
    </div>
  );
}
