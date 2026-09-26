import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { JudgeAssignmentService } from '../src/services/judge-assignment.service';
import { JudgeStatus } from '@dogfood/shared';

describe('Phase 6 — Judge Management & Automated Judge Assignment', () => {
  // =========================================================================
  // 1. ISOLATED ALGORITHM TESTS (JudgeAssignmentService direct unit tests)
  // =========================================================================
  describe('JudgeAssignmentService (Isolated Unit Tests)', () => {
    const service = new JudgeAssignmentService();

    it('CASE 1: 4 judges, 8 submissions, 2 judges/submission -> 16 total assignments, balanced distribution', () => {
      const judges = [
        { id: 'judge-1', fullName: 'Judge One', email: 'j1@dogfood.local', status: JudgeStatus.ACTIVE },
        { id: 'judge-2', fullName: 'Judge Two', email: 'j2@dogfood.local', status: JudgeStatus.ACTIVE },
        { id: 'judge-3', fullName: 'Judge Three', email: 'j3@dogfood.local', status: JudgeStatus.ACTIVE },
        { id: 'judge-4', fullName: 'Judge Four', email: 'j4@dogfood.local', status: JudgeStatus.ACTIVE }
      ];

      const submissions = Array.from({ length: 8 }, (_, i) => ({
        id: `sub-${i + 1}`,
        title: `Submission ${i + 1}`,
        teamId: `team-${i + 1}`
      }));

      const result = service.execute({
        hackathonId: 'hack-test-1',
        judgesPerSubmission: 2,
        judges,
        submissions,
        teamMemberships: [],
        conflicts: []
      });

      expect(result.success).toBe(true);
      expect(result.totalAssignments).toBe(16);
      expect(result.assignments.length).toBe(16);

      // Workload should be perfectly balanced: 16 assignments / 4 judges = 4 per judge
      for (const stat of result.workloadStats) {
        expect(stat.assignmentCount).toBe(4);
      }

      // No duplicate judge for any submission
      const subJudgeMap = new Map<string, Set<string>>();
      for (const a of result.assignments) {
        if (!subJudgeMap.has(a.submissionId)) {
          subJudgeMap.set(a.submissionId, new Set());
        }
        expect(subJudgeMap.get(a.submissionId)!.has(a.judgeId)).toBe(false);
        subJudgeMap.get(a.submissionId)!.add(a.judgeId);
      }

      for (const [_, judgesSet] of subJudgeMap.entries()) {
        expect(judgesSet.size).toBe(2);
      }
    });

    it('CASE 2: Judge A belongs to Team 1 -> Judge A excluded from Team 1 submission', () => {
      const judges = [
        { id: 'judge-a', fullName: 'Judge A', email: 'ja@dogfood.local', status: JudgeStatus.ACTIVE },
        { id: 'judge-b', fullName: 'Judge B', email: 'jb@dogfood.local', status: JudgeStatus.ACTIVE },
        { id: 'judge-c', fullName: 'Judge C', email: 'jc@dogfood.local', status: JudgeStatus.ACTIVE }
      ];

      const submissions = [
        { id: 'sub-team-1', title: 'Team 1 Project', teamId: 'team-1' },
        { id: 'sub-team-2', title: 'Team 2 Project', teamId: 'team-2' }
      ];

      // Judge A belongs to team-1
      const teamMemberships = [
        { teamId: 'team-1', userId: 'judge-a' }
      ];

      const result = service.execute({
        hackathonId: 'hack-test-2',
        judgesPerSubmission: 2,
        judges,
        submissions,
        teamMemberships,
        conflicts: []
      });

      expect(result.success).toBe(true);

      // Check sub-team-1 assignments: Judge A must NOT be assigned
      const team1Assignments = result.assignments.filter((a) => a.submissionId === 'sub-team-1');
      expect(team1Assignments.length).toBe(2);
      expect(team1Assignments.some((a) => a.judgeId === 'judge-a')).toBe(false);
      expect(team1Assignments.map((a) => a.judgeId).sort()).toEqual(['judge-b', 'judge-c']);

      // COI diagnostic must have been captured
      expect(result.conflictsEncountered.some((c) => c.submissionId === 'sub-team-1' && c.judgeId === 'judge-a')).toBe(true);
    });

    it('CASE 3: Only 2 eligible judges remain, K = 3 -> fails safely with clear unassignable diagnostics', () => {
      const judges = [
        { id: 'judge-1', fullName: 'Judge 1', email: 'j1@dogfood.local', status: JudgeStatus.ACTIVE },
        { id: 'judge-2', fullName: 'Judge 2', email: 'j2@dogfood.local', status: JudgeStatus.ACTIVE }
      ];

      const submissions = [
        { id: 'sub-1', title: 'Project 1', teamId: 'team-1' }
      ];

      const result = service.execute({
        hackathonId: 'hack-test-3',
        judgesPerSubmission: 3,
        judges,
        submissions,
        teamMemberships: [],
        conflicts: []
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.totalAssignments).toBe(0);
    });

    it('CASE 4: Determinism: Same input repeated produces identical assignments', () => {
      const judges = [
        { id: 'judge-alpha', fullName: 'Judge Alpha', email: 'ja@dogfood.local', status: JudgeStatus.ACTIVE },
        { id: 'judge-beta', fullName: 'Judge Beta', email: 'jb@dogfood.local', status: JudgeStatus.ACTIVE },
        { id: 'judge-gamma', fullName: 'Judge Gamma', email: 'jg@dogfood.local', status: JudgeStatus.ACTIVE },
        { id: 'judge-delta', fullName: 'Judge Delta', email: 'jd@dogfood.local', status: JudgeStatus.ACTIVE }
      ];

      const submissions = [
        { id: 'sub-z', title: 'Project Z', teamId: 'team-z' },
        { id: 'sub-a', title: 'Project A', teamId: 'team-a' },
        { id: 'sub-m', title: 'Project M', teamId: 'team-m' }
      ];

      const conflicts = [
        { judgeId: 'judge-beta', submissionId: 'sub-a', reason: 'Declared COI' }
      ];

      const input = {
        hackathonId: 'hack-det-1',
        judgesPerSubmission: 2,
        judges,
        submissions,
        teamMemberships: [],
        conflicts
      };

      const run1 = service.execute(input);
      const run2 = service.execute(input);
      const run3 = service.execute(input);

      expect(run1.success).toBe(true);
      expect(run1.assignments).toEqual(run2.assignments);
      expect(run2.assignments).toEqual(run3.assignments);
      expect(run1.workloadStats).toEqual(run2.workloadStats);
    });

    it('CASE 5: Inactive judges are strictly excluded from assignment pool', () => {
      const judges = [
        { id: 'judge-active-1', fullName: 'Active 1', email: 'a1@dogfood.local', status: JudgeStatus.ACTIVE },
        { id: 'judge-active-2', fullName: 'Active 2', email: 'a2@dogfood.local', status: JudgeStatus.ACTIVE },
        { id: 'judge-inactive', fullName: 'Inactive', email: 'i@dogfood.local', status: JudgeStatus.INACTIVE }
      ];

      const submissions = [
        { id: 'sub-1', title: 'Project 1', teamId: 'team-1' }
      ];

      const result = service.execute({
        hackathonId: 'hack-test-5',
        judgesPerSubmission: 2,
        judges,
        submissions,
        teamMemberships: [],
        conflicts: []
      });

      expect(result.success).toBe(true);
      expect(result.assignments.some((a) => a.judgeId === 'judge-inactive')).toBe(false);
      expect(result.assignments.length).toBe(2);
    });
  });

  // =========================================================================
  // 2. INTEGRATION & API ENDPOINTS TESTS (/api/v1/hackathons/:id/judges, etc.)
  // =========================================================================
  describe('Judge Management & Assignment APIs', () => {
    const app = createApp();

    let adminToken: string;
    let organizerToken: string;
    let participantToken: string;
    let judgeToken: string;
    let judgeAliceToken: string;

    const testHackathonId = 'ai-agents-blitz-2026';
    const runningHackathonId = 'cloud-systems-2026';

    beforeAll(async () => {
      // Authenticate seeded accounts
      const adminRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@dogfood.local', password: 'AdminPass123!' });
      adminToken = adminRes.body.data.token;

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
      judgeAliceToken = aliceRes.body.data.token;
    });

    // --- Access Control / RBAC ---
    it('Participant cannot list or manage hackathon judges (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/hackathons/${testHackathonId}/judges`)
        .set('Authorization', `Bearer ${participantToken}`);

      expect(res.status).toBe(403);
    });

    it('Participant cannot add a judge to a hackathon (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/hackathons/${testHackathonId}/judges`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ judgeId: '00000000-0000-0000-0000-000000000003' });

      expect(res.status).toBe(403);
    });

    it('Organizer can list judges enrolled in a hackathon', async () => {
      const res = await request(app)
        .get(`/api/v1/hackathons/${testHackathonId}/judges`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('Organizer can list available system judges for enrollment', async () => {
      const res = await request(app)
        .get(`/api/v1/hackathons/${testHackathonId}/judges/available`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.availableUsers).toBeDefined();
    });

    it('Organizer can add a judge and update their status (activate/deactivate)', async () => {
      // Add Judge Bob to runningHackathonId
      const addRes = await request(app)
        .post(`/api/v1/hackathons/${runningHackathonId}/judges`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ judgeId: '00000000-0000-0000-0000-000000000022', status: 'ACTIVE' });

      expect(addRes.status).toBe(201);
      expect(addRes.body.data.status).toBe('ACTIVE');

      // Update status to INACTIVE
      const updateRes = await request(app)
        .patch(`/api/v1/hackathons/${runningHackathonId}/judges/00000000-0000-0000-0000-000000000022`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ status: 'INACTIVE' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.status).toBe('INACTIVE');
    });

    it('Non-judge user cannot be added as a judge (400 USER_NOT_A_JUDGE)', async () => {
      const res = await request(app)
        .post(`/api/v1/hackathons/${runningHackathonId}/judges`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ judgeId: '00000000-0000-0000-0000-000000000004' }); // participant user id

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('USER_NOT_A_JUDGE');
    });

    // --- Judging Configuration ---
    it('Organizer can read and update judging configuration (judges per submission K)', async () => {
      const getRes = await request(app)
        .get(`/api/v1/hackathons/${testHackathonId}/judging/config`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.judgesPerSubmission).toBeGreaterThanOrEqual(1);

      const patchRes = await request(app)
        .patch(`/api/v1/hackathons/${testHackathonId}/judging/config`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ judgesPerSubmission: 3 });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.judgesPerSubmission).toBe(3);

      // Revert to 2
      await request(app)
        .patch(`/api/v1/hackathons/${testHackathonId}/judging/config`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ judgesPerSubmission: 2 });
    });

    // --- Conflict of Interest Management ---
    it('Organizer can declare and list conflicts of interest', async () => {
      const declareRes = await request(app)
        .post(`/api/v1/hackathons/${runningHackathonId}/judging/conflicts`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          judgeId: '00000000-0000-0000-0000-000000000003',
          reason: 'Advised team on architecture'
        });

      expect(declareRes.status).toBe(201);
      expect(declareRes.body.data.reason).toBe('Advised team on architecture');
      const conflictId = declareRes.body.data.id;

      // List conflicts
      const listRes = await request(app)
        .get(`/api/v1/hackathons/${runningHackathonId}/judging/conflicts`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.some((c: any) => c.id === conflictId)).toBe(true);

      // Remove conflict
      const delRes = await request(app)
        .delete(`/api/v1/hackathons/${runningHackathonId}/judging/conflicts/${conflictId}`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(delRes.status).toBe(200);
    });

    // --- Assignment Preview & Finalization ---
    it('Organizer can generate assignment preview without modifying finalized assignments', async () => {
      const previewRes = await request(app)
        .post(`/api/v1/hackathons/${testHackathonId}/judging/assignments/preview`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ judgesPerSubmission: 2 });

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.data.totalEligibleSubmissions).toBeGreaterThanOrEqual(1);
      expect(previewRes.body.data.assignments).toBeDefined();
      expect(previewRes.body.data.workloadDistribution).toBeDefined();
    });

    it('Finalizing already finalized assignments without forceRegenerate returns 409', async () => {
      const res = await request(app)
        .post(`/api/v1/hackathons/${testHackathonId}/judging/assignments/finalize`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ judgesPerSubmission: 2, forceRegenerate: false });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ASSIGNMENTS_ALREADY_FINALIZED');
    });

    it('Finalizing with forceRegenerate replaces official assignments atomically', async () => {
      const res = await request(app)
        .post(`/api/v1/hackathons/${testHackathonId}/judging/assignments/finalize`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ judgesPerSubmission: 2, forceRegenerate: true });

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
      expect(res.body.data.totalAssignments).toBeGreaterThanOrEqual(2);
    });

    // --- Judge Portal & IDOR Protection ---
    it('Judge can view their assigned projects queue', async () => {
      const res = await request(app)
        .get(`/api/v1/hackathons/${testHackathonId}/judge/my-assignments`)
        .set('Authorization', `Bearer ${judgeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assignments).toBeDefined();
      expect(res.body.data.stats).toBeDefined();
      expect(res.body.data.stats.total).toBe(res.body.data.assignments.length);
    });

    it('Judge cannot view another judge assigned project detail (403 IDOR protected)', async () => {
      // Find an assignment assigned to judge.alice
      const aliceQueue = await request(app)
        .get(`/api/v1/hackathons/${testHackathonId}/judge/my-assignments`)
        .set('Authorization', `Bearer ${judgeAliceToken}`);

      expect(aliceQueue.status).toBe(200);
      if (aliceQueue.body.data.assignments.length > 0) {
        const aliceAssignmentId = aliceQueue.body.data.assignments[0].id;

        // Regular Judge tries to access Alice's assignment detail directly: must be FORBIDDEN
        const idorRes = await request(app)
          .get(`/api/v1/hackathons/${testHackathonId}/judge/assignments/${aliceAssignmentId}`)
          .set('Authorization', `Bearer ${judgeToken}`);

        expect(idorRes.status).toBe(403);
        expect(idorRes.body.error.code).toBe('FORBIDDEN');
      }
    });

    it('Judge cannot access assigned queue for hackathons where they are not an active judge (403)', async () => {
      // Panel judge is not active in dogfood-alpha-2026
      const res = await request(app)
        .get(`/api/v1/hackathons/dogfood-alpha-2026/judge/my-assignments`)
        .set('Authorization', `Bearer ${judgeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('NOT_ACTIVE_JUDGE');
    });
  });
});
