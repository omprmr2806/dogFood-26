import { JudgeStatus } from '@dogfood/shared';

export interface AlgorithmJudgeInput {
  id: string;
  fullName: string;
  email: string;
  status: JudgeStatus;
}

export interface AlgorithmSubmissionInput {
  id: string;
  title: string;
  teamId: string;
}

export interface AlgorithmTeamMembershipInput {
  teamId: string;
  userId: string;
}

export interface AlgorithmConflictInput {
  judgeId: string;
  teamId?: string | null;
  submissionId?: string | null;
  reason: string;
}

export interface AssignmentEngineInput {
  hackathonId: string;
  judgesPerSubmission: number;
  judges: AlgorithmJudgeInput[];
  submissions: AlgorithmSubmissionInput[];
  teamMemberships: AlgorithmTeamMembershipInput[];
  conflicts: AlgorithmConflictInput[];
}

export interface GeneratedAssignment {
  submissionId: string;
  submissionTitle: string;
  judgeId: string;
  judgeName: string;
  judgeEmail: string;
  hackathonId: string;
}

export interface JudgeWorkloadStat {
  judgeId: string;
  judgeName: string;
  judgeEmail: string;
  assignmentCount: number;
}

export interface UnassignableSubmission {
  submissionId: string;
  submissionTitle: string;
  reason: string;
  availableJudgesCount: number;
  requiredJudgesCount: number;
}

export interface ConflictDiagnostic {
  submissionId: string;
  submissionTitle: string;
  judgeId: string;
  judgeName: string;
  reason: string;
}

export interface AssignmentEngineResult {
  success: boolean;
  hackathonId: string;
  judgesPerSubmission: number;
  totalSubmissions: number;
  totalAssignments: number;
  assignments: GeneratedAssignment[];
  workloadStats: JudgeWorkloadStat[];
  unassignableSubmissions: UnassignableSubmission[];
  conflictsEncountered: ConflictDiagnostic[];
  error?: string;
}

/**
 * JudgeAssignmentService
 * 
 * Objectives:
 * 1. Assign each eligible submission to exactly K active judges.
 * 2. Balance total workload across active judges (minimized workload variance).
 * 3. Strictly prevent conflicts of interest (team membership and declared COI).
 * 4. Guarantee zero duplicate assignments for any (judge, submission) pair.
 * 5. Deterministic and reproducible: identical input sets produce identical assignments.
 * 6. Fail safely if any submission cannot be fully assigned with K eligible judges.
 * 
 * Determinism & Sorting Strategy:
 * - Submissions are sorted deterministically by their UUID/ID ascending.
 * - Judges are sorted deterministically by their UUID/ID ascending.
 * - When selecting K judges for a submission:
 *     Primary criteria: Current assigned workload count ascending (least busy judge first).
 *     Secondary criteria (tie-breaker): Judge ID ascending string comparison.
 * - No uncontrolled random numbers, timestamps, or system noise are used in ordering.
 */
export class JudgeAssignmentService {
  public execute(input: AssignmentEngineInput): AssignmentEngineResult {
    const { hackathonId, judgesPerSubmission, judges, submissions, teamMemberships, conflicts } = input;

    // Validate K
    if (judgesPerSubmission < 1) {
      return {
        success: false,
        hackathonId,
        judgesPerSubmission,
        totalSubmissions: submissions.length,
        totalAssignments: 0,
        assignments: [],
        workloadStats: [],
        unassignableSubmissions: [],
        conflictsEncountered: [],
        error: 'Judges per submission must be at least 1.'
      };
    }

    // 1. Filter active judges and sort deterministically
    const activeJudges = judges
      .filter((j) => j.status === JudgeStatus.ACTIVE)
      .sort((a, b) => a.id.localeCompare(b.id));

    if (activeJudges.length < judgesPerSubmission) {
      return {
        success: false,
        hackathonId,
        judgesPerSubmission,
        totalSubmissions: submissions.length,
        totalAssignments: 0,
        assignments: [],
        workloadStats: [],
        unassignableSubmissions: [],
        conflictsEncountered: [],
        error: `Insufficient active judges in pool. Required at least ${judgesPerSubmission}, but only ${activeJudges.length} active judges available.`
      };
    }

    if (submissions.length === 0) {
      return {
        success: true,
        hackathonId,
        judgesPerSubmission,
        totalSubmissions: 0,
        totalAssignments: 0,
        assignments: [],
        workloadStats: activeJudges.map((j) => ({
          judgeId: j.id,
          judgeName: j.fullName,
          judgeEmail: j.email,
          assignmentCount: 0
        })),
        unassignableSubmissions: [],
        conflictsEncountered: []
      };
    }

    // 2. Build Conflict Lookups
    // Fast O(1) set lookup for Team Membership COI: key = `${teamId}:${userId}`
    const teamMemberSet = new Set<string>();
    for (const tm of teamMemberships) {
      teamMemberSet.add(`${tm.teamId}:${tm.userId}`);
    }

    // Fast lookup for Declared COI:
    // judge -> Set of submissionIds
    const judgeSubmissionConflicts = new Map<string, Set<string>>();
    // judge -> Set of teamIds
    const judgeTeamConflicts = new Map<string, Set<string>>();

    for (const c of conflicts) {
      if (c.submissionId) {
        if (!judgeSubmissionConflicts.has(c.judgeId)) {
          judgeSubmissionConflicts.set(c.judgeId, new Set());
        }
        judgeSubmissionConflicts.get(c.judgeId)!.add(c.submissionId);
      }
      if (c.teamId) {
        if (!judgeTeamConflicts.has(c.judgeId)) {
          judgeTeamConflicts.set(c.judgeId, new Set());
        }
        judgeTeamConflicts.get(c.judgeId)!.add(c.teamId);
      }
    }

    // 3. Initialize Workload Tracker
    const workloadMap = new Map<string, number>();
    for (const j of activeJudges) {
      workloadMap.set(j.id, 0);
    }

    // 4. Deterministically sort submissions
    const sortedSubmissions = [...submissions].sort((a, b) => a.id.localeCompare(b.id));

    const generatedAssignments: GeneratedAssignment[] = [];
    const unassignableSubmissions: UnassignableSubmission[] = [];
    const conflictsEncountered: ConflictDiagnostic[] = [];

    // Helper: conflict checker
    const checkConflict = (
      judge: AlgorithmJudgeInput,
      submission: AlgorithmSubmissionInput
    ): { hasConflict: boolean; reason?: string } => {
      // Rule A: Judge is a team member or leader of the submission's team
      if (teamMemberSet.has(`${submission.teamId}:${judge.id}`)) {
        return {
          hasConflict: true,
          reason: `Judge is a registered member of team "${submission.teamId}".`
        };
      }

      // Rule B: Declared conflict for this specific submission
      const subConflicts = judgeSubmissionConflicts.get(judge.id);
      if (subConflicts && subConflicts.has(submission.id)) {
        return {
          hasConflict: true,
          reason: 'Explicit conflict of interest declared for this submission.'
        };
      }

      // Rule C: Declared conflict for the entire team
      const teamConflicts = judgeTeamConflicts.get(judge.id);
      if (teamConflicts && teamConflicts.has(submission.teamId)) {
        return {
          hasConflict: true,
          reason: 'Explicit conflict of interest declared for this team.'
        };
      }

      return { hasConflict: false };
    };

    // 5. Run Assignment Loop for each submission
    for (const submission of sortedSubmissions) {
      // Find all eligible (non-conflicted) active judges
      const eligibleJudges: AlgorithmJudgeInput[] = [];

      for (const judge of activeJudges) {
        const conflictCheck = checkConflict(judge, submission);
        if (conflictCheck.hasConflict) {
          conflictsEncountered.push({
            submissionId: submission.id,
            submissionTitle: submission.title,
            judgeId: judge.id,
            judgeName: judge.fullName,
            reason: conflictCheck.reason || 'Conflict of interest'
          });
        } else {
          eligibleJudges.push(judge);
        }
      }

      // Check if enough eligible judges exist for this submission
      if (eligibleJudges.length < judgesPerSubmission) {
        unassignableSubmissions.push({
          submissionId: submission.id,
          submissionTitle: submission.title,
          reason: `Requires ${judgesPerSubmission} judges, but only ${eligibleJudges.length} eligible judges remain after conflict exclusion.`,
          availableJudgesCount: eligibleJudges.length,
          requiredJudgesCount: judgesPerSubmission
        });
        continue;
      }

      // Sort eligible judges:
      // 1. Primary: Current workload count ascending (minimized workload variance)
      // 2. Secondary: Judge ID ascending (deterministic tie-breaking)
      eligibleJudges.sort((a, b) => {
        const loadA = workloadMap.get(a.id) ?? 0;
        const loadB = workloadMap.get(b.id) ?? 0;
        if (loadA !== loadB) {
          return loadA - loadB;
        }
        return a.id.localeCompare(b.id);
      });

      // Select top K judges
      const chosenJudges = eligibleJudges.slice(0, judgesPerSubmission);

      for (const chosen of chosenJudges) {
        const currentLoad = workloadMap.get(chosen.id) ?? 0;
        workloadMap.set(chosen.id, currentLoad + 1);

        generatedAssignments.push({
          submissionId: submission.id,
          submissionTitle: submission.title,
          judgeId: chosen.id,
          judgeName: chosen.fullName,
          judgeEmail: chosen.email,
          hackathonId
        });
      }
    }

    // 6. Build workload stats
    const workloadStats: JudgeWorkloadStat[] = activeJudges.map((j) => ({
      judgeId: j.id,
      judgeName: j.fullName,
      judgeEmail: j.email,
      assignmentCount: workloadMap.get(j.id) ?? 0
    }));

    const isSuccess = unassignableSubmissions.length === 0;

    return {
      success: isSuccess,
      hackathonId,
      judgesPerSubmission,
      totalSubmissions: sortedSubmissions.length,
      totalAssignments: generatedAssignments.length,
      assignments: generatedAssignments,
      workloadStats,
      unassignableSubmissions,
      conflictsEncountered,
      error: isSuccess
        ? undefined
        : `${unassignableSubmissions.length} submission(s) could not be assigned due to conflict of interest or judge capacity constraints.`
    };
  }
}

export const judgeAssignmentService = new JudgeAssignmentService();
