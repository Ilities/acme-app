import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { homePathFor, useAuth } from './AuthContext';

interface RequireAuthProps {
  area: 'clinic' | 'admin';
  children: ReactNode;
}

export function RequireAuth({ area, children }: RequireAuthProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p className="muted" style={{ padding: '2rem' }}>Loading…</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  const isAdmin = user.role === 'acme_admin';
  if ((area === 'admin') !== isAdmin) {
    return <Navigate to={homePathFor(user)} replace />;
  }

  return children;
}
