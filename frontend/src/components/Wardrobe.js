import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import WeatherWidget from './WeatherWidget';

function Wardrobe() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tags, setTags] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const { token } = useAuth();

  // Form state for adding/editing items
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    tag: '',
    in_laundry: false,
    unavailable: false,
    image: null,
    imagePreview: null
  });

  useEffect(() => {
    fetchWardrobeItems();
    fetchTags();
  }, [token]);

  const fetchWardrobeItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/wardrobe', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch wardrobe items');
      }

      const data = await response.json();
      setItems(data);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(data.map(item => item.category))];
      setCategories(['All', ...uniqueCategories]);
      
      setError(null);
    } catch (err) {
      setError('Error loading your wardrobe. Please try again.');
      console.error('Error fetching wardrobe items:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/wardrobe/tags');
      if (!response.ok) {
        throw new Error('Failed to fetch tags');
      }
      const data = await response.json();
      setTags(data);
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const fileType = file.type;
    if (!fileType.includes('image/jpeg') && !fileType.includes('image/png') && !fileType.includes('image/jpg')) {
      setError('Please upload a JPEG or PNG image.');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setItemForm({
        ...itemForm,
        image: file,
        imagePreview: reader.result
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!itemForm.tag) {
      setError('Please select a category tag');
      return;
    }
    
    if (!itemForm.description && !itemForm.image) {
      setError('Please provide either a description or an image');
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('name', itemForm.name);
      formData.append('description', itemForm.description);
      formData.append('tag', itemForm.tag);
      formData.append('in_laundry', itemForm.in_laundry);
      formData.append('unavailable', itemForm.unavailable);
      
      if (itemForm.image) {
        formData.append('image', itemForm.image);
      }
      
      const response = await fetch('/api/wardrobe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to add item to wardrobe');
      }
      
      const newItem = await response.json();
      
      // Update items list
      setItems([newItem, ...items]);
      
      // Update categories if needed
      if (!categories.includes(newItem.category) && newItem.category !== 'All') {
        setCategories([...categories, newItem.category]);
      }
      
      // Reset form
      setItemForm({
        name: '',
        description: '',
        tag: '',
        in_laundry: false,
        unavailable: false,
        image: null,
        imagePreview: null
      });
      
      // Close modal
      setShowAddModal(false);
      setError(null);
      
    } catch (err) {
      setError('Error adding item to wardrobe. Please try again.');
      console.error('Error adding wardrobe item:', err);
    }
  };

  const toggleItemStatus = async (id, field) => {
    try {
      // Find the item
      const item = items.find(i => i.id === id);
      if (!item) return;
      
      // Prepare data for update
      const updateData = { [field]: !item[field] };
      
      // Send update request
      const response = await fetch(`/api/wardrobe/toggle/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update item ${field}`);
      }
      
      // Update local state
      setItems(items.map(i => {
        if (i.id === id) {
          return { ...i, [field]: !i[field] };
        }
        return i;
      }));
      
    } catch (err) {
      setError(`Error updating item. Please try again.`);
      console.error('Error updating wardrobe item:', err);
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/wardrobe/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete item');
      }
      
      // Remove item from state
      setItems(items.filter(item => item.id !== id));
      
    } catch (err) {
      setError('Error deleting item. Please try again.');
      console.error('Error deleting wardrobe item:', err);
    }
  };

  // Filter items by selected category
  const filteredItems = selectedCategory === 'All' 
    ? items 
    : items.filter(item => item.category === selectedCategory);

  // Group items by category for carousel
  const groupedItems = {};
  categories.forEach(category => {
    if (category !== 'All') {
      groupedItems[category] = items.filter(item => item.category === category);
    }
  });

  if (loading && items.length === 0) {
    return (
      <div className="wardrobe-page">
        <div className="container">
          <div className="page-header">
            <h2>My Wardrobe</h2>
          </div>
          <div className="loading-container">
            <div className="loader"></div>
            <p>Loading your wardrobe...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wardrobe-page">
      <div className="container">
        <div className="page-header">
          <h2>My Wardrobe</h2>
          <div className="wardrobe-actions">
            <button 
              className="btn btn-primary" 
              onClick={() => setShowAddModal(true)}
            >
              <i className="fas fa-plus"></i> Add Item
            </button>
            <button className="btn btn-secondary outfit-suggestion-btn">
              <i className="fas fa-magic"></i> Outfit Suggestions
            </button>
          </div>
        </div>

        <div className="weather-section">
          <WeatherWidget />
        </div>
        
        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={() => setError(null)} className="btn btn-small">Clear</button>
          </div>
        )}
        
        {items.length === 0 ? (
          <div className="empty-wardrobe">
            <div className="empty-icon">
              <i className="fas fa-tshirt"></i>
            </div>
            <h3>Your wardrobe is empty</h3>
            <p>Start adding items to organize your clothing collection</p>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowAddModal(true)}
            >
              Add Your First Item
            </button>
          </div>
        ) : (
          <>
            {/* Category selector tabs */}
            <div className="category-tabs">
              {categories.map(category => (
                <button
                  key={category}
                  className={`category-tab ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
            
            {/* Display items */}
            {selectedCategory === 'All' ? (
              // Display all items organized by category (carousel view)
              <div className="category-carousels">
                {Object.keys(groupedItems).map(category => (
                  groupedItems[category].length > 0 && (
                    <div key={category} className="category-section">
                      <h3>{category}</h3>
                      <div className="items-carousel">
                        {groupedItems[category].map(item => (
                          <div 
                            key={item.id} 
                            className={`wardrobe-item ${item.in_laundry ? 'in-laundry' : ''} ${item.unavailable ? 'unavailable' : ''}`}
                          >
                            <div className="item-image">
                              {item.image ? (
                                <img src={item.image} alt={item.name || item.description} />
                              ) : (
                                <div className="no-image">
                                  <i className="fas fa-tshirt"></i>
                                </div>
                              )}
                              {(item.in_laundry || item.unavailable) && (
                                <div className="item-status">
                                  {item.in_laundry && <span className="status-badge laundry">Laundry</span>}
                                  {item.unavailable && <span className="status-badge unavailable">Unavailable</span>}
                                </div>
                              )}
                            </div>
                            <div className="item-details">
                              {item.name && <h4 className="item-name">{item.name}</h4>}
                              {item.description && <p className="item-description">{item.description}</p>}
                              <div className="item-tag" style={{ backgroundColor: getTagColor(item.tag, tags) }}>
                                {item.tag}
                              </div>
                            </div>
                            <div className="item-actions">
                              <button 
                                className={`status-toggle ${item.in_laundry ? 'active' : ''}`}
                                onClick={() => toggleItemStatus(item.id, 'in_laundry')}
                                title={item.in_laundry ? "Remove from laundry" : "Mark as in laundry"}
                              >
                                <i className="fas fa-soap"></i>
                              </button>
                              <button 
                                className={`status-toggle ${item.unavailable ? 'active' : ''}`}
                                onClick={() => toggleItemStatus(item.id, 'unavailable')}
                                title={item.unavailable ? "Mark as available" : "Mark as unavailable"}
                              >
                                <i className="fas fa-ban"></i>
                              </button>
                              <button 
                                className="item-delete"
                                onClick={() => deleteItem(item.id)}
                                title="Delete item"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            ) : (
              // Display items of selected category (grid view)
              <div className="items-grid">
                {filteredItems.map(item => (
                  <div 
                    key={item.id} 
                    className={`wardrobe-item ${item.in_laundry ? 'in-laundry' : ''} ${item.unavailable ? 'unavailable' : ''}`}
                  >
                    <div className="item-image">
                      {item.image ? (
                        <img src={item.image} alt={item.name || item.description} />
                      ) : (
                        <div className="no-image">
                          <i className="fas fa-tshirt"></i>
                        </div>
                      )}
                      {(item.in_laundry || item.unavailable) && (
                        <div className="item-status">
                          {item.in_laundry && <span className="status-badge laundry">Laundry</span>}
                          {item.unavailable && <span className="status-badge unavailable">Unavailable</span>}
                        </div>
                      )}
                    </div>
                    <div className="item-details">
                      {item.name && <h4 className="item-name">{item.name}</h4>}
                      {item.description && <p className="item-description">{item.description}</p>}
                      <div className="item-tag" style={{ backgroundColor: getTagColor(item.tag, tags) }}>
                        {item.tag}
                      </div>
                    </div>
                    <div className="item-actions">
                      <button 
                        className={`status-toggle ${item.in_laundry ? 'active' : ''}`}
                        onClick={() => toggleItemStatus(item.id, 'in_laundry')}
                        title={item.in_laundry ? "Remove from laundry" : "Mark as in laundry"}
                      >
                        <i className="fas fa-soap"></i>
                      </button>
                      <button 
                        className={`status-toggle ${item.unavailable ? 'active' : ''}`}
                        onClick={() => toggleItemStatus(item.id, 'unavailable')}
                        title={item.unavailable ? "Mark as available" : "Mark as unavailable"}
                      >
                        <i className="fas fa-ban"></i>
                      </button>
                      <button 
                        className="item-delete"
                        onClick={() => deleteItem(item.id)}
                        title="Delete item"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        
        {/* Add Item Modal */}
        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="add-item-modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <i className="fas fa-times"></i>
              </button>
              <h3>Add Wardrobe Item</h3>
              
              <form onSubmit={handleSubmit} className="add-item-form">
                <div className="form-group">
                  <label htmlFor="name">Item Name (Optional)</label>
                  <input
                    type="text"
                    id="name"
                    value={itemForm.name}
                    onChange={(e) => setItemForm({...itemForm, name: e.target.value})}
                    placeholder="E.g., Blue Denim Jacket"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="description">Description {!itemForm.image && <span className="required">*</span>}</label>
                  <textarea
                    id="description"
                    value={itemForm.description}
                    onChange={(e) => setItemForm({...itemForm, description: e.target.value})}
                    placeholder="Describe your item"
                    rows="3"
                  ></textarea>
                  <p className="form-hint">At least one of Description or Image is required</p>
                </div>
                
                <div className="form-group">
                  <label>Item Image {!itemForm.description && <span className="required">*</span>}</label>
                  <div className="image-upload-container">
                    {itemForm.imagePreview ? (
                      <div className="image-preview-container">
                        <img src={itemForm.imagePreview} alt="Preview" className="image-preview" />
                        <button 
                          type="button" 
                          className="btn btn-small btn-remove" 
                          onClick={() => setItemForm({...itemForm, image: null, imagePreview: null})}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className="image-upload">
                        <i className="fas fa-upload"></i>
                        <span>Choose Image</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg"
                          onChange={handleImageChange}
                          hidden
                        />
                      </label>
                    )}
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="tag">Category <span className="required">*</span></label>
                  <select
                    id="tag"
                    value={itemForm.tag}
                    onChange={(e) => setItemForm({...itemForm, tag: e.target.value})}
                    required
                  >
                    <option value="">Select a category</option>
                    {tags.map(tag => (
                      <option key={`${tag.category}-${tag.tag}`} value={tag.tag}>
                        {tag.tag} ({tag.category})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={itemForm.in_laundry}
                      onChange={(e) => setItemForm({...itemForm, in_laundry: e.target.checked})}
                    />
                    In Laundry
                  </label>
                  
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={itemForm.unavailable}
                      onChange={(e) => setItemForm({...itemForm, unavailable: e.target.checked})}
                    />
                    Unavailable
                  </label>
                </div>
                
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Add to Wardrobe
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to get tag color
function getTagColor(tag, tags) {
  const tagInfo = tags.find(t => t.tag === tag);
  return tagInfo ? tagInfo.color : '#999';
}

export default Wardrobe;