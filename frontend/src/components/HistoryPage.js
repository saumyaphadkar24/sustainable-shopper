import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Link } from 'react-router-dom';

function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // Get the JWT token
        const token = localStorage.getItem('token');
        
        const response = await fetch('/api/history', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch history');
        }
        
        const data = await response.json();
        setHistory(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="history-page">
        <div className="container">
          <div className="page-header">
            <h2>My Try-On History</h2>
          </div>
          <div className="loading-container">
            <div className="loader"></div>
            <p>Loading your history...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="history-page">
        <div className="container">
          <div className="page-header">
            <h2>My Try-On History</h2>
          </div>
          <div className="error-message">
            <p>{error}</p>
            <button 
              className="btn btn-primary" 
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="container">
        <div className="page-header">
          <h2>My Try-On History</h2>
          <p>View your past virtual try-on sessions, {currentUser.name}.</p>
        </div>
        
        {history.length === 0 ? (
          <div className="empty-history">
            <div className="empty-icon">
              <i className="fas fa-tshirt"></i>
            </div>
            <h3>No try-ons yet</h3>
            <p>You haven't tried on any garments yet. Start your sustainable shopping journey now!</p>
            <Link to="/try-on" className="btn btn-primary">
              Try On Something Now
            </Link>
          </div>
        ) : (
          <div className="history-grid">
            {history.map((item) => (
              <div key={item.id} className="history-card">
                <div className="history-image">
                  <img src={item.result_image} alt="Try-on result" />
                </div>
                <div className="history-info">
                  <p className="history-date">
                    {new Date(item.created_at * 1000).toLocaleDateString()}
                  </p>
                  <a 
                    href={item.result_image} 
                    download="virtual-tryon.jpg" 
                    className="btn btn-small btn-secondary"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default HistoryPage;