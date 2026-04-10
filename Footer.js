/**
 * Footer.js - Application Footer Component
 *
 * Renders the site-wide footer that appears at the bottom of every page.
 * The footer is divided into three informational sections:
 * 1. About - A brief description of the Komodo Hub platform
 * 2. Quick Links - Navigation shortcuts to key pages (Species, Campaigns, etc.)
 * 3. Contact - Contact email and physical location information
 *
 * Also includes a copyright notice at the bottom with the university module reference.
 * This is a purely presentational (stateless) component with no side effects.
 */

import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer">
      {/* Main footer content area with three side-by-side sections */}
      <div className="footer-content">
        {/* About section - describes the platform's mission */}
        <div className="footer-section">
          <h3>About</h3>
          <p>
            Komodo Hub is a conservation platform dedicated to protecting and
            monitoring wildlife species. Join our community of researchers,
            conservationists, and nature enthusiasts working together to preserve
            biodiversity.
          </p>
        </div>

        {/* Quick Links section - provides navigation shortcuts */}
        <div className="footer-section">
          <h3>Quick Links</h3>
          <div className="footer-links">
            <Link to="/species">Species</Link>
            <Link to="/campaigns">Campaigns</Link>
            <Link to="/events">Events</Link>
            <Link to="/sightings">Sightings</Link>
          </div>
        </div>

        {/* Contact section - displays contact information */}
        <div className="footer-section">
          <h3>Contact</h3>
          <p>Email: info@komodohub.com</p>
          <p>Location: Coventry, United Kingdom</p>
        </div>
      </div>

      {/* Footer bottom bar - copyright notice and university module reference */}
      <div className="footer-bottom">
        <p>&copy; 2026 Komodo Hub. All rights reserved. 5005CMD Software Engineering - Coventry University</p>
      </div>
    </footer>
  );
};

export default Footer;
