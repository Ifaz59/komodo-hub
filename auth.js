/**
 * routes/auth.js - Authentication Routes
 *
 * Handles user registration, login, and profile management.
 * Uses bcrypt for password hashing and JWT for session tokens.
 *
 * Routes:
 *   POST   /api/auth/register - Create a new user account
 *   POST   /api/auth/login    - Authenticate and receive a JWT token
 *   GET    /api/auth/profile  - Get the current user's profile (protected)
 *   PUT    /api/auth/profile  - Update the current user's profile (protected)
 */

const express = require('express');      // Express framework
const bcrypt = require('bcryptjs');      // Library for hashing passwords securely
const jwt = require('jsonwebtoken');     // Library for creating/verifying JWT tokens
const { pool } = require('../config/db');         // PostgreSQL connection pool
const { authenticate } = require('../middleware/auth'); // JWT authentication middleware

const router = express.Router(); // Create a new Express Router instance

/**
 * POST /register - Register a new user
 * @body {string} name - User's full name
 * @body {string} email - User's email (must be unique)
 * @body {string} password - Plain text password (will be hashed before storage)
 * @body {string} role - Desired role (registered_user, donor, volunteer, researcher)
 * @returns {object} JWT token and user data on success
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }

    // Check if email is already registered to prevent duplicate accounts
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    // Hash the password with bcrypt (10 salt rounds) before storing in database
    const hashedPassword = await bcrypt.hash(password, 10);

    // Validate the requested role - default to 'registered_user' if invalid
    // Note: 'admin' role cannot be self-assigned during registration for security
    const validRoles = ['registered_user', 'donor', 'volunteer', 'researcher'];
    const userRole = validRoles.includes(role) ? role : 'registered_user';

    // Insert the new user into the database and return the created record
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
      [name, email, hashedPassword, userRole]
    );

    // Generate a JWT token containing the user's id, email, and role
    // Token expires in 7 days, after which the user must log in again
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Return the token and user data to the client
    res.status(201).json({ message: 'Registration successful', token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

/**
 * POST /login - Authenticate user and return JWT token
 * @body {string} email - User's registered email
 * @body {string} password - User's password (compared against stored hash)
 * @returns {object} JWT token and user profile data
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Look up user by email in the database
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      // Generic error message to prevent email enumeration attacks
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Compare the provided password with the stored bcrypt hash
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Generate JWT token with user payload (valid for 7 days)
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Return token and user profile (excluding the password hash for security)
    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, bio: user.bio }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

/**
 * GET /profile - Get current user's profile
 * Protected route - requires valid JWT token (authenticate middleware)
 * Uses req.user.id set by the authenticate middleware to fetch user data
 * @returns {object} User profile data (excluding password)
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, avatar, bio, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * PUT /profile - Update current user's profile
 * Protected route - requires valid JWT token
 * Uses COALESCE to only update fields that are provided (partial updates)
 * @body {string} name - Updated display name (optional)
 * @body {string} bio - Updated biography text (optional)
 * @body {string} avatar - Updated avatar URL (optional)
 * @returns {object} Updated user profile
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, bio, avatar } = req.body;
    // COALESCE returns the first non-null value, so if a field is not provided
    // (null/undefined), it keeps the existing database value
    const result = await pool.query(
      'UPDATE users SET name = COALESCE($1, name), bio = COALESCE($2, bio), avatar = COALESCE($3, avatar), updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, name, email, role, avatar, bio',
      [name, bio, avatar, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
