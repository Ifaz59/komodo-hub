/**
 * App.js - Root Application Component
 *
 * This is the main entry point for the Komodo Hub React application.
 * It sets up the client-side routing using React Router, wraps the entire
 * app in the AuthProvider for global authentication state, and defines
 * all the application routes including protected (authenticated) routes.
 *
 * Key responsibilities:
 * - Configures React Router with all page routes
 * - Implements route protection via the ProtectedRoute wrapper component
 * - Provides the global authentication context to all child components
 * - Renders the persistent Navbar, Footer, and ToastContainer across all pages
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// Import shared layout components
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Import all page-level components
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import SpeciesList from './pages/SpeciesList';
import SpeciesDetail from './pages/SpeciesDetail';
import ReportSighting from './pages/ReportSighting';
import SightingsFeed from './pages/SightingsFeed';
import CampaignsList from './pages/CampaignsList';
import CampaignDetail from './pages/CampaignDetail';
import DonationHistory from './pages/DonationHistory';
import EventsList from './pages/EventsList';
import EventDetail from './pages/EventDetail';
import MyEvents from './pages/MyEvents';
import AdminDashboard from './pages/AdminDashboard';

/**
 * ProtectedRoute - Higher-Order Component for Route Authorization
 *
 * Wraps child routes to enforce authentication and optional role-based access.
 * - If the auth state is still loading, shows a loading indicator
 * - If no user is logged in, redirects to the login page
 * - If a 'roles' array is provided and the user's role is not included, redirects to home
 * - Otherwise, renders the child component
 *
 * @param {ReactNode} children - The child component(s) to render if authorized
 * @param {string[]} roles - Optional array of allowed roles (e.g., ['admin'])
 */
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  // Show loading state while authentication status is being determined
  if (loading) return <div className="loading">Loading...</div>;

  // Redirect unauthenticated users to the login page
  if (!user) return <Navigate to="/login" />;

  // Redirect users without the required role back to the homepage
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;

  // User is authenticated and authorized - render the protected content
  return children;
};

/**
 * AppContent - Main Layout and Routing Component
 *
 * Defines the application shell (Navbar + main content area + Footer)
 * and all client-side routes. This component must be a child of AuthProvider
 * so that ProtectedRoute can access the auth context via useAuth().
 *
 * Routes are divided into:
 * - Public routes: Home, Login, Register, Species, Sightings, Campaigns, Events
 * - Protected routes: Profile, Report Sighting, My Donations, My Events
 * - Admin-only routes: Admin Dashboard (requires 'admin' role)
 */
function AppContent() {
  return (
    <Router>
      <div className="app">
        {/* Persistent navigation bar shown on every page */}
        <Navbar />
        <main className="main-content">
          <Routes>
            {/* Public routes - accessible to all visitors */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/species" element={<SpeciesList />} />
            <Route path="/species/:id" element={<SpeciesDetail />} />
            <Route path="/sightings" element={<SightingsFeed />} />
            <Route path="/campaigns" element={<CampaignsList />} />
            <Route path="/campaigns/:id" element={<CampaignDetail />} />
            <Route path="/events" element={<EventsList />} />
            <Route path="/events/:id" element={<EventDetail />} />

            {/* Protected routes - require user to be logged in */}
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/report-sighting" element={<ProtectedRoute><ReportSighting /></ProtectedRoute>} />
            <Route path="/my-donations" element={<ProtectedRoute><DonationHistory /></ProtectedRoute>} />
            <Route path="/my-events" element={<ProtectedRoute><MyEvents /></ProtectedRoute>} />

            {/* Admin-only route - requires the 'admin' role */}
            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          </Routes>
        </main>
        {/* Persistent footer shown on every page */}
        <Footer />
        {/* Global toast notification container - displays in the bottom-right corner */}
        <ToastContainer position="bottom-right" autoClose={3000} />
      </div>
    </Router>
  );
}

/**
 * App - Top-Level Application Component
 *
 * Wraps AppContent in the AuthProvider so that authentication state
 * (user, login, logout) is available to all components in the tree.
 * AuthProvider must be outside of Router because AppContent uses
 * useAuth() inside ProtectedRoute.
 */
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
