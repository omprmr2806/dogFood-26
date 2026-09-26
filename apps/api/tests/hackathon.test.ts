import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('Hackathon Event Lifecycle & RBAC (/api/v1/hackathons)', () => {
  const app = createApp();

  let adminToken: string;
  let organizerToken: string;
  let participantToken: string;

  beforeAll(async () => {
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
  });

  describe('Event Creation & Permissions', () => {
    it('should allow ORGANIZER to create a valid hackathon in DRAFT state', async () => {
      const res = await request(app)
        .post('/api/v1/hackathons')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          name: 'AI Agents Challenge 2026',
          slug: 'ai-agents-challenge-2026',
          shortDescription: 'Autonomous agent hackathon',
          description: 'A comprehensive challenge for testing multi-agent systems and real-world tools.',
          rules: 'Zero plagiarism. Open source tools only.',
          minTeamSize: 1,
          maxTeamSize: 4
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hackathon.slug).toBe('ai-agents-challenge-2026');
      expect(res.body.data.hackathon.status).toBe('DRAFT');
      expect(res.body.data.hackathon.minTeamSize).toBe(1);
      expect(res.body.data.hackathon.maxTeamSize).toBe(4);
    });

    it('should forbid PARTICIPANT from creating an event (403)', async () => {
      const res = await request(app)
        .post('/api/v1/hackathons')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          name: 'Participant Created Event',
          slug: 'participant-event',
          description: 'Should not be allowed'
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject unauthenticated request to create an event (401)', async () => {
      const res = await request(app)
        .post('/api/v1/hackathons')
        .send({
          name: 'Unauthenticated Event',
          slug: 'unauth-event',
          description: 'Should not be allowed'
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('should reject duplicate slug with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/hackathons')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          name: 'Duplicate Slug Event',
          slug: 'ai-agents-challenge-2026',
          description: 'Testing duplicate slug constraint'
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('SLUG_EXISTS');
    });

    it('should reject invalid team configuration (minTeamSize > maxTeamSize) with 400', async () => {
      const res = await request(app)
        .post('/api/v1/hackathons')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          name: 'Invalid Team Size Event',
          slug: 'invalid-team-size',
          description: 'Testing invalid team sizes',
          minTeamSize: 5,
          maxTeamSize: 2
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject malformed slug formatting with 400', async () => {
      const res = await request(app)
        .post('/api/v1/hackathons')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          name: 'Invalid Slug Event',
          slug: 'Invalid Slug with Spaces & Caps!',
          description: 'Testing slug regex'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Event Retrieval & Visibility', () => {
    it('should list published hackathons publicly', async () => {
      const res = await request(app).get('/api/v1/hackathons');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.hackathons)).toBe(true);

      // Verify no DRAFT event is visible publicly without auth
      const drafts = res.body.data.hackathons.filter(
        (h: { status: string }) => h.status === 'DRAFT'
      );
      expect(drafts.length).toBe(0);
    });

    it('should allow ORGANIZER to see DRAFT events in list', async () => {
      const res = await request(app)
        .get('/api/v1/hackathons')
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      const drafts = res.body.data.hackathons.filter(
        (h: { status: string }) => h.status === 'DRAFT'
      );
      expect(drafts.length).toBeGreaterThanOrEqual(1);
    });

    it('should retrieve a single hackathon by slug', async () => {
      const res = await request(app).get('/api/v1/hackathons/dogfood-alpha-2026');

      expect(res.status).toBe(200);
      expect(res.body.data.hackathon.slug).toBe('dogfood-alpha-2026');
      expect(res.body.data.hackathon.status).toBe('OPEN');
    });

    it('should return 404 for unauthenticated access to a DRAFT hackathon', async () => {
      const res = await request(app).get('/api/v1/hackathons/robotics-sprint-2026');
      expect(res.status).toBe(404);
    });

    it('should allow ORGANIZER to view a DRAFT hackathon', async () => {
      const res = await request(app)
        .get('/api/v1/hackathons/robotics-sprint-2026')
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.hackathon.status).toBe('DRAFT');
    });
  });

  describe('Event State Transitions', () => {
    it('should allow ORGANIZER to perform valid transition (DRAFT -> OPEN)', async () => {
      const res = await request(app)
        .post('/api/v1/hackathons/robotics-sprint-2026/transitions')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          targetStatus: 'OPEN',
          reason: 'Ready for public registration'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.hackathon.status).toBe('OPEN');
    });

    it('should reject invalid transition (e.g. OPEN -> COMPLETED without RUNNING/JUDGING)', async () => {
      const res = await request(app)
        .post('/api/v1/hackathons/robotics-sprint-2026/transitions')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          targetStatus: 'COMPLETED',
          reason: 'Illegal skip'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('should reject unauthorized state transition by PARTICIPANT (403)', async () => {
      const res = await request(app)
        .post('/api/v1/hackathons/robotics-sprint-2026/transitions')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          targetStatus: 'RUNNING'
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Event Updates', () => {
    it('should allow ORGANIZER to update event details', async () => {
      const res = await request(app)
        .patch('/api/v1/hackathons/robotics-sprint-2026')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          name: 'Updated Dogfood Hackathon Name',
          rules: 'Updated rules text'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.hackathon.name).toBe('Updated Dogfood Hackathon Name');
      expect(res.body.data.hackathon.rules).toBe('Updated rules text');
    });

    it('should forbid PARTICIPANT from updating event details (403)', async () => {
      const res = await request(app)
        .patch('/api/v1/hackathons/robotics-sprint-2026')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          name: 'Hacked Name'
        });

      expect(res.status).toBe(403);
    });
  });
});
