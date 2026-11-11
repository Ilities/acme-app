import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import type { BookingConfirmation } from '../../api/types';
import { formatClinicAddress, formatMoney } from '../../lib/format';
import styles from './BookingPage.module.css';

export function BookingConfirmedPage() {
  const { slug = '' } = useParams();
  const location = useLocation();
  const booking = (location.state as { booking?: BookingConfirmation } | null)?.booking;

  if (!booking) {
    return <Navigate to={`/book/${slug}`} replace />;
  }

  return (
    <div className={styles.page}>
      <div className="card stack">
        <h1>You're booked in</h1>
        <p>
          {booking.serviceName} with {booking.staffName} at {booking.clinicName}
        </p>
        <p className={styles.serviceName}>{booking.when}</p>
        <div className={styles.clinicDetails}>
          <p>{formatClinicAddress(booking.clinicAddressLine, booking.clinicCity)}</p>
          {booking.clinicPhone && <p>Phone: {booking.clinicPhone}</p>}
        </div>
        {booking.depositPaidCents != null && (
          <p className="muted">
            Deposit of {formatMoney(booking.depositPaidCents)} paid — it counts towards the price of
            your visit.
          </p>
        )}
        <p className="muted">You will receive a confirmation email shortly.</p>
        <div>
          <Link to={`/book/${slug}`} className="button button-secondary">
            Book another appointment
          </Link>
        </div>
      </div>
      <footer className={styles.footer}>Online booking by Acme Book</footer>
    </div>
  );
}
