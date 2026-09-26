'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface LeaderboardEntry {
  rank: number | null;
  submissionId: string;
  submissionTitle: string;
  submissionTagline?: string;
  teamId: string;
  teamName: string;
  normalizedScore: number;
  rawScoreAvg: number;
  voteCount: number;
  isTied: boolean;
  isDisqualified: boolean;
  evaluationsCount: number;
}

interface PublishedResults {
  hackathonId: string;
  hackathonName: string;
  hackathonSlug: string;
  publishedAt: string;
  isPublished: boolean;
  leaderboard: LeaderboardEntry[];
  totalVotes: number;
  totalSubmissions: number;
  totalJudgedSubmissions: number;
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function getRankClass(rank: number | null): string {
  if (!rank) return '';
  if (rank === 1) return 'rank-1';
  if (rank === 2) return 'rank-2';
  if (rank === 3) return 'rank-3';
  return '';
}

export default function LeaderboardPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;

  const [results, setResults] = useState<PublishedResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiBase}/api/v1/hackathons/${hackathonId}/results`, {
          credentials: 'include',
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error?.message || 'Failed to load results');
        }

        const body = await res.json();
        setResults(body.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [hackathonId]);

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="container" style={{ paddingTop: '4rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '72px', borderRadius: '10px', opacity: 1 - i * 0.15 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="page-wrapper">
        <div className="container" style={{ paddingTop: '4rem' }}>
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
            <h2 className="heading-2" style={{ marginBottom: '0.5rem' }}>
              Results Not Available
            </h2>
            <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>
              {error || 'Results for this hackathon have not been published yet.'}
            </p>
            <Link href="/gallery" className="btn btn-secondary btn-sm">
              Browse Gallery
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const qualified = results.leaderboard.filter((e) => !e.isDisqualified);
  const disqualified = results.leaderboard.filter((e) => e.isDisqualified);

  return (
    <div className="page-wrapper">
      {/* Hero Header */}
      <section className="hero-section" style={{ paddingBottom: '2rem' }}>
        <div className="container">
          <div className="hero-eyebrow animate-fade-in">
            🏆 Final Results
          </div>
          <h1 className="heading-hero animate-fade-in stagger-1">
            {results.hackathonName}
          </h1>
          <p className="text-secondary animate-fade-in stagger-2" style={{ marginTop: '0.75rem', fontSize: '1rem' }}>
            Leaderboard · {qualified.length} ranked projects · {results.totalVotes.toLocaleString()} community votes
          </p>
          {results.publishedAt && (
            <p className="text-muted animate-fade-in stagger-3" style={{ marginTop: '0.375rem', fontSize: '0.8rem' }}>
              Published {new Date(results.publishedAt).toLocaleDateString('en-US', { dateStyle: 'long' })}
            </p>
          )}
        </div>
      </section>

      <div className="container" style={{ paddingBottom: '4rem' }}>
        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          {[
            { label: 'Total Submissions', value: results.totalSubmissions },
            { label: 'Judged Projects', value: results.totalJudgedSubmissions },
            { label: 'Community Votes', value: results.totalVotes.toLocaleString() },
            { label: 'Ranked Projects', value: qualified.length },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`stat-card animate-fade-in stagger-${i + 1}`}
            >
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Top 3 Podium */}
        {qualified.length >= 3 && (
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 className="heading-3 text-gradient" style={{ marginBottom: '1.25rem' }}>
              🎖️ Top Finishers
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {qualified.slice(0, 3).map((entry, i) => (
                <div
                  key={entry.submissionId}
                  className={`card card--hero animate-fade-in stagger-${i + 1}`}
                  style={{ position: 'relative', overflow: 'hidden' }}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                    {MEDAL[entry.rank ?? i + 1] || `#${entry.rank}`}
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.25rem' }}>
                    <Link href={`/gallery/${entry.submissionId}`} style={{ color: 'var(--text-primary)' }}>
                      {entry.submissionTitle}
                    </Link>
                  </h3>
                  <p className="text-secondary" style={{ fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                    by {entry.teamName}
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-accent">
                      {entry.normalizedScore.toFixed(2)} pts
                    </span>
                    <span className="badge badge-danger">
                      ❤️ {entry.voteCount}
                    </span>
                    {entry.isTied && (
                      <span className="badge badge-warning">Tied</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Leaderboard */}
        <div>
          <h2 className="heading-3" style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            Full Rankings
          </h2>

          {qualified.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">No ranked submissions yet</div>
              <p className="empty-state-desc">Judging may still be in progress.</p>
            </div>
          ) : (
            <div>
              {qualified.map((entry, i) => (
                <div
                  key={entry.submissionId}
                  className={`leaderboard-row animate-fade-in stagger-${Math.min(i + 1, 5)}`}
                >
                  {/* Rank */}
                  <div className={`leaderboard-rank ${getRankClass(entry.rank)}`}>
                    {entry.rank ? (MEDAL[entry.rank] || `#${entry.rank}`) : '—'}
                  </div>

                  {/* Project Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link
                      href={`/gallery/${entry.submissionId}`}
                      style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}
                      className="truncate"
                    >
                      {entry.submissionTitle}
                    </Link>
                    {entry.submissionTagline && (
                      <p className="text-secondary truncate" style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>
                        {entry.submissionTagline}
                      </p>
                    )}
                    <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.15rem' }}>
                      {entry.teamName} · {entry.evaluationsCount} evaluation{entry.evaluationsCount !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Scores */}
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        {entry.normalizedScore.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Norm. Score
                      </div>
                    </div>
                    <span className="badge badge-danger">
                      ❤️ {entry.voteCount}
                    </span>
                    {entry.isTied && <span className="badge badge-warning">Tied</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Disqualified section */}
          {disqualified.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <details>
                <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem', userSelect: 'none', marginBottom: '0.75rem' }}>
                  {disqualified.length} disqualified project{disqualified.length !== 1 ? 's' : ''}
                </summary>
                {disqualified.map((entry) => (
                  <div
                    key={entry.submissionId}
                    className="leaderboard-row"
                    style={{ opacity: 0.5 }}
                  >
                    <div className="leaderboard-rank">—</div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {entry.submissionTitle}
                      </span>
                      <p className="text-muted" style={{ fontSize: '0.75rem' }}>{entry.teamName}</p>
                    </div>
                    <span className="badge badge-danger">Disqualified</span>
                  </div>
                ))}
              </details>
            </div>
          )}
        </div>

        {/* Back links */}
        <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link href="/gallery" className="btn btn-secondary">
            Browse Gallery
          </Link>
          <Link href="/hackathons" className="btn btn-ghost">
            All Hackathons
          </Link>
        </div>
      </div>
    </div>
  );
}
