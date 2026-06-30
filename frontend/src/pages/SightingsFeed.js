/**
 * SightingsFeed.js - Community Wildlife Sightings Feed Page
 *
 * Displays a feed of all community-reported wildlife sightings in a card grid.
 * Each sighting card shows the species name, location, date, reporter name,
 * verification status badge, and a truncated description.
 *
 * Features:
 * - Fetches all sightings from the API on component mount
 * - Displays sighting verification status with colour-coded badges (pending/verified/rejected)
 * - Truncates long descriptions to 120 characters for card previews
 * - Includes a CTA button to report a new sighting
 * - Shows an empty state message when no sightings exist
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSightings } from '../services/api';

const SightingsFeed = () => {
  // State to store the array of sighting objects fetched from the API
  const [sightings, setSightings] = useState([]);

  // Loading state - true while the sightings data is being fetched
  const [loading, setLoading] = useState(true);

  /**
   * useEffect - Fetch All Sightings on Component Mount
   *
   * Calls the getSightings API to retrieve all community-reported sightings.
   * Runs once on mount (empty dependency array).
   */
  useEffect(() => {
    const fetchSightings = async () => {
      try {
        const response = await getSightings();
        setSightings(response.data);
      } catch (error) {
        console.error('Error fetching sightings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSightings();
  }, []);

  /**
   * getStatusBadgeClass - Returns CSS class for the sighting verification status badge
   *
   * Maps sighting statuses to colour-coded badges:
   * - pending: yellow/warning badge
   * - verified: green/success badge
   * - rejected: red/danger badge
   *
   * @param {string} status - The verification status of the sighting
   * @returns {string} CSS class string for the badge
   */
  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'badge badge-warning';
      case 'verified':
        return 'badge badge-success';
      case 'rejected':
        return 'badge badge-danger';
      default:
        return 'badge';
    }
  };

  /**
   * formatDate - Formats an ISO date string into a readable date
   *
   * @param {string} dateString - ISO date string from the API
   * @returns {string} Human-readable date or 'Unknown date' if null
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  /**
   * formatStatus - Capitalises the first letter of the status string
   *
   * @param {string} status - Raw status string (e.g., 'pending')
   * @returns {string} Capitalised status (e.g., 'Pending')
   */
  const formatStatus = (status) => {
    if (!status) return '';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) {
    return <div className="container"><p>Loading sightings...</p></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div className="container">
          <h1>Wildlife Sightings</h1>
          <p>Community-reported wildlife observations</p>
          <Link to="/report-sighting" className="btn btn-primary">
            Report a Sighting
          </Link>
        </div>
      </div>

      <div className="container">
        <div className="grid-3">
          {/* Iterate over sightings and render a card for each one */}
          {sightings.map((sighting) => (
            <div key={sighting.id} className="card">
              <div className="card-body">
                {/* Species name - falls back through populated ref, plain name, or 'Unknown' */}
                <h3>{sighting.species_id?.name || sighting.species_name || 'Unknown Species'}</h3>
                <p className="sighting-location">
                  <strong>Location:</strong> {sighting.location || 'Unknown'}
                </p>
                <p className="sighting-date">
                  <strong>Date:</strong> {formatDate(sighting.date)}
                </p>
                <p className="sighting-reporter">
                  <strong>Reported by:</strong> {sighting.user_id?.name || sighting.reporter_name || 'Anonymous'}
                </p>
                <span className={getStatusBadgeClass(sighting.status)}>
                  {formatStatus(sighting.status)}
                </span>
                {/* Description preview - truncated to 120 characters for card layout */}
                {sighting.description && (
                  <p className="sighting-description">
                    {sighting.description.length > 120
                      ? `${sighting.description.substring(0, 120)}...`
                      : sighting.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {sightings.length === 0 && (
          <p className="no-results">No sightings reported yet. Be the first to report one!</p>
        )}
      </div>
    </div>
  );
};

export default SightingsFeed;
