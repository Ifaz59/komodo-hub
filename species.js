/**
 * routes/species.js - Species CRUD Routes
 *
 * Manages the endangered species catalogue.  Public users can browse and
 * search species; admins and researchers can create, update, and delete entries.
 *
 * Routes:
 *   GET    /api/species      - List all species (with optional filters)
 *   GET    /api/species/:id  - Get a single species by ID
 *   POST   /api/species      - Create a new species (admin/researcher)
 *   PUT    /api/species/:id  - Update a species (admin/researcher)
 *   DELETE /api/species/:id  - Delete a species (admin only)
 */

const express = require('express');                           // Express framework
const { pool } = require('../config/db');                    // PostgreSQL connection pool
const { authenticate, authorize } = require('../middleware/auth'); // Auth middleware

const router = express.Router(); // Create a new Express Router instance

/**
 * GET / - List all species with optional filtering
 * @query {string} status - Filter by conservation status (e.g., 'critically_endangered')
 * @query {string} search - Search term matched against name, scientific_name, and description
 * @returns {Array} Array of species objects, ordered alphabetically by name
 *
 * This route builds a dynamic SQL query by appending WHERE conditions based on
 * the provided query parameters.  Uses parameterised queries ($1, $2, etc.)
 * to prevent SQL injection.  ILIKE is used for case-insensitive search.
 */
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = 'SELECT * FROM species';
    const params = [];       // Holds parameterised query values
    const conditions = [];   // Holds WHERE clause fragments

    // Filter by conservation status if provided
    if (status) {
      params.push(status);
      conditions.push(`conservation_status = $${params.length}`);
    }
    // Search across name, scientific name, and description (case-insensitive)
    if (search) {
      params.push(`%${search}%`);
      // The same parameter index is reused for all three ILIKE comparisons
      conditions.push(`(name ILIKE $${params.length} OR scientific_name ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }

    // Append WHERE clause only if filters were provided
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get species error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * GET /:id - Get a single species by its database ID
 * @param {number} id - Species ID (from URL path)
 * @returns {object} The species record, or 404 if not found
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM species WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Species not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get species error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * POST / - Create a new species entry
 * Protected: requires authentication + admin or researcher role
 * @body {string} name - Common name of the species
 * @body {string} scientific_name - Binomial nomenclature (e.g., 'Varanus komodoensis')
 * @body {string} conservation_status - IUCN status category
 * @body {number} population_estimate - Estimated wild population count
 * @body {string} habitat - Description of the species' natural habitat
 * @body {string} description - General description of the species
 * @body {string} threats - Known threats to the species
 * @body {string} image_url - URL to a representative image
 * @body {string} location - Geographic location / range
 * @returns {object} The newly created species record (201 Created)
 */
router.post('/', authenticate, authorize('admin', 'researcher'), async (req, res) => {
  try {
    const { name, scientific_name, conservation_status, population_estimate, habitat, description, threats, image_url, location } = req.body;
    const result = await pool.query(
      `INSERT INTO species (name, scientific_name, conservation_status, population_estimate, habitat, description, threats, image_url, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, scientific_name, conservation_status, population_estimate, habitat, description, threats, image_url, location]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create species error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * PUT /:id - Update an existing species record (partial update supported)
 * Protected: requires authentication + admin or researcher role
 * @param {number} id - Species ID to update (from URL path)
 * @body {string} [name] - Updated common name (optional)
 * @body {string} [scientific_name] - Updated scientific name (optional)
 * @body {string} [conservation_status] - Updated IUCN status (optional)
 * @body {number} [population_estimate] - Updated population count (optional)
 * @body {string} [habitat] - Updated habitat description (optional)
 * @body {string} [description] - Updated general description (optional)
 * @body {string} [threats] - Updated threats (optional)
 * @body {string} [image_url] - Updated image URL (optional)
 * @body {string} [location] - Updated location (optional)
 * @returns {object} The updated species record, or 404 if not found
 *
 * Uses COALESCE so only provided fields are updated; omitted fields
 * retain their current database values.
 */
router.put('/:id', authenticate, authorize('admin', 'researcher'), async (req, res) => {
  try {
    const { name, scientific_name, conservation_status, population_estimate, habitat, description, threats, image_url, location } = req.body;
    const result = await pool.query(
      `UPDATE species SET name = COALESCE($1, name), scientific_name = COALESCE($2, scientific_name),
       conservation_status = COALESCE($3, conservation_status), population_estimate = COALESCE($4, population_estimate),
       habitat = COALESCE($5, habitat), description = COALESCE($6, description), threats = COALESCE($7, threats),
       image_url = COALESCE($8, image_url), location = COALESCE($9, location) WHERE id = $10 RETURNING *`,
      [name, scientific_name, conservation_status, population_estimate, habitat, description, threats, image_url, location, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Species not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update species error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * DELETE /:id - Delete a species from the catalogue
 * Protected: requires authentication + admin role only
 * @param {number} id - Species ID to delete (from URL path)
 * @returns {object} Success message, or 404 if species not found
 *
 * Note: Due to ON DELETE SET NULL in the sightings table, any sightings
 * referencing this species will have their species_id set to NULL rather
 * than being deleted.
 */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM species WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Species not found.' });
    res.json({ message: 'Species deleted successfully.' });
  } catch (err) {
    console.error('Delete species error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
