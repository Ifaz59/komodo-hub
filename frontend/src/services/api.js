/**
 * api.js - Centralized API Service Layer
 *
 * This module configures an Axios HTTP client instance and exports all
 * API endpoint functions used throughout the Komodo Hub application.
 *
 * Key features:
 * - Creates a pre-configured Axios instance with the base URL and default headers
 * - Uses a request interceptor to automatically attach the JWT token from
 *   localStorage to every outgoing request's Authorization header
 * - Organises API functions by domain: Auth, Species, Sightings, Campaigns,
 *   Donations, Events, and Admin
 *
 * All exported functions return Axios Promises that resolve to the server response.
 */

import axios from 'axios';

// Base URL for all API requests - reads from environment variable or falls back to localhost
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create a reusable Axios instance with default configuration
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Axios Request Interceptor
 *
 * Runs before every HTTP request made through this Axios instance.
 * Retrieves the JWT token from localStorage and attaches it to the
 * Authorization header as a Bearer token. This ensures that all
 * authenticated API calls include the user's credentials automatically.
 */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ==================== Authentication Endpoints ====================
// Handles user login, registration, and profile management

/** POST /auth/login - Authenticate a user with email and password */
export const login = (data) => api.post('/auth/login', data);

/** POST /auth/register - Create a new user account */
export const register = (data) => api.post('/auth/register', data);

/** GET /auth/profile - Fetch the currently authenticated user's profile */
export const getProfile = () => api.get('/auth/profile');

/** PUT /auth/profile - Update the currently authenticated user's profile */
export const updateProfile = (data) => api.put('/auth/profile', data);

// ==================== Species Endpoints ====================
// CRUD operations for the endangered species directory

/** GET /species - Fetch all species with optional query parameters for filtering */
export const getSpecies = (params) => api.get('/species', { params });

/** GET /species/:id - Fetch a single species by its unique ID */
export const getSpeciesById = (id) => api.get(`/species/${id}`);

/** POST /species - Create a new species entry (admin only) */
export const createSpecies = (data) => api.post('/species', data);

/** PUT /species/:id - Update a species entry (admin/researcher) */
export const updateSpecies = (id, data) => api.put(`/species/${id}`, data);

/** DELETE /species/:id - Delete a species entry (admin only) */
export const deleteSpecies = (id) => api.delete(`/species/${id}`);

// ==================== Sightings Endpoints ====================
// Manage community-reported wildlife sighting observations

/** GET /sightings - Fetch all sightings from the community feed */
export const getSightings = () => api.get('/sightings');

/** GET /sightings/:id - Fetch a single sighting by its unique ID */
export const getSightingById = (id) => api.get(`/sightings/${id}`);

/** POST /sightings - Submit a new wildlife sighting report */
export const createSighting = (data) => api.post('/sightings', data);

/** GET /sightings/user/me - Fetch all sightings reported by the current user */
export const getMySightings = () => api.get('/sightings/user/me');

/** PUT /sightings/:id/status - Update the verification status of a sighting (admin) */
export const updateSightingStatus = (id, status) => api.put(`/sightings/${id}/status`, { status });

// ==================== Campaign Endpoints ====================
// Manage conservation fundraising campaigns

/** GET /campaigns - Fetch all campaigns with optional query parameters */
export const getCampaigns = (params) => api.get('/campaigns', { params });

/** GET /campaigns/:id - Fetch a single campaign by its unique ID */
export const getCampaignById = (id) => api.get(`/campaigns/${id}`);

/** POST /campaigns - Create a new conservation campaign (admin only) */
export const createCampaign = (data) => api.post('/campaigns', data);

/** PUT /campaigns/:id - Update a campaign (admin only) */
export const updateCampaign = (id, data) => api.put(`/campaigns/${id}`, data);

/** DELETE /campaigns/:id - Delete a campaign (admin only) */
export const deleteCampaign = (id) => api.delete(`/campaigns/${id}`);

// ==================== Donation Endpoints ====================
// Handle financial donations to conservation campaigns

/** POST /donations - Make a donation to a campaign */
export const makeDonation = (data) => api.post('/donations', data);

/** GET /donations/my - Fetch all donations made by the current user */
export const getMyDonations = () => api.get('/donations/my');

/** GET /donations/campaign/:id - Fetch all donations for a specific campaign */
export const getCampaignDonations = (id) => api.get(`/donations/campaign/${id}`);

// ==================== Event Endpoints ====================
// Manage conservation volunteer events and registrations

/** GET /events - Fetch all events with optional query parameters */
export const getEvents = (params) => api.get('/events', { params });

/** GET /events/:id - Fetch a single event by its unique ID */
export const getEventById = (id) => api.get(`/events/${id}`);

/** POST /events - Create a new volunteer event (admin only) */
export const createEvent = (data) => api.post('/events', data);

/** PUT /events/:id - Update a volunteer event (admin only) */
export const updateEvent = (id, data) => api.put(`/events/${id}`, data);

/** DELETE /events/:id - Delete a volunteer event (admin only) */
export const deleteEvent = (id) => api.delete(`/events/${id}`);

/** POST /events/:id/register - Register the current user for an event */
export const registerForEvent = (id) => api.post(`/events/${id}/register`);

/** DELETE /events/:id/register - Cancel the current user's event registration */
export const cancelEventRegistration = (id) => api.delete(`/events/${id}/register`);

/** GET /events/user/my-events - Fetch all events the current user has registered for */
export const getMyEvents = () => api.get('/events/user/my-events');

// ==================== Admin Endpoints ====================
// Platform administration: statistics, user management

// ==================== Upload Endpoint ====================

/** POST /upload - Upload an image file, returns { url } */
export const uploadImage = (file) => {
  const formData = new FormData();
  formData.append('image', file);
  return api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

/** GET /admin/stats - Fetch platform-wide statistics (admin only) */
export const getAdminStats = () => api.get('/admin/stats');

/** GET /admin/users - Fetch all registered users (admin only) */
export const getAdminUsers = () => api.get('/admin/users');

/** PUT /admin/users/:id/role - Update a user's role (admin only) */
export const updateUserRole = (id, role) => api.put(`/admin/users/${id}/role`, { role });

/** DELETE /admin/users/:id - Delete a user account (admin only) */
export const deleteUser = (id) => api.delete(`/admin/users/${id}`);

export default api;
