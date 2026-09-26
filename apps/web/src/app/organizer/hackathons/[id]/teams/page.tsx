'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../../../context/AuthContext';
import {
  apiGetHackathon,
  apiGetTeams,
  apiDisbandTeam,
  ApiClientError
} from '../../../../../lib/apiClient';
import { HackathonDetail, TeamSummary } from '@dogfood/shared';

export default function OrganizerTeamsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const hackathonId = resolvedParams.id;
  const { user, loading: authLoading } = useAuth();

  const [hackathon, setHackathon] = useState<HackathonDetail | null>(null);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [disbandingId, setDisbandingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [h, tList] = await Promise.all([
          apiGetHackathon(hackathonId),
          apiGetTeams(hackathonId)
        ]);
        setHackathon(h);
        setTeams(tList);
      } catch (err) {
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError('Failed to load organizer teams.');
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

  const handleDisbandTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to disband this team?')) return;
    setDisbandingId(teamId);
    setError(null);
    setSuccessMsg(null);

    try {
      await apiDisbandTeam(hackathonId, teamId);
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
      setSuccessMsg('Team successfully disbanded.');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to disband team.');
      }
    } finally {
      setDisbandingId(null);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
        Loading team supervision console...
      </div>
    );
  }

  if (!user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN')) {
    return (
      <div className="container" style={{ maxWidth: '600px', margin: '3rem auto' }}>
        <div className="card" style={{ borderColor: 'var(--danger)', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--danger)', marginBottom: '0.75rem' }}>Organizer Access Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Only authenticated Organizers or Administrators have permission to supervise hackathon teams.
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
          Team Supervision ({teams.length})
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Monitor team formation, view rosters, and perform administrative team corrections.
        </p>
      </div>

      {successMsg && (
        <div className="card" style={{ borderColor: 'var(--success)', color: 'var(--success)', background: 'rgba(16, 185, 129, 0.08)', marginBottom: '1.5rem' }}>
          {successMsg}
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.08)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {teams.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
          No teams have formed yet for this event.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Team Name</th>
                <th style={{ padding: '0.75rem 1rem' }}>Leader</th>
                <th style={{ padding: '0.75rem 1rem' }}>Capacity</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem' }}>Created</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                    {t.name}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                    {t.leaderName || 'Leader'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.memberCount}</span>
                    <span style={{ color: 'var(--text-secondary)' }}> / {hackathon?.maxTeamSize}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>{t.status}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDisbandTeam(t.id)}
                      disabled={disbandingId === t.id}
                      className="btn"
                      style={{
                        padding: '0.25rem 0.6rem',
                        fontSize: '0.75rem',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: 'var(--danger)',
                        border: '1px solid rgba(239, 68, 68, 0.3)'
                      }}
                    >
                      {disbandingId === t.id ? 'Disbanding...' : 'Disband'}
                    </button>
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
