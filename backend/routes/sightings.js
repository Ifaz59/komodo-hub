/**
 * routes/sightings.js - Wildlife Sighting Routes
 *
 * Manages wildlife sighting reports submitted by users.  Sightings go through
 * a verification workflow: they start as "pending" and can be verified or
 * rejected by admins/researchers.
 *
 * Routes:
 *   GET    /api/sightings          - List all sightings (public)
 *   GET    /api/sightings/user/me  - List current user's sightings (protected)
 *   GET    /api/sightings/:id      - Get a single sighting (public)
 *   POST   /api/sightings          - Report a new sighting (protected)
 *   PUT    /api/sightings/:id/status - Verify or reject a sighting (admin/researcher)
 */

const express = require('express');                           // Express framework
const { pool } = require('../config/db');                    // PostgreSQL connection pool
const { authenticate, authorize } = require('../middleware/auth'); // Auth middleware

const router = express.Router(); // Create a new Express Router instance

/**
 * GET / - List all wildlife sightings
 * @returns {Array} Array of sighting objects with reporter and species names
 *
 * Uses LEFT JOINs to include the reporter's name (from users table) and the
 * species name (from species table).  LEFT JOIN ensures sightings are still
 * returned even if the user or species record has been deleted.
 * Results are ordered newest-first by creation date.
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, u.name as reporter_name, sp.name as species_name
      FROM sightings s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN species sp ON s.species_id = sp.id
      ORDER BY s.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get sightings error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * GET /:id - Get a single sighting by ID
 * @param {number} id - Sighting ID (from URL path)
 * @returns {object} Sighting record with reporter and species names, or 404
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, u.name as reporter_name, sp.name as species_name
      FROM sightings s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN species sp ON s.species_id = sp.id
      WHERE s.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Sighting not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get sighting error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * POST / - Report a new wildlife sighting
 * Protected: requires authentication (any role)
 * @body {number} species_id - ID of the species sighted (optional, can be null if unknown)
 * @body {string} location - Text description of where the sighting occurred (required)
 * @body {number} latitude - GPS latitude coordinate (optional)
 * @body {number} longitude - GPS longitude coordinate (optional)
 * @body {string} description - Details about the sighting (optional)
 * @body {string} image_url - URL to a photo of the sighting (optional)
 * @body {string} sighting_date - Date when the sighting occurred (required, ISO format)
 * @returns {object} The newly created sighting record (201 Created)
 *
 * The sighting is automatically assigned to the authenticated user (req.user.id)
 * and starts with a status of "pending" (set by the database default).
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { species_id, location, latitude, longitude, description, image_url, sighting_date } = req.body;
    // Validate required fields
    if (!location || !sighting_date) {
      return res.status(400).json({ error: 'Location and sighting date are required.' });
    }

    // Insert the sighting - user_id comes from the authenticated JWT token
    const result = await pool.query(
      `INSERT INTO sightings (user_id, species_id, location, latitude, longitude, description, image_url, sighting_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, species_id, location, latitude, longitude, description, image_url, sighting_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create sighting error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * GET /user/me - Get the authenticated user's own sightings
 * Protected: requires authentication
 * @returns {Array} Array of the current user's sightings with species names
 *
 * Note: This route must be defined BEFORE /:id to prevent Express from
 * interpreting "user" as an ID parameter.
 */
router.get('/user/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, sp.name as species_name
      FROM sightings s
      LEFT JOIN species sp ON s.species_id = sp.id
      WHERE s.user_id = $1 ORDER BY s.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Get user sightings error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * PUT /:id/status - Verify or reject a sighting report
 * Protected: requires authentication + admin or researcher role
 * @param {number} id - Sighting ID to update (from URL path)
 * @body {string} status - New status: must be either "verified" or "rejected"
 * @returns {object} The updated sighting record, or 404 if not found
 *
 * This is part of the sighting verification workflow.  New sightings start as
 * "pending" and admins/researchers review them and set the status accordingly.
 */
router.put('/:id/status', authenticate, authorize('admin', 'researcher'), async (req, res) => {
  try {
    const { status } = req.body;
    // Validate that the status is one of the two allowed transition values
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be verified or rejected.' });
    }
    const result = await pool.query(
      'UPDATE sightings SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Sighting not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update sighting status error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
