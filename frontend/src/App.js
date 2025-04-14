import React, { useState } from 'react';
import './styles/main.css';
import Header from './components/Header';
import UploadForm from './components/UploadForm';
import ResultDisplay from './components/ResultDisplay';
import Footer from './components/Footer';

function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch('/api/try-on', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      
      setResult(data);
    } catch (err) {
      setError(err.message || 'An error occurred while processing your request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <Header />
      <main className="container">
        <div className="app-description">
          <h2>Virtual Try-On Experience</h2>
          <p>
            Upload a photo of yourself and a garment you're interested in to see how it would look on you.
            Our sustainable approach helps reduce returns and waste in the fashion industry.
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
      </main>
      <Footer />
    </div>
  );
}

export default App;
