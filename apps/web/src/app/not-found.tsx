import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container" style={{ maxWidth: '500px', margin: '6rem auto', textAlign: 'center' }}>
      <div className="card">
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>404</h1>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Page Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          The page you requested does not exist or has been moved.
        </p>
        <Link href="/" className="btn">
          Return Home
        </Link>
      </div>
    </div>
  );
}
