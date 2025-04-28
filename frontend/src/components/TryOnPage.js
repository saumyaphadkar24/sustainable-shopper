import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UploadForm from './UploadForm';
import ResultDisplay from './ResultDisplay';
import { useAuth } from './AuthContext';

function TryOnPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const { currentUser, isAuthenticated, token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Double-check authentication status
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      // Make sure we have a token
      if (!token) {
        throw new Error('You must be logged in to use this feature');
      }
      
      const response = await fetch('/api/try-on', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      
      setResult(data);
    } catch (err) {
      setError(err.message || 'An error occurred while processing your request');
      console.error('Try-on error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Only render the page content if we're authenticated and have user data
  if (!isAuthenticated() || !currentUser) {
    return (
      <div className="try-on-page">
        <div className="container">
          <div className="loading-screen">
            <div className="loader"></div>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="try-on-page">
      <div className="container">
        <div className="page-header">
          <h2>Virtual Try-On Experience</h2>
          <p>
            Welcome back, {currentUser.name}! Upload a photo of yourself and a garment you're 
            interested in to see how it would look on you. Our sustainable approach helps reduce 
            returns and waste in the fashion industry.
          </p>
        </div>
        
        {!result && (
          <UploadForm onSubmit={handleSubmit} loading={loading} />
        )}
        
        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button 
              className="btn btn-primary" 
              onClick={() => setError(null)}
            >
              Try Again
            </button>
          </div>
        )}
        
        {result && (
          <ResultDisplay 
            result={result} 
            onReset={() => {
              setResult(null);
              setError(null);
            }} 
          />
        )}
      </div>
    </div>
  );
}

export default TryOnPage;