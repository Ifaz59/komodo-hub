/**
 * AuthContext.js - Global Authentication State Management
 *
 * This module implements React's Context API to provide authentication state
 * and actions (login, logout) to every component in the application tree.
 *
 * How it works:
 * 1. On initial load, checks localStorage for an existing JWT token
 * 2. If a token exists, validates it by fetching the user profile from the API
 * 3. If the token is invalid or expired, clears it from localStorage
 * 4. Provides user data, loading state, loginUser(), and logout() to consumers
 *
 * Usage: Wrap the app in <AuthProvider>, then call useAuth() in any child component.
 */

import React, { createContext, useState, useContext, useEffect } from 'react';
import { getProfile } from '../services/api';

// Create the authentication context with a default value of null
const AuthContext = createContext(null);

/**
 * AuthProvider - Context Provider Component
 *
 * Wraps the entire application and supplies authentication state to all
 * child components via React Context. Manages the current user object,
 * loading state, and provides login/logout helper functions.
 *
 * @param {ReactNode} children - Child components that can consume the auth context
 */
export const AuthProvider = ({ children }) => {
  // State to hold the currently authenticated user object (null if not logged in)
  const [user, setUser] = useState(null);

  // Loading state - true while we verify the stored token on initial page load
  const [loading, setLoading] = useState(true);

  /**
   * useEffect - Token Validation on App Mount
   *
   * Runs once when the app first loads. Checks if a JWT token is stored
   * in localStorage. If found, it calls the API to fetch the user's profile
   * to validate the token. If the token is invalid (API returns an error),
   * it clears the token from storage and sets the user to null.
   *
   * Dependency array is empty [] so this only runs on initial mount.
   */
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Token exists - validate it by fetching the user profile
      getProfile()
        .then((res) => setUser(res.data))
        .catch(() => {
          // Token is invalid or expired - clean up
          localStorage.removeItem('token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      // No token found - user is not logged in, stop loading
      setLoading(false);
    }
  }, []);

  /**
   * loginUser - Stores the JWT token and sets the user state
   *
   * Called after a successful login or registration API response.
   * Persists the token to localStorage for future sessions and
   * updates the user state so the UI reflects the logged-in status.
   *
   * @param {string} token - The JWT token received from the server
   * @param {Object} userData - The user object (name, email, role, etc.)
   */
  const loginUser = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  /**
   * logout - Clears authentication state and token
   *
   * Removes the JWT token from localStorage and sets the user to null,
   * which triggers the UI to show the logged-out state (login/register links).
   */
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // Provide auth state and actions to all child components
  return (
    <AuthContext.Provider value={{ user, setUser, loading, loginUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * useAuth - Custom Hook for Accessing Auth Context
 *
 * A convenience hook that returns the current auth context value.
 * Must be called from within a component that is a descendant of <AuthProvider>.
 *
 * @returns {{ user: Object|null, setUser: Function, loading: boolean, loginUser: Function, logout: Function }}
 */
export const useAuth = () => useContext(AuthContext);
