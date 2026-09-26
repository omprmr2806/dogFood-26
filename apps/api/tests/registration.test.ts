import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('Hackathon Registration Workflow & Security (/api/v1/hackathons/:id/registrations)', () => {
  const app = createApp();

  let adminToken: string;
  let organizerToken: string;
  let participantToken: string;
  let secondParticipantToken: string;
  let createdRegistrationId: string;

  beforeAll(async () => {
    // Authenticate primary users
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

    // Register a second participant to test multi-user isolation
    const reg2 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'alice.hacker@dogfood.local',
        password: 'AlicePassword123!',
        fullName: 'Alice Hacker'
      });
    secondParticipantToken = reg2.body.data.token;
  });

  describe('Participant Registration Flow', () => {
    it('should reject unauthenticated registration attempt with 401', async () => {
      const res = await request(app)
        .post('/api/v1/hackathons/dogfood-alpha-2026/registrations');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('should reject registration when hackathon is NOT in OPEN state (e.g. RUNNING)', async () => {
      const res = await request(app)
        .post('/api/v1/hackathons/cloud-systems-2026/registrations')
        .set('Authorization', `Bearer ${secondParticipantToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_EVENT_STATE');
    });

    it('should allow authenticated PARTICIPANT to register for an OPEN hackathon', async () => {
      const res = await request(app)
        .post('/api/v1/hackathons/dogfood-alpha-2026/registrations')
        .set('Authorization', `Bearer ${secondParticipantToken}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.registration.status).toBe('ACCEPTED');
      expect(res.body.data.registration.hackathonId).toBe('10000000-0000-0000-0000-000000000002');
      createdRegistrationId = res.body.data.registration.id;
    });

    it('should reject duplicate registration with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/hackathons/dogfood-alpha-2026/registrations')
        .set('Authorization', `Bearer ${secondParticipantToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_REGISTERED');
    });

    it('should allow participant to view their own registration', async () => {
      const res = await request(app)
        .get('/api/v1/hackathons/dogfood-alpha-2026/registration')
        .set('Authorization', `Bearer ${secondParticipantToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.registration).not.toBeNull();
      expect(res.body.data.registration.id).toBe(createdRegistrationId);
    });

    it('should return null registration for a user who has not registered', async () => {
      const res = await request(app)
        .get('/api/v1/hackathons/cloud-systems-2026/registration')
        .set('Authorization', `Bearer ${secondParticipantToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.registration).toBeNull();
    });
  });

  describe('Registration Management & IDOR Protection', () => {
    it('should allow ORGANIZER to view all registrations for an event', async () => {
      const res = await request(app)
        .get('/api/v1/hackathons/dogfood-alpha-2026/registrations')
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.registrations)).toBe(true);
      expect(res.body.data.registrations.length).toBeGreaterThanOrEqual(1);

      // Verify participant details are populated for organizers
      const reg = res.body.data.registrations.find((r: { id: string }) => r.id === createdRegistrationId);
      expect(reg).toBeDefined();
      expect(reg.user.email).toBe('alice.hacker@dogfood.local');
    });

    it('should forbid PARTICIPANT from viewing all registrations list (403)', async () => {
      const res = await request(app)
        .get('/api/v1/hackathons/dogfood-alpha-2026/registrations')
        .set('Authorization', `Bearer ${participantToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should forbid PARTICIPANT from approving/modifying their own or another registration (IDOR Guard)', async () => {
      const res = await request(app)
        .patch(`/api/v1/hackathons/dogfood-alpha-2026/registrations/${createdRegistrationId}`)
        .set('Authorization', `Bearer ${secondParticipantToken}`)
        .send({ status: 'CHECKED_IN' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow ORGANIZER to update registration status (e.g. CHECKED_IN)', async () => {
      const res = await request(app)
        .patch(`/api/v1/hackathons/dogfood-alpha-2026/registrations/${createdRegistrationId}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ status: 'CHECKED_IN' });

      expect(res.status).toBe(200);
      expect(res.body.data.registration.status).toBe('CHECKED_IN');
    });

    it('should reject invalid registration status with 400', async () => {
      const res = await request(app)
        .patch(`/api/v1/hackathons/dogfood-alpha-2026/registrations/${createdRegistrationId}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ status: 'INVALID_STATUS' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Privacy & Data Isolation', () => {
    it('should not leak participant email addresses in public hackathon details', async () => {
      const res = await request(app).get('/api/v1/hackathons/dogfood-alpha-2026');

      expect(res.status).toBe(200);
      const jsonStr = JSON.stringify(res.body);
      expect(jsonStr).not.toContain('alice.hacker@dogfood.local');
      expect(jsonStr).not.toContain('participant@dogfood.local');
    });
  });
});
