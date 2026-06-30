/**
 * tests/app.js - Test Express App Builder
 * Mirrors server.js route mounting but does NOT call app.listen(), so Supertest
 * can drive the app in-process. The config/db module is mocked per test file.
 */
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', require('../routes/auth'));
app.use('/api/species', require('../routes/species'));
app.use('/api/sightings', require('../routes/sightings'));
app.use('/api/campaigns', require('../routes/campaigns'));
app.use('/api/donations', require('../routes/donations'));
app.use('/api/events', require('../routes/events'));
app.use('/api/admin', require('../routes/admin'));
app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'Komodo Hub API is running' }));
module.exports = app;
