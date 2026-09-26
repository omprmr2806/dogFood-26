import { ApiStatusBadge } from '../components/ApiStatusBadge';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="container">
      <div style={{ maxWidth: '800px', margin: '2rem auto', textAlign: 'center' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <ApiStatusBadge />
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-1px', marginBottom: '1rem' }}>
          DOGFOOD Hackathon Platform
        </h1>
        <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '2rem' }}>
          A modern, open-source, self-hosted hackathon submission, judging, and community voting platform.
          Designed to run 100% locally with zero cloud dependencies.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '3rem' }}>
          <Link href="/register" className="btn">Get Started</Link>
          <Link href="/dashboard" className="btn" style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
            View Dashboard
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', textAlign: 'left' }}>
          <div className="card">
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Modular Monolith</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Clean separation of Next.js frontend, Node.js API, and PostgreSQL database without microservice sprawl.
            </p>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Zero Cloud Requirement</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Operates offline in air-gapped environments. No reliance on external CDN, fonts, or third-party auth.
            </p>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Enterprise Security</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Strict RBAC, secure headers, sanitized logging, and backend-enforced resource ownership checks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
