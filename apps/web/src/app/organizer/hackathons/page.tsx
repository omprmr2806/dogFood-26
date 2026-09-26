'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { apiGetHackathons, ApiClientError } from '../../../lib/apiClient';
import { HackathonSummary, HackathonStatus } from '@dogfood/shared';

function getStatusBadge(status: HackathonStatus) {
  switch (status) {
    case HackathonStatus.DRAFT:
      return <span className="badge badge-neutral">DRAFT</span>;
    case HackathonStatus.OPEN:
      return <span className="badge badge-success">OPEN</span>;
    case HackathonStatus.RUNNING:
      return <span className="badge badge-info">RUNNING</span>;
    case HackathonStatus.JUDGING:
      return <span className="badge badge-warning">JUDGING</span>;
    case HackathonStatus.COMPLETED:
      return <span className="badge badge-neutral">COMPLETED</span>;
    case HackathonStatus.ARCHIVED:
      return <span className="badge badge-neutral">ARCHIVED</span>;
    default:
      return <span className="badge badge-neutral">{status}</span>;
  }
}

export default function OrganizerHackathonsPage() {
  const { user, loading: authLoading } = useAuth();
  const [hackathons, setHackathons] = useState<HackathonSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiGetHackathons();
        setHackathons(data);
      } catch (err) {
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError('Failed to load organizer hackathons.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading && user) {
      load();
    } else if (!authLoading && !user) {
      setIsLoading(false);
    }
  }, [authLoading, user]);

  if (authLoading || isLoading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
        Loading organizer dashboard...
      </div>
    );
  }

  if (!user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN')) {
    return (
      <div className="container" style={{ maxWidth: '600px', margin: '3rem auto' }}>
        <div className="card" style={{ borderColor: 'var(--danger)', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--danger)', marginBottom: '0.75rem' }}>Organizer Access Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            You must be signed in with an ORGANIZER or ADMIN role to manage hackathon events.
          </p>
          <Link href="/login" className="btn" style={{ padding: '0.5rem 1.25rem' }}>
            Sign In with Organizer Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>Event Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Create events, manage lifecycles, and supervise participant registrations.
          </p>
        </div>
        <Link href="/organizer/hackathons/new" className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
          + Create Hackathon
        </Link>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {hackathons.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: '1rem' }}>No hackathons have been created yet.</p>
          <Link href="/organizer/hackathons/new" className="btn" style={{ fontSize: '0.85rem' }}>
            Create First Event
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {hackathons.map((h) => (
            <div key={h.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>{h.name}</h2>
                    {getStatusBadge(h.status)}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Slug: <code style={{ color: 'var(--accent-primary)' }}>{h.slug}</code> &bull; Created: {new Date(h.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Link
                    href={`/organizer/hackathons/${h.id}/registrations`}
                    className="btn"
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                      padding: '0.35rem 0.75rem'
                    }}
                  >
                    Registrations ({h.registrationCount})
                  </Link>

                  <Link
                    href={`/organizer/hackathons/${h.id}`}
                    className="btn"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  >
                    Manage Event &rarr;
                  </Link>
                </div>
              </div>

              {h.shortDescription && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {h.shortDescription}
                </p>
              )}

              <div style={{
                display: 'flex',
                gap: '1.5rem',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '0.5rem'
              }}>
                <div>Team Size: {h.minTeamSize} - {h.maxTeamSize}</div>
                <div>Status: <strong>{h.status}</strong></div>
                <div>Public Link: <Link href={`/hackathons/${h.slug}`} style={{ color: 'var(--accent-primary)' }}>/hackathons/{h.slug}</Link></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
