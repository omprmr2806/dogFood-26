'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { frontendEnv } from '../../lib/env';

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const [rbacResult, setRbacResult] = useState<{ endpoint: string; status: number; message: string } | null>(null);
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);

  const testRbacEndpoint = async (roleName: string) => {
    const endpoint = `/rbac/${roleName}-test`;
    setTestingEndpoint(endpoint);
    try {
      const res = await fetch(`${frontendEnv.apiUrl}${endpoint}`, {
        credentials: 'include'
      });
      const data = await res.json().catch(() => ({}));
      setRbacResult({
        endpoint,
        status: res.status,
        message: res.status === 200 
          ? `200 OK: ${data?.data?.message || 'Access granted'}`
          : `${res.status} ${data?.error?.code || 'Access denied'}: ${data?.error?.message || 'Forbidden'}`
      });
    } catch (err: unknown) {
      setRbacResult({
        endpoint,
        status: 0,
        message: err instanceof Error ? err.message : 'Network error'
      });
    } finally {
      setTestingEndpoint(null);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem 0' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Verifying session authentication...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container" style={{ maxWidth: '500px', margin: '4rem auto', textAlign: 'center' }}>
        <div className="card">
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Authentication Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            You must be signed in to access the DOGFOOD dashboard.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link href="/login" className="btn">Sign In</Link>
            <Link href="/register" className="btn" style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            Welcome back, {user.fullName}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Authenticated as <strong style={{ color: 'var(--text-primary)' }}>{user.email}</strong> &bull; Member since {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span className="badge badge-success" style={{ fontSize: '0.875rem', padding: '0.35rem 0.75rem' }}>
            ROLE: {user.role}
          </span>
          <button 
            onClick={() => logout()}
            className="btn" 
            style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Role-Specific Panel */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--accent-primary)' }}>
            {user.role} Workspace
          </h2>
          {user.role === 'ADMIN' && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.5' }}>
              Full administrative privileges. You can manage hackathons, assign organizer permissions, inspect audit logs, and override system configurations.
            </p>
          )}
          {user.role === 'ORGANIZER' && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.5' }}>
              Event management console. You can configure hackathon details, weighted criteria rubrics, run judge assignment algorithms, and publish score rankings.
            </p>
          )}
          {user.role === 'JUDGE' && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.5' }}>
              Evaluation console. You have access to your assigned submission queue and criteria scoring rubrics.
            </p>
          )}
          {user.role === 'PARTICIPANT' && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.5' }}>
              Participant workspace. Form teams, submit hackathon projects, and cast community votes.
            </p>
          )}
        </div>

        {/* Live RBAC Permission Verification Tester */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Live RBAC Route Verification</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Test your current session against backend role-guarded endpoints:
          </p>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {['admin', 'organizer', 'judge', 'participant'].map((roleName) => (
              <button
                key={roleName}
                onClick={() => testRbacEndpoint(roleName)}
                disabled={testingEndpoint !== null}
                className="btn"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
              >
                Test /{roleName}
              </button>
            ))}
          </div>

          {rbacResult && (
            <div style={{
              background: rbacResult.status === 200 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${rbacResult.status === 200 ? 'var(--success)' : 'var(--danger)'}`,
              padding: '0.75rem',
              borderRadius: '4px',
              fontSize: '0.85rem'
            }}>
              <p><strong>Endpoint:</strong> {rbacResult.endpoint}</p>
              <p><strong>Status:</strong> {rbacResult.message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
