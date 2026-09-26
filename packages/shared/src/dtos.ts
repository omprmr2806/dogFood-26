import { UserRole, HackathonStatus, RegistrationStatus } from './enums';
import { HackathonDetail, HackathonSummary, Registration, RegistrationDetail } from './domain';

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

// Hackathon DTOs
export interface CreateHackathonRequest {
  slug: string;
  name: string;
  shortDescription?: string;
  description: string;
  rules?: string;
  registrationStart?: string | null;
  registrationEnd?: string | null;
  eventStart?: string | null;
  eventEnd?: string | null;
  minTeamSize?: number;
  maxTeamSize?: number;
}

export interface UpdateHackathonRequest {
  name?: string;
  shortDescription?: string;
  description?: string;
  rules?: string;
  registrationStart?: string | null;
  registrationEnd?: string | null;
  eventStart?: string | null;
  eventEnd?: string | null;
  minTeamSize?: number;
  maxTeamSize?: number;
}

export interface TransitionHackathonRequest {
  targetStatus: HackathonStatus;
  reason?: string;
}

// Registration DTOs
export interface CreateRegistrationRequest {
  notes?: string;
}

export interface UpdateRegistrationStatusRequest {
  status: RegistrationStatus;
}

// Team DTOs
export interface CreateTeamRequest {
  name: string;
}

export interface UpdateTeamRequest {
  name?: string;
}

export interface JoinTeamRequest {
  inviteCode: string;
}

export interface AddTeamMemberRequest {
  userId: string;
  role?: string;
}
