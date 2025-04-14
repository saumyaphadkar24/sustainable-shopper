import React, { useState, useRef } from 'react';

function UploadForm({ onSubmit, loading }) {
  const [modelImage, setModelImage] = useState(null);
  const [garmentImage, setGarmentImage] = useState(null);
  const [modelPreview, setModelPreview] = useState(null);
  const [garmentPreview, setGarmentPreview] = useState(null);
  
  const modelInputRef = useRef(null);
  const garmentInputRef = useRef(null);

  const handleModelChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setModelImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setModelPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGarmentChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setGarmentImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setGarmentPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!modelImage || !garmentImage) {
      alert('Please select both a model image and a garment image');
      return;
    }
    
    const formData = new FormData();
    formData.append('model_image', modelImage);
    formData.append('garment_image', garmentImage);
    
    onSubmit(formData);
  };

  const resetForm = () => {
    setModelImage(null);
    setGarmentImage(null);
    setModelPreview(null);
    setGarmentPreview(null);
    
    if (modelInputRef.current) modelInputRef.current.value = '';
    if (garmentInputRef.current) garmentInputRef.current.value = '';
  };

  return (
    <div className="upload-form-container">
      <form onSubmit={handleSubmit} className="upload-form">
        <div className="upload-columns">
          <div className="upload-column">
            <h3>Your Photo</h3>
            <div className={`upload-area ${modelPreview ? 'has-preview' : ''}`}>
              {modelPreview ? (
                <div className="preview-container">
                  <img src={modelPreview} alt="Your preview" className="image-preview" />
                  <button 
                    type="button" 
                    className="btn btn-small btn-remove" 
                    onClick={() => {
                      setModelImage(null);
                      setModelPreview(null);
                      if (modelInputRef.current) modelInputRef.current.value = '';
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <i className="fas fa-user"></i>
                  <p>Upload a full-body photo of yourself</p>
                  <label className="btn btn-secondary">
                    Choose File
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      onChange={handleModelChange}
                      ref={modelInputRef}
                      hidden
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
          
          <div className="upload-column">
            <h3>Garment Photo</h3>
            <div className={`upload-area ${garmentPreview ? 'has-preview' : ''}`}>
              {garmentPreview ? (
                <div className="preview-container">
                  <img src={garmentPreview} alt="Garment preview" className="image-preview" />
                  <button 
                    type="button" 
                    className="btn btn-small btn-remove" 
                    onClick={() => {
                      setGarmentImage(null);
                      setGarmentPreview(null);
                      if (garmentInputRef.current) garmentInputRef.current.value = '';
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <i className="fas fa-tshirt"></i>
                  <p>Upload a photo of the garment</p>
                  <label className="btn btn-secondary">
                    Choose File
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      onChange={handleGarmentChange}
                      ref={garmentInputRef}
                      hidden
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={resetForm}>
            Reset
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={!modelImage || !garmentImage || loading}
          >
            {loading ? 'Processing...' : 'Try It On'}
          </button>
        </div>
      </form>
      
      {loading && (
        <div className="loading-overlay">
          <div className="loader"></div>
          <p>Creating your virtual try-on...</p>
          <p className="processing-note">This may take 10-20 seconds to process</p>
        </div>
      )}
    </div>
  );
}

export default UploadForm;