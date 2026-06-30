/**
 * EventDetail.js - Individual Event Detail and Registration Page
 *
 * Displays full details for a single volunteer event and allows authenticated
 * users to register for or cancel their registration. Shows event title,
 * description, location, date/time, capacity status, and action buttons.
 *
 * Features:
 * - Fetches event details by ID from the URL parameters
 * - Uses useCallback to memoize the fetch function (prevents unnecessary re-renders)
 * - Register/Cancel Registration buttons with loading states
 * - Smart button disabling: event full, not upcoming, or action in progress
 * - Login prompt for unauthenticated visitors
 * - Toast notifications for registration success/failure
 * - Back navigation button to the events list
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getEventById, registerForEvent, cancelEventRegistration } from '../services/api';
import { useAuth } from '../context/AuthContext';

const EventDetail = () => {
  // Extract the event ID from the URL parameters
  const { id } = useParams();

  // Get the current user from auth context (null if not logged in)
  const { user } = useAuth();

  // State to store the fetched event details object
  const [event, setEvent] = useState(null);

  // Loading state for the initial event data fetch
  const [loading, setLoading] = useState(true);

  // Error state - holds an error message if the fetch fails
  const [error, setError] = useState(null);

  // Action loading state - true while register/cancel API request is in progress
  const [actionLoading, setActionLoading] = useState(false);

  // Toast notification state for registration feedback
  const [toast, setToast] = useState(null);

  /**
   * fetchEvent - Memoized function to fetch event details from the API
   *
   * Wrapped in useCallback with 'id' as a dependency so that it only
   * gets re-created when the event ID changes. This prevents unnecessary
   * re-renders when passed to useEffect as a dependency.
   */
  const fetchEvent = useCallback(async () => {
    try {
      const response = await getEventById(id);
      setEvent(response.data || response);
    } catch (err) {
      setError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  /**
   * useEffect - Trigger Event Fetch When fetchEvent Changes
   *
   * Calls fetchEvent whenever the memoized function reference changes
   * (which happens when the 'id' URL parameter changes).
   */
  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  /**
   * showToast - Displays a temporary toast notification
   *
   * @param {string} message - The notification text
   * @param {string} type - The toast type: 'success' (default) or 'error'
   */
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  /**
   * handleRegister - Registers the current user for this event
   *
   * Calls the registerForEvent API, then re-fetches the event data
   * to update the registration count and is_registered status.
   */
  const handleRegister = async () => {
    setActionLoading(true);
    try {
      await registerForEvent(id);
      showToast('Successfully registered for event!');
      // Re-fetch event to update registration status and count
      await fetchEvent();
    } catch (err) {
      showToast(err.response?.data?.message || 'Registration failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * handleCancelRegistration - Cancels the current user's event registration
   *
   * Calls the cancelEventRegistration API, then re-fetches the event
   * data to update the UI accordingly.
   */
  const handleCancelRegistration = async () => {
    setActionLoading(true);
    try {
      await cancelEventRegistration(id);
      showToast('Registration cancelled successfully');
      await fetchEvent();
    } catch (err) {
      showToast(err.response?.data?.message || 'Cancellation failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * formatDate - Formats an ISO date string for display
   *
   * @param {string} dateStr - ISO date string
   * @returns {string} Formatted date or 'N/A' if null
   */
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  /**
   * formatTime - Returns the time string as-is (pass-through formatter)
   *
   * @param {string} timeStr - Time string from the API
   * @returns {string} The time string or 'N/A' if null
   */
  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    return timeStr;
  };

  /**
   * getStatusBadge - Maps event status to a CSS badge class suffix
   *
   * @param {string} status - The event status
   * @returns {string} CSS class suffix for the badge
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

  // Derived boolean flags for registration button state
  // Check if the event has reached its maximum capacity
  const isEventFull = event && event.capacity && (event.registered_count || 0) >= event.capacity;
  // Check if the event status is not 'upcoming' (registration only open for upcoming events)
  const isNotUpcoming = event && event.status !== 'upcoming';
  // Disable the register button if any disabling condition is true
  const registerDisabled = actionLoading || isEventFull || isNotUpcoming;

  if (loading) return <div className="container"><p>Loading event details...</p></div>;
  if (error) return <div className="container"><p className="error">{error}</p></div>;
  if (!event) return <div className="container"><p>Event not found.</p></div>;

  return (
    <div className="detail-page">
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
      <div className="container">
        <Link to="/events" className="btn btn-back">&larr; Back to Events</Link>
        <div className="detail-card">
          <div className="detail-body">
            <h1>{event.title}</h1>
            <span className={`badge ${getStatusBadge(event.status)}`}>
              {event.status}
            </span>
            <p>{event.description}</p>

            <div className="detail-info-grid">
              <div className="detail-info-item">
                <strong>Location</strong>
                <span>{event.location || 'N/A'}</span>
              </div>
              <div className="detail-info-item">
                <strong>Date</strong>
                <span>{formatDate(event.event_date)}</span>
              </div>
              <div className="detail-info-item">
                <strong>Time</strong>
                <span>{formatTime(event.start_time)} - {formatTime(event.end_time)}</span>
              </div>
              <div className="detail-info-item">
                <strong>Capacity</strong>
                <span>
                  {event.capacity
                    ? `${event.registered_count || 0}/${event.capacity}`
                    : 'Unlimited'}
                </span>
              </div>
              <div className="detail-info-item">
                <strong>Status</strong>
                <span>{event.status}</span>
              </div>
            </div>

            {/*
              Action buttons section with three possible states:
              1. User is logged in AND registered -> Show "Cancel Registration" button
              2. User is logged in AND not registered -> Show "Register" button
                 (disabled if event is full, not upcoming, or action in progress)
              3. User is not logged in -> Show "Log in to register" link
            */}
            <div className="detail-actions">
              {user ? (
                event.is_registered ? (
                  <button
                    className="btn btn-danger"
                    onClick={handleCancelRegistration}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Cancelling...' : 'Cancel Registration'}
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={handleRegister}
                    disabled={registerDisabled}
                  >
                    {/* Dynamic button text based on why registration might be disabled */}
                    {actionLoading
                      ? 'Registering...'
                      : isEventFull
                      ? 'Event Full'
                      : isNotUpcoming
                      ? 'Registration Closed'
                      : 'Register for Event'}
                  </button>
                )
              ) : (
                <Link to="/login" className="btn btn-primary">
                  Log in to register
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
