import React, { useState } from 'react';

function ResultDisplay({ result, onReset }) {
  const [showGarmentModal, setShowGarmentModal] = useState(false);
  
  // Check for result_image and garment_image
  const resultImage = result?.result_image;
  const garmentImage = result?.garment_image;
  
  if (!resultImage) {
    return (
      <div className="result-error">
        <h3>Error Processing Results</h3>
        <p>Sorry, we couldn't generate a virtual try-on image. Please try again with different photos.</p>
        <button className="btn btn-primary" onClick={onReset}>
          Try Again
        </button>
      </div>
    );
  }

  const toggleGarmentModal = () => {
    setShowGarmentModal(!showGarmentModal);
  };

  return (
    <div className="result-container">
      <h3>Your Virtual Try-On Result</h3>
      
      <div className="result-image-container">
        <img 
          src={resultImage} 
          alt="Virtual try-on result" 
          className="result-image" 
          onClick={toggleGarmentModal} 
        />
        {garmentImage && (
          <div className="view-garment">
            <button className="btn btn-small" onClick={toggleGarmentModal}>
              <i className="fas fa-eye"></i> View Original Garment
            </button>
          </div>
        )}
      </div>
      
      <div className="result-actions">
        <button className="btn btn-secondary" onClick={onReset}>
          Try Another
        </button>
        <a 
          href={resultImage} 
          download="virtual-tryon.jpg" 
          className="btn btn-primary"
          target="_blank"
          rel="noopener noreferrer"
        >
          Download Image
        </a>
      </div>
      
      <div className="sustainability-impact">
        <h4>Sustainability Impact</h4>
        <p>
          By using virtual try-on technology, you're helping reduce returns and carbon emissions 
          associated with shipping unwanted products. The fashion industry accounts for approximately 
          10% of global carbon emissions, and digital solutions like this can help create a more 
          sustainable future.
        </p>
      </div>
      
      {showGarmentModal && garmentImage && (
        <div className="modal-overlay" onClick={toggleGarmentModal}>
          <div className="garment-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={toggleGarmentModal}>
              <i className="fas fa-times"></i>
            </button>
            <h4>Original Garment</h4>
            <div className="garment-image-container">
              <img src={garmentImage} alt="Original garment" className="garment-image" />
            </div>
            <div className="comparison-container">
              <div className="comparison-image">
                <h5>Original</h5>
                <img src={garmentImage} alt="Original garment" />
              </div>
              <div className="comparison-image">
                <h5>Try-On Result</h5>
                <img src={resultImage} alt="Virtual try-on result" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResultDisplay;