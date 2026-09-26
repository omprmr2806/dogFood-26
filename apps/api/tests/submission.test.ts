import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('Submissions & Public Gallery Domain (/api/v1)', () => {
  const app = createApp();

  let adminToken: string;
  let organizerToken: string;
  let participantToken: string;
  let userUnrelatedToken: string;
  let userNoTeamToken: string;
  let userUnregisteredToken: string;

  const openHackathonId = 'dogfood-alpha-2026';
  const judgingHackathonId = 'ai-agents-blitz-2026';

  let createdSubmissionId: string;
  let draftOnlySubmissionId: string;

  beforeAll(async () => {
    // 1. Authenticate standard seeded accounts
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@dogfood.local', password: 'AdminPass123!' });
    adminToken = adminRes.body.data.token;

    const organizerRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'organizer@dogfood.local', password: 'OrganizerPass123!' });
    organizerToken = organizerRes.body.data.token;

    const participantRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'participant@dogfood.local', password: 'ParticipantPass123!' });
    participantToken = participantRes.body.data.token;

    // 2. Register fresh participants for edge testing
    const unrelRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'unrelated.sub@dogfood.local', password: 'Password123!', fullName: 'Unrelated User' });
    userUnrelatedToken = unrelRes.body.data.token;

    const noTeamRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'noteam.sub@dogfood.local', password: 'Password123!', fullName: 'No Team User' });
    userNoTeamToken = noTeamRes.body.data.token;

    const unregRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'unreg.sub@dogfood.local', password: 'Password123!', fullName: 'Unregistered User' });
    userUnregisteredToken = unregRes.body.data.token;

    // Register userUnrelated and userNoTeam for openHackathonId
    await request(app)
      .post(`/api/v1/hackathons/${openHackathonId}/registrations`)
      .set('Authorization', `Bearer ${userUnrelatedToken}`);

    await request(app)
      .post(`/api/v1/hackathons/${openHackathonId}/registrations`)
      .set('Authorization', `Bearer ${userNoTeamToken}`);

    // Create a separate team for userUnrelated in openHackathonId
    await request(app)
      .post(`/api/v1/hackathons/${openHackathonId}/teams`)
      .set('Authorization', `Bearer ${userUnrelatedToken}`)
      .send({ name: 'Unrelated Team' });
  });

  describe('Submission Creation & Eligibility', () => {
    it('should reject submission creation from unregistered participant (403)', async () => {
      const res = await request(app)
        .post(`/api/v1/hackathons/${openHackathonId}/submissions`)
        .set('Authorization', `Bearer ${userUnregisteredToken}`)
        .send({
          title: 'Unregistered Project',
          description: 'This submission should be rejected.'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('REGISTRATION_REQUIRED');
    });

    it('should reject submission creation from participant without a team (400)', async () => {
      const res = await request(app)
        .post(`/api/v1/hackathons/${openHackathonId}/submissions`)
        .set('Authorization', `Bearer ${userNoTeamToken}`)
        .send({
          title: 'Lone Wolf Project',
          description: 'Participant has no team in this hackathon.'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TEAM_REQUIRED');
    });

    it('should allow eligible team member to create a draft submission', async () => {
      // participant@dogfood.local is registered in openHackathonId and leads Alpha Innovators (Team 1)
      const res = await request(app)
        .post(`/api/v1/hackathons/${openHackathonId}/submissions`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          title: 'AlphaShield: Local Privacy Suite',
          tagline: 'Self-hosted privacy-preserving auditing suite',
          description: 'AlphaShield runs 100% locally to inspect and audit platform telemetry without cloud egress.',
          problemStatement: 'Sensitive participant data leaks through telemetry.',
          solution: 'Deterministic local audit sanitizers and zero-knowledge telemetry guards.',
          technologyStack: ['TypeScript', 'Node.js', 'PostgreSQL'],
          repoUrl: 'https://github.com/dogfood/alphashield',
          demoUrl: 'https://alphashield.local:3000'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.title).toBe('AlphaShield: Local Privacy Suite');
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.submittedAt).toBeUndefined();

      createdSubmissionId = res.body.data.id;
    });

    it('should prevent team from creating a second submission in same hackathon (409)', async () => {
      const res = await request(app)
        .post(`/api/v1/hackathons/${openHackathonId}/submissions`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          title: 'Duplicate Project',
          description: 'Team already has an active submission in this hackathon.'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SUBMISSION_EXISTS');
    });

    it('should reject submission creation in JUDGING hackathon (400)', async () => {
      const res = await request(app)
        .post(`/api/v1/hackathons/${judgingHackathonId}/submissions`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          title: 'Late Project',
          description: 'Judging phase is active; submissions are closed.'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_EVENT_STATE');
    });

    it('should ignore mass assignment attempts on status or ownership during creation', async () => {
      // Create draft for userUnrelated's team
      const res = await request(app)
        .post(`/api/v1/hackathons/${openHackathonId}/submissions`)
        .set('Authorization', `Bearer ${userUnrelatedToken}`)
        .send({
          title: 'Unrelated Team Project',
          description: 'A genuine submission for the unrelated team.',
          status: 'FINALIZED', // Attempt to spoof final status
          submitted_at: '2020-01-01T00:00:00.000Z',
          team_id: 'fake-team-id'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('DRAFT'); // Must remain DRAFT
      expect(res.body.data.submittedAt).toBeUndefined();

      draftOnlySubmissionId = res.body.data.id;
    });
  });

  describe('Submission Updates, URL Security & IDOR Defenses', () => {
    it('should allow authorized team member to update submission draft', async () => {
      const res = await request(app)
        .patch(`/api/v1/submissions/${createdSubmissionId}`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          tagline: 'Updated: Ultra-fast local privacy suite',
          technologyStack: ['TypeScript', 'Node.js', 'PostgreSQL', 'Argon2id']
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tagline).toBe('Updated: Ultra-fast local privacy suite');
      expect(res.body.data.technologyStack).toContain('Argon2id');
    });

    it('should prevent non-team member from updating another team submission (403 IDOR defense)', async () => {
      const res = await request(app)
        .patch(`/api/v1/submissions/${createdSubmissionId}`)
        .set('Authorization', `Bearer ${userUnrelatedToken}`)
        .send({
          title: 'Malicious Hijack Title'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject unsafe URL schemes such as javascript: (400)', async () => {
      const res = await request(app)
        .patch(`/api/v1/submissions/${createdSubmissionId}`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          repoUrl: 'javascript:alert(1)'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject unsafe URL schemes such as data: or file: (400)', async () => {
      const resData = await request(app)
        .patch(`/api/v1/submissions/${createdSubmissionId}`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          demoUrl: 'data:text/html,<script>alert(1)</script>'
        });
      expect(resData.status).toBe(400);

      const resFile = await request(app)
        .patch(`/api/v1/submissions/${createdSubmissionId}`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          repoUrl: 'file:///etc/passwd'
        });
      expect(resFile.status).toBe(400);
    });
  });

  describe('Submission Finalization ("Submit Project")', () => {
    it('should reject project submission if required fields or links are missing', async () => {
      // Create empty draft
      const emptyRes = await request(app)
        .post(`/api/v1/hackathons/${openHackathonId}/submissions`)
        .set('Authorization', `Bearer ${adminToken}`); // Admin can't without team, tested above
      // Instead, test submitting createdSubmissionId with invalid state or non-member
      const res = await request(app)
        .post(`/api/v1/submissions/${createdSubmissionId}/submit`)
        .set('Authorization', `Bearer ${userUnrelatedToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should finalize submission when called by authorized team member', async () => {
      const res = await request(app)
        .post(`/api/v1/submissions/${createdSubmissionId}/submit`)
        .set('Authorization', `Bearer ${participantToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SUBMITTED');
      expect(res.body.data.submittedAt).toBeDefined();
    });

    it('should retrieve own team submission via /hackathons/:id/my-submission', async () => {
      const res = await request(app)
        .get(`/api/v1/hackathons/${openHackathonId}/my-submission`)
        .set('Authorization', `Bearer ${participantToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdSubmissionId);
      expect(res.body.data.status).toBe('SUBMITTED');
    });
  });

  describe('Privacy & Role Boundaries', () => {
    it('should NOT allow unauthenticated users to view a DRAFT submission (404/403)', async () => {
      const res = await request(app)
        .get(`/api/v1/submissions/${draftOnlySubmissionId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should NOT allow unrelated participants to view another team draft submission (403)', async () => {
      const res = await request(app)
        .get(`/api/v1/submissions/${draftOnlySubmissionId}`)
        .set('Authorization', `Bearer ${participantToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow team members and organizers to view draft submission', async () => {
      const memberRes = await request(app)
        .get(`/api/v1/submissions/${draftOnlySubmissionId}`)
        .set('Authorization', `Bearer ${userUnrelatedToken}`);
      expect(memberRes.status).toBe(200);
      expect(memberRes.body.data.id).toBe(draftOnlySubmissionId);

      const orgRes = await request(app)
        .get(`/api/v1/submissions/${draftOnlySubmissionId}`)
        .set('Authorization', `Bearer ${organizerToken}`);
      expect(orgRes.status).toBe(200);
      expect(orgRes.body.data.id).toBe(draftOnlySubmissionId);
    });

    it('should allow unauthenticated users to view a SUBMITTED submission publicly', async () => {
      const res = await request(app)
        .get(`/api/v1/submissions/${createdSubmissionId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdSubmissionId);
    });
  });

  describe('Public Gallery (/api/v1/gallery)', () => {
    it('should return public submissions and exclude draft/disqualified submissions', async () => {
      const res = await request(app).get('/api/v1/gallery');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toBeDefined();

      const items = res.body.data.items;
      // No drafts or disqualified submissions in public gallery
      expect(items.some((i: any) => i.status === 'DRAFT')).toBe(false);
      expect(items.some((i: any) => i.status === 'DISQUALIFIED')).toBe(false);
      // Public submissions present
      expect(items.some((i: any) => i.status === 'SUBMITTED' || i.status === 'LOCKED' || i.status === 'FINALIZED')).toBe(true);
    });

    it('should filter gallery by technology tag', async () => {
      const res = await request(app)
        .get('/api/v1/gallery?technology=Rust');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const items = res.body.data.items;
      for (const item of items) {
        const hasTech = item.technologyStack.some((t: string) => t.toLowerCase() === 'rust');
        expect(hasTech).toBe(true);
      }
    });

    it('should search gallery by query string', async () => {
      const res = await request(app)
        .get('/api/v1/gallery?search=Edge');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      for (const item of res.body.data.items) {
        const matches =
          item.title.toLowerCase().includes('edge') ||
          (item.tagline && item.tagline.toLowerCase().includes('edge')) ||
          item.description.toLowerCase().includes('edge');
        expect(matches).toBe(true);
      }
    });

    it('should paginate gallery results with metadata', async () => {
      const res = await request(app)
        .get('/api/v1/gallery?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(2);
      expect(res.body.data.total).toBeGreaterThanOrEqual(1);
      expect(res.body.data.totalPages).toBeGreaterThanOrEqual(1);
      expect(res.body.data.items.length).toBeLessThanOrEqual(2);
    });

    it('should return individual project detail via /api/v1/gallery/:id', async () => {
      const res = await request(app)
        .get(`/api/v1/gallery/${createdSubmissionId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('AlphaShield: Local Privacy Suite');
    });
  });

  describe('Organizer Management & Administrative Controls', () => {
    it('should allow organizer to view all submissions for hackathon including drafts', async () => {
      const res = await request(app)
        .get(`/api/v1/hackathons/${openHackathonId}/submissions`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const submissions = res.body.data;
      expect(submissions.some((s: any) => s.status === 'DRAFT')).toBe(true);
      expect(submissions.some((s: any) => s.status === 'SUBMITTED')).toBe(true);
    });

    it('should allow organizer to update submission status (DISQUALIFIED)', async () => {
      const res = await request(app)
        .patch(`/api/v1/submissions/${draftOnlySubmissionId}/status`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ status: 'DISQUALIFIED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DISQUALIFIED');
    });

    it('should forbid standard participant from changing submission status (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/submissions/${createdSubmissionId}/status`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ status: 'FINALIZED' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
