import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import WeatherWidget from './WeatherWidget';
import OutfitSuggestionModal from './OutfitSuggestionModal';
import EditItemModal from './EditItemModal';

function Wardrobe() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tags, setTags] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOutfitModal, setShowOutfitModal] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const { token } = useAuth();

  const carouselRefs = useRef({});

  // Form state for adding/editing items
  const [itemForm, setItemForm] = useState({
    name: '',
    fit_description: '',
    tag: '',
    in_laundry: false,
    unavailable: false,
    images: [],
    imagePreview: []
  });

  const handleWeatherUpdate = (data) => {
    setWeatherData(data);
  };

  useEffect(() => {
    fetchWardrobeItems();
    fetchTags();
    // eslint-disable-next-line
  }, [token]);

  useEffect(() => {
    fetchWardrobeItems();
    fetchTags();
    // eslint-disable-next-line
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
      console.log("Fetched wardrobe items:", data); // Add this to debug

      // Check if images are properly present
      data.forEach(item => {
        if (!item.images || !Array.isArray(item.images) || item.images.length === 0) {
          console.warn(`Item ${item.id} has no images or invalid image data`);
        }
      });

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

    // Check if we already have 5 images
    if (itemForm.imagePreview.length >= 5) {
      setError('Maximum 5 images allowed.');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setItemForm({
        ...itemForm,
        images: [...itemForm.images, file],
        imagePreview: [...itemForm.imagePreview, reader.result]
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (index) => {
    const newImages = [...itemForm.images];
    const newImagePreview = [...itemForm.imagePreview];

    newImages.splice(index, 1);
    newImagePreview.splice(index, 1);

    setItemForm({
      ...itemForm,
      images: newImages,
      imagePreview: newImagePreview
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!itemForm.tag) {
      setError('Please select a category tag');
      return;
    }

    if (itemForm.images.length === 0) {
      setError('Please upload at least one image');
      return;
    }

    if (itemForm.images.length > 5) {
      setError('Maximum 5 images allowed');
      return;
    }

    try {
      setError(null);
      const formData = new FormData();
      formData.append('name', itemForm.name);
      formData.append('fit_description', itemForm.fit_description);
      formData.append('tag', itemForm.tag);
      formData.append('in_laundry', itemForm.in_laundry);
      formData.append('unavailable', itemForm.unavailable);

      // Append multiple images
      itemForm.images.forEach(image => {
        formData.append('images[]', image);
      });

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
        fit_description: '',
        tag: '',
        in_laundry: false,
        unavailable: false,
        images: [],
        imagePreview: []
      });

      // Close modal
      setShowAddModal(false);

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

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleItemUpdate = (updatedItem) => {
    // Update the items list with the updated item
    setItems(items.map(item =>
      item.id === updatedItem.id ? updatedItem : item
    ));

    // Show success message (optional)
    setSuccessMessage('Item updated successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const renderWardrobeItem = (item) => {
    return (
      <div
        key={item.id}
        className={`wardrobe-item ${item.in_laundry ? 'in-laundry' : ''} ${item.unavailable ? 'unavailable' : ''}`}
        onClick={() => handleItemClick(item)} // Add click handler
      >
        <div className="item-image">
          {item.images && Array.isArray(item.images) && item.images.length > 0 ? (
            <img
              src={item.images[0]}
              alt={item.name || "Wardrobe item"}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill="%23f0f0f0"/><text x="50%" y="50%" font-family="Arial" font-size="14" text-anchor="middle" dominant-baseline="middle" fill="%23999">No image</text></svg>';
              }}
            />
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
          <h3 className="item-name">{item.name || item.category}</h3>
          {item.fit_description && (
            <p className="item-description">{item.fit_description}</p>
          )}
        </div>
      </div>
    );
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
            <button
              className="btn btn-secondary outfit-suggestion-btn"
              onClick={() => setShowOutfitModal(true)}>
              <i className="fas fa-magic"></i> Outfit Suggestions
            </button>
          </div>
        </div>

        <div className="weather-section">
          <WeatherWidget onWeatherUpdate={handleWeatherUpdate} />
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

            {/* Display items */} {/*I AM HERE*/}
            {selectedCategory === 'All' ? (
              // Display all items organized by category (carousel view)
              <div className="category-carousels">
                {Object.keys(groupedItems).map(category => (
                  groupedItems[category].length > 0 && (
                    <div key={category} className="category-section">
                      <div className="carousel-header">
                        <h3>{category}</h3>
                        <div className="carousel-scroll-controls">
                          <button
                            className="carousel-scroll-button"
                            onClick={() => {
                              const container = carouselRefs.current[category];
                              if (container) container.scrollLeft -= container.offsetWidth;
                            }}
                          >
                            &lt;
                          </button>
                          <button
                            className="carousel-scroll-button"
                            onClick={() => {
                              const container = carouselRefs.current[category];
                              if (container) container.scrollLeft += container.offsetWidth;
                            }}
                          >
                            &gt;
                          </button>
                        </div>
                      </div>

                      <div
                        className="items-carousel"
                        ref={el => (carouselRefs.current[category] = el)}
                      >
                        {groupedItems[category].map(item => (
                          <div
                            key={item.id}
                            className={`wardrobe-item ${item.in_laundry ? 'in-laundry' : ''} ${item.unavailable ? 'unavailable' : ''}`}
                          >
                            <div className="item-image">
                              {item.images && item.images.length > 0 ? (
                                <div className="image-carousel">
                                  <img src={item.images[0]} alt={item.name || item.fit_description} />
                                  {item.images.length > 1 && (
                                    <div className="image-indicators">
                                      {item.images.map((_, index) => (
                                        <span
                                          key={index}
                                          className="indicator"
                                        ></span>
                                      ))}
                                    </div>
                                  )}
                                </div>
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
                    {item.images && item.images.length > 0 ? (
                      <img src={item.images[0]} alt={item.name || item.description} />
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
                {/* Item Images Section - Now First */}
                <div className="form-group">
                  <label>Item Images <span className="required">*</span> (1-5 images)</label>
                  <div className="image-upload-container">
                    {itemForm.imagePreview && itemForm.imagePreview.length > 0 ? (
                      <div className="image-previews">
                        {itemForm.imagePreview.map((preview, index) => (
                          <div key={index} className="image-preview-item">
                            <img src={preview} alt={`Preview ${index + 1}`} className="image-preview" />
                            <button
                              type="button"
                              className="btn btn-small btn-remove"
                              onClick={() => handleRemoveImage(index)}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        ))}
                        {itemForm.imagePreview.length < 5 && (
                          <label className="image-upload-additional">
                            <i className="fas fa-plus"></i>
                            <span>Add Image</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/jpg"
                              onChange={handleImageChange}
                              hidden
                            />
                          </label>
                        )}
                      </div>
                    ) : (
                      <label className="image-upload">
                        <i className="fas fa-upload"></i>
                        <span>Choose Images</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg"
                          onChange={handleImageChange}
                          hidden
                        />
                      </label>
                    )}
                  </div>
                  <p className="form-hint">Upload 1-5 images of your garment (required)</p>
                </div>

                {/* Item Name */}
                <div className="form-group">
                  <label htmlFor="name">Item Name (Optional)</label>
                  <input
                    type="text"
                    id="name"
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    placeholder="E.g., Blue Denim Jacket"
                    className="form-input"
                  />
                </div>

                {/* Fit Description */}
                <div className="form-group">
                  <label htmlFor="fit_description">Fit Description (Optional)</label>
                  <textarea
                    id="fit_description"
                    value={itemForm.fit_description}
                    onChange={(e) => setItemForm({ ...itemForm, fit_description: e.target.value })}
                    placeholder="Describe how this item fits on your body"
                    rows="3"
                    className="form-textarea"
                  ></textarea>
                </div>

                {/* Category */}
                <div className="form-group">
                  <label htmlFor="tag">Category <span className="required">*</span></label>
                  <select
                    id="tag"
                    value={itemForm.tag}
                    onChange={(e) => setItemForm({ ...itemForm, tag: e.target.value })}
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
                      checked={itemForm.in_laundry}
                      onChange={(e) => setItemForm({ ...itemForm, in_laundry: e.target.checked })}
                    />
                    In Laundry
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={itemForm.unavailable}
                      onChange={(e) => setItemForm({ ...itemForm, unavailable: e.target.checked })}
                    />
                    Unavailable
                  </label>
                </div>

                {/* Form Actions */}
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

        {/* Outfit Suggestion Modal */}
        <OutfitSuggestionModal
          isOpen={showOutfitModal}
          onClose={() => setShowOutfitModal(false)}
          weather={weatherData}
        />

        <EditItemModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          item={selectedItem}
          tags={tags}
          onItemUpdate={handleItemUpdate}
        />

        {successMessage && (
          <div className="success-message">
            <p>{successMessage}</p>
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