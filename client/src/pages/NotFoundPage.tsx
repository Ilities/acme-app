import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }} className="stack">
      <h1>Page not found</h1>
      <p className="muted">The page you were looking for doesn't exist or has moved.</p>
      <p>
        <Link to="/">Go to the dashboard</Link>
      </p>
    </div>
  );
}
