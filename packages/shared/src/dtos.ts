import { UserRole, HackathonStatus, RegistrationStatus, SubmissionStatus, JudgeStatus, JudgeAssignmentStatus } from './enums';
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

// Submission DTOs
export interface CreateSubmissionRequest {
  title: string;
  tagline?: string;
  description: string;
  problemStatement?: string;
  solution?: string;
  technologyStack?: string[];
  repoUrl?: string;
  demoUrl?: string;
  demoVideoUrl?: string;
  presentationUrl?: string;
  coverImagePath?: string;
}

export interface UpdateSubmissionRequest {
  title?: string;
  tagline?: string;
  description?: string;
  problemStatement?: string;
  solution?: string;
  technologyStack?: string[];
  repoUrl?: string;
  demoUrl?: string;
  demoVideoUrl?: string;
  presentationUrl?: string;
  coverImagePath?: string;
}

export interface UpdateSubmissionStatusRequest {
  status: SubmissionStatus;
}

// Public Gallery DTOs
export interface GalleryQuery {
  hackathonId?: string;
  search?: string;
  technology?: string;
  page?: number;
  limit?: number;
}

export interface GalleryItem {
  id: string;
  hackathonId: string;
  hackathonName: string;
  hackathonSlug: string;
  teamId: string;
  teamName: string;
  title: string;
  tagline?: string;
  description: string;
  technologyStack: string[];
  repoUrl?: string;
  demoUrl?: string;
  coverImagePath?: string;
  status: SubmissionStatus;
  submittedAt?: string;
}

export interface GalleryResponse {
  items: GalleryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==========================================
// PHASE 6: JUDGE MANAGEMENT & ASSIGNMENTS DTOS
// ==========================================

export interface AddJudgeRequest {
  judgeId: string;
  status?: JudgeStatus;
}

export interface UpdateJudgeStatusRequest {
  status: JudgeStatus;
}

export interface UpdateJudgingConfigRequest {
  judgesPerSubmission: number;
}

export interface DeclareConflictRequest {
  judgeId: string;
  teamId?: string;
  submissionId?: string;
  reason: string;
}

export interface GenerateAssignmentsRequest {
  judgesPerSubmission?: number;
}

export interface FinalizeAssignmentsRequest {
  judgesPerSubmission?: number;
  forceRegenerate?: boolean;
  confirmRegenerate?: boolean;
}

// ==========================================
// PHASE 7: RUBRICS & JUDGE EVALUATIONS DTOS
// ==========================================

export interface RubricCriterionInput {
  id?: string;
  name: string;
  description: string;
  weightPercentage: number;
  maxPoints: number;
  displayOrder?: number;
}

export interface CreateRubricRequest {
  name: string;
  description?: string;
  isActive?: boolean;
  criteria: RubricCriterionInput[];
}

export interface UpdateRubricRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
  criteria?: RubricCriterionInput[];
}

export interface CriterionScoreInput {
  criterionId: string;
  score: number;
  feedback?: string;
}

export interface SaveEvaluationDraftRequest {
  scores: CriterionScoreInput[];
  feedback?: string;
}

export interface SubmitEvaluationRequest {
  scores: CriterionScoreInput[];
  feedback?: string;
}

// ==========================================
// PHASE 9: COMMUNITY VOTING DTOS
// ==========================================

export interface CastVoteRequest {
  // Body may be empty; submission identified by route param
}

export interface VotingWindowRequest {
  votingStart?: string | null;
  votingEnd?: string | null;
  votingEnabled: boolean;
}

// ==========================================
// PHASE 10: RESULTS DTOS
// ==========================================

export interface PublishResultsRequest {
  confirm: boolean;
}

export interface ExportFormat {
  format: 'csv' | 'json';
}
