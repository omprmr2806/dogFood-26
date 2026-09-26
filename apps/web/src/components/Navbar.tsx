'use client';

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { ApiStatusBadge } from './ApiStatusBadge';

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link href="/" style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
            DOGFOOD <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', padding: '2px 6px', borderRadius: '4px' }}>v0.2</span>
          </Link>
          <ApiStatusBadge />
        </div>

        <nav style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', fontSize: '0.875rem' }}>
          <Link href="/" style={{ color: 'var(--text-secondary)' }}>Home</Link>
          <Link href="/hackathons" style={{ color: 'var(--text-secondary)' }}>Events</Link>
          
          {user && (user.role === 'ORGANIZER' || user.role === 'ADMIN') && (
            <Link href="/organizer/hackathons" style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>
              Organizer
            </Link>
          )}

          {user ? (
            <>
              <Link href="/dashboard" style={{ color: 'var(--text-secondary)' }}>Dashboard</Link>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.25rem 0.75rem', borderRadius: '9999px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{user.fullName}</span>
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>{user.role}</span>
              </div>
              <button 
                onClick={() => logout()}
                className="btn" 
                style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', padding: '0.35rem 0.75rem' }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" style={{ color: 'var(--text-secondary)' }}>Sign In</Link>
              <Link href="/register" className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>Register</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
