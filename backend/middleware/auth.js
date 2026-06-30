/**
 * middleware/auth.js - Authentication & Authorization Middleware
 *
 * Provides two middleware functions used to protect API routes:
 * 1. authenticate - Verifies the JWT token from the Authorization header
 * 2. authorize    - Checks if the authenticated user has the required role(s)
 *
 * These are used in route definitions like:
 *   router.get('/protected', authenticate, authorize('admin'), handler)
 */

const jwt = require('jsonwebtoken'); // Library for creating and verifying JSON Web Tokens

/**
 * authenticate - JWT Token Verification Middleware
 *
 * Extracts the Bearer token from the Authorization header, verifies it
 * using the JWT_SECRET, and attaches the decoded user payload (id, email,
 * role) to req.user for use in subsequent middleware and route handlers.
 *
 * If no token is provided, returns 401 (Unauthorized).
 * If the token is invalid or expired, returns 401.
 */
const authenticate = (req, res, next) => {
  // Extract the token from "Bearer <token>" header format
  const token = req.header('Authorization')?.replace('Bearer ', '');

  // No token provided - user is not authenticated
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  try {
    // Verify the token signature and decode the payload (id, email, role)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach decoded user info to the request object for downstream use
    req.user = decoded;

    // Token is valid - proceed to the next middleware or route handler
    next();
  } catch (err) {
    // Token verification failed (expired, tampered, wrong secret)
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

/**
 * authorize - Role-Based Access Control (RBAC) Middleware
 *
 * A higher-order function that returns middleware checking whether the
 * authenticated user's role is included in the list of allowed roles.
 * Must be used AFTER the authenticate middleware (relies on req.user).
 *
 * @param {...string} roles - One or more allowed roles (e.g., 'admin', 'researcher')
 * @returns {Function} Express middleware that checks the user's role
 *
 * Usage: authorize('admin')           - only admins
 *        authorize('admin','researcher') - admins and researchers
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // Check if the user's role is in the list of allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    // User has the required role - proceed
    next();
  };
};

module.exports = { authenticate, authorize };
