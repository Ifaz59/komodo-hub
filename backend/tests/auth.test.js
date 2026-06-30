jest.mock('../config/db', () => require('./testdb'));
const request = require('supertest');
const { initDB } = require('../config/db');
const app = require('./app');
const { register } = require('./helpers');
beforeAll(async () => { await initDB(); });

describe('Auth API', () => {
  test('registers a new user and returns a JWT + user', async () => {
    const { res } = await register(app, { name: 'Ifaz', email: 'ifaz@test.com' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('ifaz@test.com');
    expect(res.body.user.role).toBe('registered_user');
    expect(res.body.user.password).toBeUndefined();
  });
  test('rejects duplicate email with 400', async () => {
    await register(app, { email: 'dup@test.com' });
    const { res } = await register(app, { email: 'dup@test.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already registered/i);
  });
  test('rejects registration with missing fields (400)', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@test.com' });
    expect(res.status).toBe(400);
  });
  test('prevents self-assigning the admin role at registration', async () => {
    const { res } = await register(app, { email: 'sneaky@test.com', role: 'admin' });
    expect(res.body.user.role).toBe('registered_user');
  });
  test('logs in with valid credentials', async () => {
    await register(app, { email: 'login@test.com', password: 'secret99' });
    const res = await request(app).post('/api/auth/login').send({ email: 'login@test.com', password: 'secret99' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
  test('rejects login with wrong password (401)', async () => {
    await register(app, { email: 'wrong@test.com', password: 'rightpass' });
    const res = await request(app).post('/api/auth/login').send({ email: 'wrong@test.com', password: 'BADpass' });
    expect(res.status).toBe(401);
  });
  test('GET /profile returns the user when authenticated', async () => {
    const r = await register(app, { email: 'prof@test.com' });
    const res = await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${r.res.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('prof@test.com');
  });
  test('GET /profile without a token returns 401', async () => {
    const res = await request(app).get('/api/auth/profile');
    expect(res.status).toBe(401);
  });
  test('PUT /profile updates the bio', async () => {
    const r = await register(app, { email: 'bio@test.com' });
    const res = await request(app).put('/api/auth/profile').set('Authorization', `Bearer ${r.res.body.token}`).send({ bio: 'Conservationist' });
    expect(res.status).toBe(200);
    expect(res.body.bio).toBe('Conservationist');
  });
});
