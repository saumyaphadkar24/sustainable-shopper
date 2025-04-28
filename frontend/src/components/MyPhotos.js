import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const MyPhotos = ({ onPhotoSelect, selectedPhotoId, isSelectionMode = false }) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [photoName, setPhotoName] = useState('');
  const { token } = useAuth();

  useEffect(() => {
    fetchPhotos();
  }, [token]);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/photos', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch photos');
      }

      const data = await response.json();
      setPhotos(data);
      setError(null);
    } catch (err) {
      setError('Error loading your photos. Please try again.');
      console.error('Error fetching photos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const fileType = file.type;
    if (!fileType.includes('image/jpeg') && !fileType.includes('image/png') && !fileType.includes('image/jpg')) {
      setError('Please upload a JPEG or PNG image.');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('name', photoName || file.name);

      const response = await fetch('/api/photos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }

      const newPhoto = await response.json();
      setPhotos([newPhoto, ...photos]);
      setPhotoName('');
      setError(null);
    } catch (err) {
      setError('Error uploading photo. Please try again.');
      console.error('Error uploading photo:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (id) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) {
      return;
    }

    try {
      const response = await fetch(`/api/photos/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete photo');
      }

      setPhotos(photos.filter(photo => photo.id !== id));
    } catch (err) {
      setError('Error deleting photo. Please try again.');
      console.error('Error deleting photo:', err);
    }
  };

  if (loading && photos.length === 0) {
    return (
      <div className="my-photos">
        <div className="section-header">
          <h3>My Photos</h3>
        </div>
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading your photos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-photos">
      <div className="section-header">
        <h3>My Photos</h3>
        {!isSelectionMode && (
          <div className="upload-container">
            <input
              type="text"
              placeholder="Photo name (optional)"
              value={photoName}
              onChange={(e) => setPhotoName(e.target.value)}
              className="photo-name-input"
            />
            <label className="btn btn-secondary">
              Upload New Photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handlePhotoUpload}
                disabled={uploading}
                className="hidden-input"
              />
            </label>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {uploading && (
        <div className="upload-status">
          <div className="loader-small"></div>
          <p>Uploading photo...</p>
        </div>
      )}

      {photos.length === 0 ? (
        <div className="empty-photos">
          <div className="empty-icon">
            <i className="fas fa-camera"></i>
          </div>
          <h4>No photos yet</h4>
          <p>Upload photos of yourself to use for virtual try-ons</p>
          <label className="btn btn-primary">
            Upload First Photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              onChange={handlePhotoUpload}
              disabled={uploading}
              className="hidden-input"
            />
          </label>
        </div>
      ) : (
        <div className="photos-grid">
          {photos.map(photo => (
            <div 
              key={photo.id} 
              className={`photo-item ${isSelectionMode && selectedPhotoId === photo.id ? 'selected' : ''}`}
              onClick={isSelectionMode ? () => onPhotoSelect(photo.id) : undefined}
            >
              <div className="photo-image">
                <img src={photo.image} alt={photo.name} />
                {isSelectionMode && selectedPhotoId === photo.id && (
                  <div className="selection-indicator">
                    <i className="fas fa-check-circle"></i>
                  </div>
                )}
              </div>
              <div className="photo-details">
                <p className="photo-name">{photo.name}</p>
                <p className="photo-date">{new Date(photo.created_at * 1000).toLocaleDateString()}</p>
                {!isSelectionMode && (
                  <button
                    className="btn btn-small btn-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePhoto(photo.id);
                    }}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPhotos;