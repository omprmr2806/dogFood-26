'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import {
  apiGetHackathon,
  apiGetMyTeam,
  apiUpdateTeam,
  apiLeaveTeam,
  apiRemoveMember,
  apiRegenerateInviteCode,
  ApiClientError
} from '../../../../lib/apiClient';
import { HackathonDetail, TeamDetail, TeamMemberRole } from '@dogfood/shared';

export default function MyTeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [hackathon, setHackathon] = useState<HackathonDetail | null>(null);
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Edit team name
  const [editName, setEditName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // State actions
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [h, t] = await Promise.all([
          apiGetHackathon(slug),
          apiGetMyTeam(slug)
        ]);
        setHackathon(h);
        setTeam(t);
        if (t) setEditName(t.name);
      } catch (err) {
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError('Failed to load team.');
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
  }, [slug, user, authLoading]);

  const handleCopyInvite = () => {
    if (!team?.inviteCode) return;
    navigator.clipboard.writeText(team.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;
    setIsUpdatingName(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const updated = await apiUpdateTeam(slug, team.id, { name: editName.trim() });
      setTeam(updated);
      setSuccessMsg('Team name updated successfully.');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to update team name.');
      }
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleRegenerateCode = async () => {
    if (!team) return;
    setIsRegenerating(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { inviteCode } = await apiRegenerateInviteCode(slug, team.id);
      setTeam({ ...team, inviteCode });
      setSuccessMsg('New invite code generated.');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to regenerate invite code.');
      }
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!team) return;
    setRemovingUserId(targetUserId);
    setError(null);
    setSuccessMsg(null);

    try {
      await apiRemoveMember(slug, team.id, targetUserId);
      setTeam({
        ...team,
        members: team.members.filter((m) => m.userId !== targetUserId),
        memberCount: team.memberCount - 1
      });
      setSuccessMsg('Member removed from team.');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to remove member.');
      }
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleLeaveTeam = async () => {
    if (!team) return;
    if (!confirm('Are you sure you want to leave this team?')) return;
    setIsLeaving(true);
    setError(null);

    try {
      await apiLeaveTeam(slug, team.id);
      router.push(`/hackathons/${slug}/teams`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to leave team.');
      }
      setIsLeaving(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
        Loading team information...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container" style={{ maxWidth: '600px', margin: '3rem auto' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Please sign in to view your team.</p>
          <Link href="/login" className="btn">Sign In</Link>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="container" style={{ maxWidth: '600px', margin: '3rem auto' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>No Team Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            You do not currently belong to a team in this hackathon.
          </p>
          <Link href={`/hackathons/${slug}/teams`} className="btn">
            Create or Join Team
          </Link>
        </div>
      </div>
    );
  }

  const isLeader = team.leaderId === user.id;

  return (
    <div className="container" style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Link href={`/hackathons/${slug}/teams`} style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          &larr; Back to Teams
        </Link>
        <button
          onClick={handleLeaveTeam}
          disabled={isLeaving}
          className="btn"
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--danger)',
            fontSize: '0.85rem',
            padding: '0.35rem 0.75rem'
          }}
        >
          {isLeaving ? 'Leaving...' : 'Leave Team'}
        </button>
      </div>

      {successMsg && (
        <div className="card" style={{ borderColor: 'var(--success)', background: 'rgba(16, 185, 129, 0.08)', color: 'var(--success)', marginBottom: '1.5rem' }}>
          {successMsg}
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Main Team Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>{team.name}</h1>
              <span className="badge badge-info">{team.status}</span>
              {isLeader && <span className="badge badge-success">LEADER</span>}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Hackathon: <strong>{hackathon?.name}</strong> &bull; Capacity: <strong>{team.memberCount} / {team.maxTeamSize}</strong> members
            </div>
          </div>

          {/* Secure Invite Code Section */}
          {team.inviteCode && (
            <div style={{
              background: 'var(--bg-secondary)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              textAlign: 'right'
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Team Invite Code
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <code style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '1px', color: 'var(--accent-primary)' }}>
                  {team.inviteCode}
                </code>
                <button
                  onClick={handleCopyInvite}
                  className="btn"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {isLeader && (
                <button
                  onClick={handleRegenerateCode}
                  disabled={isRegenerating}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    marginTop: '0.35rem'
                  }}
                >
                  {isRegenerating ? 'Generating...' : 'Regenerate Code'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Leader: Edit Team Name */}
        {isLeader && (
          <form onSubmit={handleUpdateName} style={{ display: 'flex', gap: '0.5rem', maxWidth: '400px', marginBottom: '1.25rem' }}>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Update team name"
              style={{
                flex: 1,
                padding: '0.45rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
            />
            <button
              type="submit"
              disabled={isUpdatingName || editName === team.name}
              className="btn"
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
            >
              {isUpdatingName ? 'Saving...' : 'Rename'}
            </button>
          </form>
        )}
      </div>

      {/* Team Members Table */}
      <div className="card">
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem' }}>
          Team Members ({team.members.length})
        </h2>

        <div style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.65rem 0.75rem' }}>Member</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Role</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Joined</th>
                {isLeader && <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {team.members.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.65rem 0.75rem', fontWeight: 500 }}>
                    {m.fullName || 'Team Member'}
                    {m.userId === user.id && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>(You)</span>
                    )}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    {m.role === TeamMemberRole.LEADER ? (
                      <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>LEADER</span>
                    ) : (
                      <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>MEMBER</span>
                    )}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-secondary)' }}>
                    {new Date(m.joinedAt).toLocaleDateString()}
                  </td>
                  {isLeader && (
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                      {m.userId !== user.id && (
                        <button
                          onClick={() => handleRemoveMember(m.userId)}
                          disabled={removingUserId === m.userId}
                          className="btn"
                          style={{
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.75rem',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: 'var(--danger)',
                            border: '1px solid rgba(239, 68, 68, 0.3)'
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
