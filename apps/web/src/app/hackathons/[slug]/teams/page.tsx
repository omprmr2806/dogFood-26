'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../../context/AuthContext';
import {
  apiGetHackathon,
  apiGetTeams,
  apiGetMyTeam,
  apiCreateTeam,
  apiJoinTeam,
  ApiClientError
} from '../../../../lib/apiClient';
import { HackathonDetail, TeamSummary, TeamDetail } from '@dogfood/shared';

export default function HackathonTeamsPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const { user, loading: authLoading } = useAuth();

  const [hackathon, setHackathon] = useState<HackathonDetail | null>(null);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [myTeam, setMyTeam] = useState<TeamDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Create team state
  const [teamName, setTeamName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Join team state
  const [inviteCode, setInviteCode] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [h, tList] = await Promise.all([
          apiGetHackathon(slug),
          apiGetTeams(slug)
        ]);
        setHackathon(h);
        setTeams(tList);

        if (user) {
          const mt = await apiGetMyTeam(slug);
          setMyTeam(mt);
        }
      } catch (err) {
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError('Failed to load teams.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading) {
      load();
    }
  }, [slug, user, authLoading]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsCreating(true);
    setError(null);
    setActionSuccess(null);

    try {
      const created = await apiCreateTeam(slug, { name: teamName });
      setMyTeam(created);
      setTeamName('');
      setActionSuccess(`Team "${created.name}" created successfully! Invite code: ${created.inviteCode}`);
      // Refresh teams list
      const updatedList = await apiGetTeams(slug);
      setTeams(updatedList);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to create team. Ensure you are registered.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsJoining(true);
    setError(null);
    setActionSuccess(null);

    try {
      const joined = await apiJoinTeam(slug, selectedTeamId || 'lookup', {
        inviteCode: inviteCode.trim()
      });
      setMyTeam(joined);
      setInviteCode('');
      setSelectedTeamId('');
      setActionSuccess(`Successfully joined team "${joined.name}"!`);
      const updatedList = await apiGetTeams(slug);
      setTeams(updatedList);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to join team. Check the invite code and event registration.');
      }
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
        Loading teams...
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Link href={`/hackathons/${slug}`} style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          &larr; Back to Event Details
        </Link>
        {myTeam && (
          <Link href={`/hackathons/${slug}/my-team`} className="btn" style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}>
            Manage My Team ({myTeam.name}) &rarr;
          </Link>
        )}
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          Teams &bull; {hackathon?.name}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Form a team or join teammates using a secure invite code. Max size: {hackathon?.maxTeamSize} members.
        </p>
      </div>

      {actionSuccess && (
        <div className="card" style={{ borderColor: 'var(--success)', background: 'rgba(16, 185, 129, 0.08)', color: 'var(--success)', marginBottom: '1.5rem' }}>
          {actionSuccess}
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* If user is already in a team, show banner */}
      {myTeam && (
        <div className="card" style={{ background: 'var(--bg-secondary)', borderLeft: '4px solid var(--accent-primary)', marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>You belong to</div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{myTeam.name}</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              {myTeam.memberCount} / {hackathon?.maxTeamSize} members &bull; Status: {myTeam.status}
            </div>
          </div>
          <Link href={`/hackathons/${slug}/my-team`} className="btn" style={{ fontSize: '0.85rem' }}>
            Open Team Roster &rarr;
          </Link>
        </div>
      )}

      {/* Team Formation Action Section (only if not already in a team and logged in) */}
      {user && !myTeam && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* Create Team Form */}
          <div className="card">
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>Create a New Team</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              You will become the team leader and receive an invite code to share with collaborators.
            </p>
            <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Team name (e.g. Quantum Hackers)"
                style={{
                  padding: '0.55rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              />
              <button
                type="submit"
                disabled={isCreating || !teamName.trim()}
                className="btn"
                style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
              >
                {isCreating ? 'Creating...' : 'Create Team'}
              </button>
            </form>
          </div>

          {/* Join by Invite Code Form */}
          <div className="card">
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>Join with Invite Code</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Enter the invite code provided by your team leader (e.g. DOG-ALPHA1).
            </p>
            <form onSubmit={handleJoinTeam} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Enter invite code (e.g. DOG-XXXXXX)"
                style={{
                  padding: '0.55rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  letterSpacing: '1px',
                  fontWeight: 600
                }}
              />
              <button
                type="submit"
                disabled={isJoining || !inviteCode.trim()}
                className="btn"
                style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              >
                {isJoining ? 'Joining...' : 'Join Team'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Existing Public Teams Grid */}
      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
          Registered Teams ({teams.length})
        </h2>

        {teams.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
            No teams have formed yet for this hackathon. Be the first to create one!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {teams.map((t) => (
              <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{t.name}</h3>
                    <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{t.status}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Leader: {t.leaderName || 'Team Captain'}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '0.5rem'
                }}>
                  <div>
                    Roster: <strong style={{ color: 'var(--text-primary)' }}>{t.memberCount}</strong> / {hackathon?.maxTeamSize}
                  </div>
                  {user && !myTeam && (
                    <button
                      onClick={() => {
                        setSelectedTeamId(t.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="btn"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: 'transparent', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)' }}
                    >
                      Join via Code
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
