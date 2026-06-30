/**
 * EventsList.js - Volunteer Events Listing Page
 *
 * Displays all conservation volunteer events in a card grid format.
 * Each event card shows the title, truncated description, location, date,
 * capacity status, and a colour-coded event status badge.
 *
 * Features:
 * - Fetches all events from the API on component mount
 * - Colour-coded status badges (upcoming, ongoing, completed, cancelled)
 * - Capacity indicator showing how many spots are filled vs total
 * - Each card links to the event detail page for registration
 * - Handles loading, error, and empty states
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getEvents } from '../services/api';

const EventsList = () => {
  // State to store the array of event objects from the API
  const [events, setEvents] = useState([]);

  // Loading state - true while events are being fetched
  const [loading, setLoading] = useState(true);

  // Error state - holds an error message if the fetch fails
  const [error, setError] = useState(null);

  /**
   * useEffect - Fetch All Events on Component Mount
   *
   * Calls the getEvents API endpoint. Handles both response formats
   * (response.data for Axios or direct response for other clients).
   * Runs once on mount (empty dependency array).
   */
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await getEvents();
        // Handle both Axios response format and direct data format
        setEvents(response.data || response);
      } catch (err) {
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  /**
   * getStatusBadge - Maps event status to a colour-coded CSS badge class
   *
   * Status-to-colour mapping:
   * - upcoming: blue/info
   * - ongoing: green/success
   * - completed: primary colour
   * - cancelled: red/danger
   *
   * @param {string} status - The event status
   * @returns {string} CSS badge class suffix
   */
  const getStatusBadge = (status) => {
    const map = {
      upcoming: 'badge-info',
      ongoing: 'badge-success',
      completed: 'badge-primary',
      cancelled: 'badge-danger',
    };
    return map[status] || 'badge-info';
  };

  /**
   * formatDate - Formats an ISO date string for display
   *
   * @param {string} dateStr - ISO date string
   * @returns {string} Formatted date (e.g., 'January 15, 2024')
   */
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  /**
   * getCapacityText - Generates a human-readable capacity status string
   *
   * Returns 'Open' if no capacity limit is set, otherwise shows
   * the number of registered participants out of the total capacity.
   *
   * @param {Object} event - The event object
   * @returns {string} Capacity text (e.g., '15/30 spots filled' or 'Open')
   */
  const getCapacityText = (event) => {
    if (!event.capacity) return 'Open';
    const filled = event.registered_count || 0;
    return `${filled}/${event.capacity} spots filled`;
  };

  if (loading) return <div className="container"><p>Loading events...</p></div>;
  if (error) return <div className="container"><p className="error">{error}</p></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Volunteer Events</h1>
        <p>Join conservation events and make a difference</p>
      </div>
      <div className="container">
        <div className="grid-3">
          {events.map((event) => (
            <Link to={`/events/${event.id}`} key={event.id} className="card">
              <div className="card-body">
                <h3>{event.title}</h3>
                <p>
                  {event.description
                    ? event.description.length > 120
                      ? event.description.substring(0, 120) + '...'
                      : event.description
                    : ''}
                </p>
                <p><strong>Location:</strong> {event.location}</p>
                <p><strong>Date:</strong> {formatDate(event.event_date)}</p>
                <p><strong>Capacity:</strong> {getCapacityText(event)}</p>
                <span className={`badge ${getStatusBadge(event.status)}`}>
                  {event.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
        {events.length === 0 && (
          <p>No events available at the moment.</p>
        )}
      </div>
    </div>
  );
};

export default EventsList;
