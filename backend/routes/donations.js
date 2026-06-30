/**
 * routes/donations.js - Donation Processing Routes
 *
 * Handles viewing and creating donations to conservation campaigns.
 * The POST route uses a database transaction to ensure the donation record
 * and campaign raised_amount are updated atomically.
 *
 * Routes:
 *   GET  /api/donations/campaign/:campaignId - List donations for a campaign (public)
 *   GET  /api/donations/my                   - List current user's donations (protected)
 *   POST /api/donations                      - Make a new donation (protected)
 */

const express = require('express');                    // Express framework
const { pool } = require('../config/db');             // PostgreSQL connection pool
const { authenticate } = require('../middleware/auth'); // JWT authentication middleware

const router = express.Router(); // Create a new Express Router instance

/**
 * GET /campaign/:campaignId - List all donations for a specific campaign
 * @param {number} campaignId - Campaign ID (from URL path)
 * @returns {Array} Array of donation objects (donor_name, amount, message, date)
 *
 * This is a public route - anyone can see who donated to a campaign.
 * Only selected columns are returned to protect donor privacy (no email or user_id).
 */
router.get('/campaign/:campaignId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, donor_name, amount, message, created_at FROM donations WHERE campaign_id = $1 ORDER BY created_at DESC',
      [req.params.campaignId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get donations error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * GET /my - Get the authenticated user's donation history
 * Protected: requires authentication
 * @returns {Array} Array of the user's donations with campaign titles
 *
 * Uses LEFT JOIN to include the campaign title.  LEFT JOIN ensures donations
 * are still returned even if the campaign has been deleted.
 */
router.get('/my', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, c.title as campaign_title
      FROM donations d
      LEFT JOIN campaigns c ON d.campaign_id = c.id
      WHERE d.user_id = $1
      ORDER BY d.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Get user donations error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * POST / - Make a donation to a conservation campaign
 * Protected: requires authentication (any role)
 * @body {number} campaign_id - ID of the campaign to donate to (required)
 * @body {number} amount - Donation amount in dollars, must be > 0 (required)
 * @body {string} message - Optional message from the donor
 * @returns {object} Success message and the created donation record (201 Created)
 *
 * This route uses a DATABASE TRANSACTION (BEGIN/COMMIT/ROLLBACK) to ensure
 * that the donation record and the campaign's raised_amount are updated
 * atomically.  If either operation fails, both are rolled back to maintain
 * data consistency.
 *
 * A dedicated client is acquired from the pool (not the shared pool.query)
 * because transactions must execute on a single connection.
 *
 * Note: stripe_payment_id uses a demo placeholder ('demo_' + timestamp).
 * In production, this would be replaced with a real Stripe payment intent ID.
 */
router.post('/', authenticate, async (req, res) => {
  // Acquire a dedicated client for the transaction
  const client = await pool.connect();
  try {
    const { campaign_id, amount, message } = req.body;
    // Validate required fields and ensure amount is positive
    if (!campaign_id || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Campaign ID and a positive amount are required.' });
    }

    // Verify the campaign exists AND is currently active (not completed/cancelled)
    const campaign = await client.query('SELECT * FROM campaigns WHERE id = $1 AND status = $2', [campaign_id, 'active']);
    if (campaign.rows.length === 0) {
      return res.status(404).json({ error: 'Active campaign not found.' });
    }

    // Fetch the donor's name and email to store in the donation record
    const user = await client.query('SELECT name, email FROM users WHERE id = $1', [req.user.id]);

    // --- BEGIN TRANSACTION ---
    // Both the donation insert and campaign update must succeed or both fail
    await client.query('BEGIN');

    // Step 1: Insert the donation record with donor details
    const donation = await client.query(
      `INSERT INTO donations (user_id, campaign_id, amount, donor_name, donor_email, message, stripe_payment_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, campaign_id, amount, user.rows[0].name, user.rows[0].email, message, 'demo_' + Date.now()]
    );

    // Step 2: Increment the campaign's raised_amount by the donation amount
    await client.query(
      'UPDATE campaigns SET raised_amount = raised_amount + $1 WHERE id = $2',
      [amount, campaign_id]
    );

    // Both operations succeeded - commit the transaction
    await client.query('COMMIT');
    res.status(201).json({ message: 'Donation successful!', donation: donation.rows[0] });
  } catch (err) {
    // Something went wrong - roll back both operations to maintain consistency
    await client.query('ROLLBACK');
    console.error('Donation error:', err);
    res.status(500).json({ error: 'Server error during donation.' });
  } finally {
    // Always release the client back to the pool to prevent connection leaks
    client.release();
  }
});

module.exports = router;
