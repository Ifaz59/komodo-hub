/**
 * ReportSighting.js - Report Wildlife Sighting Form Page
 *
 * Provides a form for authenticated users to submit a new wildlife sighting.
 * The form collects the species observed, location (text and optional GPS coords),
 * observation date, a description, and an optional image URL.
 *
 * Features:
 * - Fetches the species list from the API to populate the species dropdown
 * - Controlled form inputs for all sighting fields
 * - Optional latitude/longitude fields parsed as floats before submission
 * - Redirects to the sightings feed on successful submission
 * - This page is protected and requires the user to be authenticated
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSpecies, createSighting, uploadImage } from '../services/api';

const ReportSighting = () => {
  // React Router hook for redirecting after successful submission
  const navigate = useNavigate();

  // State to store the species list for the dropdown selector
  const [speciesList, setSpeciesList] = useState([]);

  // Loading state for the form submission
  const [loading, setLoading] = useState(false);

  // Image upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef();

  // State to store all form input values
  const [formData, setFormData] = useState({
    species_id: '',
    location: '',
    latitude: '',
    longitude: '',
    date: '',
    description: '',
    image_url: '',
  });

  /**
   * useEffect - Fetch Species List for Dropdown on Component Mount
   *
   * Retrieves all species from the API so the user can select which
   * species they observed from a dropdown menu.
   */
  useEffect(() => {
    const fetchSpecies = async () => {
      try {
        const response = await getSpecies();
        setSpeciesList(response.data);
      } catch (error) {
        console.error('Error fetching species:', error);
      }
    };
    fetchSpecies();
  }, []);

  /**
   * handleChange - Updates form state when any input value changes
   *
   * Uses the input's name attribute to dynamically update the correct
   * field in the formData state using a functional state update.
   *
   * @param {Event} e - The input change event
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const res = await uploadImage(file);
      setFormData((prev) => ({ ...prev, image_url: res.data.url }));
    } catch (err) {
      setUploadError('Upload failed. Try pasting a URL instead.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  /**
   * handleSubmit - Handles the sighting report form submission
   *
   * Constructs the API payload from the form data. Optional fields
   * (image_url, latitude, longitude) are only included if they have values.
   * Latitude and longitude are parsed from strings to floating-point numbers.
   *
   * On success, shows an alert and redirects to the sightings feed.
   * On failure, shows an error alert.
   *
   * @param {Event} e - The form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Build the payload with required fields
      const payload = {
        species_id: formData.species_id,
        location: formData.location,
        date: formData.date,
        description: formData.description,
        image_url: formData.image_url || undefined, // Exclude empty string
      };

      // Only include GPS coordinates if both latitude and longitude are provided
      if (formData.latitude && formData.longitude) {
        payload.latitude = parseFloat(formData.latitude);
        payload.longitude = parseFloat(formData.longitude);
      }

      await createSighting(payload);
      alert('Sighting reported successfully!');
      navigate('/sightings');
    } catch (error) {
      console.error('Error reporting sighting:', error);
      alert('Failed to report sighting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="form-container" style={{ maxWidth: '600px', margin: '2rem auto' }}>
        <div className="form-card">
          <h1>Report a Sighting</h1>
          <p>Share your wildlife observation with the community</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="species_id">Species</label>
              <select
                id="species_id"
                name="species_id"
                value={formData.species_id}
                onChange={handleChange}
                required
              >
                <option value="">Select a species</option>
                {speciesList.map((species) => (
                  <option key={species.id} value={species.id}>
                    {species.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Komodo National Park"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="latitude">Latitude (optional)</label>
              <input
                type="number"
                id="latitude"
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                placeholder="e.g., -8.5503"
                step="any"
              />
            </div>

            <div className="form-group">
              <label htmlFor="longitude">Longitude (optional)</label>
              <input
                type="number"
                id="longitude"
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
                placeholder="e.g., 119.4893"
                step="any"
              />
            </div>

            <div className="form-group">
              <label htmlFor="date">Date</label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe what you observed..."
                rows="4"
                required
              />
            </div>

            <div className="form-group">
              <label>Photo (optional)</label>
              {formData.image_url && (
                <img
                  src={formData.image_url}
                  alt="preview"
                  style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, marginBottom: 8, border: '1px solid #d1d5db' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageFile} />
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                disabled={uploading}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: '2px dashed #166534', background: '#f0fdf4', color: '#166534', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
              >
                {uploading ? 'Uploading…' : formData.image_url ? '📷 Change Photo' : '📷 Upload Photo'}
              </button>
              {formData.image_url && (
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, image_url: '' }))}
                  style={{ marginTop: 6, background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13 }}
                >
                  Remove photo
                </button>
              )}
              {uploadError && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 4 }}>{uploadError}</p>}
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Sighting'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportSighting;
