const request = require('supertest');
async function register(app, over = {}) {
  const body = { name: 'Test User', email: `u${Date.now()}_${Math.random().toString(36).slice(2,7)}@test.com`, password: 'pass1234', ...over };
  const res = await request(app).post('/api/auth/register').send(body);
  return { res, body };
}
async function tokenFor(app, over = {}) {
  const { res } = await register(app, over);
  return res.body.token;
}
async function adminToken(app) {
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@komodohub.com', password: 'password' });
  return res.body.token;
}
module.exports = { register, tokenFor, adminToken };
