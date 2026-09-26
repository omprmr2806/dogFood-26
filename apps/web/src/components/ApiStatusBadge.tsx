'use client';

import { useEffect, useState } from 'react';
import { fetchHealth } from '../lib/apiClient';
import { HealthCheckResponse } from '@dogfood/shared';

export function ApiStatusBadge() {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth()
      .then((data) => {
        setHealth(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'API unreachable');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <span className="badge">Checking Backend...</span>;
  }

  if (error) {
    return (
      <span className="badge badge-warning" title={error}>
        Backend: Disconnected
      </span>
    );
  }

  return (
    <span className={`badge ${health?.status === 'ok' ? 'badge-success' : 'badge-warning'}`}>
      Backend: {health?.status === 'ok' ? 'Healthy' : 'Degraded'} (DB: {health?.services.database})
    </span>
  );
}
