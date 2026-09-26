'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface LeaderboardEntry {
  rank: number | null;
  submissionId: string;
  submissionTitle: string;
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
  isPublished: boolean;
  publishedAt?: string;
  leaderboard: LeaderboardEntry[];
  totalVotes: number;
  totalSubmissions: number;
  totalJudgedSubmissions: number;
}

export default function OrganizerResultsPage() {
  const params = useParams();
  const hackathonId = params.id as string;
  const router = useRouter();

  const [results, setResults] = useState<PublishedResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiBase}/api/v1/hackathons/${hackathonId}/results`, {
        credentials: 'include',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || 'Failed to fetch results');
      setResults(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hackathonId]);

  const handlePublish = async () => {
    if (!confirm('Publish results? This will make the leaderboard visible to all participants.')) return;
    setPublishing(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`${apiBase}/api/v1/hackathons/${hackathonId}/results/publish`, {
        method: 'POST',
        credentials: 'include',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || 'Failed to publish results');
      setStatusMsg({ type: 'success', text: 'Results published successfully! The leaderboard is now public.' });
      await fetchResults();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to publish' });
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!confirm('Unpublish results? The leaderboard will become hidden from participants.')) return;
    setPublishing(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`${apiBase}/api/v1/hackathons/${hackathonId}/results/publish`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || 'Failed to unpublish');
      setStatusMsg({ type: 'success', text: 'Results unpublished. Leaderboard is now hidden.' });
      await fetchResults();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to unpublish' });
    } finally {
      setPublishing(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    window.open(`${apiBase}/api/v1/hackathons/${hackathonId}/results/export?format=${format}`, '_blank');
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="container" style={{ paddingTop: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '10px' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <Link href={`/organizer/hackathons/${hackathonId}`} style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              ← Back to Hackathon
            </Link>
            <h1 className="heading-1" style={{ marginTop: '0.375rem' }}>
              Results & Leaderboard
            </h1>
            {results && (
              <p className="text-secondary" style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}>
                {results.hackathonName}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {results?.isPublished ? (
              <>
                <Link
                  href={`/leaderboard/${hackathonId}`}
                  target="_blank"
                  className="btn btn-secondary btn-sm"
                >
                  🔗 View Public Leaderboard
                </Link>
                <button
                  className="btn btn-sm"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-medium)', color: 'var(--warning)' }}
                  onClick={handleUnpublish}
                  disabled={publishing}
                >
                  {publishing ? <span className="spinner" /> : '🔒 Unpublish'}
                </button>
              </>
            ) : (
              <button
                className="btn btn-gradient btn-sm"
                onClick={handlePublish}
                disabled={publishing || !results}
              >
                {publishing ? <span className="spinner" /> : '🚀 Publish Results'}
              </button>
            )}

            <div style={{ display: 'flex', gap: '0.375rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => handleExport('csv')}>
                📄 CSV
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleExport('json')}>
                {} JSON
              </button>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div className={`alert ${statusMsg.type === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: '1.5rem' }}>
            {statusMsg.text}
          </div>
        )}

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {results && (
          <>
            {/* Publication Status Banner */}
            <div className={`card ${results.isPublished ? 'card--hero' : ''}`} style={{ marginBottom: '2rem', padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{results.isPublished ? '✅' : '🔒'}</span>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {results.isPublished ? 'Results are PUBLISHED' : 'Results are UNPUBLISHED (Preview)'}
                    </div>
                    {results.publishedAt && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Published on {new Date(results.publishedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { label: 'Total Submissions', value: results.totalSubmissions },
                { label: 'Judged', value: results.totalJudgedSubmissions },
                { label: 'Community Votes', value: results.totalVotes.toLocaleString() },
                { label: 'Ranked', value: results.leaderboard.filter((e) => !e.isDisqualified).length },
              ].map((s) => (
                <div key={s.label} className="stat-card">
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Leaderboard Preview Table */}
            <h2 className="heading-3" style={{ marginBottom: '1rem' }}>Leaderboard Preview</h2>

            {results.leaderboard.length === 0 ? (
              <div className="card empty-state">
                <div className="empty-state-icon">📊</div>
                <div className="empty-state-title">No results yet</div>
                <p className="empty-state-desc">
                  Run score normalization from the Judging Monitor first.
                </p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Project</th>
                      <th>Team</th>
                      <th>Normalized Score</th>
                      <th>Raw Avg</th>
                      <th>Votes</th>
                      <th>Evals</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.leaderboard.map((entry) => (
                      <tr key={entry.submissionId}>
                        <td style={{ fontWeight: 700, color: entry.isDisqualified ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                          {entry.isDisqualified ? '—' : (entry.rank ?? '—')}
                        </td>
                        <td>
                          <Link href={`/gallery/${entry.submissionId}`} style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>
                            {entry.submissionTitle}
                          </Link>
                        </td>
                        <td className="text-secondary">{entry.teamName}</td>
                        <td style={{ fontWeight: 600 }}>{entry.normalizedScore.toFixed(4)}</td>
                        <td className="text-secondary">{entry.rawScoreAvg.toFixed(4)}</td>
                        <td>
                          <span className="badge badge-danger">❤️ {entry.voteCount}</span>
                        </td>
                        <td className="text-secondary">{entry.evaluationsCount}</td>
                        <td>
                          {entry.isDisqualified ? (
                            <span className="badge badge-danger">DQ</span>
                          ) : entry.isTied ? (
                            <span className="badge badge-warning">Tied</span>
                          ) : (
                            <span className="badge badge-success">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Audit Log Link */}
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <Link href={`/organizer/hackathons/${hackathonId}/audit`} className="btn btn-ghost btn-sm">
                🗒️ View Audit Log
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
