import type { AppointmentStatus, OrderStatus } from '../api/types';
import styles from './StatusBadge.module.css';

type Status = AppointmentStatus | OrderStatus | 'active' | 'inactive';

const LABELS: Record<Status, string> = {
  booked: 'Booked',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  active: 'Active',
  inactive: 'Inactive',
};

const TONES: Record<Status, 'neutral' | 'success' | 'danger' | 'warning' | 'info'> = {
  booked: 'info',
  completed: 'success',
  cancelled: 'neutral',
  no_show: 'warning',
  pending: 'warning',
  paid: 'success',
  failed: 'danger',
  active: 'success',
  inactive: 'neutral',
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`${styles.badge} ${styles[TONES[status]]}`}>{LABELS[status]}</span>;
}
