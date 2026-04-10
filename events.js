/**
 * routes/events.js - Volunteer Event Routes
 *
 * Manages conservation / volunteer events and user registrations.
 * Public users can browse events; authenticated users can register or cancel.
 * Only admins can create new events.
 *
 * Routes:
 *   GET    /api/events              - List all events (with optional status filter)
 *   GET    /api/events/user/my-events - List events the current user registered for (protected)
 *   GET    /api/events/:id          - Get a single event (includes registration check)
 *   POST   /api/events              - Create a new event (admin only)
 *   POST   /api/events/:id/register - Register for an event (protected)
 *   DELETE /api/events/:id/register - Cancel event registration (protected)
 */

const express = require('express');                           // Express framework
const { pool } = require('../config/db');                    // PostgreSQL connection pool
const { authenticate, authorize } = require('../middleware/auth'); // Auth middleware

const router = express.Router(); // Create a new Express Router instance

/**
 * GET / - List all volunteer events
 * @query {string} status - Optional filter: 'upcoming', 'ongoing', 'completed', or 'cancelled'
 * @returns {Array} Array of event objects, ordered by event_date ascending (soonest first)
 */
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM events';
    const params = [];
    // Conditionally filter by event status
    if (status) {
      params.push(status);
      query += ' WHERE status = $1';
    }
    // Sort by event date so upcoming events appear first
    query += ' ORDER BY event_date ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * GET /:id - Get a single event by ID, with registration status
 * @param {number} id - Event ID (from URL path)
 * @returns {object} Event record with an additional is_registered boolean field
 *
 * This route is semi-public: it works without authentication, but if an
 * Authorization header IS present, it checks whether the user is already
 * registered for the event and includes that flag in the response.
 * This avoids requiring login just to view event details.
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM events WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found.' });

    // Optionally check if the requesting user is registered for this event
    let isRegistered = false;
    const authHeader = req.header('Authorization');
    if (authHeader) {
      try {
        // Manually decode the JWT (not using authenticate middleware since this
        // route should still work for unauthenticated users)
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);
        // Check the event_registrations join table for this user + event combo
        const reg = await pool.query(
          'SELECT id FROM event_registrations WHERE user_id = $1 AND event_id = $2',
          [decoded.id, req.params.id]
        );
        isRegistered = reg.rows.length > 0;
      } catch (e) { /* Token invalid or expired - silently ignore, treat as not registered */ }
    }

    // Spread the event data and add the is_registered flag
    res.json({ ...result.rows[0], is_registered: isRegistered });
  } catch (err) {
    console.error('Get event error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * POST / - Create a new volunteer event
 * Protected: requires authentication + admin role
 * @body {string} title - Event title (required)
 * @body {string} description - Event description (optional)
 * @body {string} location - Event venue/location (required)
 * @body {string} event_date - Event date in ISO format (required)
 * @body {string} start_time - Start time (HH:MM format, optional)
 * @body {string} end_time - End time (HH:MM format, optional)
 * @body {number} capacity - Maximum number of participants (optional, null = unlimited)
 * @body {string} image_url - URL to event banner image (optional)
 * @returns {object} The newly created event record (201 Created)
 */
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { title, description, location, event_date, start_time, end_time, capacity, image_url } = req.body;
    // Validate required fields
    if (!title || !location || !event_date) {
      return res.status(400).json({ error: 'Title, location and event date are required.' });
    }
    const result = await pool.query(
      `INSERT INTO events (title, description, location, event_date, start_time, end_time, capacity, image_url, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [title, description, location, event_date, start_time, end_time, capacity, image_url, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * PUT /:id - Update an existing event (admin only)
 */
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { title, description, location, event_date, start_time, end_time, capacity, image_url, status } = req.body;
    const result = await pool.query(
      `UPDATE events SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        location = COALESCE($3, location),
        event_date = COALESCE($4, event_date),
        start_time = COALESCE($5, start_time),
        end_time = COALESCE($6, end_time),
        capacity = COALESCE($7, capacity),
        image_url = COALESCE($8, image_url),
        status = COALESCE($9, status)
       WHERE id = $10 RETURNING *`,
      [title, description, location, event_date, start_time, end_time, capacity, image_url, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update event error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * DELETE /:id - Delete an event (admin only)
 */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM events WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found.' });
    res.json({ message: 'Event deleted successfully.' });
  } catch (err) {
    console.error('Delete event error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * POST /:id/register - Register the authenticated user for an event
 * Protected: requires authentication (any role)
 * @param {number} id - Event ID to register for (from URL path)
 * @returns {object} Success message (201 Created)
 *
 * Validation checks performed before registration:
 *   1. Event must exist
 *   2. Event status must be 'upcoming' (can't register for past/cancelled events)
 *   3. Event must not be at capacity (if a capacity limit is set)
 *   4. User must not already be registered (UNIQUE constraint backup)
 *
 * Uses a DATABASE TRANSACTION to atomically insert the registration record
 * and increment the event's registered_count.
 */
router.post('/:id/register', authenticate, async (req, res) => {
  // Acquire a dedicated client for the transaction
  const client = await pool.connect();
  try {
    const eventId = req.params.id;

    // Fetch the event to validate registration eligibility
    const event = await client.query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (event.rows.length === 0) return res.status(404).json({ error: 'Event not found.' });

    // Only allow registration for upcoming events
    if (event.rows[0].status !== 'upcoming') {
      return res.status(400).json({ error: 'Cannot register for this event.' });
    }
    // Check capacity limit (null capacity means unlimited)
    if (event.rows[0].capacity && event.rows[0].registered_count >= event.rows[0].capacity) {
      return res.status(400).json({ error: 'Event is full.' });
    }

    // Prevent duplicate registrations (in addition to the DB UNIQUE constraint)
    const existing = await client.query(
      'SELECT id FROM event_registrations WHERE user_id = $1 AND event_id = $2',
      [req.user.id, eventId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already registered for this event.' });
    }

    // --- BEGIN TRANSACTION ---
    await client.query('BEGIN');
    // Step 1: Create the registration record in the join table
    await client.query(
      'INSERT INTO event_registrations (user_id, event_id) VALUES ($1, $2)',
      [req.user.id, eventId]
    );
    // Step 2: Increment the event's registered participant count
    await client.query(
      'UPDATE events SET registered_count = registered_count + 1 WHERE id = $1',
      [eventId]
    );
    await client.query('COMMIT');

    res.status(201).json({ message: 'Successfully registered for event!' });
  } catch (err) {
    // Roll back both operations if anything fails
    await client.query('ROLLBACK');
    console.error('Event registration error:', err);
    res.status(500).json({ error: 'Server error.' });
  } finally {
    // Always release the client back to the pool
    client.release();
  }
});

/**
 * DELETE /:id/register - Cancel the authenticated user's event registration
 * Protected: requires authentication (any role)
 * @param {number} id - Event ID to cancel registration for (from URL path)
 * @returns {object} Success message, or 404 if no registration found
 *
 * Uses a DATABASE TRANSACTION to atomically delete the registration and
 * decrement the event's registered_count.  GREATEST(..., 0) ensures the
 * count never goes below zero (defensive programming).
 */
router.delete('/:id/register', authenticate, async (req, res) => {
  // Acquire a dedicated client for the transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Attempt to delete the registration - RETURNING id confirms it existed
    const result = await client.query(
      'DELETE FROM event_registrations WHERE user_id = $1 AND event_id = $2 RETURNING id',
      [req.user.id, req.params.id]
    );
    if (result.rows.length === 0) {
      // No registration found - roll back and return 404
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Registration not found.' });
    }
    // Decrement the count, using GREATEST to prevent negative values
    await client.query(
      'UPDATE events SET registered_count = GREATEST(registered_count - 1, 0) WHERE id = $1',
      [req.params.id]
    );
    await client.query('COMMIT');
    res.json({ message: 'Registration cancelled.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Cancel registration error:', err);
    res.status(500).json({ error: 'Server error.' });
  } finally {
    client.release();
  }
});

/**
 * GET /user/my-events - Get all events the authenticated user has registered for
 * Protected: requires authentication
 * @returns {Array} Array of event objects with the user's registration timestamp
 *
 * Uses INNER JOIN (not LEFT JOIN) because we only want events where a
 * registration record exists.  Ordered by event_date ascending so upcoming
 * events appear first.
 *
 * Note: This route must be defined BEFORE /:id to prevent Express from
 * interpreting "user" as an event ID parameter.
 */
router.get('/user/my-events', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, er.registered_at
      FROM events e
      INNER JOIN event_registrations er ON e.id = er.event_id
      WHERE er.user_id = $1
      ORDER BY e.event_date ASC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Get user events error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
