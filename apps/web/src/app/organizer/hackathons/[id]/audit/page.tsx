'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface AuditEntry {
  id: string;
  user_email: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

const ACTION_ICONS: Record<string, string> = {
  RESULTS_PUBLISHED: '🚀',
  RESULTS_UNPUBLISHED: '🔒',
  VOTE_CAST: '❤️',
  VOTE_REMOVED: '🤍',
  SUBMISSION_LOCKED: '🔐',
  ASSIGNMENT_FINALIZED: '✅',
  default: '📝',
};

export default function AuditLogPage() {
  const params = useParams();
  const hackathonId = params.id as string;

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const LIMIT = 50;

  useEffect(() => {
    const fetchLog = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${apiBase}/api/v1/hackathons/${hackathonId}/audit-log?page=${page}&limit=${LIMIT}`,
          { credentials: 'include' }
        );
        const body = await res.json();
        if (!res.ok) throw new Error(body.error?.message || 'Failed to fetch audit log');
        setEntries(body.data.entries);
        setTotal(body.data.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audit log');
      } finally {
        setLoading(false);
      }
    };
    fetchLog();
  }, [hackathonId, page, apiBase]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="page-wrapper">
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <Link href={`/organizer/hackathons/${hackathonId}`} style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            ← Back to Hackathon
          </Link>
          <h1 className="heading-1" style={{ marginTop: '0.375rem' }}>Audit Log</h1>
          <p className="text-secondary" style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}>
            {total} events recorded
          </p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>{error}</div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton" style={{ height: '60px', borderRadius: '8px' }} />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No audit events yet</div>
            <p className="empty-state-desc">Events will appear here as organizers take actions.</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Action</th>
                    <th>User</th>
                    <th>Entity</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        {new Date(entry.created_at).toLocaleString()}
                      </td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>{ACTION_ICONS[entry.action] || ACTION_ICONS.default}</span>
                          <span className="badge badge-accent" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0', textTransform: 'none', fontSize: '0.72rem' }}>
                            {entry.action}
                          </span>
                        </span>
                      </td>
                      <td className="text-secondary" style={{ fontSize: '0.82rem' }}>
                        {entry.user_email || '—'}
                      </td>
                      <td className="text-secondary" style={{ fontSize: '0.78rem' }}>
                        {entry.entity_type ? `${entry.entity_type}` : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '200px' }}>
                        {entry.details && Object.keys(entry.details).length > 0
                          ? JSON.stringify(entry.details).slice(0, 80)
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Prev
                </button>
                <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
