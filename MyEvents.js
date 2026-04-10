/**
 * MyEvents.js - User's Registered Events Page
 *
 * Displays all volunteer events that the currently authenticated user
 * has registered for. Each event card shows the title, location, date,
 * status badge, and the date the user registered.
 *
 * Features:
 * - Fetches the user's registered events from the API on mount
 * - Shows colour-coded status badges for each event
 * - Displays the user's registration date on each card
 * - Empty state with link to browse available events
 * - This is a protected page (requires authentication)
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyEvents } from '../services/api';

const MyEvents = () => {
  // State to store the array of events the user has registered for
  const [events, setEvents] = useState([]);

  // Loading state - true while the user's events are being fetched
  const [loading, setLoading] = useState(true);

  // Error state - holds an error message if the fetch fails
  const [error, setError] = useState(null);

  /**
   * useEffect - Fetch User's Registered Events on Component Mount
   *
   * Calls the getMyEvents API endpoint to retrieve all events the
   * current user has registered for. Runs once on mount.
   */
  useEffect(() => {
    const fetchMyEvents = async () => {
      try {
        const response = await getMyEvents();
        setEvents(response.data || response);
      } catch (err) {
        setError('Failed to load your events');
      } finally {
        setLoading(false);
      }
    };
    fetchMyEvents();
  }, []);

  /**
   * getStatusBadge - Maps event status to a CSS badge class suffix
   *
   * @param {string} status - The event status
   * @returns {string} CSS class suffix for colour-coded badges
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

  if (loading) return <div className="container"><p>Loading your events...</p></div>;
  if (error) return <div className="container"><p className="error">{error}</p></div>;

  return (
    <div>
      <div className="page-header">
        <h1>My Events</h1>
        <p>Events you've registered for</p>
      </div>
      <div className="container">
        {/* Conditional rendering: empty state or event card grid */}
        {events.length === 0 ? (
          <div className="empty-state">
            <p>You haven't registered for any events yet.</p>
            <Link to="/events" className="btn btn-primary">Browse Events</Link>
          </div>
        ) : (
          <div className="grid-3">
            {events.map((event) => (
              <Link to={`/events/${event.id}`} key={event.id} className="card">
                <div className="card-body">
                  <h3>{event.title}</h3>
                  <p><strong>Location:</strong> {event.location}</p>
                  <p><strong>Date:</strong> {formatDate(event.event_date)}</p>
                  <span className={`badge ${getStatusBadge(event.status)}`}>
                    {event.status}
                  </span>
                  {/* Show the date the user registered for this event, if available */}
                  {event.registered_at && (
                    <p className="registered-date">
                      <small>Registered: {formatDate(event.registered_at)}</small>
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyEvents;
