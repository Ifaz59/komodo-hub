/**
 * DonationHistory.js - User Donation History Page
 *
 * Displays a table of all donations made by the currently authenticated user.
 * Each row shows the campaign name, donation amount, optional message, and date.
 *
 * Features:
 * - Fetches the user's donation history from the API on mount
 * - Renders data in a responsive HTML table format
 * - Shows an empty state with encouragement to browse campaigns if no donations exist
 * - Formats monetary amounts and dates for readable display
 * - This is a protected page (requires authentication)
 */

import React, { useState, useEffect } from 'react';
import { getMyDonations } from '../services/api';

const DonationHistory = () => {
  // State to store the array of donation objects for the current user
  const [donations, setDonations] = useState([]);

  // Loading state - true while donation history is being fetched
  const [loading, setLoading] = useState(true);

  // Error state - holds an error message if the fetch fails
  const [error, setError] = useState(null);

  /**
   * useEffect - Fetch User's Donation History on Component Mount
   *
   * Calls the getMyDonations API endpoint to retrieve all donations
   * made by the currently authenticated user. Runs once on mount.
   */
  useEffect(() => {
    const fetchDonations = async () => {
      try {
        const response = await getMyDonations();
        setDonations(response.data);
      } catch (err) {
        setError('Failed to load donation history');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDonations();
  }, []);

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

  if (loading) return <div className="container"><p>Loading donation history...</p></div>;
  if (error) return <div className="container"><p className="error">{error}</p></div>;

  return (
    <div>
      <div className="page-header">
        <h1>My Donations</h1>
        <p>Your contribution history</p>
      </div>
      <div className="container">
        {/* Conditional rendering: empty state or donation table */}
        {donations.length === 0 ? (
          <div className="empty-state">
            <h3>No donations yet</h3>
            <p>You haven't made any donations. Browse active campaigns to make your first contribution!</p>
          </div>
        ) : (
          /* Donation history table with campaign, amount, message, and date columns */
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Amount</th>
                  <th>Message</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((donation, index) => (
                  <tr key={donation.id || index}>
                    <td>{donation.campaign?.title || 'Unknown Campaign'}</td>
                    <td>{formatMoney(donation.amount)}</td>
                    <td>{donation.message || '—'}</td>
                    <td>{formatDate(donation.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DonationHistory;
