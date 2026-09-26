'use client';

import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="container" style={{ maxWidth: '440px', margin: '4rem auto' }}>
      <div className="card">
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', fontWeight: 700 }}>Create an Account</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Phase 1 Foundation Placeholder &bull; User registration will be enabled in Phase 2
        </p>

        <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="name" style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Full Name</label>
            <input 
              id="name" 
              type="text" 
              placeholder="Jane Doe" 
              disabled 
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            />
          </div>
          <div>
            <label htmlFor="email" style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Email</label>
            <input 
              id="email" 
              type="email" 
              placeholder="user@example.com" 
              disabled 
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            />
          </div>
          <div>
            <label htmlFor="password" style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Password</label>
            <input 
              id="password" 
              type="password" 
              placeholder="••••••••" 
              disabled 
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            />
          </div>
          <button type="submit" className="btn" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>
            Register (Phase 2)
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--accent-primary)' }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}
