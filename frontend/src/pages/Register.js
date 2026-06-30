/**
 * Register.js - User Registration Page Component
 *
 * Renders a registration form that allows new users to create an account
 * on the Komodo Hub platform. Collects name, email, password (with confirmation),
 * and a role selection. On successful registration, automatically logs the user
 * in and redirects them to the homepage.
 *
 * Features:
 * - Controlled form inputs for all registration fields
 * - Client-side password confirmation validation before API submission
 * - Role selection dropdown (Registered User, Donor, Volunteer, Researcher)
 * - Automatic login after successful registration
 * - Toast notifications for success and error feedback
 * - Link to the login page for existing users
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { register } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  // State to store all form input values including password confirmation and role
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'registered_user' // Default role for new users
  });

  // Loading state - true while the registration API request is in progress
  const [loading, setLoading] = useState(false);

  // Toggle state for showing/hiding password fields
  const [showPassword, setShowPassword] = useState(false);

  // React Router hook for programmatic navigation after registration
  const navigate = useNavigate();

  // Destructure the loginUser function from the authentication context
  const { loginUser } = useAuth();

  /**
   * handleChange - Updates form state when any input value changes
   *
   * Uses computed property names to dynamically update the correct field
   * in the formData state. Works for text inputs, email, password, and select.
   *
   * @param {Event} e - The input change event
   */
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  /**
   * handleSubmit - Handles the registration form submission
   *
   * Performs the following steps:
   * 1. Prevents default form submission
   * 2. Validates that password and confirmPassword match (client-side validation)
   * 3. Strips the confirmPassword field before sending to the API
   * 4. Calls the register API endpoint with the form data
   * 5. On success: stores token/user in AuthContext, shows toast, redirects to home
   * 6. On failure: shows an error toast with the server message
   *
   * @param {Event} e - The form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation: ensure both password fields match
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Destructure to remove confirmPassword before sending to the API
      // The API does not expect a confirmPassword field
      const { confirmPassword, ...submitData } = formData;

      // Send registration data to the API
      const response = await register(submitData);

      // Auto-login: store the token and user data returned by the API
      loginUser(response.data.token, response.data.user);

      // Show success notification and redirect to homepage
      toast.success('Registration successful!');
      navigate('/');
    } catch (error) {
      // Display error message from the server, or a generic fallback
      toast.error(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      // Reset loading state regardless of outcome
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <h2>Create Account</h2>
        <p>Join the Komodo Hub conservation community</p>

        {/* Registration form with name, email, password, confirm password, and role */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </div>
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
                placeholder="Create a password"
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
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
              />
            </div>
          </div>

          {/* Role selection dropdown - lets users choose their role type */}
          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="registered_user">Registered User</option>
              <option value="donor">Donor</option>
              <option value="volunteer">Volunteer</option>
              <option value="researcher">Researcher</option>
            </select>
          </div>

          {/* Submit button - shows loading text while registration is in progress */}
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        {/* Footer link directing existing users to the login page */}
        <div className="form-footer">
          <p>Already have an account? <Link to="/login">Login</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;
