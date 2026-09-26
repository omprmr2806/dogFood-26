import { frontendEnv } from './env';
import { HealthCheckResponse } from '@dogfood/shared';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export async function fetchHealth(): Promise<HealthCheckResponse> {
  try {
    const res = await fetch(`${frontendEnv.apiUrl}/health`, {
      cache: 'no-store'
    });

    if (!res.ok) {
      throw new ApiClientError(`API health check failed with status ${res.status}`, res.status);
    }

    return await res.json();
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    throw new ApiClientError(
      error instanceof Error ? error.message : 'Network error reaching backend API',
      0
    );
  }
}
