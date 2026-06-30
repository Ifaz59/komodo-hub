// Provides the JWT secret used to sign/verify tokens during tests.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_komodo_hub';
process.env.CLIENT_URL = 'http://localhost:3000';
