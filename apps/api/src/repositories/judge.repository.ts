import { dbPool, checkDatabaseHealth } from '../config/database';
import { JudgeStatus, JudgeAssignmentStatus } from '@dogfood/shared';
import crypto from 'crypto';

export interface HackathonJudgeEntity {
  id: string;
  hackathon_id: string;
  judge_id: string;
  status: JudgeStatus;
  created_at: string;
  updated_at: string;
}

export interface HackathonJudgeWithDetails extends HackathonJudgeEntity {
  full_name: string;
  email: string;
  assignment_count: number;
  completed_count: number;
  conflict_count: number;
}

export interface JudgingConfigEntity {
  hackathon_id: string;
  judges_per_submission: number;
  assignments_finalized: boolean;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JudgeConflictEntity {
  id: string;
  hackathon_id: string;
  judge_id: string;
  team_id: string | null;
  submission_id: string | null;
  reason: string;
  created_at: string;
  judge_name?: string;
  judge_email?: string;
  team_name?: string;
  submission_title?: string;
}

export interface JudgeAssignmentEntity {
  id: string;
  hackathon_id: string;
  submission_id: string;
  judge_id: string;
  status: JudgeAssignmentStatus;
  is_final: boolean;
  assigned_at: string;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JudgeAssignmentWithDetails extends JudgeAssignmentEntity {
  submission_title: string;
  submission_tagline: string | null;
  submission_description: string;
  submission_tech_stack: string[];
  repo_url: string | null;
  demo_url: string | null;
  demo_video_url: string | null;
  presentation_url: string | null;
  team_id: string;
  team_name: string;
  hackathon_name: string;
  hackathon_slug: string;
  judge_name?: string;
  judge_email?: string;
}

export class JudgeRepository {
  private inMemoryJudges: Map<string, HackathonJudgeEntity> = new Map();
  private inMemoryConfigs: Map<string, JudgingConfigEntity> = new Map();
  private inMemoryConflicts: Map<string, JudgeConflictEntity> = new Map();
  private inMemoryAssignments: Map<string, JudgeAssignmentEntity> = new Map();

  constructor() {
    this.seedInMemoryDefaults();
  }

  private seedInMemoryDefaults() {
    // 1. Seed judging configs
    this.inMemoryConfigs.set('10000000-0000-0000-0000-000000000004', {
      hackathon_id: '10000000-0000-0000-0000-000000000004',
      judges_per_submission: 2,
      assignments_finalized: true,
      finalized_at: '2026-03-01T00:00:00Z',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    this.inMemoryConfigs.set('10000000-0000-0000-0000-000000000003', {
      hackathon_id: '10000000-0000-0000-0000-000000000003',
      judges_per_submission: 2,
      assignments_finalized: false,
      finalized_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // 2. Seed hackathon judges
    const seedJudges: HackathonJudgeEntity[] = [
      {
        id: '70000000-0000-0000-0000-000000000001',
        hackathon_id: '10000000-0000-0000-0000-000000000004',
        judge_id: '00000000-0000-0000-0000-000000000003',
        status: JudgeStatus.ACTIVE,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '70000000-0000-0000-0000-000000000002',
        hackathon_id: '10000000-0000-0000-0000-000000000004',
        judge_id: '00000000-0000-0000-0000-000000000021',
        status: JudgeStatus.ACTIVE,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '70000000-0000-0000-0000-000000000022',
        hackathon_id: '10000000-0000-0000-0000-000000000004',
        judge_id: '00000000-0000-0000-0000-000000000022',
        status: JudgeStatus.ACTIVE,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '70000000-0000-0000-0000-000000000004',
        hackathon_id: '10000000-0000-0000-0000-000000000004',
        judge_id: '00000000-0000-0000-0000-000000000023',
        status: JudgeStatus.ACTIVE,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '70000000-0000-0000-0000-000000000005',
        hackathon_id: '10000000-0000-0000-0000-000000000004',
        judge_id: '00000000-0000-0000-0000-000000000024',
        status: JudgeStatus.INACTIVE,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '70000000-0000-0000-0000-000000000006',
        hackathon_id: '10000000-0000-0000-0000-000000000004',
        judge_id: '00000000-0000-0000-0000-000000000025',
        status: JudgeStatus.ACTIVE,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '70000000-0000-0000-0000-000000000007',
        hackathon_id: '10000000-0000-0000-0000-000000000003',
        judge_id: '00000000-0000-0000-0000-000000000003',
        status: JudgeStatus.ACTIVE,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '70000000-0000-0000-0000-000000000008',
        hackathon_id: '10000000-0000-0000-0000-000000000003',
        judge_id: '00000000-0000-0000-0000-000000000021',
        status: JudgeStatus.ACTIVE,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    for (const j of seedJudges) {
      this.inMemoryJudges.set(`${j.hackathon_id}:${j.judge_id}`, j);
    }

    // 3. Seed conflicts
    this.inMemoryConflicts.set('80000000-0000-0000-0000-000000000001', {
      id: '80000000-0000-0000-0000-000000000001',
      hackathon_id: '10000000-0000-0000-0000-000000000004',
      judge_id: '00000000-0000-0000-0000-000000000021',
      team_id: null,
      submission_id: '50000000-0000-0000-0000-000000000009',
      reason: 'Former academic advisor to team lead.',
      created_at: new Date().toISOString()
    });

    // 4. Seed assignments
    const seedAssignments: JudgeAssignmentEntity[] = [
      {
        id: '90000000-0000-0000-0000-000000000001',
        hackathon_id: '10000000-0000-0000-0000-000000000004',
        submission_id: '50000000-0000-0000-0000-000000000003',
        judge_id: '00000000-0000-0000-0000-000000000003',
        status: JudgeAssignmentStatus.ASSIGNED,
        is_final: true,
        assigned_at: '2026-03-01T00:00:00Z',
        finalized_at: '2026-03-01T00:00:00Z',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '90000000-0000-0000-0000-000000000002',
        hackathon_id: '10000000-0000-0000-0000-000000000004',
        submission_id: '50000000-0000-0000-0000-000000000003',
        judge_id: '00000000-0000-0000-0000-000000000022',
        status: JudgeAssignmentStatus.ASSIGNED,
        is_final: true,
        assigned_at: '2026-03-01T00:00:00Z',
        finalized_at: '2026-03-01T00:00:00Z',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '90000000-0000-0000-0000-000000000003',
        hackathon_id: '10000000-0000-0000-0000-000000000004',
        submission_id: '50000000-0000-0000-0000-000000000008',
        judge_id: '00000000-0000-0000-0000-000000000021',
        status: JudgeAssignmentStatus.ASSIGNED,
        is_final: true,
        assigned_at: '2026-03-01T00:00:00Z',
        finalized_at: '2026-03-01T00:00:00Z',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '90000000-0000-0000-0000-000000000004',
        hackathon_id: '10000000-0000-0000-0000-000000000004',
        submission_id: '50000000-0000-0000-0000-000000000008',
        judge_id: '00000000-0000-0000-0000-000000000025',
        status: JudgeAssignmentStatus.ASSIGNED,
        is_final: true,
        assigned_at: '2026-03-01T00:00:00Z',
        finalized_at: '2026-03-01T00:00:00Z',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '90000000-0000-0000-0000-000000000005',
        hackathon_id: '10000000-0000-0000-0000-000000000004',
        submission_id: '50000000-0000-0000-0000-000000000009',
        judge_id: '00000000-0000-0000-0000-000000000023',
        status: JudgeAssignmentStatus.ASSIGNED,
        is_final: true,
        assigned_at: '2026-03-01T00:00:00Z',
        finalized_at: '2026-03-01T00:00:00Z',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '90000000-0000-0000-0000-000000000006',
        hackathon_id: '10000000-0000-0000-0000-000000000004',
        submission_id: '50000000-0000-0000-0000-000000000009',
        judge_id: '00000000-0000-0000-0000-000000000025',
        status: JudgeAssignmentStatus.ASSIGNED,
        is_final: true,
        assigned_at: '2026-03-01T00:00:00Z',
        finalized_at: '2026-03-01T00:00:00Z',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    for (const a of seedAssignments) {
      this.inMemoryAssignments.set(a.id, a);
    }
  }

  // ==========================================
  // HACKATHON JUDGE POOL
  // ==========================================

  async addJudgeToHackathon(
    hackathonId: string,
    judgeId: string,
    status: JudgeStatus = JudgeStatus.ACTIVE
  ): Promise<HackathonJudgeEntity> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<HackathonJudgeEntity>(
        `INSERT INTO hackathon_judges (hackathon_id, judge_id, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (hackathon_id, judge_id) DO UPDATE SET
           status = EXCLUDED.status,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id, hackathon_id, judge_id, status, created_at, updated_at`,
        [hackathonId, judgeId, status]
      );
      return res.rows[0];
    }

    const key = `${hackathonId}:${judgeId}`;
    const existing = this.inMemoryJudges.get(key);
    if (existing) {
      existing.status = status;
      existing.updated_at = new Date().toISOString();
      return existing;
    }

    const newJudge: HackathonJudgeEntity = {
      id: crypto.randomUUID(),
      hackathon_id: hackathonId,
      judge_id: judgeId,
      status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.inMemoryJudges.set(key, newJudge);
    return newJudge;
  }

  async updateJudgeStatus(
    hackathonId: string,
    judgeId: string,
    status: JudgeStatus
  ): Promise<HackathonJudgeEntity | null> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<HackathonJudgeEntity>(
        `UPDATE hackathon_judges
         SET status = $3, updated_at = CURRENT_TIMESTAMP
         WHERE hackathon_id = $1 AND judge_id = $2
         RETURNING id, hackathon_id, judge_id, status, created_at, updated_at`,
        [hackathonId, judgeId, status]
      );
      return res.rows[0] || null;
    }

    const key = `${hackathonId}:${judgeId}`;
    const j = this.inMemoryJudges.get(key);
    if (!j) return null;
    j.status = status;
    j.updated_at = new Date().toISOString();
    return j;
  }

  async removeJudgeFromHackathon(hackathonId: string, judgeId: string): Promise<boolean> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query(
        `DELETE FROM hackathon_judges WHERE hackathon_id = $1 AND judge_id = $2`,
        [hackathonId, judgeId]
      );
      return (res.rowCount ?? 0) > 0;
    }

    const key = `${hackathonId}:${judgeId}`;
    return this.inMemoryJudges.delete(key);
  }

  async getJudgeByHackathonAndUser(
    hackathonId: string,
    judgeId: string
  ): Promise<HackathonJudgeEntity | null> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<HackathonJudgeEntity>(
        `SELECT id, hackathon_id, judge_id, status, created_at, updated_at
         FROM hackathon_judges
         WHERE hackathon_id = $1 AND judge_id = $2`,
        [hackathonId, judgeId]
      );
      return res.rows[0] || null;
    }

    return this.inMemoryJudges.get(`${hackathonId}:${judgeId}`) || null;
  }

  async listJudgesForHackathon(hackathonId: string): Promise<HackathonJudgeWithDetails[]> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const query = `
        SELECT
          hj.id,
          hj.hackathon_id,
          hj.judge_id,
          hj.status,
          hj.created_at,
          hj.updated_at,
          u.full_name,
          u.email,
          COALESCE(COUNT(DISTINCT ja.id), 0)::int AS assignment_count,
          COALESCE(COUNT(DISTINCT CASE WHEN ja.status = 'COMPLETED' THEN ja.id END), 0)::int AS completed_count,
          COALESCE(COUNT(DISTINCT jc.id), 0)::int AS conflict_count
        FROM hackathon_judges hj
        JOIN users u ON hj.judge_id = u.id
        LEFT JOIN judge_assignments ja ON ja.hackathon_id = hj.hackathon_id AND ja.judge_id = hj.judge_id AND ja.is_final = TRUE
        LEFT JOIN judge_conflicts jc ON jc.hackathon_id = hj.hackathon_id AND jc.judge_id = hj.judge_id
        WHERE hj.hackathon_id = $1
        GROUP BY hj.id, hj.hackathon_id, hj.judge_id, hj.status, hj.created_at, hj.updated_at, u.full_name, u.email
        ORDER BY u.full_name ASC
      `;
      const res = await dbPool.query<HackathonJudgeWithDetails>(query, [hackathonId]);
      return res.rows;
    }

    const results: HackathonJudgeWithDetails[] = [];
    const demoJudgeUsers: Record<string, { full_name: string; email: string }> = {
      '00000000-0000-0000-0000-000000000003': { full_name: 'Panel Judge', email: 'judge@dogfood.local' },
      '00000000-0000-0000-0000-000000000021': { full_name: 'Dr. Alice Algorithm', email: 'judge.alice@dogfood.local' },
      '00000000-0000-0000-0000-000000000022': { full_name: 'Bob Benchmark', email: 'judge.bob@dogfood.local' },
      '00000000-0000-0000-0000-000000000023': { full_name: 'Charlie Criterion', email: 'judge.charlie@dogfood.local' },
      '00000000-0000-0000-0000-000000000024': { full_name: 'Diana Data', email: 'judge.diana@dogfood.local' },
      '00000000-0000-0000-0000-000000000025': { full_name: 'Judge TeamConflict', email: 'judge.conflict@dogfood.local' }
    };

    for (const j of this.inMemoryJudges.values()) {
      if (j.hackathon_id === hackathonId) {
        const u = demoJudgeUsers[j.judge_id] || { full_name: 'Judge User', email: 'judge@dogfood.local' };
        let assignmentCount = 0;
        let completedCount = 0;
        for (const a of this.inMemoryAssignments.values()) {
          if (a.hackathon_id === hackathonId && a.judge_id === j.judge_id && a.is_final) {
            assignmentCount++;
            if (a.status === JudgeAssignmentStatus.COMPLETED) completedCount++;
          }
        }
        let conflictCount = 0;
        for (const c of this.inMemoryConflicts.values()) {
          if (c.hackathon_id === hackathonId && c.judge_id === j.judge_id) conflictCount++;
        }
        results.push({
          ...j,
          full_name: u.full_name,
          email: u.email,
          assignment_count: assignmentCount,
          completed_count: completedCount,
          conflict_count: conflictCount
        });
      }
    }
    return results.sort((a, b) => a.full_name.localeCompare(b.full_name));
  }

  // ==========================================
  // JUDGING CONFIGURATION
  // ==========================================

  async getJudgingConfig(hackathonId: string): Promise<JudgingConfigEntity | null> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<JudgingConfigEntity>(
        `SELECT hackathon_id, judges_per_submission, assignments_finalized, finalized_at, created_at, updated_at
         FROM hackathon_judging_configs
         WHERE hackathon_id = $1`,
        [hackathonId]
      );
      return res.rows[0] || null;
    }

    return this.inMemoryConfigs.get(hackathonId) || null;
  }

  async upsertJudgingConfig(
    hackathonId: string,
    judgesPerSubmission: number,
    assignmentsFinalized?: boolean,
    finalizedAt?: string | null
  ): Promise<JudgingConfigEntity> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<JudgingConfigEntity>(
        `INSERT INTO hackathon_judging_configs (hackathon_id, judges_per_submission, assignments_finalized, finalized_at)
         VALUES ($1, $2, COALESCE($3, FALSE), $4)
         ON CONFLICT (hackathon_id) DO UPDATE SET
           judges_per_submission = EXCLUDED.judges_per_submission,
           assignments_finalized = COALESCE($3, hackathon_judging_configs.assignments_finalized),
           finalized_at = COALESCE($4, hackathon_judging_configs.finalized_at),
           updated_at = CURRENT_TIMESTAMP
         RETURNING hackathon_id, judges_per_submission, assignments_finalized, finalized_at, created_at, updated_at`,
        [hackathonId, judgesPerSubmission, assignmentsFinalized, finalizedAt]
      );
      return res.rows[0];
    }

    const existing = this.inMemoryConfigs.get(hackathonId);
    if (existing) {
      existing.judges_per_submission = judgesPerSubmission;
      if (assignmentsFinalized !== undefined) existing.assignments_finalized = assignmentsFinalized;
      if (finalizedAt !== undefined) existing.finalized_at = finalizedAt;
      existing.updated_at = new Date().toISOString();
      return existing;
    }

    const newConfig: JudgingConfigEntity = {
      hackathon_id: hackathonId,
      judges_per_submission: judgesPerSubmission,
      assignments_finalized: assignmentsFinalized ?? false,
      finalized_at: finalizedAt ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.inMemoryConfigs.set(hackathonId, newConfig);
    return newConfig;
  }

  // ==========================================
  // CONFLICTS OF INTEREST
  // ==========================================

  async declareConflict(data: {
    hackathonId: string;
    judgeId: string;
    teamId?: string | null;
    submissionId?: string | null;
    reason: string;
  }): Promise<JudgeConflictEntity> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<JudgeConflictEntity>(
        `INSERT INTO judge_conflicts (hackathon_id, judge_id, team_id, submission_id, reason)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, hackathon_id, judge_id, team_id, submission_id, reason, created_at`,
        [data.hackathonId, data.judgeId, data.teamId || null, data.submissionId || null, data.reason]
      );
      return res.rows[0];
    }

    const conflict: JudgeConflictEntity = {
      id: crypto.randomUUID(),
      hackathon_id: data.hackathonId,
      judge_id: data.judgeId,
      team_id: data.teamId || null,
      submission_id: data.submissionId || null,
      reason: data.reason,
      created_at: new Date().toISOString()
    };
    this.inMemoryConflicts.set(conflict.id, conflict);
    return conflict;
  }

  async removeConflict(conflictId: string, hackathonId: string): Promise<boolean> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query(
        `DELETE FROM judge_conflicts WHERE id = $1 AND hackathon_id = $2`,
        [conflictId, hackathonId]
      );
      return (res.rowCount ?? 0) > 0;
    }

    const c = this.inMemoryConflicts.get(conflictId);
    if (c && c.hackathon_id === hackathonId) {
      return this.inMemoryConflicts.delete(conflictId);
    }
    return false;
  }

  async listConflictsForHackathon(hackathonId: string): Promise<JudgeConflictEntity[]> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const query = `
        SELECT
          jc.id,
          jc.hackathon_id,
          jc.judge_id,
          jc.team_id,
          jc.submission_id,
          jc.reason,
          jc.created_at,
          u.full_name AS judge_name,
          u.email AS judge_email,
          t.name AS team_name,
          s.title AS submission_title
        FROM judge_conflicts jc
        JOIN users u ON jc.judge_id = u.id
        LEFT JOIN teams t ON jc.team_id = t.id
        LEFT JOIN submissions s ON jc.submission_id = s.id
        WHERE jc.hackathon_id = $1
        ORDER BY jc.created_at DESC
      `;
      const res = await dbPool.query<JudgeConflictEntity>(query, [hackathonId]);
      return res.rows;
    }

    const results: JudgeConflictEntity[] = [];
    for (const c of this.inMemoryConflicts.values()) {
      if (c.hackathon_id === hackathonId) {
        results.push({ ...c, judge_name: 'Judge User', judge_email: 'judge@dogfood.local' });
      }
    }
    return results;
  }

  // ==========================================
  // JUDGE ASSIGNMENTS
  // ==========================================

  async listAssignmentsForHackathon(hackathonId: string): Promise<JudgeAssignmentWithDetails[]> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const query = `
        SELECT
          ja.id,
          ja.hackathon_id,
          ja.submission_id,
          ja.judge_id,
          ja.status,
          ja.is_final,
          ja.assigned_at,
          ja.finalized_at,
          ja.created_at,
          ja.updated_at,
          s.title AS submission_title,
          s.tagline AS submission_tagline,
          s.description AS submission_description,
          s.technology_stack AS submission_tech_stack,
          s.repo_url,
          s.demo_url,
          s.demo_video_url,
          s.presentation_url,
          t.id AS team_id,
          t.name AS team_name,
          h.name AS hackathon_name,
          h.slug AS hackathon_slug,
          u.full_name AS judge_name,
          u.email AS judge_email
        FROM judge_assignments ja
        JOIN submissions s ON ja.submission_id = s.id
        JOIN teams t ON s.team_id = t.id
        JOIN hackathons h ON ja.hackathon_id = h.id
        JOIN users u ON ja.judge_id = u.id
        WHERE ja.hackathon_id = $1
        ORDER BY s.title ASC, u.full_name ASC
      `;
      const res = await dbPool.query<JudgeAssignmentWithDetails>(query, [hackathonId]);
      return res.rows;
    }

    const results: JudgeAssignmentWithDetails[] = [];
    for (const a of this.inMemoryAssignments.values()) {
      if (a.hackathon_id === hackathonId) {
        results.push({
          ...a,
          submission_title: 'Demo Project Submission',
          submission_tagline: 'Leading project',
          submission_description: 'Autonomous agents project',
          submission_tech_stack: ['TypeScript', 'Python'],
          repo_url: 'https://github.com/dogfood/project',
          demo_url: 'https://demo.local',
          demo_video_url: null,
          presentation_url: null,
          team_id: '30000000-0000-0000-0000-000000000004',
          team_name: 'Agentic Explorers',
          hackathon_name: 'AI Agents Blitz',
          hackathon_slug: 'ai-agents-blitz-2026',
          judge_name: 'Panel Judge',
          judge_email: 'judge@dogfood.local'
        });
      }
    }
    return results;
  }

  async listAssignmentsForJudge(hackathonId: string, judgeId: string): Promise<JudgeAssignmentWithDetails[]> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const query = `
        SELECT
          ja.id,
          ja.hackathon_id,
          ja.submission_id,
          ja.judge_id,
          ja.status,
          ja.is_final,
          ja.assigned_at,
          ja.finalized_at,
          ja.created_at,
          ja.updated_at,
          s.title AS submission_title,
          s.tagline AS submission_tagline,
          s.description AS submission_description,
          s.technology_stack AS submission_tech_stack,
          s.repo_url,
          s.demo_url,
          s.demo_video_url,
          s.presentation_url,
          t.id AS team_id,
          t.name AS team_name,
          h.name AS hackathon_name,
          h.slug AS hackathon_slug
        FROM judge_assignments ja
        JOIN submissions s ON ja.submission_id = s.id
        JOIN teams t ON s.team_id = t.id
        JOIN hackathons h ON ja.hackathon_id = h.id
        WHERE ja.hackathon_id = $1 AND ja.judge_id = $2 AND ja.is_final = TRUE
        ORDER BY s.title ASC
      `;
      const res = await dbPool.query<JudgeAssignmentWithDetails>(query, [hackathonId, judgeId]);
      return res.rows;
    }

    const results: JudgeAssignmentWithDetails[] = [];
    for (const a of this.inMemoryAssignments.values()) {
      if (a.hackathon_id === hackathonId && a.judge_id === judgeId && a.is_final) {
        results.push({
          ...a,
          submission_title: 'Demo Project Submission',
          submission_tagline: 'Leading project',
          submission_description: 'Autonomous agents project',
          submission_tech_stack: ['TypeScript', 'Python'],
          repo_url: 'https://github.com/dogfood/project',
          demo_url: 'https://demo.local',
          demo_video_url: null,
          presentation_url: null,
          team_id: '30000000-0000-0000-0000-000000000004',
          team_name: 'Agentic Explorers',
          hackathon_name: 'AI Agents Blitz',
          hackathon_slug: 'ai-agents-blitz-2026'
        });
      }
    }
    return results;
  }

  async getAssignmentById(assignmentId: string): Promise<JudgeAssignmentWithDetails | null> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const query = `
        SELECT
          ja.id,
          ja.hackathon_id,
          ja.submission_id,
          ja.judge_id,
          ja.status,
          ja.is_final,
          ja.assigned_at,
          ja.finalized_at,
          ja.created_at,
          ja.updated_at,
          s.title AS submission_title,
          s.tagline AS submission_tagline,
          s.description AS submission_description,
          s.technology_stack AS submission_tech_stack,
          s.repo_url,
          s.demo_url,
          s.demo_video_url,
          s.presentation_url,
          t.id AS team_id,
          t.name AS team_name,
          h.name AS hackathon_name,
          h.slug AS hackathon_slug,
          u.full_name AS judge_name,
          u.email AS judge_email
        FROM judge_assignments ja
        JOIN submissions s ON ja.submission_id = s.id
        JOIN teams t ON s.team_id = t.id
        JOIN hackathons h ON ja.hackathon_id = h.id
        JOIN users u ON ja.judge_id = u.id
        WHERE ja.id = $1
      `;
      const res = await dbPool.query<JudgeAssignmentWithDetails>(query, [assignmentId]);
      return res.rows[0] || null;
    }

    const a = this.inMemoryAssignments.get(assignmentId);
    if (!a) return null;
    return {
      ...a,
      submission_title: 'Demo Project Submission',
      submission_tagline: 'Leading project',
      submission_description: 'Autonomous agents project',
      submission_tech_stack: ['TypeScript', 'Python'],
      repo_url: 'https://github.com/dogfood/project',
      demo_url: 'https://demo.local',
      demo_video_url: null,
      presentation_url: null,
      team_id: '30000000-0000-0000-0000-000000000004',
      team_name: 'Agentic Explorers',
      hackathon_name: 'AI Agents Blitz',
      hackathon_slug: 'ai-agents-blitz-2026',
      judge_name: 'Panel Judge',
      judge_email: 'judge@dogfood.local'
    };
  }

  async updateAssignmentStatus(
    assignmentId: string,
    status: JudgeAssignmentStatus
  ): Promise<JudgeAssignmentEntity | null> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<JudgeAssignmentEntity>(
        `UPDATE judge_assignments
         SET status = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id, hackathon_id, submission_id, judge_id, status, is_final, assigned_at, finalized_at, created_at, updated_at`,
        [assignmentId, status]
      );
      return res.rows[0] || null;
    }

    const a = this.inMemoryAssignments.get(assignmentId);
    if (!a) return null;
    a.status = status;
    a.updated_at = new Date().toISOString();
    return a;
  }

  /**
   * Atomically finalizes assignments for a hackathon within a single SQL transaction.
   * If any step fails or conflict occurs, rolls back cleanly.
   */
  async finalizeAssignmentsTransaction(
    hackathonId: string,
    assignments: Array<{ submissionId: string; judgeId: string; hackathonId: string }>,
    judgesPerSubmission: number
  ): Promise<number> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const client = await dbPool.connect();
      try {
        await client.query('BEGIN');

        // 1. Delete any existing assignments for this hackathon
        await client.query('DELETE FROM judge_assignments WHERE hackathon_id = $1', [hackathonId]);

        // 2. Insert new finalized assignments
        const now = new Date().toISOString();
        for (const a of assignments) {
          await client.query(
            `INSERT INTO judge_assignments (
               hackathon_id, submission_id, judge_id, status, is_final, assigned_at, finalized_at
             )
             VALUES ($1, $2, $3, 'ASSIGNED', TRUE, $4, $4)`,
            [hackathonId, a.submissionId, a.judgeId, now]
          );
        }

        // 3. Mark judging configuration as finalized
        await client.query(
          `INSERT INTO hackathon_judging_configs (
             hackathon_id, judges_per_submission, assignments_finalized, finalized_at
           )
           VALUES ($1, $2, TRUE, $3)
           ON CONFLICT (hackathon_id) DO UPDATE SET
             judges_per_submission = EXCLUDED.judges_per_submission,
             assignments_finalized = TRUE,
             finalized_at = EXCLUDED.finalized_at,
             updated_at = CURRENT_TIMESTAMP`,
          [hackathonId, judgesPerSubmission, now]
        );

        await client.query('COMMIT');
        return assignments.length;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // In-memory fallback
    for (const [id, a] of Array.from(this.inMemoryAssignments.entries())) {
      if (a.hackathon_id === hackathonId) {
        this.inMemoryAssignments.delete(id);
      }
    }

    const now = new Date().toISOString();
    for (const a of assignments) {
      const newId = crypto.randomUUID();
      this.inMemoryAssignments.set(newId, {
        id: newId,
        hackathon_id: hackathonId,
        submission_id: a.submissionId,
        judge_id: a.judgeId,
        status: JudgeAssignmentStatus.ASSIGNED,
        is_final: true,
        assigned_at: now,
        finalized_at: now,
        created_at: now,
        updated_at: now
      });
    }

    const cfg = this.inMemoryConfigs.get(hackathonId);
    if (cfg) {
      cfg.judges_per_submission = judgesPerSubmission;
      cfg.assignments_finalized = true;
      cfg.finalized_at = now;
      cfg.updated_at = now;
    } else {
      this.inMemoryConfigs.set(hackathonId, {
        hackathon_id: hackathonId,
        judges_per_submission: judgesPerSubmission,
        assignments_finalized: true,
        finalized_at: now,
        created_at: now,
        updated_at: now
      });
    }

    return assignments.length;
  }
}

export const judgeRepository = new JudgeRepository();
