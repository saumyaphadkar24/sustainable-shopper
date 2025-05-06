import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const EditItemModal = ({ isOpen, onClose, item, tags, onItemUpdate }) => {
  const [editForm, setEditForm] = useState({
    name: '',
    fit_description: '',
    tag: '',
    in_laundry: false,
    unavailable: false
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  
  // Initialize form with item data when modal opens
  useEffect(() => {
    if (item) {
      setEditForm({
        name: item.name || '',
        fit_description: item.fit_description || '',
        tag: item.tag || '',
        in_laundry: item.in_laundry || false,
        unavailable: item.unavailable || false
      });
    }
  }, [item]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!editForm.tag) {
      setError('Please select a category tag');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/wardrobe/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editForm.name,
          fit_description: editForm.fit_description,
          tag: editForm.tag,
          in_laundry: editForm.in_laundry,
          unavailable: editForm.unavailable,
          images: item.images // Keep existing images
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update item');
      }
      
      const updatedItem = await response.json();
      
      // Notify parent component about the update
      onItemUpdate(updatedItem);
      
      // Close the modal
      onClose();
      
    } catch (err) {
      setError('Error updating item. Please try again.');
      console.error('Error updating wardrobe item:', err);
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen || !item) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="edit-item-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
        
        <h3>Edit Wardrobe Item</h3>
        
        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}
        
        <div className="item-image-preview">
          {item.images && item.images.length > 0 ? (
            <img 
              src={item.images[0]} 
              alt={item.name || 'Wardrobe item'} 
              className="full-image" 
            />
          ) : (
            <div className="no-image-large">
              <i className="fas fa-tshirt"></i>
            </div>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="edit-item-form">
          {/* Item Name */}
          <div className="form-group">
            <label htmlFor="edit-name">Item Name (Optional)</label>
            <input
              type="text"
              id="edit-name"
              value={editForm.name}
              onChange={(e) => setEditForm({...editForm, name: e.target.value})}
              placeholder="E.g., Blue Denim Jacket"
              className="form-input"
            />
          </div>
          
          {/* Fit Description */}
          <div className="form-group">
            <label htmlFor="edit-fit_description">Fit Description (Optional)</label>
            <textarea
              id="edit-fit_description"
              value={editForm.fit_description}
              onChange={(e) => setEditForm({...editForm, fit_description: e.target.value})}
              placeholder="Describe how this item fits on your body"
              rows="3"
              className="form-textarea"
            ></textarea>
          </div>
          
          {/* Category */}
          <div className="form-group">
            <label htmlFor="edit-tag">Category <span className="required">*</span></label>
            <select
              id="edit-tag"
              value={editForm.tag}
              onChange={(e) => setEditForm({...editForm, tag: e.target.value})}
              required
              className="form-select"
            >
              <option value="">Select a category</option>
              {tags.map(tag => (
                <option key={`${tag.category}-${tag.tag}`} value={tag.tag}>
                  {tag.tag} ({tag.category})
                </option>
              ))}
            </select>
          </div>
          
          {/* Status Checkboxes */}
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={editForm.in_laundry}
                onChange={(e) => setEditForm({...editForm, in_laundry: e.target.checked})}
              />
              In Laundry
            </label>
            
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={editForm.unavailable}
                onChange={(e) => setEditForm({...editForm, unavailable: e.target.checked})}
              />
              Unavailable
            </label>
          </div>
          
          {/* Form Actions */}
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditItemModal;