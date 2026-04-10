/**
 * routes/admin.js - Admin Dashboard & User Management Routes
 *
 * Provides administrative endpoints for platform management.  ALL routes
 * in this file require authentication AND the 'admin' role.
 *
 * Routes:
 *   GET    /api/admin/stats          - Get dashboard statistics overview
 *   GET    /api/admin/users          - List all registered users
 *   PUT    /api/admin/users/:id/role - Change a user's role
 *   DELETE /api/admin/users/:id      - Delete a user account
 */

const express = require('express');                           // Express framework
const { pool } = require('../config/db');                    // PostgreSQL connection pool
const { authenticate, authorize } = require('../middleware/auth'); // Auth middleware

const router = express.Router(); // Create a new Express Router instance

/**
 * GET /stats - Retrieve dashboard statistics for the admin panel
 * Protected: requires authentication + admin role
 * @returns {object} Aggregated platform statistics:
 *   - totalUsers: Total number of registered users
 *   - totalSpecies: Total number of species in the catalogue
 *   - totalSightings: Total number of sighting reports
 *   - activeCampaigns: Number of campaigns with status 'active'
 *   - totalDonations: Sum of all donation amounts (in dollars)
 *   - upcomingEvents: Number of events with status 'upcoming'
 *   - pendingSightings: Number of sightings awaiting verification
 *
 * Each statistic is fetched with a separate COUNT/SUM query.
 * COALESCE is used for the donations sum to return 0 instead of null
 * when there are no donation records.  parseInt/parseFloat convert
 * the PostgreSQL string results to JavaScript numbers.
 */
router.get('/stats', authenticate, authorize('admin'), async (req, res) => {
  try {
    // Execute all count queries (these could be parallelised with Promise.all for performance)
    const users = await pool.query('SELECT COUNT(*) as count FROM users');
    const species = await pool.query('SELECT COUNT(*) as count FROM species');
    const sightings = await pool.query('SELECT COUNT(*) as count FROM sightings');
    const campaigns = await pool.query('SELECT COUNT(*) as count FROM campaigns WHERE status = $1', ['active']);
    const donations = await pool.query('SELECT COALESCE(SUM(amount), 0) as total FROM donations');
    const events = await pool.query('SELECT COUNT(*) as count FROM events WHERE status = $1', ['upcoming']);
    const pendingSightings = await pool.query('SELECT COUNT(*) as count FROM sightings WHERE status = $1', ['pending']);

    // Convert string counts to JavaScript numbers and return
    res.json({
      totalUsers: parseInt(users.rows[0].count),
      totalSpecies: parseInt(species.rows[0].count),
      totalSightings: parseInt(sightings.rows[0].count),
      activeCampaigns: parseInt(campaigns.rows[0].count),
      totalDonations: parseFloat(donations.rows[0].total),
      upcomingEvents: parseInt(events.rows[0].count),
      pendingSightings: parseInt(pendingSightings.rows[0].count),
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * GET /users - List all registered users
 * Protected: requires authentication + admin role
 * @returns {Array} Array of user objects (id, name, email, role, created_at)
 *
 * Password hashes are excluded from the SELECT for security.
 * Results are ordered newest-first by registration date.
 */
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * PUT /users/:id/role - Update a user's role
 * Protected: requires authentication + admin role
 * @param {number} id - User ID to update (from URL path)
 * @body {string} role - New role (registered_user, donor, volunteer, researcher, admin)
 * @returns {object} Updated user record (id, name, email, role), or 404
 *
 * Note: Unlike registration (where 'admin' is excluded), admins CAN promote
 * other users to admin through this endpoint.  The role is validated against
 * the full list including 'admin'.
 */
router.put('/users/:id/role', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    // Validate against all possible roles (including admin)
    const validRoles = ['registered_user', 'donor', 'volunteer', 'researcher', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }
    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email, role',
      [role, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update role error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * DELETE /users/:id - Delete a user account
 * Protected: requires authentication + admin role
 * @param {number} id - User ID to delete (from URL path)
 * @returns {object} Success message, or 404 if user not found
 *
 * Safety check: Admins cannot delete their own account to prevent
 * accidentally locking themselves out of the system.
 *
 * Due to ON DELETE CASCADE on sightings and event_registrations, deleting
 * a user will also remove their sighting reports and event registrations.
 * Donations use ON DELETE SET NULL, so donation records are preserved
 * but the user_id is set to null.
 */
router.delete('/users/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    // Prevent self-deletion - admin cannot delete their own account
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account.' });
    }
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
