import { frontendEnv } from './env';
import {
  HealthCheckResponse,
  RegisterRequest,
  LoginRequest,
  UserProfile,
  ApiResponse
} from '@dogfood/shared';

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

async function handleResponse<T>(res: Response): Promise<T> {
  const json: ApiResponse<T> = await res.json().catch(() => ({
    success: false,
    error: { code: 'PARSE_ERROR', message: 'Failed to parse response' }
  }));

  if (!res.ok || !json.success) {
    throw new ApiClientError(
      json.error?.message || `Request failed with status ${res.status}`,
      res.status,
      json.error?.code
    );
  }

  return json.data as T;
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

export async function apiRegister(data: RegisterRequest): Promise<UserProfile> {
  const res = await fetch(`${frontendEnv.apiUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });

  const result = await handleResponse<{ user: UserProfile }>(res);
  return result.user;
}

export async function apiLogin(data: LoginRequest): Promise<UserProfile> {
  const res = await fetch(`${frontendEnv.apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });

  const result = await handleResponse<{ user: UserProfile }>(res);
  return result.user;
}

export async function apiLogout(): Promise<void> {
  const res = await fetch(`${frontendEnv.apiUrl}/auth/logout`, {
    method: 'POST',
    credentials: 'include'
  });

  await handleResponse<{ message: string }>(res);
}

export async function apiGetMe(): Promise<UserProfile> {
  const res = await fetch(`${frontendEnv.apiUrl}/auth/me`, {
    method: 'GET',
    credentials: 'include'
  });

  const result = await handleResponse<{ user: UserProfile }>(res);
  return result.user;
}
