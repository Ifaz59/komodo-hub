/**
 * Navbar.js - Main Navigation Bar Component
 *
 * Renders the top navigation bar that appears on every page of the application.
 * The navbar is responsive to authentication state:
 * - When logged out: Shows public links (Species, Sightings, Campaigns, Events)
 *   plus Login and Register buttons
 * - When logged in: Additionally shows Report Sighting, user name with role badge,
 *   Profile link, and Logout button
 * - When logged in as admin: Also shows the Admin dashboard link
 *
 * Uses React Router's useLocation hook to highlight the currently active nav link.
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  // Destructure user object and logout function from the auth context
  const { user, logout } = useAuth();

  // Get the current URL path to determine which nav link is active
  const location = useLocation();

  /**
   * isActive - Determines if a nav link matches the current route
   *
   * Compares the given path against the current location pathname.
   * Returns 'active' CSS class string if they match, empty string otherwise.
   * This is used to visually highlight the currently active navigation link.
   *
   * @param {string} path - The route path to check (e.g., '/species')
   * @returns {string} 'active' if the path matches the current route, '' otherwise
   */
  const isActive = (path) => location.pathname === path ? 'active' : '';

  /**
   * handleLogout - Handles the logout button click
   *
   * Calls the logout function from AuthContext which clears the JWT token
   * from localStorage and sets the user state to null.
   */
  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="navbar">
      {/* Brand logo/text - links back to the homepage */}
      <Link to="/" className="navbar-brand">
        Komodo Hub
      </Link>

      <div className="nav-links">
        {/* Public navigation links - visible to all visitors */}
        <Link to="/species" className={`btn-nav ${isActive('/species')}`}>
          Species
        </Link>
        <Link to="/sightings" className={`btn-nav ${isActive('/sightings')}`}>
          Sightings
        </Link>
        <Link to="/campaigns" className={`btn-nav ${isActive('/campaigns')}`}>
          Campaigns
        </Link>
        <Link to="/events" className={`btn-nav ${isActive('/events')}`}>
          Events
        </Link>

        {/* Conditional rendering based on authentication state */}
        {user ? (
          <>
            {/* Authenticated user links */}
            <Link to="/report-sighting" className={`btn-nav ${isActive('/report-sighting')}`}>
              Report Sighting
            </Link>

            {/* Admin-only link - only rendered if the user has the 'admin' role */}
            {user.role === 'admin' && (
              <Link to="/admin" className={`btn-nav ${isActive('/admin')}`}>
                Admin
              </Link>
            )}

            {/* User info section - profile link and logout */}
            <div className="nav-user">
              <Link to="/profile" className={`btn-nav ${isActive('/profile')}`}>
                Profile
              </Link>
              <button className="btn-logout" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Guest user links - shown when no user is logged in */}
            <Link to="/login" className={`btn-nav ${isActive('/login')}`}>
              Login
            </Link>
            <Link to="/register" className={`btn-nav ${isActive('/register')}`}>
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
