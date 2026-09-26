import { frontendEnv } from './env';
import {
  HealthCheckResponse,
  RegisterRequest,
  LoginRequest,
  UserProfile,
  ApiResponse,
  HackathonSummary,
  HackathonDetail,
  CreateHackathonRequest,
  UpdateHackathonRequest,
  TransitionHackathonRequest,
  Registration,
  RegistrationDetail,
  UpdateRegistrationStatusRequest,
  TeamSummary,
  TeamDetail,
  CreateTeamRequest,
  UpdateTeamRequest,
  JoinTeamRequest,
  SubmissionDetail,
  SubmissionSummary,
  CreateSubmissionRequest,
  UpdateSubmissionRequest,
  UpdateSubmissionStatusRequest,
  GalleryResponse,
  GalleryItem,
  GalleryQuery,
  SubmissionStatus
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

// ==========================================
// HACKATHON EVENT APIS
// ==========================================

export async function apiGetHackathons(): Promise<HackathonSummary[]> {
  const res = await fetch(`${frontendEnv.apiUrl}/hackathons`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store'
  });

  const result = await handleResponse<{ hackathons: HackathonSummary[] }>(res);
  return result.hackathons;
}

export async function apiGetHackathon(idOrSlug: string): Promise<HackathonDetail> {
  const res = await fetch(`${frontendEnv.apiUrl}/hackathons/${idOrSlug}`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store'
  });

  const result = await handleResponse<{ hackathon: HackathonDetail }>(res);
  return result.hackathon;
}

export async function apiCreateHackathon(data: CreateHackathonRequest): Promise<HackathonDetail> {
  const res = await fetch(`${frontendEnv.apiUrl}/hackathons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });

  const result = await handleResponse<{ hackathon: HackathonDetail }>(res);
  return result.hackathon;
}

export async function apiUpdateHackathon(id: string, data: UpdateHackathonRequest): Promise<HackathonDetail> {
  const res = await fetch(`${frontendEnv.apiUrl}/hackathons/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });

  const result = await handleResponse<{ hackathon: HackathonDetail }>(res);
  return result.hackathon;
}

export async function apiTransitionHackathon(id: string, data: TransitionHackathonRequest): Promise<HackathonDetail> {
  const res = await fetch(`${frontendEnv.apiUrl}/hackathons/${id}/transitions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });

  const result = await handleResponse<{ hackathon: HackathonDetail }>(res);
  return result.hackathon;
}

// ==========================================
// REGISTRATION APIS
// ==========================================

export async function apiRegisterForHackathon(hackathonIdOrSlug: string): Promise<Registration> {
  const res = await fetch(`${frontendEnv.apiUrl}/hackathons/${hackathonIdOrSlug}/registrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  });

  const result = await handleResponse<{ registration: Registration }>(res);
  return result.registration;
}

export async function apiGetMyRegistration(hackathonIdOrSlug: string): Promise<Registration | null> {
  const res = await fetch(`${frontendEnv.apiUrl}/hackathons/${hackathonIdOrSlug}/registration`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store'
  });

  const result = await handleResponse<{ registration: Registration | null }>(res);
  return result.registration;
}

export async function apiGetHackathonRegistrations(hackathonIdOrSlug: string): Promise<RegistrationDetail[]> {
  const res = await fetch(`${frontendEnv.apiUrl}/hackathons/${hackathonIdOrSlug}/registrations`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store'
  });

  const result = await handleResponse<{ registrations: RegistrationDetail[] }>(res);
  return result.registrations;
}

export async function apiUpdateRegistrationStatus(
  hackathonIdOrSlug: string,
  registrationId: string,
  data: UpdateRegistrationStatusRequest
): Promise<Registration> {
  const res = await fetch(`${frontendEnv.apiUrl}/hackathons/${hackathonIdOrSlug}/registrations/${registrationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });

  const result = await handleResponse<{ registration: Registration }>(res);
  return result.registration;
}

// ==========================================
// TEAM APIS
// ==========================================

export async function apiGetTeams(hackathonIdOrSlug: string): Promise<TeamSummary[]> {
  const res = await fetch(`${frontendEnv.apiUrl}/hackathons/${hackathonIdOrSlug}/teams`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store'
  });

  const result = await handleResponse<{ teams: TeamSummary[] }>(res);
  return result.teams;
}

export async function apiGetTeam(hackathonIdOrSlug: string, teamId: string): Promise<TeamDetail> {
  const res = await fetch(`${frontendEnv.apiUrl}/hackathons/${hackathonIdOrSlug}/teams/${teamId}`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store'
  });

  const result = await handleResponse<{ team: TeamDetail }>(res);
  return result.team;
}

export async function apiGetMyTeam(hackathonIdOrSlug: string): Promise<TeamDetail | null> {
  const res = await fetch(`${frontendEnv.apiUrl}/hackathons/${hackathonIdOrSlug}/my-team`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store'
  });

  const result = await handleResponse<{ team: TeamDetail | null }>(res);
  return result.team;
}

export async function apiCreateTeam(hackathonIdOrSlug: string, data: CreateTeamRequest): Promise<TeamDetail> {
  const res = await fetch(`${frontendEnv.apiUrl}/hackathons/${hackathonIdOrSlug}/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });

  const result = await handleResponse<{ team: TeamDetail }>(res);
  return result.team;
}

export async function apiJoinTeam(
  hackathonIdOrSlug: string,
  teamId: string,
  data: JoinTeamRequest
): Promise<TeamDetail> {
  const res = await fetch(`${frontendEnv.apiUrl}/hackathons/${hackathonIdOrSlug}/teams/${teamId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });

  const result = await handleResponse<{ team: TeamDetail }>(res);
  return result.team;
}

export async function apiUpdateTeam(
  hackathonIdOrSlug: string,
  teamId: string,
  data: UpdateTeamRequest
): Promise<TeamDetail> {
  const res = await fetch(`${frontendEnv.apiUrl}/hackathons/${hackathonIdOrSlug}/teams/${teamId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });

  const result = await handleResponse<{ team: TeamDetail }>(res);
  return result.team;
}

export async function apiLeaveTeam(hackathonIdOrSlug: string, teamId: string): Promise<{ message: string }> {
  const res = await fetch(`${frontendEnv.apiUrl}/hackathons/${hackathonIdOrSlug}/teams/${teamId}/leave`, {
    method: 'POST',
    credentials: 'include'
  });

  return await handleResponse<{ message: string }>(res);
}

export async function apiRemoveMember(
  hackathonIdOrSlug: string,
  teamId: string,
  userId: string
): Promise<{ message: string }> {
  const res = await fetch(`${frontendEnv.apiUrl}/hackathons/${hackathonIdOrSlug}/teams/${teamId}/members/${userId}`, {
    method: 'DELETE',
    credentials: 'include'
  });

  return await handleResponse<{ message: string }>(res);
}

export async function apiRegenerateInviteCode(
  hackathonIdOrSlug: string,
  teamId: string
): Promise<{ inviteCode: string }> {
  const res = await fetch(`${frontendEnv.apiUrl}/hackathons/${hackathonIdOrSlug}/teams/${teamId}/invite-code/regenerate`, {
    method: 'POST',
    credentials: 'include'
  });

  return await handleResponse<{ inviteCode: string }>(res);
}

export async function apiDisbandTeam(hackathonIdOrSlug: string, teamId: string): Promise<{ message: string }> {
  const res = await fetch(`${frontendEnv.apiUrl}/hackathons/${hackathonIdOrSlug}/teams/${teamId}`, {
    method: 'DELETE',
    credentials: 'include'
  });

  return await handleResponse<{ message: string }>(res);
}

// ==========================================
// SUBMISSION APIS
// ==========================================

export async function apiCreateSubmission(
  hackathonIdOrSlug: string,
  data: CreateSubmissionRequest
): Promise<SubmissionDetail> {
  const res = await fetch(`${frontendEnv.apiUrl}/hackathons/${hackathonIdOrSlug}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });

  return await handleResponse<SubmissionDetail>(res);
}

export async function apiGetMySubmission(hackathonIdOrSlug: string): Promise<SubmissionDetail | null> {
  const res = await fetch(`${frontendEnv.apiUrl}/hackathons/${hackathonIdOrSlug}/my-submission`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store'
  });

  if (res.status === 404) return null;
  return await handleResponse<SubmissionDetail | null>(res);
}

export async function apiGetHackathonSubmissions(hackathonIdOrSlug: string): Promise<SubmissionSummary[]> {
  const res = await fetch(`${frontendEnv.apiUrl}/hackathons/${hackathonIdOrSlug}/submissions`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store'
  });

  return await handleResponse<SubmissionSummary[]>(res);
}

export async function apiGetSubmission(id: string): Promise<SubmissionDetail> {
  const res = await fetch(`${frontendEnv.apiUrl}/submissions/${id}`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store'
  });

  return await handleResponse<SubmissionDetail>(res);
}

export async function apiUpdateSubmission(
  id: string,
  data: UpdateSubmissionRequest
): Promise<SubmissionDetail> {
  const res = await fetch(`${frontendEnv.apiUrl}/submissions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });

  return await handleResponse<SubmissionDetail>(res);
}

export async function apiSubmitProject(id: string): Promise<SubmissionDetail> {
  const res = await fetch(`${frontendEnv.apiUrl}/submissions/${id}/submit`, {
    method: 'POST',
    credentials: 'include'
  });

  return await handleResponse<SubmissionDetail>(res);
}

export async function apiUpdateSubmissionStatus(
  id: string,
  status: SubmissionStatus
): Promise<SubmissionDetail> {
  const res = await fetch(`${frontendEnv.apiUrl}/submissions/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
    credentials: 'include'
  });

  return await handleResponse<SubmissionDetail>(res);
}

// ==========================================
// PUBLIC GALLERY APIS
// ==========================================

export async function apiGetGallery(params?: GalleryQuery): Promise<GalleryResponse> {
  const query = new URLSearchParams();
  if (params?.hackathonId) query.set('hackathonId', params.hackathonId);
  if (params?.search) query.set('search', params.search);
  if (params?.technology) query.set('technology', params.technology);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const qs = query.toString();
  const url = `${frontendEnv.apiUrl}/gallery${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    method: 'GET',
    cache: 'no-store'
  });

  return await handleResponse<GalleryResponse>(res);
}

export async function apiGetGalleryProject(id: string): Promise<SubmissionDetail> {
  const res = await fetch(`${frontendEnv.apiUrl}/gallery/${id}`, {
    method: 'GET',
    cache: 'no-store'
  });

  return await handleResponse<SubmissionDetail>(res);
}
