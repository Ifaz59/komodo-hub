/**
 * Login.js - User Login Page Component
 *
 * Renders a login form that allows existing users to authenticate with their
 * email and password. On successful login, the JWT token and user data are
 * stored via the AuthContext and the user is redirected to the homepage.
 *
 * Features:
 * - Controlled form inputs for email and password
 * - Loading state to disable the submit button during API calls
 * - Toast notifications for success and error feedback
 * - Link to the registration page for new users
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { login } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  // State to store the form input values (email and password)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // Loading state - true while the login API request is in progress
  const [loading, setLoading] = useState(false);

  // Toggle state for showing/hiding the password field
  const [showPassword, setShowPassword] = useState(false);

  // React Router hook to programmatically navigate after successful login
  const navigate = useNavigate();

  // Destructure the loginUser function from the authentication context
  const { loginUser } = useAuth();

  /**
   * handleChange - Updates form state when input values change
   *
   * Uses computed property names ([e.target.name]) to dynamically update
   * the correct field in the formData state object. This allows a single
   * handler to manage multiple form inputs.
   *
   * @param {Event} e - The input change event
   */
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  /**
   * handleSubmit - Handles the login form submission
   *
   * Prevents the default form submission, sends the credentials to the
   * login API endpoint, and on success:
   * 1. Stores the JWT token and user data in AuthContext
   * 2. Shows a success toast notification
   * 3. Redirects the user to the homepage
   *
   * On failure, displays an error toast with the server's error message.
   *
   * @param {Event} e - The form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Send login credentials to the API
      const response = await login(formData);

      // Store the token and user data in the auth context
      loginUser(response.data.token, response.data.user);

      // Show success notification and redirect to the homepage
      toast.success('Login successful!');
      navigate('/');
    } catch (error) {
      // Display error message from the server, or a generic fallback message
      toast.error(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      // Reset loading state regardless of success or failure
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <h2>Welcome Back</h2>
        <p>Login to your Komodo Hub account</p>

        {/* Login form with email and password fields */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem',
                  color: '#6c757d', fontWeight: '600', padding: '4px 8px'
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Submit button - disabled while the login request is in progress */}
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Footer link directing new users to the registration page */}
        <div className="form-footer">
          <p>Don't have an account? <Link to="/register">Register</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
