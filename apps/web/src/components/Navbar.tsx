import Link from 'next/link';

export function Navbar() {
  return (
    <header style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/" style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
            DOGFOOD <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', padding: '2px 6px', borderRadius: '4px' }}>v0.1</span>
          </Link>
        </div>
        <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', fontSize: '0.875rem' }}>
          <Link href="/" style={{ color: 'var(--text-secondary)' }}>Home</Link>
          <Link href="/dashboard" style={{ color: 'var(--text-secondary)' }}>Dashboard</Link>
          <Link href="/login" style={{ color: 'var(--text-secondary)' }}>Login</Link>
          <Link href="/register" className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>Register</Link>
        </nav>
      </div>
    </header>
  );
}
