import {
  JudgeStatus,
  JudgeAssignmentStatus,
  HackathonStatus,
  UserRole,
  HackathonJudge,
  JudgingConfig,
  JudgeConflict,
  JudgeAssignmentItem,
  AssignmentPreviewResult,
  AddJudgeRequest,
  UpdateJudgeStatusRequest,
  UpdateJudgingConfigRequest,
  DeclareConflictRequest,
  GenerateAssignmentsRequest,
  FinalizeAssignmentsRequest
} from '@dogfood/shared';
import {
  judgeRepository,
  HackathonJudgeWithDetails,
  JudgingConfigEntity,
  JudgeConflictEntity,
  JudgeAssignmentWithDetails
} from '../repositories/judge.repository';
import { judgeAssignmentService } from './judge-assignment.service';
import { userRepository } from '../repositories/user.repository';
import { teamRepository } from '../repositories/team.repository';
import { submissionRepository } from '../repositories/submission.repository';
import { hackathonService } from './hackathon.service';
import { auditRepository } from '../repositories/audit.repository';
import { AppError } from '../middleware/errorHandler';

export class JudgeService {
  // Helper: map DB judge to DTO
  private mapJudgeToDto(j: HackathonJudgeWithDetails): HackathonJudge {
    return {
      id: j.id,
      hackathonId: j.hackathon_id,
      judgeId: j.judge_id,
      judgeEmail: j.email,
      judgeFullName: j.full_name,
      status: j.status,
      assignedCount: j.assignment_count,
      createdAt: j.created_at,
      updatedAt: j.updated_at
    };
  }

  // Helper: map DB config to DTO
  private mapConfigToDto(c: JudgingConfigEntity): JudgingConfig {
    return {
      hackathonId: c.hackathon_id,
      judgesPerSubmission: c.judges_per_submission,
      assignmentsFinalized: c.assignments_finalized,
      finalizedAt: c.finalized_at || undefined,
      updatedAt: c.updated_at
    };
  }

  // Helper: map DB conflict to DTO
  private mapConflictToDto(c: JudgeConflictEntity): JudgeConflict {
    return {
      id: c.id,
      hackathonId: c.hackathon_id,
      judgeId: c.judge_id,
      judgeName: c.judge_name,
      teamId: c.team_id || undefined,
      teamName: c.team_name,
      submissionId: c.submission_id || undefined,
      submissionTitle: c.submission_title,
      reason: c.reason,
      createdAt: c.created_at
    };
  }

  // Helper: map DB assignment to DTO
  private mapAssignmentToDto(a: JudgeAssignmentWithDetails): JudgeAssignmentItem {
    return {
      id: a.id,
      hackathonId: a.hackathon_id,
      hackathonName: a.hackathon_name,
      submissionId: a.submission_id,
      submissionTitle: a.submission_title,
      submissionTagline: a.submission_tagline || undefined,
      teamId: a.team_id,
      teamName: a.team_name,
      judgeId: a.judge_id,
      judgeName: a.judge_name || 'Panel Judge',
      status: a.status,
      isFinal: a.is_final,
      assignedAt: a.assigned_at,
      finalizedAt: a.finalized_at || undefined,
      repoUrl: a.repo_url || undefined,
      demoUrl: a.demo_url || undefined
    };
  }

  private async getHackathon(hackathonIdOrSlug: string): Promise<any> {
    return hackathonService.getHackathonByIdOrSlug(hackathonIdOrSlug, UserRole.ORGANIZER);
  }

  // ==========================================
  // JUDGE POOL MANAGEMENT
  // ==========================================

  async listJudges(hackathonIdOrSlug: string): Promise<HackathonJudge[]> {
    const hackathon = await this.getHackathon(hackathonIdOrSlug);
    const judges = await judgeRepository.listJudgesForHackathon(hackathon.id);
    return judges.map((j) => this.mapJudgeToDto(j));
  }

  async getAvailableJudges(hackathonIdOrSlug: string): Promise<{
    availableUsers: Array<{ id: string; email: string; fullName: string; isEnrolled: boolean }>;
  }> {
    const hackathon = await this.getHackathon(hackathonIdOrSlug);
    const allJudges = await userRepository.findByRole(UserRole.JUDGE);
    const enrolled = await judgeRepository.listJudgesForHackathon(hackathon.id);
    const enrolledIds = new Set(enrolled.map((e) => e.judge_id));

    return {
      availableUsers: allJudges.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.full_name,
        isEnrolled: enrolledIds.has(u.id)
      }))
    };
  }

  async addJudge(
    hackathonIdOrSlug: string,
    data: AddJudgeRequest,
    actorId: string,
    ipAddress?: string
  ): Promise<HackathonJudge> {
    const hackathon = await this.getHackathon(hackathonIdOrSlug);

    // Guard: Hackathon state
    if (hackathon.status === HackathonStatus.COMPLETED || hackathon.status === HackathonStatus.ARCHIVED) {
      throw new AppError(
        `Cannot add judges to a hackathon in ${hackathon.status} status.`,
        400,
        'INVALID_EVENT_STATE'
      );
    }

    // Verify judge user exists and has JUDGE role
    const user = await userRepository.findById(data.judgeId);
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }
    if (user.role !== UserRole.JUDGE) {
      throw new AppError('User does not have the JUDGE role.', 400, 'USER_NOT_A_JUDGE');
    }

    // Check if assignments already finalized
    const config = await judgeRepository.getJudgingConfig(hackathon.id);
    if (config?.assignments_finalized) {
      // Adding judge is allowed, but note that assignments are finalized
    }

    const saved = await judgeRepository.addJudgeToHackathon(
      hackathon.id,
      data.judgeId,
      data.status || JudgeStatus.ACTIVE
    );

    // Audit log
    await auditRepository.logAuditEvent({
      userId: actorId,
      action: 'JUDGE_ADDED',
      entityType: 'HACKATHON_JUDGE',
      entityId: saved.id,
      metadata: { hackathonId: hackathon.id, judgeId: data.judgeId, status: data.status || JudgeStatus.ACTIVE },
      ipAddress
    });

    return {
      id: saved.id,
      hackathonId: saved.hackathon_id,
      judgeId: saved.judge_id,
      judgeEmail: user.email,
      judgeFullName: user.full_name,
      status: saved.status,
      assignedCount: 0,
      createdAt: saved.created_at,
      updatedAt: saved.updated_at
    };
  }

  async updateJudgeStatus(
    hackathonIdOrSlug: string,
    judgeId: string,
    data: UpdateJudgeStatusRequest,
    actorId: string,
    ipAddress?: string
  ): Promise<HackathonJudge> {
    const hackathon = await this.getHackathon(hackathonIdOrSlug);

    const existing = await judgeRepository.getJudgeByHackathonAndUser(hackathon.id, judgeId);
    if (!existing) {
      throw new AppError('Judge is not registered for this hackathon.', 404, 'JUDGE_NOT_FOUND');
    }

    const updated = await judgeRepository.updateJudgeStatus(hackathon.id, judgeId, data.status);
    if (!updated) {
      throw new AppError('Failed to update judge status.', 500, 'UPDATE_FAILED');
    }

    const user = await userRepository.findById(judgeId);

    // Audit log
    const auditAction = data.status === JudgeStatus.ACTIVE ? 'JUDGE_ACTIVATED' : 'JUDGE_DEACTIVATED';
    await auditRepository.logAuditEvent({
      userId: actorId,
      action: auditAction,
      entityType: 'HACKATHON_JUDGE',
      entityId: updated.id,
      metadata: { hackathonId: hackathon.id, judgeId, oldStatus: existing.status, newStatus: data.status },
      ipAddress
    });

    return {
      id: updated.id,
      hackathonId: updated.hackathon_id,
      judgeId: updated.judge_id,
      judgeEmail: user?.email || '',
      judgeFullName: user?.full_name || '',
      status: updated.status,
      assignedCount: 0,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at
    };
  }

  async removeJudge(
    hackathonIdOrSlug: string,
    judgeId: string,
    actorId: string,
    ipAddress?: string
  ): Promise<void> {
    const hackathon = await this.getHackathon(hackathonIdOrSlug);

    // Guard: Hackathon state
    if (hackathon.status === HackathonStatus.COMPLETED || hackathon.status === HackathonStatus.ARCHIVED) {
      throw new AppError(
        `Cannot remove judges from a hackathon in ${hackathon.status} status.`,
        400,
        'INVALID_EVENT_STATE'
      );
    }

    // Check if assignments already finalized
    const config = await judgeRepository.getJudgingConfig(hackathon.id);
    if (config?.assignments_finalized) {
      throw new AppError(
        'Cannot remove judge after assignments have been finalized. Please regenerate assignments first.',
        400,
        'ASSIGNMENTS_ALREADY_FINALIZED'
      );
    }

    const existing = await judgeRepository.getJudgeByHackathonAndUser(hackathon.id, judgeId);
    if (!existing) {
      throw new AppError('Judge is not registered for this hackathon.', 404, 'JUDGE_NOT_FOUND');
    }

    await judgeRepository.removeJudgeFromHackathon(hackathon.id, judgeId);

    // Audit log
    await auditRepository.logAuditEvent({
      userId: actorId,
      action: 'JUDGE_REMOVED',
      entityType: 'HACKATHON_JUDGE',
      entityId: existing.id,
      metadata: { hackathonId: hackathon.id, judgeId },
      ipAddress
    });
  }

  // ==========================================
  // JUDGING CONFIGURATION
  // ==========================================

  async getJudgingConfig(hackathonIdOrSlug: string): Promise<JudgingConfig> {
    const hackathon = await this.getHackathon(hackathonIdOrSlug);
    let config = await judgeRepository.getJudgingConfig(hackathon.id);
    if (!config) {
      config = await judgeRepository.upsertJudgingConfig(hackathon.id, 2);
    }
    return this.mapConfigToDto(config);
  }

  async updateJudgingConfig(
    hackathonIdOrSlug: string,
    data: UpdateJudgingConfigRequest,
    actorId: string,
    ipAddress?: string
  ): Promise<JudgingConfig> {
    const hackathon = await this.getHackathon(hackathonIdOrSlug);

    if (hackathon.status === HackathonStatus.COMPLETED || hackathon.status === HackathonStatus.ARCHIVED) {
      throw new AppError(
        `Cannot update judging config for hackathon in ${hackathon.status} status.`,
        400,
        'INVALID_EVENT_STATE'
      );
    }

    const activeJudges = (await judgeRepository.listJudgesForHackathon(hackathon.id)).filter(
      (j) => j.status === JudgeStatus.ACTIVE
    );

    if (activeJudges.length > 0 && data.judgesPerSubmission > activeJudges.length) {
      throw new AppError(
        `Judges per submission (${data.judgesPerSubmission}) cannot exceed active judge pool size (${activeJudges.length}).`,
        400,
        'CONFIG_EXCEEDS_JUDGE_POOL'
      );
    }

    const updated = await judgeRepository.upsertJudgingConfig(hackathon.id, data.judgesPerSubmission);

    await auditRepository.logAuditEvent({
      userId: actorId,
      action: 'JUDGING_CONFIG_UPDATED',
      entityType: 'JUDGING_CONFIG',
      entityId: hackathon.id,
      metadata: { hackathonId: hackathon.id, judgesPerSubmission: data.judgesPerSubmission },
      ipAddress
    });

    return this.mapConfigToDto(updated);
  }

  // ==========================================
  // CONFLICT OF INTEREST
  // ==========================================

  async listConflicts(hackathonIdOrSlug: string): Promise<JudgeConflict[]> {
    const hackathon = await this.getHackathon(hackathonIdOrSlug);
    const conflicts = await judgeRepository.listConflictsForHackathon(hackathon.id);
    return conflicts.map((c) => this.mapConflictToDto(c));
  }

  async declareConflict(
    hackathonIdOrSlug: string,
    data: DeclareConflictRequest,
    actorId: string,
    ipAddress?: string
  ): Promise<JudgeConflict> {
    const hackathon = await this.getHackathon(hackathonIdOrSlug);

    // Verify judge is part of hackathon
    const judge = await judgeRepository.getJudgeByHackathonAndUser(hackathon.id, data.judgeId);
    if (!judge) {
      throw new AppError('Judge is not enrolled in this hackathon.', 404, 'JUDGE_NOT_FOUND');
    }

    // Verify team or submission belongs to hackathon if provided
    if (data.teamId) {
      const team = await teamRepository.findTeamById(data.teamId);
      if (!team || team.hackathon_id !== hackathon.id) {
        throw new AppError('Team does not belong to this hackathon.', 400, 'INVALID_TEAM');
      }
    }

    if (data.submissionId) {
      const submission = await submissionRepository.findById(data.submissionId);
      if (!submission || submission.hackathon_id !== hackathon.id) {
        throw new AppError('Submission does not belong to this hackathon.', 400, 'INVALID_SUBMISSION');
      }
    }

    const conflict = await judgeRepository.declareConflict({
      hackathonId: hackathon.id,
      judgeId: data.judgeId,
      teamId: data.teamId,
      submissionId: data.submissionId,
      reason: data.reason
    });

    return this.mapConflictToDto(conflict);
  }

  async removeConflict(
    hackathonIdOrSlug: string,
    conflictId: string,
    actorId: string,
    ipAddress?: string
  ): Promise<void> {
    const hackathon = await this.getHackathon(hackathonIdOrSlug);
    const removed = await judgeRepository.removeConflict(conflictId, hackathon.id);
    if (!removed) {
      throw new AppError('Conflict record not found.', 404, 'CONFLICT_NOT_FOUND');
    }
  }

  // ==========================================
  // ASSIGNMENT GENERATION: PREVIEW & FINALIZE
  // ==========================================

  private async prepareEngineInput(
    hackathonId: string,
    judgesPerSubmissionOverride?: number
  ) {
    // 1. Get configuration
    let config = await judgeRepository.getJudgingConfig(hackathonId);
    const k = judgesPerSubmissionOverride ?? (config?.judges_per_submission || 2);

    // 2. Load judges
    const judgesList = await judgeRepository.listJudgesForHackathon(hackathonId);
    const engineJudges = judgesList.map((j) => ({
      id: j.judge_id,
      fullName: j.full_name,
      email: j.email,
      status: j.status
    }));

    // 3. Load eligible submissions (SUBMITTED, LOCKED, UNDER_REVIEW, FINALIZED)
    const allSubs = await submissionRepository.findByHackathonId(hackathonId);
    const eligibleSubs = allSubs.filter((s) =>
      ['SUBMITTED', 'LOCKED', 'UNDER_REVIEW', 'FINALIZED'].includes(s.status)
    );
    const engineSubmissions = eligibleSubs.map((s) => ({
      id: s.id,
      title: s.title,
      teamId: s.team_id
    }));

    // 4. Load team memberships
    const teamMembers = await teamRepository.getTeamMembersForHackathon(hackathonId);
    const engineMemberships = teamMembers.map((m) => ({
      teamId: m.team_id,
      userId: m.user_id
    }));

    // 5. Load explicit conflicts
    const conflicts = await judgeRepository.listConflictsForHackathon(hackathonId);
    const engineConflicts = conflicts.map((c) => ({
      judgeId: c.judge_id,
      teamId: c.team_id,
      submissionId: c.submission_id,
      reason: c.reason
    }));

    return {
      hackathonId,
      judgesPerSubmission: k,
      judges: engineJudges,
      submissions: engineSubmissions,
      teamMemberships: engineMemberships,
      conflicts: engineConflicts
    };
  }

  async generateAssignmentPreview(
    hackathonIdOrSlug: string,
    data?: GenerateAssignmentsRequest,
    actorId?: string,
    ipAddress?: string
  ): Promise<AssignmentPreviewResult> {
    const hackathon = await this.getHackathon(hackathonIdOrSlug);

    const engineInput = await this.prepareEngineInput(hackathon.id, data?.judgesPerSubmission);
    const result = judgeAssignmentService.execute(engineInput);

    if (actorId) {
      await auditRepository.logAuditEvent({
        userId: actorId,
        action: 'ASSIGNMENTS_PREVIEW_GENERATED',
        entityType: 'JUDGE_ASSIGNMENTS',
        entityId: hackathon.id,
        metadata: {
          hackathonId: hackathon.id,
          totalSubmissions: result.totalSubmissions,
          totalAssignments: result.totalAssignments,
          success: result.success
        },
        ipAddress
      });
    }

    // Map to AssignmentPreviewResult
    const mappedAssignments: JudgeAssignmentItem[] = result.assignments.map((a, idx) => ({
      id: `preview-${idx + 1}`,
      hackathonId: a.hackathonId,
      submissionId: a.submissionId,
      submissionTitle: a.submissionTitle,
      teamId: '',
      teamName: '',
      judgeId: a.judgeId,
      judgeName: a.judgeName,
      status: JudgeAssignmentStatus.ASSIGNED,
      isFinal: false,
      assignedAt: new Date().toISOString()
    }));

    const activeJudgesCount = engineInput.judges.filter((j) => j.status === JudgeStatus.ACTIVE).length;

    return {
      totalEligibleSubmissions: result.totalSubmissions,
      totalActiveJudges: activeJudgesCount,
      judgesPerSubmission: engineInput.judgesPerSubmission,
      totalAssignments: result.totalAssignments,
      assignments: mappedAssignments,
      workloadDistribution: result.workloadStats.map((w) => ({
        judgeId: w.judgeId,
        judgeName: w.judgeName,
        count: w.assignmentCount
      })),
      conflictsAvoided: result.conflictsEncountered.length,
      unassignableSubmissions: result.unassignableSubmissions.map((u) => ({
        submissionId: u.submissionId,
        title: u.submissionTitle,
        assignedCount: u.availableJudgesCount,
        reason: u.reason
      }))
    };
  }

  async finalizeAssignments(
    hackathonIdOrSlug: string,
    data: FinalizeAssignmentsRequest,
    actorId: string,
    ipAddress?: string
  ): Promise<{ success: boolean; totalAssignments: number; message: string }> {
    const hackathon = await this.getHackathon(hackathonIdOrSlug);

    // 1. Guard event state: allowed during RUNNING or JUDGING
    if (
      hackathon.status !== HackathonStatus.RUNNING &&
      hackathon.status !== HackathonStatus.JUDGING
    ) {
      throw new AppError(
        `Judge assignments can only be finalized while hackathon is in RUNNING or JUDGING status (currently ${hackathon.status}).`,
        400,
        'INVALID_EVENT_STATE'
      );
    }

    // 2. Check if already finalized
    const config = await judgeRepository.getJudgingConfig(hackathon.id);
    const wasAlreadyFinalized = config?.assignments_finalized;

    if (wasAlreadyFinalized && !data.forceRegenerate) {
      throw new AppError(
        'Assignments have already been finalized. To replace official assignments, you must explicitly confirm regeneration.',
        409,
        'ASSIGNMENTS_ALREADY_FINALIZED'
      );
    }

    // 3. Prepare engine input
    const engineInput = await this.prepareEngineInput(hackathon.id, data.judgesPerSubmission);
    const result = judgeAssignmentService.execute(engineInput);

    if (!result.success) {
      throw new AppError(
        `Cannot finalize assignments: ${result.error || 'Unassignable submissions detected'}`,
        400,
        'ASSIGNMENT_GENERATION_FAILED'
      );
    }

    // 4. Atomically persist assignments via transaction
    const finalAssignments = result.assignments.map((a) => ({
      submissionId: a.submissionId,
      judgeId: a.judgeId,
      hackathonId: hackathon.id
    }));

    const persistedCount = await judgeRepository.finalizeAssignmentsTransaction(
      hackathon.id,
      finalAssignments,
      engineInput.judgesPerSubmission
    );

    // 5. Audit log
    const auditAction = wasAlreadyFinalized ? 'ASSIGNMENTS_REGENERATED' : 'ASSIGNMENTS_FINALIZED';
    await auditRepository.logAuditEvent({
      userId: actorId,
      action: auditAction,
      entityType: 'JUDGE_ASSIGNMENTS',
      entityId: hackathon.id,
      metadata: {
        hackathonId: hackathon.id,
        persistedCount,
        judgesPerSubmission: engineInput.judgesPerSubmission,
        wasAlreadyFinalized
      },
      ipAddress
    });

    return {
      success: true,
      totalAssignments: persistedCount,
      message: `Successfully finalized ${persistedCount} assignments across ${result.totalSubmissions} submissions.`
    };
  }

  // ==========================================
  // ASSIGNMENT INSPECTION
  // ==========================================

  async listAssignmentsForHackathon(
    hackathonIdOrSlug: string,
    actorRole: UserRole
  ): Promise<JudgeAssignmentItem[]> {
    if (actorRole !== UserRole.ADMIN && actorRole !== UserRole.ORGANIZER) {
      throw new AppError('Only organizers and administrators can inspect all assignments.', 403, 'FORBIDDEN');
    }
    const hackathon = await this.getHackathon(hackathonIdOrSlug);
    const assignments = await judgeRepository.listAssignmentsForHackathon(hackathon.id);
    return assignments.map((a) => this.mapAssignmentToDto(a));
  }

  async getMyJudgeAssignments(
    hackathonIdOrSlug: string,
    judgeUserId: string
  ): Promise<{ assignments: JudgeAssignmentItem[]; stats: { total: number; completed: number; pending: number } }> {
    const hackathon = await this.getHackathon(hackathonIdOrSlug);

    // Verify judge is enrolled and active
    const judge = await judgeRepository.getJudgeByHackathonAndUser(hackathon.id, judgeUserId);
    if (!judge || judge.status !== JudgeStatus.ACTIVE) {
      throw new AppError('You are not an active judge for this hackathon.', 403, 'NOT_ACTIVE_JUDGE');
    }

    const assignments = await judgeRepository.listAssignmentsForJudge(hackathon.id, judgeUserId);
    const dtos = assignments.map((a) => this.mapAssignmentToDto(a));

    const completed = dtos.filter((a) => a.status === JudgeAssignmentStatus.COMPLETED).length;
    const pending = dtos.length - completed;

    return {
      assignments: dtos,
      stats: {
        total: dtos.length,
        completed,
        pending
      }
    };
  }

  async getMyAssignmentDetail(
    hackathonIdOrSlug: string,
    assignmentId: string,
    judgeUserId: string
  ): Promise<JudgeAssignmentWithDetails> {
    const hackathon = await this.getHackathon(hackathonIdOrSlug);

    const assignment = await judgeRepository.getAssignmentById(assignmentId);
    if (!assignment || assignment.hackathon_id !== hackathon.id) {
      throw new AppError('Assignment not found.', 404, 'ASSIGNMENT_NOT_FOUND');
    }

    // STRICT IDOR: Judge can only see their own assignment
    if (assignment.judge_id !== judgeUserId) {
      throw new AppError('You are not authorized to view another judge\'s assignment.', 403, 'FORBIDDEN');
    }

    return assignment;
  }
}

export const judgeService = new JudgeService();
