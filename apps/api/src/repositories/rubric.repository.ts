import { dbPool, checkDatabaseHealth } from '../config/database';
import { EvaluationStatus, Rubric, RubricCriterion, JudgeEvaluation, CriterionScore, OrganizerJudgingMonitor } from '@dogfood/shared';
import crypto from 'crypto';

export interface RubricEntity {
  id: string;
  hackathon_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RubricCriterionEntity {
  id: string;
  rubric_id: string;
  name: string;
  description: string;
  weight_percentage: number;
  max_points: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface JudgeEvaluationEntity {
  id: string;
  hackathon_id: string;
  assignment_id: string;
  submission_id: string;
  judge_id: string;
  rubric_id: string;
  raw_weighted_score: number;
  feedback: string | null;
  status: EvaluationStatus;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JudgeCriterionScoreEntity {
  id: string;
  evaluation_id: string;
  criterion_id: string;
  score: number;
  feedback: string | null;
  created_at: string;
  updated_at: string;
}

export class RubricRepository {
  private inMemoryRubrics: Map<string, RubricEntity> = new Map();
  private inMemoryCriteria: Map<string, RubricCriterionEntity> = new Map();
  private inMemoryEvaluations: Map<string, JudgeEvaluationEntity> = new Map();
  private inMemoryScores: Map<string, JudgeCriterionScoreEntity> = new Map();

  constructor() {
    this.seedInMemoryDefaults();
  }

  private seedInMemoryDefaults() {
    // 1. Seed Rubric for ai-agents-blitz-2026
    const rubric1: RubricEntity = {
      id: 'a0000000-0000-0000-0000-000000000001',
      hackathon_id: '10000000-0000-0000-0000-000000000004',
      name: 'AI Agents Blitz Evaluation Rubric',
      description: 'Standard multi-criterion weighted evaluation framework for autonomous agents.',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.inMemoryRubrics.set(rubric1.id, rubric1);

    const criteria1: RubricCriterionEntity[] = [
      {
        id: 'b0000000-0000-0000-0000-000000000001',
        rubric_id: rubric1.id,
        name: 'Technical Architecture & Complexity',
        description: 'Codebase design, modularity, algorithmic depth, and error handling.',
        weight_percentage: 30,
        max_points: 10,
        display_order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'b0000000-0000-0000-0000-000000000002',
        rubric_id: rubric1.id,
        name: 'Agent Autonomy & Determinism',
        description: 'Verifiable execution traces, tool-calling resilience, and offline self-reflection.',
        weight_percentage: 30,
        max_points: 10,
        display_order: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'b0000000-0000-0000-0000-000000000003',
        rubric_id: rubric1.id,
        name: 'Problem Impact & Innovation',
        description: 'Originality of problem formulation and practical real-world utility.',
        weight_percentage: 25,
        max_points: 10,
        display_order: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'b0000000-0000-0000-0000-000000000004',
        rubric_id: rubric1.id,
        name: 'UX, Documentation & Demo',
        description: 'Quality of live demonstration, clear instructions, and intuitive interface.',
        weight_percentage: 15,
        max_points: 10,
        display_order: 4,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    criteria1.forEach(c => this.inMemoryCriteria.set(c.id, c));

    // Pre-seed an evaluation for Assignment 2 (Bob Martinez) so Assignment 1 is fresh for testing
    const eval1: JudgeEvaluationEntity = {
      id: 'c0000000-0000-0000-0000-000000000001',
      hackathon_id: '10000000-0000-0000-0000-000000000004',
      assignment_id: '90000000-0000-0000-0000-000000000002',
      submission_id: '50000000-0000-0000-0000-000000000003',
      judge_id: '00000000-0000-0000-0000-000000000022',
      rubric_id: rubric1.id,
      raw_weighted_score: 89.5,
      feedback: 'Exceptional multi-agent consensus architecture. Well documented AST parser integration.',
      status: EvaluationStatus.SUBMITTED,
      submitted_at: '2026-03-01T12:00:00Z',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.inMemoryEvaluations.set(eval1.id, eval1);

    const scores1: JudgeCriterionScoreEntity[] = [
      { id: 'd0000000-0000-0000-0000-000000000001', evaluation_id: eval1.id, criterion_id: criteria1[0].id, score: 9.0, feedback: 'Very clean AST pipeline', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'd0000000-0000-0000-0000-000000000002', evaluation_id: eval1.id, criterion_id: criteria1[1].id, score: 9.5, feedback: 'Zero hallucination verified', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'd0000000-0000-0000-0000-000000000003', evaluation_id: eval1.id, criterion_id: criteria1[2].id, score: 8.5, feedback: 'High practical value', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'd0000000-0000-0000-0000-000000000004', evaluation_id: eval1.id, criterion_id: criteria1[3].id, score: 8.5, feedback: 'Solid walkthrough demo', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    ];
    scores1.forEach(s => this.inMemoryScores.set(s.id, s));
  }

  // Find active rubric by hackathon ID
  async findActiveRubricByHackathonId(hackathonId: string): Promise<Rubric | null> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      try {
        const rubricRes = await dbPool.query(
          `SELECT * FROM rubrics WHERE hackathon_id = $1 AND is_active = TRUE ORDER BY created_at DESC LIMIT 1`,
          [hackathonId]
        );
        if (rubricRes.rows.length === 0) return null;
        const rubricRow = rubricRes.rows[0];

        const criteriaRes = await dbPool.query(
          `SELECT * FROM rubric_criteria WHERE rubric_id = $1 ORDER BY display_order ASC, created_at ASC`,
          [rubricRow.id]
        );

        return this.mapToRubric(rubricRow, criteriaRes.rows);
      } catch (err) {
        console.warn('DB error in findActiveRubricByHackathonId, falling back to in-memory:', err);
      }
    }

    const rubrics = Array.from(this.inMemoryRubrics.values()).filter(
      r => r.hackathon_id === hackathonId && r.is_active
    );
    if (rubrics.length === 0) return null;
    const rubric = rubrics[0];
    const criteria = Array.from(this.inMemoryCriteria.values())
      .filter(c => c.rubric_id === rubric.id)
      .sort((a, b) => a.display_order - b.display_order);

    return this.mapToRubric(rubric, criteria);
  }

  async findRubricById(id: string): Promise<Rubric | null> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      try {
        const rubricRes = await dbPool.query(`SELECT * FROM rubrics WHERE id = $1`, [id]);
        if (rubricRes.rows.length === 0) return null;
        const rubricRow = rubricRes.rows[0];

        const criteriaRes = await dbPool.query(
          `SELECT * FROM rubric_criteria WHERE rubric_id = $1 ORDER BY display_order ASC, created_at ASC`,
          [rubricRow.id]
        );

        return this.mapToRubric(rubricRow, criteriaRes.rows);
      } catch (err) {
        console.warn('DB error in findRubricById, falling back to in-memory:', err);
      }
    }

    const rubric = this.inMemoryRubrics.get(id);
    if (!rubric) return null;
    const criteria = Array.from(this.inMemoryCriteria.values())
      .filter(c => c.rubric_id === rubric.id)
      .sort((a, b) => a.display_order - b.display_order);

    return this.mapToRubric(rubric, criteria);
  }

  async createRubric(
    hackathonId: string,
    name: string,
    description: string | undefined,
    isActive: boolean,
    criteria: { name: string; description: string; weightPercentage: number; maxPoints: number; displayOrder?: number }[]
  ): Promise<Rubric> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const client = await dbPool.connect();
      try {
        await client.query('BEGIN');

        if (isActive) {
          await client.query(
            `UPDATE rubrics SET is_active = FALSE WHERE hackathon_id = $1`,
            [hackathonId]
          );
        }

        const rubricRes = await client.query(
          `INSERT INTO rubrics (hackathon_id, name, description, is_active)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [hackathonId, name, description || null, isActive]
        );
        const rubricRow = rubricRes.rows[0];

        const insertedCriteria: any[] = [];
        for (let i = 0; i < criteria.length; i++) {
          const c = criteria[i];
          const critRes = await client.query(
            `INSERT INTO rubric_criteria (rubric_id, name, description, weight_percentage, max_points, display_order)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [rubricRow.id, c.name, c.description, c.weightPercentage, c.maxPoints, c.displayOrder ?? (i + 1)]
          );
          insertedCriteria.push(critRes.rows[0]);
        }

        await client.query('COMMIT');
        return this.mapToRubric(rubricRow, insertedCriteria);
      } catch (err) {
        await client.query('ROLLBACK');
        console.warn('DB error in createRubric, falling back to in-memory:', err);
      } finally {
        client.release();
      }
    }

    const rubricId = crypto.randomUUID();
    if (isActive) {
      this.inMemoryRubrics.forEach(r => {
        if (r.hackathon_id === hackathonId) r.is_active = false;
      });
    }

    const rubric: RubricEntity = {
      id: rubricId,
      hackathon_id: hackathonId,
      name,
      description: description || null,
      is_active: isActive,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.inMemoryRubrics.set(rubricId, rubric);

    const insertedCriteria: RubricCriterionEntity[] = criteria.map((c, idx) => {
      const criterion: RubricCriterionEntity = {
        id: crypto.randomUUID(),
        rubric_id: rubricId,
        name: c.name,
        description: c.description,
        weight_percentage: Number(c.weightPercentage),
        max_points: Number(c.maxPoints),
        display_order: c.displayOrder ?? (idx + 1),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.inMemoryCriteria.set(criterion.id, criterion);
      return criterion;
    });

    return this.mapToRubric(rubric, insertedCriteria);
  }

  async updateRubric(
    id: string,
    name?: string,
    description?: string,
    isActive?: boolean,
    criteria?: { id?: string; name: string; description: string; weightPercentage: number; maxPoints: number; displayOrder?: number }[]
  ): Promise<Rubric> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const client = await dbPool.connect();
      try {
        await client.query('BEGIN');

        const existingRes = await client.query(`SELECT * FROM rubrics WHERE id = $1`, [id]);
        if (existingRes.rows.length === 0) throw new Error('Rubric not found');
        const existing = existingRes.rows[0];

        if (isActive === true) {
          await client.query(
            `UPDATE rubrics SET is_active = FALSE WHERE hackathon_id = $1 AND id != $2`,
            [existing.hackathon_id, id]
          );
        }

        const updatedRes = await client.query(
          `UPDATE rubrics
           SET name = COALESCE($1, name),
               description = COALESCE($2, description),
               is_active = COALESCE($3, is_active),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $4
           RETURNING *`,
          [name, description, isActive, id]
        );
        const rubricRow = updatedRes.rows[0];

        let criteriaRows: any[] = [];
        if (criteria && criteria.length > 0) {
          await client.query(`DELETE FROM rubric_criteria WHERE rubric_id = $1`, [id]);
          for (let i = 0; i < criteria.length; i++) {
            const c = criteria[i];
            const critRes = await client.query(
              `INSERT INTO rubric_criteria (id, rubric_id, name, description, weight_percentage, max_points, display_order)
               VALUES (COALESCE($1, uuid_generate_v4()), $2, $3, $4, $5, $6, $7)
               RETURNING *`,
              [c.id || null, id, c.name, c.description, c.weightPercentage, c.maxPoints, c.displayOrder ?? (i + 1)]
            );
            criteriaRows.push(critRes.rows[0]);
          }
        } else {
          const fetchCrit = await client.query(
            `SELECT * FROM rubric_criteria WHERE rubric_id = $1 ORDER BY display_order ASC`,
            [id]
          );
          criteriaRows = fetchCrit.rows;
        }

        await client.query('COMMIT');
        return this.mapToRubric(rubricRow, criteriaRows);
      } catch (err) {
        await client.query('ROLLBACK');
        console.warn('DB error in updateRubric, falling back to in-memory:', err);
      } finally {
        client.release();
      }
    }

    const rubric = this.inMemoryRubrics.get(id);
    if (!rubric) throw new Error('Rubric not found');

    if (isActive === true) {
      this.inMemoryRubrics.forEach(r => {
        if (r.hackathon_id === rubric.hackathon_id && r.id !== id) {
          r.is_active = false;
        }
      });
    }

    if (name !== undefined) rubric.name = name;
    if (description !== undefined) rubric.description = description;
    if (isActive !== undefined) rubric.is_active = isActive;
    rubric.updated_at = new Date().toISOString();

    if (criteria && criteria.length > 0) {
      // Remove old criteria
      Array.from(this.inMemoryCriteria.keys()).forEach(k => {
        if (this.inMemoryCriteria.get(k)?.rubric_id === id) {
          this.inMemoryCriteria.delete(k);
        }
      });
      criteria.forEach((c, idx) => {
        const critId = c.id || crypto.randomUUID();
        const criterion: RubricCriterionEntity = {
          id: critId,
          rubric_id: id,
          name: c.name,
          description: c.description,
          weight_percentage: Number(c.weightPercentage),
          max_points: Number(c.maxPoints),
          display_order: c.displayOrder ?? (idx + 1),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        this.inMemoryCriteria.set(critId, criterion);
      });
    }

    const currentCriteria = Array.from(this.inMemoryCriteria.values())
      .filter(c => c.rubric_id === id)
      .sort((a, b) => a.display_order - b.display_order);

    return this.mapToRubric(rubric, currentCriteria);
  }

  async findEvaluationByAssignmentId(assignmentId: string): Promise<JudgeEvaluation | null> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      try {
        const res = await dbPool.query(
          `SELECT e.*, s.title as submission_title, u.full_name as judge_name
           FROM judge_evaluations e
           JOIN submissions s ON s.id = e.submission_id
           JOIN users u ON u.id = e.judge_id
           WHERE e.assignment_id = $1`,
          [assignmentId]
        );
        if (res.rows.length === 0) return null;
        const evalRow = res.rows[0];

        const scoresRes = await dbPool.query(
          `SELECT sc.*, rc.name as criterion_name, rc.max_points, rc.weight_percentage
           FROM judge_criterion_scores sc
           JOIN rubric_criteria rc ON rc.id = sc.criterion_id
           WHERE sc.evaluation_id = $1`,
          [evalRow.id]
        );

        return this.mapToEvaluation(evalRow, scoresRes.rows);
      } catch (err) {
        console.warn('DB error in findEvaluationByAssignmentId, falling back to in-memory:', err);
      }
    }

    const evals = Array.from(this.inMemoryEvaluations.values()).filter(e => e.assignment_id === assignmentId);
    if (evals.length === 0) return null;
    const evaluation = evals[0];
    const scores = Array.from(this.inMemoryScores.values())
      .filter(s => s.evaluation_id === evaluation.id)
      .map(s => {
        const criterion = this.inMemoryCriteria.get(s.criterion_id);
        return {
          id: s.id,
          evaluationId: s.evaluation_id,
          criterionId: s.criterion_id,
          criterionName: criterion?.name,
          score: Number(s.score),
          maxPoints: criterion?.max_points,
          weightPercentage: criterion?.weight_percentage,
          feedback: s.feedback || undefined,
          createdAt: s.created_at,
          updatedAt: s.updated_at
        };
      });

    return {
      id: evaluation.id,
      hackathonId: evaluation.hackathon_id,
      assignmentId: evaluation.assignment_id,
      submissionId: evaluation.submission_id,
      judgeId: evaluation.judge_id,
      rubricId: evaluation.rubric_id,
      rawWeightedScore: Number(evaluation.raw_weighted_score),
      feedback: evaluation.feedback || undefined,
      status: evaluation.status,
      criterionScores: scores,
      submittedAt: evaluation.submitted_at || undefined,
      createdAt: evaluation.created_at,
      updatedAt: evaluation.updated_at
    };
  }

  async findEvaluationsByHackathonId(hackathonId: string): Promise<JudgeEvaluation[]> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      try {
        const res = await dbPool.query(
          `SELECT e.*, s.title as submission_title, u.full_name as judge_name
           FROM judge_evaluations e
           JOIN submissions s ON s.id = e.submission_id
           JOIN users u ON u.id = e.judge_id
           WHERE e.hackathon_id = $1
           ORDER BY e.created_at DESC`,
          [hackathonId]
        );

        const list: JudgeEvaluation[] = [];
        for (const evalRow of res.rows) {
          const scoresRes = await dbPool.query(
            `SELECT sc.*, rc.name as criterion_name, rc.max_points, rc.weight_percentage
             FROM judge_criterion_scores sc
             JOIN rubric_criteria rc ON rc.id = sc.criterion_id
             WHERE sc.evaluation_id = $1`,
            [evalRow.id]
          );
          list.push(this.mapToEvaluation(evalRow, scoresRes.rows));
        }
        return list;
      } catch (err) {
        console.warn('DB error in findEvaluationsByHackathonId, falling back to in-memory:', err);
      }
    }

    const evals = Array.from(this.inMemoryEvaluations.values()).filter(e => e.hackathon_id === hackathonId);
    return evals.map(evaluation => {
      const scores = Array.from(this.inMemoryScores.values())
        .filter(s => s.evaluation_id === evaluation.id)
        .map(s => {
          const criterion = this.inMemoryCriteria.get(s.criterion_id);
          return {
            id: s.id,
            evaluationId: s.evaluation_id,
            criterionId: s.criterion_id,
            criterionName: criterion?.name,
            score: Number(s.score),
            maxPoints: criterion?.max_points,
            weightPercentage: criterion?.weight_percentage,
            feedback: s.feedback || undefined,
            createdAt: s.created_at,
            updatedAt: s.updated_at
          };
        });

      return {
        id: evaluation.id,
        hackathonId: evaluation.hackathon_id,
        assignmentId: evaluation.assignment_id,
        submissionId: evaluation.submission_id,
        judgeId: evaluation.judge_id,
        rubricId: evaluation.rubric_id,
        rawWeightedScore: Number(evaluation.raw_weighted_score),
        feedback: evaluation.feedback || undefined,
        status: evaluation.status,
        criterionScores: scores,
        submittedAt: evaluation.submitted_at || undefined,
        createdAt: evaluation.created_at,
        updatedAt: evaluation.updated_at
      };
    });
  }

  async saveEvaluation(params: {
    hackathonId: string;
    assignmentId: string;
    submissionId: string;
    judgeId: string;
    rubricId: string;
    rawWeightedScore: number;
    feedback?: string;
    status: EvaluationStatus;
    scores: { criterionId: string; score: number; feedback?: string }[];
  }): Promise<JudgeEvaluation> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const client = await dbPool.connect();
      try {
        await client.query('BEGIN');

        const submittedAt = params.status === EvaluationStatus.SUBMITTED ? 'CURRENT_TIMESTAMP' : null;

        const evalRes = await client.query(
          `INSERT INTO judge_evaluations (
             hackathon_id, assignment_id, submission_id, judge_id, rubric_id,
             raw_weighted_score, feedback, status, submitted_at, updated_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ${submittedAt ? 'CURRENT_TIMESTAMP' : 'NULL'}, CURRENT_TIMESTAMP)
           ON CONFLICT (assignment_id) DO UPDATE SET
             raw_weighted_score = EXCLUDED.raw_weighted_score,
             feedback = EXCLUDED.feedback,
             status = EXCLUDED.status,
             submitted_at = CASE WHEN EXCLUDED.status = 'SUBMITTED' THEN COALESCE(judge_evaluations.submitted_at, CURRENT_TIMESTAMP) ELSE judge_evaluations.submitted_at END,
             updated_at = CURRENT_TIMESTAMP
           RETURNING *`,
          [
            params.hackathonId,
            params.assignmentId,
            params.submissionId,
            params.judgeId,
            params.rubricId,
            params.rawWeightedScore,
            params.feedback || null,
            params.status
          ]
        );
        const evalRow = evalRes.rows[0];

        // Delete old scores if any
        await client.query(`DELETE FROM judge_criterion_scores WHERE evaluation_id = $1`, [evalRow.id]);

        const scoreRows: any[] = [];
        for (const s of params.scores) {
          const scRes = await client.query(
            `INSERT INTO judge_criterion_scores (evaluation_id, criterion_id, score, feedback)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [evalRow.id, s.criterionId, s.score, s.feedback || null]
          );
          scoreRows.push(scRes.rows[0]);
        }

        // Also update judge_assignment status to COMPLETED if SUBMITTED
        if (params.status === EvaluationStatus.SUBMITTED) {
          await client.query(
            `UPDATE judge_assignments SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [params.assignmentId]
          );
        } else if (params.status === EvaluationStatus.DRAFT) {
          await client.query(
            `UPDATE judge_assignments SET status = 'IN_PROGRESS', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status != 'COMPLETED'`,
            [params.assignmentId]
          );
        }

        await client.query('COMMIT');
        return this.mapToEvaluation(evalRow, scoreRows);
      } catch (err) {
        await client.query('ROLLBACK');
        console.warn('DB error in saveEvaluation, falling back to in-memory:', err);
      } finally {
        client.release();
      }
    }

    let existing = Array.from(this.inMemoryEvaluations.values()).find(e => e.assignment_id === params.assignmentId);
    const evalId = existing ? existing.id : crypto.randomUUID();

    const evaluation: JudgeEvaluationEntity = {
      id: evalId,
      hackathon_id: params.hackathonId,
      assignment_id: params.assignmentId,
      submission_id: params.submissionId,
      judge_id: params.judgeId,
      rubric_id: params.rubricId,
      raw_weighted_score: Number(params.rawWeightedScore),
      feedback: params.feedback || null,
      status: params.status,
      submitted_at: params.status === EvaluationStatus.SUBMITTED ? (existing?.submitted_at || new Date().toISOString()) : null,
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.inMemoryEvaluations.set(evalId, evaluation);

    // Remove old scores
    Array.from(this.inMemoryScores.keys()).forEach(k => {
      if (this.inMemoryScores.get(k)?.evaluation_id === evalId) {
        this.inMemoryScores.delete(k);
      }
    });

    const scoreEntities: JudgeCriterionScoreEntity[] = params.scores.map(s => {
      const sc: JudgeCriterionScoreEntity = {
        id: crypto.randomUUID(),
        evaluation_id: evalId,
        criterion_id: s.criterionId,
        score: Number(s.score),
        feedback: s.feedback || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.inMemoryScores.set(sc.id, sc);
      return sc;
    });

    return {
      id: evaluation.id,
      hackathonId: evaluation.hackathon_id,
      assignmentId: evaluation.assignment_id,
      submissionId: evaluation.submission_id,
      judgeId: evaluation.judge_id,
      rubricId: evaluation.rubric_id,
      rawWeightedScore: evaluation.raw_weighted_score,
      feedback: evaluation.feedback || undefined,
      status: evaluation.status,
      criterionScores: scoreEntities.map(s => ({
        id: s.id,
        evaluationId: s.evaluation_id,
        criterionId: s.criterion_id,
        score: s.score,
        feedback: s.feedback || undefined,
        createdAt: s.created_at,
        updatedAt: s.updated_at
      })),
      submittedAt: evaluation.submitted_at || undefined,
      createdAt: evaluation.created_at,
      updatedAt: evaluation.updated_at
    };
  }

  async getJudgingMonitor(hackathonId: string): Promise<OrganizerJudgingMonitor> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      try {
        const totalAssignmentsRes = await dbPool.query(
          `SELECT COUNT(*)::int as total FROM judge_assignments WHERE hackathon_id = $1`,
          [hackathonId]
        );
        const totalAssignments = totalAssignmentsRes.rows[0]?.total || 0;

        const evalStatsRes = await dbPool.query(
          `SELECT status, COUNT(*)::int as count FROM judge_evaluations WHERE hackathon_id = $1 GROUP BY status`,
          [hackathonId]
        );
        let completed = 0;
        let drafts = 0;
        evalStatsRes.rows.forEach(r => {
          if (r.status === 'SUBMITTED' || r.status === 'LOCKED') completed += r.count;
          if (r.status === 'DRAFT') drafts += r.count;
        });

        const pending = Math.max(0, totalAssignments - completed);
        const completionPercentage = totalAssignments > 0 ? Math.round((completed / totalAssignments) * 100) : 0;

        // Judge progress
        const judgeProgressRes = await dbPool.query(
          `SELECT u.id as judge_id, u.full_name as judge_name,
                  COUNT(a.id)::int as assigned_count,
                  COUNT(CASE WHEN e.status IN ('SUBMITTED', 'LOCKED') THEN 1 END)::int as completed_count
           FROM users u
           JOIN hackathon_judges hj ON hj.judge_id = u.id AND hj.hackathon_id = $1
           LEFT JOIN judge_assignments a ON a.judge_id = u.id AND a.hackathon_id = $1
           LEFT JOIN judge_evaluations e ON e.assignment_id = a.id
           GROUP BY u.id, u.full_name
           ORDER BY u.full_name ASC`,
          [hackathonId]
        );

        const judgeProgress = judgeProgressRes.rows.map(r => ({
          judgeId: r.judge_id,
          judgeName: r.judge_name,
          assignedCount: r.assigned_count,
          completedCount: r.completed_count,
          completionPercentage: r.assigned_count > 0 ? Math.round((r.completed_count / r.assigned_count) * 100) : 0
        }));

        // Submission progress
        const subProgressRes = await dbPool.query(
          `SELECT s.id as submission_id, s.title as submission_title,
                  COUNT(a.id)::int as assigned_count,
                  COUNT(CASE WHEN e.status IN ('SUBMITTED', 'LOCKED') THEN 1 END)::int as completed_count
           FROM submissions s
           JOIN judge_assignments a ON a.submission_id = s.id AND a.hackathon_id = $1
           LEFT JOIN judge_evaluations e ON e.assignment_id = a.id
           GROUP BY s.id, s.title
           ORDER BY s.title ASC`,
          [hackathonId]
        );

        const submissionProgress = subProgressRes.rows.map(r => ({
          submissionId: r.submission_id,
          submissionTitle: r.submission_title,
          assignedCount: r.assigned_count,
          completedCount: r.completed_count,
          completionPercentage: r.assigned_count > 0 ? Math.round((r.completed_count / r.assigned_count) * 100) : 0
        }));

        return {
          hackathonId,
          totalAssignments,
          completedEvaluations: completed,
          draftEvaluations: drafts,
          pendingEvaluations: pending,
          completionPercentage,
          judgeProgress,
          submissionProgress
        };
      } catch (err) {
        console.warn('DB error in getJudgingMonitor, falling back to in-memory:', err);
      }
    }

    // In-memory fallback calculation
    const evals = Array.from(this.inMemoryEvaluations.values()).filter(e => e.hackathon_id === hackathonId);
    const completed = evals.filter(e => e.status === EvaluationStatus.SUBMITTED || e.status === EvaluationStatus.LOCKED).length;
    const drafts = evals.filter(e => e.status === EvaluationStatus.DRAFT).length;
    const totalAssignments = Math.max(evals.length, 3);
    const pending = Math.max(0, totalAssignments - completed);
    const completionPercentage = totalAssignments > 0 ? Math.round((completed / totalAssignments) * 100) : 0;

    return {
      hackathonId,
      totalAssignments,
      completedEvaluations: completed,
      draftEvaluations: drafts,
      pendingEvaluations: pending,
      completionPercentage,
      judgeProgress: [
        {
          judgeId: '00000000-0000-0000-0000-000000000003',
          judgeName: 'Judge Evaluator',
          assignedCount: 1,
          completedCount: 1,
          completionPercentage: 100
        },
        {
          judgeId: '00000000-0000-0000-0000-000000000021',
          judgeName: 'Dr. Alice Chen',
          assignedCount: 1,
          completedCount: 1,
          completionPercentage: 100
        },
        {
          judgeId: '00000000-0000-0000-0000-000000000022',
          judgeName: 'Bob Martinez',
          assignedCount: 1,
          completedCount: 1,
          completionPercentage: 100
        }
      ],
      submissionProgress: [
        {
          submissionId: '50000000-0000-0000-0000-000000000003',
          submissionTitle: 'CognitiveFlow - Self-Reflective Agent Platform',
          assignedCount: 2,
          completedCount: 2,
          completionPercentage: 100
        },
        {
          submissionId: '50000000-0000-0000-0000-000000000008',
          submissionTitle: 'AutoSynth - Synthetic Agent Dataset Factory',
          assignedCount: 1,
          completedCount: 1,
          completionPercentage: 100
        }
      ]
    };
  }

  private mapToRubric(row: any, criteriaRows: any[]): Rubric {
    return {
      id: row.id,
      hackathonId: row.hackathon_id,
      name: row.name,
      description: row.description || undefined,
      isActive: Boolean(row.is_active),
      criteria: criteriaRows.map(c => ({
        id: c.id,
        rubricId: c.rubric_id,
        name: c.name,
        description: c.description,
        weightPercentage: Number(c.weight_percentage),
        maxPoints: Number(c.max_points),
        displayOrder: Number(c.display_order),
        createdAt: c.created_at,
        updatedAt: c.updated_at
      })),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapToEvaluation(row: any, scores: any[]): JudgeEvaluation {
    return {
      id: row.id,
      hackathonId: row.hackathon_id,
      assignmentId: row.assignment_id,
      submissionId: row.submission_id,
      submissionTitle: row.submission_title || undefined,
      judgeId: row.judge_id,
      judgeName: row.judge_name || undefined,
      rubricId: row.rubric_id,
      rawWeightedScore: Number(row.raw_weighted_score),
      feedback: row.feedback || undefined,
      status: row.status as EvaluationStatus,
      criterionScores: scores.map(s => ({
        id: s.id,
        evaluationId: s.evaluation_id,
        criterionId: s.criterion_id,
        criterionName: s.criterion_name,
        score: Number(s.score),
        maxPoints: s.max_points !== undefined ? Number(s.max_points) : undefined,
        weightPercentage: s.weight_percentage !== undefined ? Number(s.weight_percentage) : undefined,
        feedback: s.feedback || undefined,
        createdAt: s.created_at,
        updatedAt: s.updated_at
      })),
      submittedAt: row.submitted_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export const rubricRepository = new RubricRepository();
