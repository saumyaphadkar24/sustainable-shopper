import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Link } from 'react-router-dom';

function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const { currentUser, token } = useAuth();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        
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
        setError(null);
      } catch (err) {
        setError(err.message || 'An error occurred while fetching your history');
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (token) {
      fetchHistory();
    }
  }, [token]);

  const openDetailModal = (item) => {
    setSelectedItem(item);
  };

  const closeDetailModal = () => {
    setSelectedItem(null);
  };

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
              <div key={item.id} className="history-card" onClick={() => openDetailModal(item)}>
                <div className="history-image">
                  <img src={item.result_image} alt="Try-on result" />
                  <div className="view-details">
                    <button className="btn btn-small">
                      <i className="fas fa-search-plus"></i> View Details
                    </button>
                  </div>
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
                    onClick={(e) => e.stopPropagation()}
                  >
                    <i className="fas fa-download"></i>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Detail Modal */}
        {selectedItem && (
          <div className="modal-overlay" onClick={closeDetailModal}>
            <div className="history-detail-modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={closeDetailModal}>
                <i className="fas fa-times"></i>
              </button>
              <h3>Try-On Details</h3>
              <p className="detail-date">
                {new Date(selectedItem.created_at * 1000).toLocaleDateString()}
              </p>
              
              <div className="detail-images">
                <div className="detail-image">
                  <h4>Original Garment</h4>
                  <img src={selectedItem.garment_image} alt="Original garment" />
                </div>
                <div className="detail-image">
                  <h4>Try-On Result</h4>
                  <img src={selectedItem.result_image} alt="Try-on result" />
                </div>
              </div>
              
              <div className="detail-actions">
                <a 
                  href={selectedItem.result_image} 
                  download="virtual-tryon.jpg" 
                  className="btn btn-primary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download Result
                </a>
                <Link to="/try-on" className="btn btn-secondary">
                  New Try-On
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HistoryPage;