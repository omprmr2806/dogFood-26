import { UserRole } from './enums';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  timestamp: string;
  services: {
    api: 'healthy';
    database: 'healthy' | 'unhealthy' | 'disconnected';
  };
}

// User Profile DTO (safe representation, never includes password hash)
export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: string;
  createdAt: string;
}

// Authentication DTOs
export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserProfile;
}
