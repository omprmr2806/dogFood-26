import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('Role-Based Access Control (RBAC) Matrix', () => {
  const app = createApp();

  let adminToken: string;
  let organizerToken: string;
  let judgeToken: string;
  let participantToken: string;

  beforeAll(async () => {
    // Authenticate with seeded deterministic demo accounts
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@dogfood.local', password: 'AdminPass123!' });
    adminToken = adminRes.body.data.token;

    const organizerRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'organizer@dogfood.local', password: 'OrganizerPass123!' });
    organizerToken = organizerRes.body.data.token;

    const judgeRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'judge@dogfood.local', password: 'JudgePass123!' });
    judgeToken = judgeRes.body.data.token;

    const participantRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'participant@dogfood.local', password: 'ParticipantPass123!' });
    participantToken = participantRes.body.data.token;
  });

  describe('Unauthenticated Access (401)', () => {
    it('should deny unauthenticated requests to all protected routes with 401', async () => {
      const endpoints = [
        '/api/v1/rbac/admin-test',
        '/api/v1/rbac/organizer-test',
        '/api/v1/rbac/judge-test',
        '/api/v1/rbac/participant-test'
      ];

      for (const endpoint of endpoints) {
        const res = await request(app).get(endpoint);
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHENTICATED');
      }
    });
  });

  describe('ADMIN Access Rights', () => {
    it('should allow ADMIN to access admin endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/rbac/admin-test')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('ADMIN');
    });

    it('should allow ADMIN to access all sub-level endpoints', async () => {
      for (const endpoint of ['/api/v1/rbac/organizer-test', '/api/v1/rbac/judge-test', '/api/v1/rbac/participant-test']) {
        const res = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
      }
    });
  });

  describe('ORGANIZER Access Rights', () => {
    it('should allow ORGANIZER to access organizer endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/rbac/organizer-test')
        .set('Authorization', `Bearer ${organizerToken}`);
      expect(res.status).toBe(200);
    });

    it('should deny ORGANIZER from admin endpoint with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/rbac/admin-test')
        .set('Authorization', `Bearer ${organizerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should deny ORGANIZER from judge-only endpoint with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/rbac/judge-test')
        .set('Authorization', `Bearer ${organizerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('JUDGE Access Rights', () => {
    it('should allow JUDGE to access judge endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/rbac/judge-test')
        .set('Authorization', `Bearer ${judgeToken}`);
      expect(res.status).toBe(200);
    });

    it('should deny JUDGE from admin and organizer endpoints with 403 Forbidden', async () => {
      for (const endpoint of ['/api/v1/rbac/admin-test', '/api/v1/rbac/organizer-test']) {
        const res = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${judgeToken}`);
        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('PARTICIPANT Access Rights', () => {
    it('should allow PARTICIPANT to access participant endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/rbac/participant-test')
        .set('Authorization', `Bearer ${participantToken}`);
      expect(res.status).toBe(200);
    });

    it('should deny PARTICIPANT from admin, organizer, and judge endpoints with 403 Forbidden', async () => {
      for (const endpoint of ['/api/v1/rbac/admin-test', '/api/v1/rbac/organizer-test', '/api/v1/rbac/judge-test']) {
        const res = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${participantToken}`);
        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
      }
    });
  });
});
