'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../../../context/AuthContext';
import {
  apiGetHackathon,
  apiGetHackathonSubmissions,
  apiUpdateSubmissionStatus,
  ApiClientError
} from '../../../../../lib/apiClient';
import { HackathonDetail, SubmissionSummary, SubmissionStatus } from '@dogfood/shared';

export default function OrganizerSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const hackathonId = resolvedParams.id;
  const { user, loading: authLoading } = useAuth();

  const [hackathon, setHackathon] = useState<HackathonDetail | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [h, sList] = await Promise.all([
          apiGetHackathon(hackathonId),
          apiGetHackathonSubmissions(hackathonId)
        ]);
        setHackathon(h);
        setSubmissions(sList);
      } catch (err) {
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError('Failed to load organizer submissions.');
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

  const handleStatusChange = async (submissionId: string, newStatus: SubmissionStatus) => {
    setUpdatingId(submissionId);
    setError(null);
    setSuccessMsg(null);

    try {
      await apiUpdateSubmissionStatus(submissionId, newStatus);
      setSubmissions((prev) =>
        prev.map((s) => (s.id === submissionId ? { ...s, status: newStatus } : s))
      );
      setSuccessMsg(`Submission status successfully updated to ${newStatus}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to update submission status.');
      }
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px', color: '#586069' }}>
        <p>Loading submission management console...</p>
      </div>
    );
  }

  // Metrics
  const totalCount = submissions.length;
  const submittedCount = submissions.filter((s) => s.status === SubmissionStatus.SUBMITTED).length;
  const draftCount = submissions.filter((s) => s.status === SubmissionStatus.DRAFT).length;
  const lockedCount = submissions.filter(
    (s) => s.status === SubmissionStatus.LOCKED || s.status === SubmissionStatus.FINALIZED
  ).length;
  const disqualifiedCount = submissions.filter((s) => s.status === SubmissionStatus.DISQUALIFIED).length;

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }}>
      {/* Navigation */}
      <div style={{ marginBottom: '20px' }}>
        <Link
          href={`/organizer/hackathons/${hackathonId}`}
          style={{ color: '#0366d6', textDecoration: 'none' }}
        >
          &larr; Back to {hackathon?.name || 'Hackathon Overview'}
        </Link>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, margin: '0 0 6px 0' }}>
            Submission Management Console
          </h1>
          <p style={{ color: '#586069', margin: 0 }}>
            {hackathon?.name} &bull; Lifecycle: <strong>{hackathon?.status}</strong>
          </p>
        </div>
        <div>
          <Link
            href="/gallery"
            style={{
              padding: '8px 16px',
              backgroundColor: '#f6f8fa',
              color: '#0366d6',
              border: '1px solid #d1d5da',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            Public Gallery &rarr;
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '16px',
          marginBottom: '28px'
        }}
      >
        <div style={{ backgroundColor: '#fff', border: '1px solid #e1e4e8', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#24292e' }}>{totalCount}</div>
          <div style={{ fontSize: '13px', color: '#586069' }}>Total Projects</div>
        </div>
        <div style={{ backgroundColor: '#fff', border: '1px solid #e1e4e8', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#28a745' }}>{submittedCount}</div>
          <div style={{ fontSize: '13px', color: '#586069' }}>Submitted</div>
        </div>
        <div style={{ backgroundColor: '#fff', border: '1px solid #e1e4e8', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59f00' }}>{draftCount}</div>
          <div style={{ fontSize: '13px', color: '#586069' }}>In Draft</div>
        </div>
        <div style={{ backgroundColor: '#fff', border: '1px solid #e1e4e8', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0366d6' }}>{lockedCount}</div>
          <div style={{ fontSize: '13px', color: '#586069' }}>Locked / Final</div>
        </div>
        <div style={{ backgroundColor: '#fff', border: '1px solid #e1e4e8', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#cb2431' }}>{disqualifiedCount}</div>
          <div style={{ fontSize: '13px', color: '#586069' }}>Disqualified</div>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb',
            borderRadius: '6px',
            marginBottom: '20px'
          }}
        >
          {error}
        </div>
      )}

      {successMsg && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#d4edda',
            color: '#155724',
            border: '1px solid #c3e6cb',
            borderRadius: '6px',
            marginBottom: '20px'
          }}
        >
          {successMsg}
        </div>
      )}

      {/* Submissions Table */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #e1e4e8', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead style={{ backgroundColor: '#f6f8fa', borderBottom: '1px solid #e1e4e8' }}>
            <tr>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Project Title</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Team</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Technologies</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Submitted At</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: '#586069' }}>
                  No submissions have been created for this hackathon yet.
                </td>
              </tr>
            ) : (
              submissions.map((sub) => (
                <tr key={sub.id} style={{ borderBottom: '1px solid #eaecef' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <strong>{sub.title}</strong>
                    {sub.tagline && (
                      <div style={{ fontSize: '12px', color: '#6a737d', fontStyle: 'italic' }}>
                        {sub.tagline}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#24292e' }}>
                    {sub.teamName}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {sub.technologyStack && sub.technologyStack.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {sub.technologyStack.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            style={{
                              fontSize: '11px',
                              padding: '1px 6px',
                              backgroundColor: '#f1f8ff',
                              color: '#0366d6',
                              borderRadius: '4px'
                            }}
                          >
                            {t}
                          </span>
                        ))}
                        {sub.technologyStack.length > 3 && (
                          <span style={{ fontSize: '11px', color: '#6a737d' }}>
                            +{sub.technologyStack.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: '#959da5' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor:
                          sub.status === SubmissionStatus.SUBMITTED
                            ? '#d4edda'
                            : sub.status === SubmissionStatus.LOCKED || sub.status === SubmissionStatus.FINALIZED
                            ? '#d1ecf1'
                            : sub.status === SubmissionStatus.DISQUALIFIED
                            ? '#f8d7da'
                            : '#fff3cd',
                        color:
                          sub.status === SubmissionStatus.SUBMITTED
                            ? '#155724'
                            : sub.status === SubmissionStatus.LOCKED || sub.status === SubmissionStatus.FINALIZED
                            ? '#0c5460'
                            : sub.status === SubmissionStatus.DISQUALIFIED
                            ? '#721c24'
                            : '#856404'
                      }}
                    >
                      {sub.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#586069', fontSize: '13px' }}>
                    {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : 'Not submitted'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      {sub.status !== SubmissionStatus.LOCKED && (
                        <button
                          type="button"
                          disabled={updatingId === sub.id}
                          onClick={() => handleStatusChange(sub.id, SubmissionStatus.LOCKED)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            backgroundColor: '#f6f8fa',
                            border: '1px solid #d1d5da',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Lock
                        </button>
                      )}
                      {sub.status !== SubmissionStatus.FINALIZED && (
                        <button
                          type="button"
                          disabled={updatingId === sub.id}
                          onClick={() => handleStatusChange(sub.id, SubmissionStatus.FINALIZED)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            backgroundColor: '#f6f8fa',
                            border: '1px solid #d1d5da',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Finalize
                        </button>
                      )}
                      {sub.status !== SubmissionStatus.DISQUALIFIED && (
                        <button
                          type="button"
                          disabled={updatingId === sub.id}
                          onClick={() => handleStatusChange(sub.id, SubmissionStatus.DISQUALIFIED)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            backgroundColor: '#fff',
                            border: '1px solid #cb2431',
                            color: '#cb2431',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Disqualify
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
