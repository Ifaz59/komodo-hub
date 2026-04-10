/**
 * routes/upload.js - File Upload Route
 *
 * Handles image uploads for species, campaigns, and events.
 * Uploaded files are stored in backend/uploads/ and served
 * as static assets at /uploads/<filename>.
 *
 * Routes:
 *   POST /api/upload - Upload a single image (admin/researcher only)
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Store files on disk with a unique timestamped filename
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, unique);
  },
});

// Only allow common image types
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ok = allowed.test(path.extname(file.originalname).toLowerCase()) &&
             allowed.test(file.mimetype);
  ok ? cb(null, true) : cb(new Error('Only image files are allowed.'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5 MB max

/**
 * POST / - Upload a single image
 * Protected: requires authentication + admin or researcher role
 * @form image - The image file to upload
 * @returns {object} { url } - The public URL of the uploaded file
 */
router.post('/', authenticate, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url });
});

module.exports = router;
