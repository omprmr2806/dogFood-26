import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('GET /api/v1/health', () => {
  const app = createApp();

  it('should return 200 with structured health status', async () => {
    const res = await request(app).get('/api/v1/health');
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('services');
    expect(res.body.services.api).toBe('healthy');
  });

  it('should not expose database credentials or secrets', async () => {
    const res = await request(app).get('/api/v1/health');
    const responseText = JSON.stringify(res.body);

    expect(responseText).not.toContain('password');
    expect(responseText).not.toContain('dogfood_password');
    expect(responseText).not.toContain('secret');
  });
});
