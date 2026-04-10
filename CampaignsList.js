/**
 * CampaignsList.js - Conservation Campaigns Listing Page
 *
 * Displays all conservation fundraising campaigns in a card grid format.
 * Each campaign card shows the title, a truncated description, a visual
 * progress bar indicating fundraising progress, and a status badge.
 *
 * Features:
 * - Fetches all campaigns from the API on component mount
 * - Calculates and renders donation progress as a percentage bar
 * - Formats monetary amounts with dollar signs and locale-specific formatting
 * - Each card links to the campaign detail page for full info and donations
 * - Handles loading and error states gracefully
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCampaigns } from '../services/api';

const CampaignsList = () => {
  // State to store the array of campaign objects from the API
  const [campaigns, setCampaigns] = useState([]);

  // Loading state - true while campaigns are being fetched
  const [loading, setLoading] = useState(true);

  // Error state - holds an error message if the fetch fails
  const [error, setError] = useState(null);

  /**
   * useEffect - Fetch All Campaigns on Component Mount
   *
   * Calls the getCampaigns API endpoint to load all conservation campaigns.
   * Runs once on mount (empty dependency array).
   */
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await getCampaigns();
        setCampaigns(response.data);
      } catch (err) {
        setError('Failed to load campaigns');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, []);

  /**
   * getProgressPercentage - Calculates campaign fundraising progress
   *
   * Returns a percentage (0-100) representing how much has been raised
   * relative to the campaign goal. Capped at 100% to prevent overflow.
   *
   * @param {number} raised - Amount of money raised so far
   * @param {number} goal - Target fundraising goal
   * @returns {number} Progress percentage (0-100)
   */
  const getProgressPercentage = (raised, goal) => {
    if (!goal || goal === 0) return 0;
    return Math.min((raised / goal) * 100, 100);
  };

  /**
   * formatMoney - Formats a number as a dollar currency string
   *
   * @param {number} amount - The monetary amount to format
   * @returns {string} Formatted string (e.g., '$1,500')
   */
  const formatMoney = (amount) => {
    return '$' + Number(amount || 0).toLocaleString();
  };

  if (loading) return <div className="container"><p>Loading campaigns...</p></div>;
  if (error) return <div className="container"><p className="error">{error}</p></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Conservation Campaigns</h1>
        <p>Support active conservation efforts through donations</p>
      </div>
      <div className="container">
        <div className="grid-3">
          {/* Iterate over campaigns, calculate progress, and render each as a card */}
          {campaigns.map((campaign) => {
            const percentage = getProgressPercentage(campaign.raised, campaign.goal);
            return (
              <Link to={`/campaigns/${campaign.id}`} key={campaign.id} className="card">
                <img
                  src={campaign.image || '/placeholder-campaign.jpg'}
                  alt={campaign.title}
                  className="card-img"
                />
                <div className="card-body">
                  <h3>{campaign.title}</h3>
                  <p>
                    {campaign.description && campaign.description.length > 120
                      ? campaign.description.substring(0, 120) + '...'
                      : campaign.description}
                  </p>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="progress-text">
                    {formatMoney(campaign.raised)} / {formatMoney(campaign.goal)}
                  </div>
                  <span className={campaign.status === 'active' ? 'badge-success' : 'badge'}>
                    {campaign.status}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CampaignsList;
