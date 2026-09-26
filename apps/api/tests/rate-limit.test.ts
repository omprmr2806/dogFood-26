import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('Authentication Rate Limiter', () => {
  const app = createApp();

  it('should trigger 429 when rate limit threshold is exceeded', async () => {
    // Make 10 requests which should pass rate limit (even if rejected with 400 validation)
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/api/v1/auth/login')
        .set('x-test-rate-limit', 'true')
        .set('x-forwarded-for', '192.168.1.100')
        .send({ email: 'rate@example.com', password: 'password' });
    }

    // 11th request must be rejected with 429
    const limitedRes = await request(app)
      .post('/api/v1/auth/login')
      .set('x-test-rate-limit', 'true')
      .set('x-forwarded-for', '192.168.1.100')
      .send({ email: 'rate@example.com', password: 'password' });

    expect(limitedRes.status).toBe(429);
    expect(limitedRes.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});
