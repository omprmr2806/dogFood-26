import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('Security & Middleware Verification', () => {
  const app = createApp();

  it('should include secure HTTP headers configured by Helmet', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.headers).toHaveProperty('x-content-type-options', 'nosniff');
    expect(res.headers).toHaveProperty('x-frame-options', 'SAMEORIGIN');
    expect(res.headers).toHaveProperty('content-security-policy');
  });

  it('should return 404 for unknown endpoints in structured format', async () => {
    const res = await request(app).get('/api/v1/unknown-endpoint');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found'
      },
      meta: expect.objectContaining({
        timestamp: expect.any(String)
      })
    });
  });
});
