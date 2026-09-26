'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGetHackathons, ApiClientError } from '../../lib/apiClient';
import { HackathonSummary, HackathonStatus } from '@dogfood/shared';

function getStatusBadge(status: HackathonStatus) {
  switch (status) {
    case HackathonStatus.OPEN:
      return <span className="badge badge-success">REGISTRATION OPEN</span>;
    case HackathonStatus.RUNNING:
      return <span className="badge badge-info">IN PROGRESS</span>;
    case HackathonStatus.JUDGING:
      return <span className="badge badge-warning">JUDGING</span>;
    case HackathonStatus.COMPLETED:
      return <span className="badge badge-neutral">COMPLETED</span>;
    case HackathonStatus.ARCHIVED:
      return <span className="badge badge-neutral">ARCHIVED</span>;
    case HackathonStatus.DRAFT:
      return <span className="badge badge-neutral">DRAFT</span>;
    default:
      return <span className="badge badge-neutral">{status}</span>;
  }
}

export default function HackathonsPage() {
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
          setError('Failed to load hackathons.');
        }
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Explore Hackathons</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Discover upcoming, active, and completed hackathons. Register to participate or review past submissions.
        </p>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
          Loading hackathons...
        </div>
      ) : error ? (
        <div className="card" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
          {error}
        </div>
      ) : hackathons.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
          No public hackathons are currently listed. Check back soon!
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {hackathons.map((h) => (
            <div key={h.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                      <Link href={`/hackathons/${h.slug}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                        {h.name}
                      </Link>
                    </h2>
                    {getStatusBadge(h.status)}
                  </div>
                  {h.shortDescription && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                      {h.shortDescription}
                    </p>
                  )}
                </div>

                <Link href={`/hackathons/${h.slug}`} className="btn" style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}>
                  View Details &rarr;
                </Link>
              </div>

              <div style={{
                display: 'flex',
                gap: '1.5rem',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '0.75rem',
                flexWrap: 'wrap'
              }}>
                <div>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Team Size: </span>
                  {h.minTeamSize === h.maxTeamSize ? `${h.minTeamSize} members` : `${h.minTeamSize} - ${h.maxTeamSize} members`}
                </div>
                <div>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Registrations: </span>
                  {h.registrationCount}
                </div>
                {h.registrationEnd && (
                  <div>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Deadline: </span>
                    {new Date(h.registrationEnd).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
