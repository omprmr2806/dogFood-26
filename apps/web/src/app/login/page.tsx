'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="container" style={{ maxWidth: '440px', margin: '3rem auto' }}>
      <div className="card">
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', fontWeight: 700 }}>Sign In</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Enter your credentials to access your DOGFOOD account.
        </p>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', color: '#fca5a5', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="email" style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Email</label>
            <input 
              id="email" 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@dogfood.local" 
              required
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label htmlFor="password" style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Password</label>
            <input 
              id="password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              required
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
          </div>
          <button type="submit" className="btn" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', textAlign: 'center' }}>
            Offline Local Demo Quick-Fill:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button 
              type="button" 
              onClick={() => handleQuickFill('admin@dogfood.local', 'AdminPass123!')}
              className="btn" 
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', fontSize: '0.75rem', padding: '0.35rem' }}
            >
              Admin Demo
            </button>
            <button 
              type="button" 
              onClick={() => handleQuickFill('organizer@dogfood.local', 'OrganizerPass123!')}
              className="btn" 
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', fontSize: '0.75rem', padding: '0.35rem' }}
            >
              Organizer Demo
            </button>
            <button 
              type="button" 
              onClick={() => handleQuickFill('judge@dogfood.local', 'JudgePass123!')}
              className="btn" 
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', fontSize: '0.75rem', padding: '0.35rem' }}
            >
              Judge Demo
            </button>
            <button 
              type="button" 
              onClick={() => handleQuickFill('participant@dogfood.local', 'ParticipantPass123!')}
              className="btn" 
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', fontSize: '0.75rem', padding: '0.35rem' }}
            >
              Participant Demo
            </button>
          </div>
        </div>

        <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
          Don&apos;t have an account? <Link href="/register" style={{ color: 'var(--accent-primary)' }}>Register</Link>
        </p>
      </div>
    </div>
  );
}
