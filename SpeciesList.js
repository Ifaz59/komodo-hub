/**
 * SpeciesList.js - Species Directory Page Component
 *
 * Displays a searchable, filterable grid of all endangered species in the database.
 * Fetches the complete list of species from the API on mount, then allows users to:
 * - Search by species name using a text input
 * - Filter by conservation status (All, Critically Endangered, Endangered, Vulnerable)
 *
 * Each species is rendered as a clickable card that links to its detail page.
 * The component handles loading states and displays a message when no results match.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSpecies } from '../services/api';

const SpeciesList = () => {
  // State to store the complete list of species fetched from the API
  const [species, setSpecies] = useState([]);

  // State for the search input - filters species by name
  const [searchTerm, setSearchTerm] = useState('');

  // State for the active conservation status filter button
  const [activeFilter, setActiveFilter] = useState('All');

  // Loading state - true while the species data is being fetched
  const [loading, setLoading] = useState(true);

  /**
   * useEffect - Fetch All Species on Component Mount
   *
   * Calls the getSpecies API endpoint to retrieve the full species list.
   * Stores the response data in the species state array.
   * Runs once on component mount (empty dependency array).
   */
  useEffect(() => {
    const fetchSpecies = async () => {
      try {
        const response = await getSpecies();
        setSpecies(response.data);
      } catch (error) {
        console.error('Error fetching species:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSpecies();
  }, []);

  // Available conservation status filter options
  const filters = ['All', 'Critically Endangered', 'Endangered', 'Vulnerable'];

  /**
   * getBadgeClass - Returns the appropriate CSS class for a conservation status badge
   *
   * Normalises the status string (lowercase, underscores) and maps it to a
   * colour-coded badge class (danger for critical, warning for endangered, etc.)
   *
   * @param {string} status - The conservation status string from the API
   * @returns {string} CSS class string for the badge element
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
   * formatStatus - Converts a snake_case status string to Title Case for display
   *
   * Example: 'critically_endangered' becomes 'Critically Endangered'
   *
   * @param {string} status - The raw conservation status string
   * @returns {string} Human-readable formatted status
   */
  const formatStatus = (status) => {
    if (!status) return '';
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  /**
   * filteredSpecies - Derives the displayed species list from search and filter state
   *
   * Applies two filters simultaneously:
   * 1. Name search: checks if the species name contains the search term (case-insensitive)
   * 2. Status filter: checks if the conservation status matches the active filter
   *
   * Both conditions must be true for a species to appear in the results.
   */
  const filteredSpecies = species.filter((s) => {
    const matchesSearch = s.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const normalizedStatus = s.conservation_status?.toLowerCase().replace(/_/g, ' ');
    const matchesFilter =
      activeFilter === 'All' || normalizedStatus === activeFilter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return <div className="container"><p>Loading species...</p></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div className="container">
          <h1>Species Directory</h1>
          <p>Explore Indonesia's endangered endemic species</p>
        </div>
      </div>

      <div className="container">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search species by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-bar">
          {filters.map((filter) => (
            <button
              key={filter}
              className={`filter-btn${activeFilter === filter ? ' active' : ''}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Species card grid - each card links to the species detail page */}
        <div className="grid-3">
          {filteredSpecies.map((s) => (
            <Link to={`/species/${s.id}`} key={s.id} className="card">
              {/* Species image with placeholder fallback if no image URL exists */}
              <img
                src={s.image_url || 'https://via.placeholder.com/300x200?text=No+Image'}
                alt={s.name}
                className="card-img"
              />
              <div className="card-body">
                <h3>{s.name}</h3>
                <p className="scientific-name"><em>{s.scientific_name}</em></p>
                <span className={getBadgeClass(s.conservation_status)}>
                  {formatStatus(s.conservation_status)}
                </span>
                {s.population && <p className="population">Population: {s.population}</p>}
              </div>
            </Link>
          ))}
        </div>

        {filteredSpecies.length === 0 && (
          <p className="no-results">No species found matching your criteria.</p>
        )}
      </div>
    </div>
  );
};

export default SpeciesList;
