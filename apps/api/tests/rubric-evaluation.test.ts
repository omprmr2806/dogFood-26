import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { RubricService } from '../src/services/rubric.service';
import { Rubric, EvaluationStatus } from '@dogfood/shared';

describe('Phase 7 — Judging Rubrics & Scoring Console', () => {
  const rubricService = new RubricService();

  // =========================================================================
  // 1. ISOLATED FORMULA & CALCULATION TESTS
  // =========================================================================
  describe('Rubric Calculation Formula (Unit Tests)', () => {
    const mockRubric: Rubric = {
      id: 'rubric-calc-test',
      hackathonId: 'hack-calc-test',
      name: 'Algorithm Test Rubric',
      isActive: true,
      criteria: [
        {
          id: 'crit-1',
          rubricId: 'rubric-calc-test',
          name: 'Technical Architecture',
          description: 'Code quality and depth',
          weightPercentage: 30,
          maxPoints: 10,
          displayOrder: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'crit-2',
          rubricId: 'rubric-calc-test',
          name: 'Autonomy & Resilience',
          description: 'Autonomous agents reliability',
          weightPercentage: 30,
          maxPoints: 10,
          displayOrder: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'crit-3',
          rubricId: 'rubric-calc-test',
          name: 'Innovation',
          description: 'Novelty of approach',
          weightPercentage: 25,
          maxPoints: 10,
          displayOrder: 3,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'crit-4',
          rubricId: 'rubric-calc-test',
          name: 'UX & Demo',
          description: 'User interface experience',
          weightPercentage: 15,
          maxPoints: 10,
          displayOrder: 4,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    it('CASE 1: Correctly calculates exact weighted score for full rubric evaluation', () => {
      // 9.0/10 * 30 = 27.0
      // 9.5/10 * 30 = 28.5
      // 8.5/10 * 25 = 21.25
      // 8.5/10 * 15 = 12.75
      // Total = 27 + 28.5 + 21.25 + 12.75 = 89.50
      const scores = [
        { criterionId: 'crit-1', score: 9.0 },
        { criterionId: 'crit-2', score: 9.5 },
        { criterionId: 'crit-3', score: 8.5 },
        { criterionId: 'crit-4', score: 8.5 }
      ];

      const weighted = rubricService.calculateWeightedScore(mockRubric, scores);
      expect(weighted).toBe(89.5);
    });

    it('CASE 2: Correctly yields 100.00 for perfect scores and 0.00 for minimum scores', () => {
      const perfectScores = [
        { criterionId: 'crit-1', score: 10.0 },
        { criterionId: 'crit-2', score: 10.0 },
        { criterionId: 'crit-3', score: 10.0 },
        { criterionId: 'crit-4', score: 10.0 }
      ];
      expect(rubricService.calculateWeightedScore(mockRubric, perfectScores)).toBe(100);

      const zeroScores = [
        { criterionId: 'crit-1', score: 0 },
        { criterionId: 'crit-2', score: 0 },
        { criterionId: 'crit-3', score: 0 },
        { criterionId: 'crit-4', score: 0 }
      ];
      expect(rubricService.calculateWeightedScore(mockRubric, zeroScores)).toBe(0);
    });

    it('CASE 3: Non-uniform max points (e.g. 100 pt and 50 pt scales) normalize correctly', () => {
      const mixedRubric: Rubric = {
        ...mockRubric,
        criteria: [
          {
            id: 'm-1',
            rubricId: 'mixed',
            name: 'Crit A',
            description: 'A',
            weightPercentage: 50,
            maxPoints: 100, // score 50 => 50%
            displayOrder: 1,
            createdAt: '',
            updatedAt: ''
          },
          {
            id: 'm-2',
            rubricId: 'mixed',
            name: 'Crit B',
            description: 'B',
            weightPercentage: 50,
            maxPoints: 20, // score 10 => 50%
            displayOrder: 2,
            createdAt: '',
            updatedAt: ''
          }
        ]
      };

      const scores = [
        { criterionId: 'm-1', score: 50 },
        { criterionId: 'm-2', score: 10 }
      ];

      // 0.5 * 50 + 0.5 * 50 = 50.0
      expect(rubricService.calculateWeightedScore(mixedRubric, scores)).toBe(50);
    });
  });

  // =========================================================================
  // 2. INTEGRATION & API TESTS
  // =========================================================================
  describe('Rubrics & Judging Console APIs', () => {
    const app = createApp();

    let organizerToken: string;
    let participantToken: string;
    let judgeToken: string;
    let otherJudgeToken: string;

    const testHackathonId = '10000000-0000-0000-0000-000000000004'; // ai-agents-blitz-2026
    const judgeAssignmentId = '90000000-0000-0000-0000-000000000001'; // assigned to judge@dogfood.local
    const otherJudgeAssignmentId = '90000000-0000-0000-0000-000000000003'; // assigned to Dr. Alice

    beforeAll(async () => {
      // Authenticate roles
      const orgRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'organizer@dogfood.local', password: 'OrganizerPass123!' });
      organizerToken = orgRes.body.data.token;

      const partRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'participant@dogfood.local', password: 'ParticipantPass123!' });
      participantToken = partRes.body.data.token;

      const judgeRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'judge@dogfood.local', password: 'JudgePass123!' });
      judgeToken = judgeRes.body.data.token;

      const aliceRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'judge.alice@dogfood.local', password: 'JudgePass123!' });
      otherJudgeToken = aliceRes.body.data.token;
    });

    // --- RUBRIC CONFIGURATION ---

    it('Organizer can fetch active rubric for hackathon', async () => {
      const res = await request(app)
        .get(`/api/v1/hackathons/${testHackathonId}/rubric`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBeDefined();
      expect(res.body.data.criteria.length).toBeGreaterThanOrEqual(1);

      const totalWeight = res.body.data.criteria.reduce(
        (sum: number, c: any) => sum + Number(c.weightPercentage),
        0
      );
      expect(Math.abs(totalWeight - 100)).toBeLessThanOrEqual(0.05);
    });

    it('Organizer can configure a new rubric if weights sum to 100%', async () => {
      const payload = {
        name: 'Fine-Grained Autonomy Rubric',
        description: 'Comprehensive test criteria',
        criteria: [
          { name: 'Core Functionality', description: 'Works properly', weightPercentage: 40, maxPoints: 10 },
          { name: 'Architecture', description: 'Clean architecture', weightPercentage: 30, maxPoints: 10 },
          { name: 'Innovation', description: 'Novel solution', weightPercentage: 20, maxPoints: 10 },
          { name: 'Presentation', description: 'Clear demo video', weightPercentage: 10, maxPoints: 10 }
        ]
      };

      const res = await request(app)
        .post(`/api/v1/hackathons/${testHackathonId}/rubric`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(payload.name);
      expect(res.body.data.criteria.length).toBe(4);
    });

    it('Rejects rubric configuration if criteria weights do NOT sum to 100%', async () => {
      const invalidPayload = {
        name: 'Invalid Weights Rubric',
        description: 'Weights sum to 80%',
        criteria: [
          { name: 'Criterion A', description: 'Desc', weightPercentage: 50, maxPoints: 10 },
          { name: 'Criterion B', description: 'Desc', weightPercentage: 30, maxPoints: 10 }
        ]
      };

      const res = await request(app)
        .post(`/api/v1/hackathons/${testHackathonId}/rubric`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.message || res.body.message).toMatch(/100/);
    });

    it('Rejects rubric with duplicate criterion names', async () => {
      const dupPayload = {
        name: 'Duplicate Criteria Rubric',
        description: 'Duplicate names',
        criteria: [
          { name: 'Code Quality', description: 'Desc 1', weightPercentage: 50, maxPoints: 10 },
          { name: 'Code Quality', description: 'Desc 2', weightPercentage: 50, maxPoints: 10 }
        ]
      };

      const res = await request(app)
        .post(`/api/v1/hackathons/${testHackathonId}/rubric`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(dupPayload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.message || res.body.message).toMatch(/duplicate/i);
    });

    it('Participant cannot configure or update rubrics (RBAC 403)', async () => {
      const res = await request(app)
        .post(`/api/v1/hackathons/${testHackathonId}/rubric`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          name: 'Hacker Rubric',
          criteria: [{ name: 'Free Pass', description: 'Auto 100', weightPercentage: 100, maxPoints: 10 }]
        });

      expect(res.status).toBe(403);
    });

    // --- JUDGE EVALUATION CONSOLE & IDOR ---

    it('Judge can fetch evaluation console for their assigned project', async () => {
      const res = await request(app)
        .get(`/api/v1/assignments/${judgeAssignmentId}/evaluation`)
        .set('Authorization', `Bearer ${judgeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assignment).toBeDefined();
      expect(res.body.data.rubric).toBeDefined();
      expect(res.body.data.rubric.criteria.length).toBeGreaterThanOrEqual(1);
    });

    it('Judge CANNOT access or score another judge\'s assignment (IDOR 403)', async () => {
      const res = await request(app)
        .get(`/api/v1/assignments/${otherJudgeAssignmentId}/evaluation`)
        .set('Authorization', `Bearer ${judgeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error?.message || res.body.message).toMatch(/assigned to you/i);
    });

    it('Participant cannot access judging evaluation endpoints (RBAC 403)', async () => {
      const res = await request(app)
        .get(`/api/v1/assignments/${judgeAssignmentId}/evaluation`)
        .set('Authorization', `Bearer ${participantToken}`);

      expect(res.status).toBe(403);
    });

    // --- SCORING, VALIDATION & SERVER-SIDE WEIGHTING ---

    it('Judge can save an evaluation draft with partial scores', async () => {
      // First get rubric criteria
      const consoleRes = await request(app)
        .get(`/api/v1/assignments/${judgeAssignmentId}/evaluation`)
        .set('Authorization', `Bearer ${judgeToken}`);

      const criteria = consoleRes.body.data.rubric.criteria;
      const draftPayload = {
        scores: [
          { criterionId: criteria[0].id, score: 8.5, feedback: 'Promising code structure' }
        ],
        feedback: 'Draft notes in progress'
      };

      const res = await request(app)
        .post(`/api/v1/assignments/${judgeAssignmentId}/evaluation/draft`)
        .set('Authorization', `Bearer ${judgeToken}`)
        .send(draftPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DRAFT');
    });

    it('Submission requires scores for ALL rubric criteria to submit final', async () => {
      const consoleRes = await request(app)
        .get(`/api/v1/assignments/${judgeAssignmentId}/evaluation`)
        .set('Authorization', `Bearer ${judgeToken}`);

      const criteria = consoleRes.body.data.rubric.criteria;
      // Provide score for only 1 criterion out of 4
      const incompletePayload = {
        scores: [
          { criterionId: criteria[0].id, score: 9.0 }
        ],
        feedback: 'Incomplete'
      };

      const res = await request(app)
        .post(`/api/v1/assignments/${judgeAssignmentId}/evaluation/submit`)
        .set('Authorization', `Bearer ${judgeToken}`)
        .send(incompletePayload);

      expect(res.status).toBe(400);
      expect(res.body.error?.message || res.body.message).toMatch(/Missing score/i);
    });

    it('Rejects criterion score that exceeds maxPoints (e.g. 15 / 10)', async () => {
      const consoleRes = await request(app)
        .get(`/api/v1/assignments/${judgeAssignmentId}/evaluation`)
        .set('Authorization', `Bearer ${judgeToken}`);

      const criteria = consoleRes.body.data.rubric.criteria;
      const outOfBoundsScores = criteria.map((c: any, idx: number) => ({
        criterionId: c.id,
        score: idx === 0 ? 15.0 : 8.0 // 15 exceeds maxPoints 10
      }));

      const res = await request(app)
        .post(`/api/v1/assignments/${judgeAssignmentId}/evaluation/submit`)
        .set('Authorization', `Bearer ${judgeToken}`)
        .send({ scores: outOfBoundsScores, feedback: 'Out of bounds test' });

      expect(res.status).toBe(400);
      expect(res.body.error?.message || res.body.message).toMatch(/out of bounds/i);
    });

    it('Server computes raw weighted score correctly and ignores spoofed values', async () => {
      const consoleRes = await request(app)
        .get(`/api/v1/assignments/${judgeAssignmentId}/evaluation`)
        .set('Authorization', `Bearer ${judgeToken}`);

      const criteria = consoleRes.body.data.rubric.criteria;
      // All criteria scored at full maxPoints (10 / 10)
      const validScores = criteria.map((c: any) => ({
        criterionId: c.id,
        score: c.maxPoints,
        feedback: 'Excellent'
      }));

      const res = await request(app)
        .post(`/api/v1/assignments/${judgeAssignmentId}/evaluation/submit`)
        .set('Authorization', `Bearer ${judgeToken}`)
        .send({
          scores: validScores,
          feedback: 'Comprehensive evaluation completed successfully.',
          rawWeightedScore: 42.0 // Client attempts to spoof score to 42
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SUBMITTED');
      // Must be 100, NOT spoofed 42
      expect(res.body.data.rawWeightedScore).toBe(100);
    });

    it('Submitted evaluation is locked against casual re-submission or edits', async () => {
      const consoleRes = await request(app)
        .get(`/api/v1/assignments/${judgeAssignmentId}/evaluation`)
        .set('Authorization', `Bearer ${judgeToken}`);

      const criteria = consoleRes.body.data.rubric.criteria;
      const scores = criteria.map((c: any) => ({
        criterionId: c.id,
        score: 5.0
      }));

      // Judge attempts to overwrite submitted evaluation
      const res = await request(app)
        .post(`/api/v1/assignments/${judgeAssignmentId}/evaluation/submit`)
        .set('Authorization', `Bearer ${judgeToken}`)
        .send({ scores, feedback: 'Attempted overwrite' });

      expect(res.status).toBe(400);
      expect(res.body.error?.message || res.body.message).toMatch(/already submitted/i);
    });

    // --- ORGANIZER JUDGING MONITOR ---

    it('Organizer can view the judging progress monitor', async () => {
      const res = await request(app)
        .get(`/api/v1/hackathons/${testHackathonId}/judging-monitor`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalAssignments).toBeGreaterThanOrEqual(1);
      expect(res.body.data.completedEvaluations).toBeGreaterThanOrEqual(1);
      expect(res.body.data.completionPercentage).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(res.body.data.judgeProgress)).toBe(true);
      expect(Array.isArray(res.body.data.submissionProgress)).toBe(true);
    });
  });
});
