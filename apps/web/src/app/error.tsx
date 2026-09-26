'use client';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
      <div className="card">
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--danger)' }}>An unexpected error occurred</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          {error.message || 'Unable to complete the requested action.'}
        </p>
        <button onClick={() => reset()} className="btn">
          Try Again
        </button>
      </div>
    </div>
  );
}
