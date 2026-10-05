import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { config } from '../../src/config/index.js';

describe('Auth Integration Tests', () => {
  const app = createApp();

  it('GET /api/health returns 200 and healthy database status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.database).toBe('connected');
  });

  it('POST /api/v1/auth/login succeeds for seeded Admin account', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: config.adminSeed.email,
        password: config.adminSeed.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('ADMIN');
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('POST /api/v1/auth/login rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: config.adminSeed.email,
        password: 'wrong_password_123',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('GET /api/v1/auth/me returns profile when authenticated with Bearer token', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: config.adminSeed.email,
        password: config.adminSeed.password,
      });

    const token = loginRes.body.data.accessToken;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.role).toBe('ADMIN');
    expect(meRes.body.data.email).toBe(config.adminSeed.email);
  });
});
