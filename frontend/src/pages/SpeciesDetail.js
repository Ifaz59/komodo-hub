/**
 * SpeciesDetail.js - Individual Species Detail Page Component
 *
 * Displays comprehensive information about a single species, fetched by its
 * unique ID from the URL parameters. Shows the species image, name, scientific
 * name, conservation status badge, population estimate, habitat, location,
 * description, and list of threats.
 *
 * Features:
 * - Fetches species data using the ID from the URL (React Router useParams)
 * - Re-fetches when the ID parameter changes (dependency in useEffect)
 * - Displays a loading indicator, error message, or species data accordingly
 * - Includes action buttons to report a sighting or navigate back to the list
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSpeciesById } from '../services/api';

const SpeciesDetail = () => {
  // Extract the species ID from the URL parameters (e.g., /species/abc123)
  const { id } = useParams();

  // State to store the fetched species data object
  const [species, setSpecies] = useState(null);

  // Loading state - true while the API request is in progress
  const [loading, setLoading] = useState(true);

  // Error state - holds an error message string if the fetch fails
  const [error, setError] = useState(null);

  /**
   * useEffect - Fetch Species Details When ID Changes
   *
   * Calls the getSpeciesById API endpoint with the current URL parameter ID.
   * Re-runs whenever the 'id' parameter changes (e.g., navigating between species).
   */
  useEffect(() => {
    const fetchSpecies = async () => {
      try {
        const response = await getSpeciesById(id);
        setSpecies(response.data);
      } catch (err) {
        console.error('Error fetching species:', err);
        setError('Failed to load species details.');
      } finally {
        setLoading(false);
      }
    };
    fetchSpecies();
  }, [id]);

  /**
   * getBadgeClass - Maps conservation status to a colour-coded CSS badge class
   *
   * @param {string} status - Conservation status from the API
   * @returns {string} CSS class string for the status badge
   */
  const getBadgeClass = (status) => {
    switch (status?.toLowerCase().replace(/\s+/g, '_')) {
      case 'critically_endangered':
        return 'badge badge-danger';
      case 'endangered':
        return 'badge badge-warning';
      case 'vulnerable':
        return 'badge badge-info';
      default:
        return 'badge';
    }
  };

  /**
   * formatStatus - Converts snake_case status to Title Case for display
   *
   * @param {string} status - Raw conservation status string
   * @returns {string} Formatted status string
   */
  const formatStatus = (status) => {
    if (!status) return '';
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (loading) {
    return <div className="container"><p>Loading species details...</p></div>;
  }

  if (error || !species) {
    return (
      <div className="container">
        <p>{error || 'Species not found.'}</p>
        <Link to="/species" className="btn">Back to Species</Link>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <div className="container">
        <div className="detail-card">
          <img
            src={species.image_url || 'https://via.placeholder.com/600x400?text=No+Image'}
            alt={species.name}
            className="detail-img"
          />
          <div className="detail-body">
            <h1>{species.name}</h1>
            <p className="scientific-name"><em>{species.scientific_name}</em></p>
            <span className={getBadgeClass(species.conservation_status)}>
              {formatStatus(species.conservation_status)}
            </span>

            {/* Information grid displaying key species attributes */}
            <div className="detail-info-grid">
              <div className="detail-info-item">
                <strong>Population Estimate</strong>
                <p>{species.population_estimate || 'Unknown'}</p>
              </div>
              <div className="detail-info-item">
                <strong>Habitat</strong>
                <p>{species.habitat || 'Unknown'}</p>
              </div>
              <div className="detail-info-item">
                <strong>Location</strong>
                <p>{species.location || 'Unknown'}</p>
              </div>
              <div className="detail-info-item">
                <strong>Conservation Status</strong>
                <p>{formatStatus(species.conservation_status)}</p>
              </div>
            </div>

            {/* About section - only rendered if the species has a description */}
            {species.description && (
              <div className="detail-section">
                <h2>About</h2>
                <p>{species.description}</p>
              </div>
            )}

            {/* Threats section - threats is a comma-separated string from SQLite */}
            {species.threats && (
              <div className="detail-section">
                <h2>Threats</h2>
                <ul>
                  {species.threats.split(',').map((threat, index) => (
                    <li key={index}>{threat.trim()}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action buttons - report a sighting or go back to the species list */}
            <div className="detail-actions">
              <Link to="/report-sighting" className="btn btn-primary">
                Report a Sighting
              </Link>
              <Link to="/species" className="btn">
                Back to Species
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeciesDetail;
