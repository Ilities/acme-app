import { Link } from 'react-router-dom';
import type { DashboardData } from '../api/types';
import { EmptyState, ErrorMessage, PageHeader } from '../components/PageHeader';
import { formatMoney } from '../lib/format';
import { useApi } from '../lib/useApi';
import styles from './DashboardPage.module.css';

export function DashboardPage() {
  const { data, error, loading } = useApi<DashboardData>('/dashboard');

  return (
    <>
      <PageHeader
        title={data?.clinicName ?? 'Dashboard'}
        description="An overview of what's coming up."
        actions={
          <Link to="/appointments/new" className="button">
            New appointment
          </Link>
        }
      />
      <ErrorMessage error={error} />
      {loading && !data && <p className="muted">Loading…</p>}
      {data && (
        <div className="stack">
          <section className={styles.stats} aria-label="Summary">
            <div className={`card ${styles.stat}`}>
              <span className={styles.statLabel}>Today</span>
              <span className={styles.statValue}>{data.todayCount}</span>
              <span className="muted">appointments</span>
            </div>
            <div className={`card ${styles.stat}`}>
              <span className={styles.statLabel}>Next 7 days</span>
              <span className={styles.statValue}>{data.weekCount}</span>
              <span className="muted">appointments</span>
            </div>
            <div className={`card ${styles.stat}`}>
              <span className={styles.statLabel}>Revenue this month</span>
              <span className={styles.statValue}>{formatMoney(data.monthRevenueCents)}</span>
              <span className="muted">from completed visits</span>
            </div>
          </section>

          <section className="stack">
            <div className={styles.sectionHeader}>
              <h2>Upcoming appointments</h2>
              <Link to="/appointments">View all</Link>
            </div>
            {data.upcoming.length === 0 ? (
              <EmptyState title="Nothing booked yet">
                Share your booking page with customers to start taking bookings online.
              </EmptyState>
            ) : (
              <ul className={`card ${styles.upcoming}`}>
                {data.upcoming.map((appointment) => (
                  <li key={appointment.id} className={styles.upcomingItem}>
                    <span className={styles.upcomingTime}>{appointment.timeLabel}</span>
                    <span>
                      <strong>{appointment.customer.name}</strong>
                      <span className="muted">
                        {' '}
                        · {appointment.service.name} with {appointment.staff.name}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}
