import React, { useState } from 'react';
import { useAuth } from './AuthContext';

function AlternativesPage() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  const handleFileChange = (e) => {
    setSelectedImage(e.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!selectedImage) {
      alert("Please select an image first");
      return;
    }
  
    setLoading(true);
    setError(null);
    setResults([]);
  
    const formData = new FormData();
    formData.append("query_image", selectedImage);
  
    try {
      const response = await fetch("/api/alternatives", {
        method: "POST",
        // ⚠️ Do NOT manually set Content-Type
        headers: new Headers({
          Authorization: `Bearer ${token}`
        }),
        body: formData,
      });
  
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error("Server returned non-JSON response");
      }
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }
  
      setResults(data);
    } catch (err) {
      console.error("handleSubmit error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="alternatives-page container">
      <div className="page-header">
        <h2>Suggested Alternatives</h2>
        <p>
          Explore similar sustainable garments to the one you tried on. All
          recommendations are based on visual similarity using AI.
        </p>
      </div>

      <div className="upload-form">
        <div className="upload-area" style={{ width: '800px', height: '400px', margin: '0 auto' }}>
          {!selectedImage ? (
            <div className="upload-placeholder">
              <i className="fas fa-upload"></i>
              <p>Select an image to find alternatives</p>
              <input type="file" accept="image/*" onChange={handleFileChange} />
            </div>
          ) : (
            <div className="preview-container">
              <img
                className="image-preview"
                src={URL.createObjectURL(selectedImage)}
                alt="Preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
              />
              <button className="btn btn-remove" onClick={() => setSelectedImage(null)}>
                &times;
              </button>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Find Alternatives'}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
      </div>

      <div className="results-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginTop: '30px'
      }}>
        {results.map((item, index) => (
          <div className="result-card" key={index} style={{
            background: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            padding: '15px',
            textAlign: 'center'
          }}>
            <img
              src={item.primary_image}
              alt={item.name}
              style={{
                width: '100%',
                height: '200px',
                objectFit: 'cover',
                borderRadius: '4px',
                marginBottom: '10px'
              }}
            />
            <h4>{item.name}</h4>
            <p>{item.category}</p>
            <p>${item.price}</p>
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              View Product
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AlternativesPage;