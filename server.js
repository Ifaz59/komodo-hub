/**
 * server.js - Main Entry Point for the Komodo Hub Backend API
 *
 * This file bootstraps the Express application, registers global middleware,
 * mounts all route modules under their respective URL prefixes, and starts
 * the HTTP server after the database has been initialised.
 *
 * Environment variables used:
 *   CLIENT_URL   - Allowed CORS origin (defaults to http://localhost:3000)
 *   PORT         - Port the server listens on (defaults to 5000)
 *   DATABASE_URL - PostgreSQL connection string (used inside config/db.js)
 *   JWT_SECRET   - Secret key for signing JSON Web Tokens (used in routes)
 */

// --- Core Node / Express imports ---
const express = require('express');   // Web framework for building the REST API
const cors = require('cors');         // Middleware to enable Cross-Origin Resource Sharing
const path = require('path');         // Utility for working with file and directory paths
require('dotenv').config();           // Load environment variables from .env file into process.env

// --- Route module imports ---
// Each route module is an Express Router that handles a specific resource
const authRoutes = require('./routes/auth');           // Authentication (register, login, profile)
const speciesRoutes = require('./routes/species');     // Species CRUD operations
const sightingRoutes = require('./routes/sightings');  // Wildlife sighting reports
const campaignRoutes = require('./routes/campaigns');  // Conservation campaign management
const donationRoutes = require('./routes/donations');  // Donation processing
const eventRoutes = require('./routes/events');        // Volunteer event management
const adminRoutes = require('./routes/admin');         // Admin dashboard & user management
const uploadRoutes = require('./routes/upload');       // Image file uploads

// --- Database configuration ---
const db = require('./config/db');  // Exports the PostgreSQL connection pool and initDB function

// Create the Express application instance
const app = express();

// --- Global Middleware Configuration ---

// Enable CORS so the React front-end (running on CLIENT_URL) can make API requests.
// "credentials: true" allows cookies and Authorization headers to be sent cross-origin.
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));

// Parse incoming JSON request bodies (e.g., POST /api/auth/register with JSON payload)
app.use(express.json());

// Serve uploaded files (images, etc.) as static assets under the /uploads URL path
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- API Route Mounting ---
// Each router is mounted at a specific base path; all routes inside the router
// are relative to that base (e.g., authRoutes' POST /register becomes POST /api/auth/register)
app.use('/api/auth', authRoutes);
app.use('/api/species', speciesRoutes);
app.use('/api/sightings', sightingRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

/**
 * GET /api/health
 * Simple health-check endpoint used by monitoring tools or the front-end
 * to verify the API is reachable and responsive.
 * @returns {object} JSON with status "OK" and a human-readable message
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Komodo Hub API is running' });
});

// Server port - read from environment or fall back to 5000 for local development
const PORT = process.env.PORT || 5000;

// --- Server Startup ---
// First initialise the database (create tables + seed data if needed),
// then start listening for HTTP requests. If the database fails to initialise
// the process exits with code 1 so container orchestrators can detect the failure.
db.initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Komodo Hub server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Export the app instance (useful for integration testing with supertest, etc.)
module.exports = app;
