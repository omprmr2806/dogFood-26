'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import {
  apiGetHackathon,
  apiGetMyRegistration,
  apiRegisterForHackathon,
  ApiClientError
} from '../../../lib/apiClient';
import { HackathonDetail, HackathonStatus, Registration, RegistrationStatus } from '@dogfood/shared';

function getStatusBadge(status: HackathonStatus) {
  switch (status) {
    case HackathonStatus.OPEN:
      return <span className="badge badge-success">REGISTRATION OPEN</span>;
    case HackathonStatus.RUNNING:
      return <span className="badge badge-info">RUNNING</span>;
    case HackathonStatus.JUDGING:
      return <span className="badge badge-warning">JUDGING</span>;
    case HackathonStatus.COMPLETED:
      return <span className="badge badge-neutral">COMPLETED</span>;
    case HackathonStatus.ARCHIVED:
      return <span className="badge badge-neutral">ARCHIVED</span>;
    case HackathonStatus.DRAFT:
      return <span className="badge badge-neutral">DRAFT (Unpublished)</span>;
    default:
      return <span className="badge badge-neutral">{status}</span>;
  }
}

export default function HackathonDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const { user } = useAuth();

  const [hackathon, setHackathon] = useState<HackathonDetail | null>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const h = await apiGetHackathon(slug);
        setHackathon(h);

        if (user) {
          const reg = await apiGetMyRegistration(slug);
          setRegistration(reg);
        }
      } catch (err) {
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError('Failed to load event details.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [slug, user]);

  const handleRegister = async () => {
    if (!user) return;
    setIsRegistering(true);
    setError(null);
    setActionSuccess(null);
    try {
      const reg = await apiRegisterForHackathon(slug);
      setRegistration(reg);
      setActionSuccess('Successfully registered for this hackathon!');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to register. Please try again.');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
        Loading event details...
      </div>
    );
  }

  if (error && !hackathon) {
    return (
      <div className="container" style={{ maxWidth: '800px', margin: '2rem auto' }}>
        <div className="card" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Unable to load hackathon</h2>
          <p>{error}</p>
          <div style={{ marginTop: '1rem' }}>
            <Link href="/hackathons" className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
              &larr; Back to Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!hackathon) return null;

  const isRegistrationOpen = hackathon.status === HackathonStatus.OPEN;

  return (
    <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/hackathons" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          &larr; Back to all events
        </Link>
      </div>

      {actionSuccess && (
        <div className="card" style={{ borderColor: 'var(--success)', background: 'rgba(16, 185, 129, 0.08)', marginBottom: '1.5rem', color: 'var(--success)' }}>
          {actionSuccess}
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', background: 'rgba(239, 68, 68, 0.08)', marginBottom: '1.5rem', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{hackathon.name}</h1>
              {getStatusBadge(hackathon.status)}
            </div>
            {hackathon.shortDescription && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                {hackathon.shortDescription}
              </p>
            )}
          </div>

          {/* Registration Status Action Section */}
          <div style={{ minWidth: '220px', textAlign: 'right' }}>
            {!user ? (
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Sign in to register
                </p>
                <Link href="/login" className="btn" style={{ width: '100%', fontSize: '0.85rem' }}>
                  Sign In
                </Link>
              </div>
            ) : registration ? (
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Your Registration Status</div>
                {registration.status === RegistrationStatus.ACCEPTED ? (
                  <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                    &check; ACCEPTED
                  </span>
                ) : registration.status === RegistrationStatus.PENDING ? (
                  <span className="badge badge-warning" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                    PENDING APPROVAL
                  </span>
                ) : registration.status === RegistrationStatus.CHECKED_IN ? (
                  <span className="badge badge-info" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                    CHECKED IN
                  </span>
                ) : (
                  <span className="badge badge-danger" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                    REJECTED
                  </span>
                )}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  Registered on {new Date(registration.registeredAt).toLocaleDateString()}
                </div>
                {registration.status === RegistrationStatus.ACCEPTED && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', width: '100%' }}>
                      <Link
                        href={`/hackathons/${slug}/my-team`}
                        className="btn"
                        style={{ flex: 1, fontSize: '0.75rem', padding: '0.3rem 0.4rem', textAlign: 'center' }}
                      >
                        My Team
                      </Link>
                      <Link
                        href={`/hackathons/${slug}/submission`}
                        className="btn"
                        style={{ flex: 1, fontSize: '0.75rem', padding: '0.3rem 0.4rem', backgroundColor: '#28a745', borderColor: '#28a745', color: '#fff', textAlign: 'center' }}
                      >
                        Project &rarr;
                      </Link>
                    </div>
                    <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.2rem' }}>
                      <Link
                        href={`/hackathons/${slug}/teams`}
                        style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', textDecoration: 'underline' }}
                      >
                        Browse Teams
                      </Link>
                      <Link
                        href="/gallery"
                        style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', textDecoration: 'underline' }}
                      >
                        Gallery
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ) : isRegistrationOpen ? (
              <button
                onClick={handleRegister}
                disabled={isRegistering}
                className="btn"
                style={{ width: '100%', padding: '0.65rem 1.25rem', fontSize: '0.95rem' }}
              >
                {isRegistering ? 'Registering...' : 'Register for Event'}
              </button>
            ) : (
              <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Registration Closed ({hackathon.status})
              </div>
            )}
          </div>
        </div>

        {/* Event Metadata Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          background: 'var(--bg-secondary)',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.85rem'
        }}>
          <div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Team Size Rule</div>
            <div style={{ fontWeight: 600 }}>
              {hackathon.minTeamSize === hackathon.maxTeamSize
                ? `${hackathon.minTeamSize} members`
                : `${hackathon.minTeamSize} - ${hackathon.maxTeamSize} members`}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Confirmed Participants</div>
            <div style={{ fontWeight: 600 }}>{hackathon.registrationCount} registered</div>
          </div>
          {hackathon.eventStart && (
            <div>
              <div style={{ color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Event Start</div>
              <div style={{ fontWeight: 600 }}>{new Date(hackathon.eventStart).toLocaleDateString()}</div>
            </div>
          )}
          {hackathon.eventEnd && (
            <div>
              <div style={{ color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Event End</div>
              <div style={{ fontWeight: 600 }}>{new Date(hackathon.eventEnd).toLocaleDateString()}</div>
            </div>
          )}
          <div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Team Formation</div>
            <div style={{ fontWeight: 600 }}>
              <Link href={`/hackathons/${slug}/teams`} style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>
                View Teams &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Description Section */}
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.75rem' }}>About this Event</h2>
          <div style={{ color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
            {hackathon.description}
          </div>
        </div>

        {/* Rules Section */}
        {hackathon.rules && (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.75rem' }}>Rules &amp; Eligibility</h2>
            <div style={{
              background: 'var(--bg-secondary)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              whiteSpace: 'pre-line'
            }}>
              {hackathon.rules}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
