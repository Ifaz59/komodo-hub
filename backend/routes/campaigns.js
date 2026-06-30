/**
 * routes/campaigns.js - Conservation Campaign Routes
 *
 * Manages conservation fundraising campaigns.  Public users can browse
 * campaigns; only admins can create, update, and delete them.
 * The raised_amount field is updated by the donations route when a
 * donation is processed (not directly through these endpoints).
 *
 * Routes:
 *   GET    /api/campaigns      - List all campaigns (with optional status filter)
 *   GET    /api/campaigns/:id  - Get a single campaign by ID
 *   POST   /api/campaigns      - Create a new campaign (admin only)
 *   PUT    /api/campaigns/:id  - Update a campaign (admin only)
 *   DELETE /api/campaigns/:id  - Delete a campaign (admin only)
 */

const express = require('express');                           // Express framework
const { pool } = require('../config/db');                    // PostgreSQL connection pool
const { authenticate, authorize } = require('../middleware/auth'); // Auth middleware

const router = express.Router(); // Create a new Express Router instance

/**
 * GET / - List all conservation campaigns
 * @query {string} status - Optional filter: 'active', 'completed', or 'cancelled'
 * @returns {Array} Array of campaign objects, ordered newest-first
 */
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM campaigns';
    const params = [];
    // Conditionally filter by status if the query parameter is provided
    if (status) {
      params.push(status);
      query += ' WHERE status = $1';
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get campaigns error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * GET /:id - Get a single campaign by its database ID
 * @param {number} id - Campaign ID (from URL path)
 * @returns {object} The campaign record, or 404 if not found
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM campaigns WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Campaign not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get campaign error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * POST / - Create a new conservation campaign
 * Protected: requires authentication + admin role
 * @body {string} title - Campaign title (required)
 * @body {string} description - Detailed campaign description (optional)
 * @body {number} goal_amount - Fundraising target in dollars (required)
 * @body {string} image_url - URL to a campaign banner image (optional)
 * @body {string} start_date - Campaign start date in ISO format (optional)
 * @body {string} end_date - Campaign end date in ISO format (optional)
 * @returns {object} The newly created campaign record (201 Created)
 *
 * The created_by field is automatically set to the authenticated admin's user ID.
 * The raised_amount starts at 0 (database default) and is updated by donations.
 */
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { title, description, goal_amount, image_url, start_date, end_date } = req.body;
    // Validate required fields
    if (!title || !goal_amount) {
      return res.status(400).json({ error: 'Title and goal amount are required.' });
    }
    const result = await pool.query(
      `INSERT INTO campaigns (title, description, goal_amount, image_url, start_date, end_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, description, goal_amount, image_url, start_date, end_date, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create campaign error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * PUT /:id - Update an existing campaign (partial update supported)
 * Protected: requires authentication + admin role
 * @param {number} id - Campaign ID to update (from URL path)
 * @body {string} [title] - Updated title (optional)
 * @body {string} [description] - Updated description (optional)
 * @body {number} [goal_amount] - Updated fundraising goal (optional)
 * @body {string} [image_url] - Updated image URL (optional)
 * @body {string} [start_date] - Updated start date (optional)
 * @body {string} [end_date] - Updated end date (optional)
 * @body {string} [status] - Updated status: active/completed/cancelled (optional)
 * @returns {object} The updated campaign record, or 404 if not found
 *
 * Uses COALESCE for partial updates - only provided fields are changed.
 */
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { title, description, goal_amount, image_url, start_date, end_date, status } = req.body;
    const result = await pool.query(
      `UPDATE campaigns SET title = COALESCE($1, title), description = COALESCE($2, description),
       goal_amount = COALESCE($3, goal_amount), image_url = COALESCE($4, image_url),
       start_date = COALESCE($5, start_date), end_date = COALESCE($6, end_date),
       status = COALESCE($7, status) WHERE id = $8 RETURNING *`,
      [title, description, goal_amount, image_url, start_date, end_date, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Campaign not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update campaign error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * DELETE /:id - Delete a campaign
 * Protected: requires authentication + admin role
 * @param {number} id - Campaign ID to delete (from URL path)
 * @returns {object} Success message, or 404 if campaign not found
 *
 * Warning: Due to ON DELETE CASCADE on the donations table, deleting a campaign
 * will also permanently delete all associated donation records.
 */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM campaigns WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Campaign not found.' });
    res.json({ message: 'Campaign deleted successfully.' });
  } catch (err) {
    console.error('Delete campaign error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
