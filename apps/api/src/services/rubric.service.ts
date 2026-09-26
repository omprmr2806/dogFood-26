import {
  UserRole,
  HackathonStatus,
  EvaluationStatus,
  Rubric,
  JudgeEvaluation,
  OrganizerJudgingMonitor,
  CreateRubricRequest,
  UpdateRubricRequest,
  SaveEvaluationDraftRequest,
  SubmitEvaluationRequest,
  CriterionScoreInput
} from '@dogfood/shared';
import { rubricRepository } from '../repositories/rubric.repository';
import { judgeRepository, JudgeAssignmentWithDetails } from '../repositories/judge.repository';
import { hackathonService } from './hackathon.service';
import { auditRepository } from '../repositories/audit.repository';
import { AppError } from '../middleware/errorHandler';

export class RubricService {
  /**
   * Fetch active rubric for a hackathon
   */
  async getActiveRubric(hackathonId: string): Promise<Rubric> {
    const rubric = await rubricRepository.findActiveRubricByHackathonId(hackathonId);
    if (!rubric) {
      throw new AppError(`No active judging rubric found for hackathon ${hackathonId}`, 404, 'RUBRIC_NOT_FOUND');
    }
    return rubric;
  }

  /**
   * Fetch rubric by ID
   */
  async getRubricById(id: string): Promise<Rubric> {
    const rubric = await rubricRepository.findRubricById(id);
    if (!rubric) {
      throw new AppError(`Rubric ${id} not found`, 404, 'RUBRIC_NOT_FOUND');
    }
    return rubric;
  }

  /**
   * Create new rubric (Organizer or Admin only)
   */
  async createRubric(
    userId: string,
    userRole: UserRole,
    hackathonId: string,
    data: CreateRubricRequest
  ): Promise<Rubric> {
    if (userRole !== UserRole.ORGANIZER && userRole !== UserRole.ADMIN) {
      throw new AppError('Only organizers or administrators can configure rubrics', 403, 'FORBIDDEN');
    }

    const hackathon = await hackathonService.getHackathonByIdOrSlug(hackathonId, userRole);
    if (!hackathon) {
      throw new AppError(`Hackathon ${hackathonId} not found`, 404, 'HACKATHON_NOT_FOUND');
    }

    this.validateCriteria(data.criteria);

    const rubric = await rubricRepository.createRubric(
      hackathonId,
      data.name,
      data.description,
      data.isActive ?? true,
      data.criteria
    );

    await auditRepository.logAuditEvent({
      userId,
      action: 'RUBRIC_CREATED',
      entityType: 'RUBRIC',
      entityId: rubric.id,
      metadata: { hackathonId, name: rubric.name, criteriaCount: rubric.criteria.length }
    });

    return rubric;
  }

  /**
   * Update rubric (Organizer or Admin only)
   */
  async updateRubric(
    userId: string,
    userRole: UserRole,
    rubricId: string,
    data: UpdateRubricRequest
  ): Promise<Rubric> {
    if (userRole !== UserRole.ORGANIZER && userRole !== UserRole.ADMIN) {
      throw new AppError('Only organizers or administrators can modify rubrics', 403, 'FORBIDDEN');
    }

    const existing = await rubricRepository.findRubricById(rubricId);
    if (!existing) {
      throw new AppError(`Rubric ${rubricId} not found`, 404, 'RUBRIC_NOT_FOUND');
    }

    if (data.criteria && data.criteria.length > 0) {
      this.validateCriteria(data.criteria);
    }

    const updated = await rubricRepository.updateRubric(
      rubricId,
      data.name,
      data.description,
      data.isActive,
      data.criteria
    );

    await auditRepository.logAuditEvent({
      userId,
      action: 'RUBRIC_UPDATED',
      entityType: 'RUBRIC',
      entityId: rubricId,
      metadata: { name: updated.name, isActive: updated.isActive }
    });

    return updated;
  }

  /**
   * Retrieve evaluation console payload for an assignment
   */
  async getEvaluationForAssignment(
    currentUser: { id: string; role: UserRole },
    assignmentId: string
  ): Promise<{
    assignment: JudgeAssignmentWithDetails;
    rubric: Rubric;
    evaluation: JudgeEvaluation | null;
  }> {
    const assignment = await judgeRepository.getAssignmentById(assignmentId);
    if (!assignment) {
      throw new AppError(`Assignment ${assignmentId} not found`, 404, 'ASSIGNMENT_NOT_FOUND');
    }

    // IDOR Enforcement: Judge can only view their own assigned projects
    if (currentUser.role === UserRole.JUDGE && assignment.judge_id !== currentUser.id) {
      throw new AppError('Access denied: You can only view and evaluate projects assigned to you', 403, 'FORBIDDEN');
    }

    // Participants cannot access evaluation console
    if (currentUser.role === UserRole.PARTICIPANT) {
      throw new AppError('Participants are not permitted to access judge evaluation endpoints', 403, 'FORBIDDEN');
    }

    const rubric = await this.getActiveRubric(assignment.hackathon_id);
    const evaluation = await rubricRepository.findEvaluationByAssignmentId(assignmentId);

    return {
      assignment,
      rubric,
      evaluation
    };
  }

  /**
   * Save Evaluation Draft
   */
  async saveEvaluationDraft(
    currentUser: { id: string; role: UserRole },
    assignmentId: string,
    data: SaveEvaluationDraftRequest
  ): Promise<JudgeEvaluation> {
    const { assignment, rubric } = await this.validateJudgeAccess(currentUser, assignmentId);

    const existing = await rubricRepository.findEvaluationByAssignmentId(assignmentId);
    if (existing && existing.status === EvaluationStatus.LOCKED) {
      throw new AppError('This evaluation has been locked and cannot be modified', 403, 'EVALUATION_LOCKED');
    }
    if (existing && existing.status === EvaluationStatus.SUBMITTED && currentUser.role === UserRole.JUDGE) {
      throw new AppError('Evaluation is already submitted. Contact an organizer if revisions are necessary.', 400, 'ALREADY_SUBMITTED');
    }

    const rawWeightedScore = this.calculateWeightedScore(rubric, data.scores);

    const saved = await rubricRepository.saveEvaluation({
      hackathonId: assignment.hackathon_id,
      assignmentId,
      submissionId: assignment.submission_id,
      judgeId: assignment.judge_id,
      rubricId: rubric.id,
      rawWeightedScore,
      feedback: data.feedback,
      status: EvaluationStatus.DRAFT,
      scores: data.scores
    });

    await auditRepository.logAuditEvent({
      userId: currentUser.id,
      action: 'EVALUATION_DRAFT_SAVED',
      entityType: 'JUDGE_EVALUATION',
      entityId: saved.id,
      metadata: { assignmentId, submissionId: assignment.submission_id, rawWeightedScore }
    });

    return saved;
  }

  /**
   * Submit Evaluation Final
   */
  async submitEvaluation(
    currentUser: { id: string; role: UserRole },
    assignmentId: string,
    data: SubmitEvaluationRequest
  ): Promise<JudgeEvaluation> {
    const { assignment, rubric } = await this.validateJudgeAccess(currentUser, assignmentId);

    const existing = await rubricRepository.findEvaluationByAssignmentId(assignmentId);
    if (existing && (existing.status === EvaluationStatus.SUBMITTED || existing.status === EvaluationStatus.LOCKED)) {
      if (currentUser.role === UserRole.JUDGE) {
        throw new AppError('Evaluation is already submitted and locked against casual editing', 400, 'ALREADY_SUBMITTED');
      }
    }

    // Ensure all criteria are scored
    const providedCriterionIds = new Set(data.scores.map(s => s.criterionId));
    for (const c of rubric.criteria) {
      if (!providedCriterionIds.has(c.id)) {
        throw new AppError(`Missing score for required rubric criterion: "${c.name}"`, 400, 'MISSING_CRITERION_SCORE');
      }
    }

    // Prevent duplicate criterion scores
    if (data.scores.length !== providedCriterionIds.size) {
      throw new AppError('Duplicate criterion scores are not allowed in evaluation submission', 400, 'DUPLICATE_CRITERIA');
    }

    // Enforce score range per criterion
    for (const s of data.scores) {
      const criterion = rubric.criteria.find(c => c.id === s.criterionId);
      if (!criterion) {
        throw new AppError(`Invalid criterion ID: ${s.criterionId} does not belong to active rubric`, 400, 'INVALID_CRITERION');
      }
      if (s.score < 0 || s.score > criterion.maxPoints) {
        throw new AppError(
          `Score ${s.score} for criterion "${criterion.name}" is out of bounds (0 - ${criterion.maxPoints})`,
          400,
          'INVALID_SCORE_RANGE'
        );
      }
    }

    // Calculate raw weighted score strictly server-side
    const rawWeightedScore = this.calculateWeightedScore(rubric, data.scores);

    const submitted = await rubricRepository.saveEvaluation({
      hackathonId: assignment.hackathon_id,
      assignmentId,
      submissionId: assignment.submission_id,
      judgeId: assignment.judge_id,
      rubricId: rubric.id,
      rawWeightedScore,
      feedback: data.feedback,
      status: EvaluationStatus.SUBMITTED,
      scores: data.scores
    });

    await auditRepository.logAuditEvent({
      userId: currentUser.id,
      action: 'EVALUATION_SUBMITTED',
      entityType: 'JUDGE_EVALUATION',
      entityId: submitted.id,
      metadata: {
        assignmentId,
        submissionId: assignment.submission_id,
        rawWeightedScore,
        status: EvaluationStatus.SUBMITTED
      }
    });

    return submitted;
  }

  /**
   * Unlock Evaluation (Organizer / Admin only)
   */
  async unlockEvaluation(
    currentUser: { id: string; role: UserRole },
    assignmentId: string
  ): Promise<JudgeEvaluation> {
    if (currentUser.role !== UserRole.ORGANIZER && currentUser.role !== UserRole.ADMIN) {
      throw new AppError('Only organizers or administrators can unlock submitted evaluations', 403, 'FORBIDDEN');
    }

    const evaluation = await rubricRepository.findEvaluationByAssignmentId(assignmentId);
    if (!evaluation) {
      throw new AppError(`No evaluation found for assignment ${assignmentId}`, 404, 'EVALUATION_NOT_FOUND');
    }

    const scoresInput: CriterionScoreInput[] = evaluation.criterionScores.map(cs => ({
      criterionId: cs.criterionId,
      score: cs.score,
      feedback: cs.feedback
    }));

    const unlocked = await rubricRepository.saveEvaluation({
      hackathonId: evaluation.hackathonId,
      assignmentId,
      submissionId: evaluation.submissionId,
      judgeId: evaluation.judgeId,
      rubricId: evaluation.rubricId,
      rawWeightedScore: evaluation.rawWeightedScore,
      feedback: evaluation.feedback,
      status: EvaluationStatus.DRAFT,
      scores: scoresInput
    });

    await auditRepository.logAuditEvent({
      userId: currentUser.id,
      action: 'EVALUATION_UNLOCKED',
      entityType: 'JUDGE_EVALUATION',
      entityId: unlocked.id,
      metadata: { assignmentId, unlockedBy: currentUser.id }
    });

    return unlocked;
  }

  /**
   * Organizer Judging Progress Monitor
   */
  async getOrganizerJudgingMonitor(
    currentUser: { id: string; role: UserRole },
    hackathonId: string
  ): Promise<OrganizerJudgingMonitor> {
    if (currentUser.role !== UserRole.ORGANIZER && currentUser.role !== UserRole.ADMIN) {
      throw new AppError('Only organizers or administrators can access judging monitor', 403, 'FORBIDDEN');
    }

    const hackathon = await hackathonService.getHackathonByIdOrSlug(hackathonId, currentUser.role);
    if (!hackathon) {
      throw new AppError(`Hackathon ${hackathonId} not found`, 404, 'HACKATHON_NOT_FOUND');
    }

    return await rubricRepository.getJudgingMonitor(hackathonId);
  }

  // --- PRIVATE HELPERS ---

  private async validateJudgeAccess(
    currentUser: { id: string; role: UserRole },
    assignmentId: string
  ): Promise<{ assignment: JudgeAssignmentWithDetails; rubric: Rubric }> {
    const assignment = await judgeRepository.getAssignmentById(assignmentId);
    if (!assignment) {
      throw new AppError(`Assignment ${assignmentId} not found`, 404, 'ASSIGNMENT_NOT_FOUND');
    }

    // Role verification
    if (currentUser.role === UserRole.PARTICIPANT) {
      throw new AppError('Participants cannot submit judging scores', 403, 'FORBIDDEN');
    }

    // IDOR Check: Judge can only score their own assignment
    if (currentUser.role === UserRole.JUDGE && assignment.judge_id !== currentUser.id) {
      throw new AppError('Access denied: You cannot score another judge\'s assignment', 403, 'FORBIDDEN');
    }

    const hackathon = await hackathonService.getHackathonByIdOrSlug(assignment.hackathon_id, currentUser.role);
    if (!hackathon) {
      throw new AppError(`Hackathon ${assignment.hackathon_id} not found`, 404, 'HACKATHON_NOT_FOUND');
    }

    // Event Lifecycle Check: Scoring permitted in JUDGING or RUNNING states
    if (
      hackathon.status !== HackathonStatus.JUDGING &&
      hackathon.status !== HackathonStatus.RUNNING &&
      currentUser.role === UserRole.JUDGE
    ) {
      throw new AppError(
        `Judging is not currently open for event "${hackathon.name}" (Status: ${hackathon.status})`,
        400,
        'EVENT_NOT_IN_JUDGING'
      );
    }

    const rubric = await this.getActiveRubric(assignment.hackathon_id);
    return { assignment, rubric };
  }

  private validateCriteria(
    criteria: { name: string; weightPercentage: number; maxPoints: number }[]
  ): void {
    if (!criteria || criteria.length === 0) {
      throw new AppError('Rubric must contain at least one evaluation criterion', 400, 'CRITERIA_REQUIRED');
    }

    let totalWeight = 0;
    const names = new Set<string>();

    for (const c of criteria) {
      const lowerName = c.name.trim().toLowerCase();
      if (names.has(lowerName)) {
        throw new AppError(`Duplicate criterion name detected: "${c.name}". Names must be unique.`, 400, 'DUPLICATE_CRITERION_NAME');
      }
      names.add(lowerName);

      if (c.weightPercentage <= 0 || c.weightPercentage > 100) {
        throw new AppError(`Criterion "${c.name}" weight must be between 0.01% and 100%`, 400, 'INVALID_WEIGHT');
      }
      if (c.maxPoints <= 0) {
        throw new AppError(`Criterion "${c.name}" max points must be greater than 0`, 400, 'INVALID_MAX_POINTS');
      }

      totalWeight += Number(c.weightPercentage);
    }

    // Total must sum to 100% (allowing small floating point variance of 0.05)
    if (Math.abs(totalWeight - 100) > 0.05) {
      throw new AppError(
        `Total criteria weights must equal exactly 100.00%. Current sum: ${totalWeight.toFixed(2)}%`,
        400,
        'WEIGHTS_MUST_SUM_100'
      );
    }
  }

  /**
   * Deterministic Server-Side Weighted Calculation
   * Formula:
   * normalizedCriterionValue = score / maxPoints
   * weightedContribution = normalizedCriterionValue * weightPercentage
   * rawWeightedScore = sum(weightedContribution)
   */
  calculateWeightedScore(
    rubric: Rubric,
    scores: CriterionScoreInput[]
  ): number {
    let totalScore = 0;

    for (const s of scores) {
      const criterion = rubric.criteria.find(c => c.id === s.criterionId);
      if (!criterion) continue;

      const normalizedValue = Math.min(Math.max(s.score / criterion.maxPoints, 0), 1);
      const contribution = normalizedValue * criterion.weightPercentage;
      totalScore += contribution;
    }

    return Math.round(totalScore * 100) / 100;
  }
}

export const rubricService = new RubricService();
