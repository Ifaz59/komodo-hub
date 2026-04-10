/**
 * Profile.js - User Profile Page Component
 *
 * Displays the currently authenticated user's profile information and provides
 * an inline editing form to update their name, bio, and avatar URL.
 *
 * Features:
 * - Fetches user profile data from the API on component mount
 * - Displays user avatar, name, email, role badge, and member-since date
 * - Toggle between view mode and edit mode for profile updates
 * - Inline toast notifications for success/error feedback
 * - Quick links to the user's donations, events, and sightings pages
 *
 * States: loading, error, profile data, editing toggle, form data, toast messages
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProfile, updateProfile } from '../services/api';

const Profile = () => {
  // State to store the full user profile object fetched from the API
  const [profile, setProfile] = useState(null);

  // Loading state - true while the profile data is being fetched
  const [loading, setLoading] = useState(true);

  // Error state - holds an error message if the profile fetch fails
  const [error, setError] = useState(null);

  // Toggle state - controls whether the edit form or the view mode is displayed
  const [editing, setEditing] = useState(false);

  // Toast notification state - holds the message and type (success/error)
  const [toast, setToast] = useState(null);

  // Form state - holds the editable fields (name, bio, avatar_url) separately
  // from the profile state so edits can be cancelled without losing original data
  const [form, setForm] = useState({
    name: '',
    bio: '',
    avatar_url: '',
  });

  /**
   * useEffect - Fetch Profile Data on Component Mount
   *
   * Calls the getProfile API endpoint to retrieve the current user's profile.
   * On success, populates both the profile state (for display) and the form
   * state (for editing). On failure, sets an error message.
   *
   * Runs only once on mount (empty dependency array).
   */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getProfile();
        const data = response.data || response;
        setProfile(data);
        // Pre-populate the edit form with the current profile values
        setForm({
          name: data.name || '',
          bio: data.bio || '',
          avatar_url: data.avatar_url || '',
        });
      } catch (err) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  /**
   * showToast - Displays a temporary toast notification
   *
   * Sets the toast state with a message and type, then automatically
   * clears it after 3 seconds using setTimeout.
   *
   * @param {string} message - The text to display in the toast
   * @param {string} type - The toast type: 'success' (default) or 'error'
   */
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  /**
   * handleChange - Updates the form state when an editable input changes
   *
   * @param {Event} e - The input change event
   */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /**
   * handleSubmit - Sends the updated profile data to the API
   *
   * Merges the API response with the current profile and form data,
   * exits edit mode, and shows a success toast. On failure, shows an error toast.
   *
   * @param {Event} e - The form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await updateProfile(form);
      const updated = response.data || response;
      // Merge updated data back into the profile state
      setProfile({ ...profile, ...updated, ...form });
      setEditing(false);
      showToast('Profile updated successfully!');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update profile', 'error');
    }
  };

  /**
   * formatDate - Formats an ISO date string into a human-readable format
   *
   * @param {string} dateStr - ISO date string (e.g., '2024-01-15T00:00:00Z')
   * @returns {string} Formatted date (e.g., 'January 15, 2024') or 'N/A' if null
   */
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Conditional rendering for loading, error, and not-found states
  if (loading) return <div className="container"><p>Loading profile...</p></div>;
  if (error) return <div className="container"><p className="error">{error}</p></div>;
  if (!profile) return <div className="container"><p>Profile not found.</p></div>;

  return (
    <div className="detail-page">
      {/* Inline toast notification - rendered when toast state is not null */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
      <div className="container">
        <div className="detail-card">
          <div className="detail-body">
            {/* Display user avatar if a URL is provided */}
            {profile.avatar_url && (
              <img
                src={profile.avatar_url}
                alt={`${profile.name}'s avatar`}
                className="profile-avatar"
              />
            )}
            <h1>{profile.name}</h1>
            <p>{profile.email}</p>
            <span className="badge badge-primary">{profile.role}</span>
            <p><strong>Member since:</strong> {formatDate(profile.created_at)}</p>
            {profile.bio && <p>{profile.bio}</p>}

            {/* Conditional rendering: show either view mode or edit form */}
            {!editing ? (
              <div>
                {/* View mode - shows an "Edit Profile" button to enter edit mode */}
                <button
                  className="btn btn-primary"
                  onClick={() => setEditing(true)}
                >
                  Edit Profile
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="name">Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="bio">Bio</label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={form.bio}
                    onChange={handleChange}
                    rows="4"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="avatar_url">Avatar URL</label>
                  <input
                    type="url"
                    id="avatar_url"
                    name="avatar_url"
                    value={form.avatar_url}
                    onChange={handleChange}
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    Save Changes
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Quick navigation links to the user's personal activity pages */}
            <div className="profile-links">
              <h3>Quick Links</h3>
              <Link to="/my-donations" className="btn btn-secondary">My Donations</Link>
              <Link to="/my-events" className="btn btn-secondary">My Events</Link>
              <Link to="/my-sightings" className="btn btn-secondary">My Sightings</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
