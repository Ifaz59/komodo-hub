/**
 * Home.js - Landing Page Component
 *
 * The homepage of the Komodo Hub application. Serves as the main entry point
 * for visitors and showcases the platform's purpose and key features.
 *
 * The page is structured into three sections:
 * 1. Hero Section - Main headline, description, and call-to-action buttons
 * 2. Features Section - A grid of four feature cards explaining how users can help
 * 3. Stats Section - Quick statistics showing the platform's impact
 *
 * This is a stateless component with no API calls or side effects - all data
 * is defined as static arrays within the component.
 */

import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  // Static array of platform features displayed in the "How You Can Help" section
  // Each feature has an emoji icon, a title, and a description
  const features = [
    {
      icon: '🦎',
      title: 'Wildlife Tracking',
      description: 'Browse our comprehensive database of endangered species across the Indonesian archipelago.',
      link: '/species'
    },
    {
      icon: '👁️',
      title: 'Community Sightings',
      description: 'Report and share wildlife sightings to help researchers monitor animal populations.',
      link: '/sightings'
    },
    {
      icon: '💚',
      title: 'Conservation Campaigns',
      description: 'Donate to active conservation campaigns and help protect endangered wildlife.',
      link: '/campaigns'
    },
    {
      icon: '🤝',
      title: 'Volunteer Events',
      description: 'Join conservation events and volunteer programs to make a direct impact.',
      link: '/events'
    }
  ];

  // Static array of platform statistics displayed in the "Our Impact" section
  const stats = [
    { number: '7+', label: 'Species Tracked' },
    { number: '3', label: 'Active Campaigns' },
    { number: '4', label: 'Upcoming Events' },
    { number: null, icon: '🌍', label: 'Community Driven' }
  ];

  return (
    <div>
      {/* Hero Section - Primary call-to-action area with headline and buttons */}
      <section className="hero">
        <div className="container">
          <h1>Protect Indonesia's Wildlife</h1>
          <p>
            Komodo Hub is a digital platform for community-supported animal conservation.
            Together, we can protect endangered species and preserve biodiversity across
            the Indonesian archipelago.
          </p>
          <div className="hero-buttons">
            {/* Primary CTA directs users to browse the species directory */}
            <Link to="/species" className="btn btn-primary">Explore Species</Link>
            {/* Secondary CTA encourages new users to register */}
            <Link to="/register" className="btn btn-outline">Join Conservation</Link>
          </div>
        </div>
      </section>

      {/* Features Section - Displays a grid of four feature cards */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">How You Can Help</h2>
          <p className="section-subtitle">
            Join our community and contribute to wildlife conservation in multiple ways.
          </p>
          <div className="features-grid">
            {/* Iterate over the features array and render a card for each feature */}
            {features.map((feature, index) => (
              <Link to={feature.link} key={index} className="feature-card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section - Displays platform impact numbers in a grid */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Our Impact</h2>
          <div className="stats-grid">
            {/* Iterate over the stats array and render a stat card for each metric */}
            {stats.map((stat, index) => (
              <div className="stat-card" key={index}>
                {stat.icon
                  ? <div style={{ fontSize: '2.8rem', lineHeight: 1, marginBottom: 0 }}>{stat.icon}</div>
                  : <div className="stat-number">{stat.number}</div>
                }
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
