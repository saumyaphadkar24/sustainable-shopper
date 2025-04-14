import React from 'react';

function ResultDisplay({ result, onReset }) {
  // The API now returns the result image URL in result.result_image
  const resultImage = result?.result_image;
  
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

  return (
    <div className="result-container">
      <h3>Your Virtual Try-On Result</h3>
      
      <div className="result-image-container">
        <img src={resultImage} alt="Virtual try-on result" className="result-image" />
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
    </div>
  );
}

export default ResultDisplay;