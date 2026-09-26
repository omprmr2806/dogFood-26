'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../../../context/AuthContext';
import {
  apiGetHackathon,
  apiGetHackathonRegistrations,
  apiUpdateRegistrationStatus,
  ApiClientError
} from '../../../../../lib/apiClient';
import { HackathonDetail, RegistrationDetail, RegistrationStatus } from '@dogfood/shared';

function getStatusBadge(status: RegistrationStatus) {
  switch (status) {
    case RegistrationStatus.ACCEPTED:
      return <span className="badge badge-success">ACCEPTED</span>;
    case RegistrationStatus.CHECKED_IN:
      return <span className="badge badge-info">CHECKED IN</span>;
    case RegistrationStatus.PENDING:
      return <span className="badge badge-warning">PENDING</span>;
    case RegistrationStatus.REJECTED:
      return <span className="badge badge-danger">REJECTED</span>;
    default:
      return <span className="badge badge-neutral">{status}</span>;
  }
}

export default function OrganizerRegistrationsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const hackathonId = resolvedParams.id;
  const { user, loading: authLoading } = useAuth();

  const [hackathon, setHackathon] = useState<HackathonDetail | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [h, regList] = await Promise.all([
          apiGetHackathon(hackathonId),
          apiGetHackathonRegistrations(hackathonId)
        ]);
        setHackathon(h);
        setRegistrations(regList);
      } catch (err) {
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError('Failed to load registrations.');
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
  }, [authLoading, user, hackathonId]);

  const handleStatusChange = async (registrationId: string, newStatus: RegistrationStatus) => {
    setUpdatingId(registrationId);
    setError(null);
    setActionSuccess(null);

    try {
      const updated = await apiUpdateRegistrationStatus(hackathonId, registrationId, {
        status: newStatus
      });

      setRegistrations((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, status: updated.status } : r))
      );
      setActionSuccess(`Participant registration updated to [${newStatus}].`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to update registration status.');
      }
    } finally {
      setUpdatingId(null);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
        Loading participant registrations...
      </div>
    );
  }

  if (!user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN')) {
    return (
      <div className="container" style={{ maxWidth: '600px', margin: '3rem auto' }}>
        <div className="card" style={{ borderColor: 'var(--danger)', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--danger)', marginBottom: '0.75rem' }}>Organizer Access Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Only authenticated Organizers or Administrators have permission to view participant registration lists.
          </p>
          <Link href="/login" className="btn">Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <Link href={`/organizer/hackathons/${hackathonId}`} style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          &larr; Back to Event Management
        </Link>
        {hackathon && (
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Hackathon: <strong style={{ color: 'var(--text-primary)' }}>{hackathon.name}</strong> ({hackathon.status})
          </div>
        )}
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          Participant Registrations ({registrations.length})
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Supervise participants, approve/reject registrations, or check participants in on-site.
        </p>
      </div>

      {actionSuccess && (
        <div className="card" style={{ borderColor: 'var(--success)', color: 'var(--success)', background: 'rgba(16, 185, 129, 0.08)', marginBottom: '1.5rem' }}>
          {actionSuccess}
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.08)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {registrations.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
          No participants have registered for this event yet.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Participant</th>
                <th style={{ padding: '0.75rem 1rem' }}>Email</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem' }}>Registered At</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((reg) => (
                <tr key={reg.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>
                    {reg.user.fullName || 'Anonymous Participant'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                    <code>{reg.user.email}</code>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {getStatusBadge(reg.status)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {new Date(reg.registeredAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                      {reg.status !== RegistrationStatus.ACCEPTED && (
                        <button
                          onClick={() => handleStatusChange(reg.id, RegistrationStatus.ACCEPTED)}
                          disabled={updatingId === reg.id}
                          className="btn"
                          style={{
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.75rem',
                            background: 'rgba(16, 185, 129, 0.2)',
                            color: 'var(--success)',
                            border: '1px solid rgba(16, 185, 129, 0.3)'
                          }}
                        >
                          Approve
                        </button>
                      )}

                      {reg.status !== RegistrationStatus.CHECKED_IN && (
                        <button
                          onClick={() => handleStatusChange(reg.id, RegistrationStatus.CHECKED_IN)}
                          disabled={updatingId === reg.id}
                          className="btn"
                          style={{
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.75rem',
                            background: 'rgba(56, 189, 248, 0.2)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.3)'
                          }}
                        >
                          Check In
                        </button>
                      )}

                      {reg.status !== RegistrationStatus.REJECTED && (
                        <button
                          onClick={() => handleStatusChange(reg.id, RegistrationStatus.REJECTED)}
                          disabled={updatingId === reg.id}
                          className="btn"
                          style={{
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.75rem',
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: 'var(--danger)',
                            border: '1px solid rgba(239, 68, 68, 0.3)'
                          }}
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
