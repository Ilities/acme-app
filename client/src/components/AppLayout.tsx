import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import styles from './AppLayout.module.css';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const CLINIC_NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/appointments', label: 'Appointments' },
  { to: '/customers', label: 'Customers' },
  { to: '/staff', label: 'Staff' },
  { to: '/services', label: 'Services' },
  { to: '/billing', label: 'Plan & billing' },
  { to: '/settings', label: 'Clinic Settings' },
];

const ADMIN_NAV: NavItem[] = [{ to: '/admin/orders', label: 'Plan orders' }];

export function AppLayout({ variant = 'clinic' }: { variant?: 'clinic' | 'admin' }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const items = variant === 'admin' ? ADMIN_NAV : CLINIC_NAV;

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">
            A
          </span>
          <span>
            Acme Book
            {variant === 'admin' && <span className={styles.adminTag}>Admin</span>}
          </span>
        </div>
        <nav className={styles.nav} aria-label="Main">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.account}>
          <div className={styles.accountName}>{user?.name}</div>
          <div className={styles.accountEmail}>{user?.email}</div>
          <button type="button" className="button button-secondary button-small" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
