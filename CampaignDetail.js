/**
 * CampaignDetail.js - Individual Campaign Detail and Donation Page
 *
 * Displays full details of a single conservation campaign and allows
 * authenticated users to make donations. Shows the campaign image,
 * description, date range, progress bar, donation form with preset
 * amounts, and a list of recent donations.
 *
 * Features:
 * - Fetches campaign details and donation list by campaign ID from the URL
 * - Displays a visual fundraising progress bar with percentage
 * - Preset donation amount buttons ($10, $25, $50, $100) plus custom input
 * - Donation form with optional message, only shown to logged-in users
 * - Re-fetches campaign and donation data after a successful donation
 * - Shows a login prompt for unauthenticated visitors
 * - Inline toast notifications for donation success/failure
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCampaignById, makeDonation, getCampaignDonations } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CampaignDetail = () => {
  // Extract the campaign ID from the URL parameters
  const { id } = useParams();

  // Get the current user from auth context (null if not logged in)
  const { user } = useAuth();

  // State to store the campaign details object
  const [campaign, setCampaign] = useState(null);

  // State to store the list of donations for this campaign
  const [donations, setDonations] = useState([]);

  // Loading and error states for the initial campaign fetch
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Donation form state - the amount to donate and optional message
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');

  // Donating state - true while the donation API request is in progress
  const [donating, setDonating] = useState(false);

  // Toast notification state for donation feedback
  const [toast, setToast] = useState(null);

  /**
   * fetchCampaign - Fetches the campaign details from the API
   *
   * Called on mount and after each successful donation to refresh the
   * campaign's raised amount and progress data.
   */
  const fetchCampaign = async () => {
    try {
      const response = await getCampaignById(id);
      setCampaign(response.data);
    } catch (err) {
      setError('Failed to load campaign');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * fetchDonations - Fetches the list of donations for this campaign
   *
   * Called on mount and after each successful donation to show the
   * latest donations in the recent donations list.
   */
  const fetchDonations = async () => {
    try {
      const response = await getCampaignDonations(id);
      setDonations(response.data);
    } catch (err) {
      console.error('Failed to load donations:', err);
    }
  };

  /**
   * useEffect - Fetch Campaign and Donations on Mount / ID Change
   *
   * Loads both the campaign details and the donation list when the
   * component mounts or when the campaign ID in the URL changes.
   */
  useEffect(() => {
    fetchCampaign();
    fetchDonations();
  }, [id]);

  /**
   * handlePresetAmount - Sets the donation amount from a preset button
   *
   * Converts the preset number to a string and updates the amount state.
   *
   * @param {number} preset - The preset dollar amount (e.g., 10, 25, 50, 100)
   */
  const handlePresetAmount = (preset) => {
    setAmount(preset.toString());
  };

  /**
   * handleDonate - Handles the donation form submission
   *
   * Validates the amount, sends the donation to the API, and on success:
   * 1. Shows a success toast
   * 2. Resets the form fields
   * 3. Re-fetches campaign data and donations to update the progress bar
   *
   * On failure, shows an error toast. Toast auto-clears after 4 seconds.
   *
   * @param {Event} e - The form submit event
   */
  const handleDonate = async (e) => {
    e.preventDefault();
    // Validate that a positive amount is entered
    if (!amount || Number(amount) <= 0) return;

    setDonating(true);
    try {
      await makeDonation({
        campaign_id: id,
        amount: Number(amount),
        message: message || undefined, // Exclude empty string
      });
      setToast('Donation successful! Thank you for your contribution.');
      // Reset form fields after successful donation
      setAmount('');
      setMessage('');
      // Refresh campaign progress and donation list
      await fetchCampaign();
      await fetchDonations();
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      setToast('Donation failed. Please try again.');
      setTimeout(() => setToast(null), 4000);
      console.error(err);
    } finally {
      setDonating(false);
    }
  };

  /**
   * getProgressPercentage - Calculates fundraising progress as a percentage
   *
   * @param {number} raised - Amount raised so far
   * @param {number} goal - Fundraising target
   * @returns {number} Percentage (0-100), capped at 100
   */
  const getProgressPercentage = (raised, goal) => {
    if (!goal || goal === 0) return 0;
    return Math.min((raised / goal) * 100, 100);
  };

  /**
   * formatMoney - Formats a number as a dollar currency string
   *
   * @param {number} amount - The monetary amount
   * @returns {string} Formatted string (e.g., '$1,500')
   */
  const formatMoney = (amount) => {
    return '$' + Number(amount || 0).toLocaleString();
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

  if (loading) return <div className="container"><p>Loading campaign...</p></div>;
  if (error) return <div className="container"><p className="error">{error}</p></div>;
  if (!campaign) return <div className="container"><p>Campaign not found.</p></div>;

  const percentage = getProgressPercentage(campaign.raised, campaign.goal);

  return (
    <div className="detail-page">
      {toast && <div className="toast">{toast}</div>}
      <div className="detail-card">
        <img
          src={campaign.image || '/placeholder-campaign.jpg'}
          alt={campaign.title}
          className="detail-img"
        />
        <div className="detail-body">
          <h1>{campaign.title}</h1>
          <span className={campaign.status === 'active' ? 'badge-success' : 'badge'}>
            {campaign.status}
          </span>
          <p className="date-range">
            {formatDate(campaign.startDate)} — {formatDate(campaign.endDate)}
          </p>
          <p className="description">{campaign.description}</p>

          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${percentage}%` }}></div>
          </div>
          <div className="progress-text">
            {formatMoney(campaign.raised)} / {formatMoney(campaign.goal)} ({Math.round(percentage)}%)
          </div>

          {/* Donation form - only shown to authenticated users */}
          {user ? (
            <form className="donation-form" onSubmit={handleDonate}>
              <h3>Make a Donation</h3>
              {/* Preset amount buttons for quick donation selection */}
              <div className="amount-grid">
                {[10, 25, 50, 100].map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    className={`amount-btn ${Number(amount) === preset ? 'active' : ''}`}
                    onClick={() => handlePresetAmount(preset)}
                  >
                    ${preset}
                  </button>
                ))}
              </div>
              <input
                type="number"
                placeholder="Custom amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                step="any"
              />
              <textarea
                placeholder="Leave a message (optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows="3"
              />
              <button type="submit" className="btn" disabled={donating || !amount}>
                {donating ? 'Processing...' : 'Donate Now'}
              </button>
            </form>
          ) : (
            /* Login prompt shown to unauthenticated visitors */
            <div className="login-prompt">
              <p>
                <Link to="/login">Log in to donate</Link>
              </p>
            </div>
          )}

          {/* Recent donations list - only shown if there are donations */}
          {donations.length > 0 && (
            <div className="recent-donations">
              <h3>Recent Donations</h3>
              <ul>
                {donations.map((donation, index) => (
                  <li key={donation.id || index}>
                    <strong>{formatMoney(donation.amount)}</strong>
                    {donation.message && <span> — {donation.message}</span>}
                    <span className="donation-date">{formatDate(donation.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;
