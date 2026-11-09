import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import type { Customer, Service, StaffMember } from '../api/types';
import { FormField } from '../components/FormField';
import { ErrorMessage, PageHeader } from '../components/PageHeader';
import { formatDuration, todayIso } from '../lib/format';
import { useApi } from '../lib/useApi';

export function NewAppointmentPage() {
  const navigate = useNavigate();
  const customers = useApi<{ customers: Customer[] }>('/customers');
  const services = useApi<{ services: Service[] }>('/services');
  const staff = useApi<{ staff: StaffMember[] }>('/staff');

  const [customerId, setCustomerId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState(todayIso());
  const [time, setTime] = useState('09:00');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/appointments', {
        customerId: Number(customerId),
        serviceId: Number(serviceId),
        staffId: Number(staffId),
        date,
        time,
        notes: notes || undefined,
      });
      navigate('/appointments');
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  const loadError = customers.error ?? services.error ?? staff.error;

  return (
    <>
      <PageHeader title="New appointment" description="Book an appointment on behalf of a customer." />
      <ErrorMessage error={loadError ?? error} />
      <form className="card form-grid" onSubmit={handleSubmit}>
        <div className="field full">
          <label className="label" htmlFor="appointment-customer">
            Customer
          </label>
          <select
            id="appointment-customer"
            className="select"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            required
          >
            <option value="">Choose a customer</option>
            {customers.data?.customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} ({customer.email})
              </option>
            ))}
          </select>
          <p className="muted">
            New customer? <Link to="/customers">Add them first</Link>.
          </p>
        </div>
        <div className="field">
          <label className="label" htmlFor="appointment-service">
            Service
          </label>
          <select
            id="appointment-service"
            className="select"
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
            required
          >
            <option value="">Choose a service</option>
            {services.data?.services
              .filter((service) => service.active)
              .map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} · {formatDuration(service.durationMinutes)}
                </option>
              ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="appointment-staff">
            Staff member
          </label>
          <select
            id="appointment-staff"
            className="select"
            value={staffId}
            onChange={(event) => setStaffId(event.target.value)}
            required
          >
            <option value="">Choose a staff member</option>
            {staff.data?.staff
              .filter((member) => member.active)
              .map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
          </select>
        </div>
        <FormField
          label="Date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
        />
        <FormField
          label="Start time"
          type="time"
          step={900}
          value={time}
          onChange={(event) => setTime(event.target.value)}
          required
        />
        <div className="field full">
          <label className="label" htmlFor="appointment-notes">
            Notes
          </label>
          <textarea
            id="appointment-notes"
            className="textarea"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
        <div className="form-actions full">
          <Link to="/appointments" className="button button-secondary">
            Cancel
          </Link>
          <button type="submit" className="button" disabled={submitting}>
            {submitting ? 'Booking…' : 'Book appointment'}
          </button>
        </div>
      </form>
    </>
  );
}
