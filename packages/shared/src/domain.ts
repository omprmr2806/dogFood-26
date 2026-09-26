import { UserRole, HackathonStatus, RegistrationStatus, SubmissionStatus, TeamMemberRole, TeamStatus, JudgeAssignmentStatus, JudgeStatus, EvaluationStatus } from './enums';

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export interface HackathonSummary {
  id: string;
  slug: string;
  name: string;
  shortDescription?: string;
  status: HackathonStatus;
  registrationStart?: string | null;
  registrationEnd?: string | null;
  eventStart?: string | null;
  eventEnd?: string | null;
  minTeamSize: number;
  maxTeamSize: number;
  registrationCount?: number;
  createdAt: string;
}

export interface HackathonDetail extends HackathonSummary {
  description: string;
  rules?: string | null;
  createdBy?: string | null;
  updatedAt: string;
}

export interface Registration {
  id: string;
  hackathonId: string;
  userId: string;
  status: RegistrationStatus;
  registeredAt: string;
  updatedAt: string;
}

export interface RegistrationDetail extends Registration {
  user: {
    id: string;
    email: string;
    fullName: string;
  };
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamMemberRole;
  fullName?: string;
  email?: string;
  joinedAt: string;
}

export interface TeamSummary {
  id: string;
  hackathonId: string;
  name: string;
  status: TeamStatus;
  leaderId: string;
  leaderName?: string;
  memberCount: number;
  createdAt: string;
}

export interface TeamDetail {
  id: string;
  hackathonId: string;
  name: string;
  status: TeamStatus;
  inviteCode?: string;
  leaderId: string;
  leaderName?: string;
  members: TeamMember[];
  memberCount: number;
  minTeamSize: number;
  maxTeamSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionSummary {
  id: string;
  hackathonId: string;
  teamId: string;
  teamName: string;
  title: string;
  tagline?: string;
  technologyStack: string[];
  status: SubmissionStatus;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionDetail {
  id: string;
  hackathonId: string;
  hackathonName?: string;
  hackathonSlug?: string;
  teamId: string;
  teamName: string;
  title: string;
  tagline?: string;
  description: string;
  problemStatement?: string;
  solution?: string;
  technologyStack: string[];
  repoUrl?: string;
  demoUrl?: string;
  demoVideoUrl?: string;
  presentationUrl?: string;
  coverImagePath?: string;
  status: SubmissionStatus;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
  members?: { id: string; fullName: string; role?: string }[];
}

export interface SubmissionVersion {
  id: string;
  submissionId: string;
  versionNumber: number;
  snapshotData: Record<string, unknown>;
  createdBy?: string;
  createdAt: string;
}

// ==========================================
// PHASE 6: JUDGE MANAGEMENT & ASSIGNMENTS
// ==========================================

export interface HackathonJudge {
  id: string;
  hackathonId: string;
  judgeId: string;
  judgeEmail: string;
  judgeFullName: string;
  status: JudgeStatus;
  assignedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface JudgingConfig {
  hackathonId: string;
  judgesPerSubmission: number;
  assignmentsFinalized: boolean;
  finalizedAt?: string;
  updatedAt: string;
}

export interface JudgeConflict {
  id: string;
  hackathonId: string;
  judgeId: string;
  judgeName?: string;
  teamId?: string;
  teamName?: string;
  submissionId?: string;
  submissionTitle?: string;
  reason: string;
  createdAt: string;
}

export interface JudgeAssignmentItem {
  id: string;
  hackathonId: string;
  hackathonName?: string;
  submissionId: string;
  submissionTitle: string;
  submissionTagline?: string;
  teamId: string;
  teamName: string;
  judgeId: string;
  judgeName: string;
  status: JudgeAssignmentStatus;
  isFinal: boolean;
  assignedAt: string;
  finalizedAt?: string;
  repoUrl?: string;
  demoUrl?: string;
}

export interface AssignmentPreviewResult {
  totalEligibleSubmissions: number;
  totalActiveJudges: number;
  judgesPerSubmission: number;
  totalAssignments: number;
  assignments: JudgeAssignmentItem[];
  workloadDistribution: { judgeId: string; judgeName: string; count: number }[];
  conflictsAvoided: number;
  unassignableSubmissions: {
    submissionId: string;
    title: string;
    assignedCount: number;
    reason: string;
  }[];
}

// ==========================================
// PHASE 7: RUBRICS & JUDGE EVALUATIONS
// ==========================================

export interface RubricCriterion {
  id: string;
  rubricId: string;
  name: string;
  description: string;
  weightPercentage: number;
  maxPoints: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Rubric {
  id: string;
  hackathonId: string;
  name: string;
  description?: string;
  isActive: boolean;
  criteria: RubricCriterion[];
  createdAt: string;
  updatedAt: string;
}

export interface CriterionScore {
  id: string;
  evaluationId: string;
  criterionId: string;
  criterionName?: string;
  score: number;
  maxPoints?: number;
  weightPercentage?: number;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JudgeEvaluation {
  id: string;
  hackathonId: string;
  assignmentId: string;
  submissionId: string;
  submissionTitle?: string;
  judgeId: string;
  judgeName?: string;
  rubricId: string;
  rawWeightedScore: number;
  feedback?: string;
  status: EvaluationStatus;
  criterionScores: CriterionScore[];
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizerJudgingMonitor {
  hackathonId: string;
  totalAssignments: number;
  completedEvaluations: number;
  draftEvaluations: number;
  pendingEvaluations: number;
  completionPercentage: number;
  judgeProgress: {
    judgeId: string;
    judgeName: string;
    assignedCount: number;
    completedCount: number;
    completionPercentage: number;
  }[];
  submissionProgress: {
    submissionId: string;
    submissionTitle: string;
    assignedCount: number;
    completedCount: number;
    completionPercentage: number;
  }[];
}
