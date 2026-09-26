import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('Authentication API (/api/v1/auth)', () => {
  const app = createApp();
  const testEmail = `testuser_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  let sessionCookie: string;
  let authToken: string;

  it('should successfully register a new participant', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        fullName: 'Test Participant'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe(testEmail.toLowerCase());
    expect(res.body.data.user.role).toBe('PARTICIPANT');
    expect(res.body.data.user.fullName).toBe('Test Participant');

    // Security check: passwords and hashes must NEVER be returned
    expect(res.body.data.user).not.toHaveProperty('password');
    expect(res.body.data.user).not.toHaveProperty('password_hash');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');

    // Verify session cookie was set
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieStr = Array.isArray(cookies) ? cookies.join(';') : cookies;
    expect(cookieStr).toContain('dogfood_session');
    expect(cookieStr).toContain('HttpOnly');
  });

  it('should reject duplicate email registration with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: 'AnotherPassword123!',
        fullName: 'Duplicate User'
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EMAIL_EXISTS');
  });

  it('should reject registration with malformed email or weak password', async () => {
    const badEmailRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'invalid-email',
        password: 'Password123!',
        fullName: 'Test'
      });
    expect(badEmailRes.status).toBe(400);

    const weakPasswordRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'valid@example.com',
        password: 'short',
        fullName: 'Test'
      });
    expect(weakPasswordRes.status).toBe(400);
  });

  it('should prevent mass assignment privilege escalation on registration', async () => {
    const privilegedEmail = `hacker_${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: privilegedEmail,
        password: testPassword,
        fullName: 'Malicious Actor',
        role: 'ADMIN' // Attempt to escalate role
      });

    // Zod strict schema rejects unknown role property with 400
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should successfully login and return session cookie and token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: testPassword
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testEmail.toLowerCase());
    expect(res.body.data.token).toBeDefined();

    // Save cookie and token for subsequent authenticated tests
    authToken = res.body.data.token;
    const cookies = res.headers['set-cookie'];
    sessionCookie = Array.isArray(cookies) ? cookies[0] : cookies;
  });

  it('should reject login with incorrect password with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: 'WrongPassword123!'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('should reject login for non-existent user with generic 401 message (no user enumeration)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'doesnotexist@example.com',
        password: 'SomePassword123!'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('should fetch current authenticated user profile via /auth/me with Bearer token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testEmail.toLowerCase());
    expect(res.body.data.user).not.toHaveProperty('password');
    expect(res.body.data.user).not.toHaveProperty('password_hash');
  });

  it('should fetch current authenticated user profile via /auth/me with session cookie', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testEmail.toLowerCase());
  });

  it('should return 401 for unauthenticated /auth/me request', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('should successfully logout and invalidate server session', async () => {
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${authToken}`);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    // Subsequent call with the same token should now be rejected as revoked
    const afterLogoutRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(afterLogoutRes.status).toBe(401);
    expect(afterLogoutRes.body.error.code).toBe('SESSION_REVOKED');
  });
});
