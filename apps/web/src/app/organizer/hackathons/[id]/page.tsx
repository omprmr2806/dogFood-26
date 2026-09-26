'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../../context/AuthContext';
import {
  apiGetHackathon,
  apiUpdateHackathon,
  apiTransitionHackathon,
  ApiClientError
} from '../../../../lib/apiClient';
import { HackathonDetail, HackathonStatus } from '@dogfood/shared';

// Available transitions mapped directly from backend state machine
const ALLOWED_TRANSITIONS: Record<HackathonStatus, HackathonStatus[]> = {
  [HackathonStatus.DRAFT]: [HackathonStatus.OPEN, HackathonStatus.ARCHIVED],
  [HackathonStatus.OPEN]: [HackathonStatus.RUNNING, HackathonStatus.DRAFT, HackathonStatus.ARCHIVED],
  [HackathonStatus.RUNNING]: [HackathonStatus.JUDGING, HackathonStatus.ARCHIVED],
  [HackathonStatus.JUDGING]: [HackathonStatus.COMPLETED, HackathonStatus.ARCHIVED],
  [HackathonStatus.COMPLETED]: [HackathonStatus.ARCHIVED],
  [HackathonStatus.ARCHIVED]: []
};

export default function EditHackathonPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const hackathonId = resolvedParams.id;
  const { user, loading: authLoading } = useAuth();

  const [hackathon, setHackathon] = useState<HackathonDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit fields
  const [name, setName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [minTeamSize, setMinTeamSize] = useState('1');
  const [maxTeamSize, setMaxTeamSize] = useState('4');
  const [isUpdating, setIsUpdating] = useState(false);

  // Transition fields
  const [targetStatus, setTargetStatus] = useState<HackathonStatus | ''>('');
  const [transitionReason, setTransitionReason] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiGetHackathon(hackathonId);
        setHackathon(data);
        setName(data.name);
        setShortDescription(data.shortDescription || '');
        setDescription(data.description);
        setRules(data.rules || '');
        setMinTeamSize(data.minTeamSize.toString());
        setMaxTeamSize(data.maxTeamSize.toString());
      } catch (err) {
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError('Failed to load hackathon data.');
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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hackathon) return;
    setIsUpdating(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const updated = await apiUpdateHackathon(hackathon.id, {
        name,
        shortDescription: shortDescription || undefined,
        description,
        rules: rules || undefined,
        minTeamSize: parseInt(minTeamSize, 10),
        maxTeamSize: parseInt(maxTeamSize, 10)
      });
      setHackathon(updated);
      setSuccessMsg('Event details updated successfully.');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to update event details.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTransition = async () => {
    if (!hackathon || !targetStatus) return;
    setIsTransitioning(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const updated = await apiTransitionHackathon(hackathon.id, {
        targetStatus: targetStatus as HackathonStatus,
        reason: transitionReason || undefined
      });
      setHackathon(updated);
      setTargetStatus('');
      setTransitionReason('');
      setSuccessMsg(`Event successfully transitioned to [${updated.status}].`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to transition event status.');
      }
    } finally {
      setIsTransitioning(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
        Loading event configuration...
      </div>
    );
  }

  if (!user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN')) {
    return (
      <div className="container" style={{ maxWidth: '600px', margin: '3rem auto' }}>
        <div className="card" style={{ borderColor: 'var(--danger)', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--danger)', marginBottom: '0.75rem' }}>Organizer Access Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            You must be logged in as an Organizer or Administrator to manage this event.
          </p>
          <Link href="/login" className="btn">Sign In</Link>
        </div>
      </div>
    );
  }

  if (!hackathon) {
    return (
      <div className="container" style={{ maxWidth: '600px', margin: '3rem auto' }}>
        <div className="card" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
          {error || 'Hackathon not found.'}
        </div>
      </div>
    );
  }

  const validTargets = ALLOWED_TRANSITIONS[hackathon.status] || [];

  return (
    <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <Link href="/organizer/hackathons" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          &larr; Back to Organizer Dashboard
        </Link>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link
            href={`/organizer/hackathons/${hackathon.id}/registrations`}
            className="btn"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.85rem'
            }}
          >
            View Registrations ({hackathon.registrationCount})
          </Link>
          <Link
            href={`/hackathons/${hackathon.slug}`}
            className="btn"
            style={{ fontSize: '0.85rem' }}
          >
            Public Event Page &rarr;
          </Link>
        </div>
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

      {/* Lifecycle Transition Card */}
      <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--accent-primary)' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Event State Machine: <span className="badge badge-info" style={{ fontSize: '0.9rem', marginLeft: '0.5rem' }}>{hackathon.status}</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Transition the hackathon across lifecycle states. Transitions are strictly validated server-side and recorded in the immutable audit log.
        </p>

        {validTargets.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>
            Event is in final state [ARCHIVED]. No further state transitions are permitted.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '500px' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as HackathonStatus)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  flex: 1
                }}
              >
                <option value="">Select Target State...</option>
                {validTargets.map((st) => (
                  <option key={st} value={st}>
                    Transition to {st}
                  </option>
                ))}
              </select>

              <button
                onClick={handleTransition}
                disabled={!targetStatus || isTransitioning}
                className="btn"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                {isTransitioning ? 'Transitioning...' : 'Apply Transition'}
              </button>
            </div>

            <input
              type="text"
              placeholder="Optional audit reason (e.g. Schedule commencement)"
              value={transitionReason}
              onChange={(e) => setTransitionReason(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
            />
          </div>
        )}
      </div>

      {/* Edit Configuration Form */}
      <div className="card">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Edit Event Configuration</h2>

        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem' }}>
              Hackathon Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem' }}>
              Tagline
            </label>
            <input
              type="text"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem' }}>
              Detailed Description
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem' }}>
              Rules &amp; Guidelines
            </label>
            <textarea
              rows={3}
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem' }}>
                Min Team Size
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={minTeamSize}
                onChange={(e) => setMinTeamSize(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem' }}>
                Max Team Size
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={maxTeamSize}
                onChange={(e) => setMaxTeamSize(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={isUpdating}
              className="btn"
              style={{ padding: '0.6rem 1.25rem' }}
            >
              {isUpdating ? 'Saving Changes...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
