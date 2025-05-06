import React, { useState } from 'react';
import { useAuth } from './AuthContext';

const OutfitSuggestionModal = ({ isOpen, onClose, weather }) => {
    const [occasion, setOccasion] = useState('');
    const [loading, setLoading] = useState(false);
    const [outfits, setOutfits] = useState(null);
    const [error, setError] = useState(null);
    const { token } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!occasion) {
            setError('Please enter an occasion');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/outfit-suggestions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    occasion,
                    weatherData: weather
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get outfit suggestions');
            }

            const data = await response.json();
            setOutfits(data.outfits);
        } catch (err) {
            setError('Error generating outfit suggestions. Please try again.');
            console.error('Error getting outfit suggestions:', err);
        } finally {
            setLoading(false);
        }
    };

    const LoadingScreen = () => {
        return (
            <div className="loading-overlay">
                <div className="loading-content">
                    <div className="spinner"></div>
                    <h3>Creating your outfit suggestions...</h3>
                    <p>Our AI stylist is analyzing your wardrobe based on your occasion and the weather.</p>
                </div>
            </div>
        );
    };

    const handleReset = () => {
        setOccasion('');
        setOutfits(null);
        setError(null);
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    return (
        <>
            {isOpen && (
                <div className="modal-overlay" onClick={handleClose}>
                    <div className="outfit-suggestion-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={handleClose}>
                            <i className="fas fa-times"></i>
                        </button>

                        {!outfits ? (
                            <>
                                <h3>Get Outfit Suggestions</h3>
                                {error && (
                                    <div className="error-message">
                                        <p>{error}</p>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="outfit-occasion-form">
                                    <div className="form-group">
                                        <label htmlFor="occasion">What's the occasion?</label>
                                        <textarea
                                            id="occasion"
                                            value={occasion}
                                            onChange={(e) => setOccasion(e.target.value)}
                                            placeholder="Describe what you're doing today (e.g., 'Going to a job interview', 'Casual dinner with friends', 'Working from home')"
                                            rows="3"
                                            className="form-textarea"
                                            required
                                        ></textarea>
                                    </div>

                                    {weather && (
                                        <div className="weather-info-box">
                                            <h4>Current Weather</h4>
                                            <p>
                                                <i className="fas fa-thermometer-half"></i> {Math.round(weather.main.temp)}°C,
                                                {' '}{weather.weather[0].description}
                                            </p>
                                        </div>
                                    )}

                                    <div className="form-actions">
                                        <button type="button" className="btn btn-secondary" onClick={handleClose}>
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={loading}
                                        >
                                            {loading ? 'Processing...' : 'Get Suggestions'}
                                        </button>
                                    </div>
                                </form>

                                {/* Add loading screen overlay */}
                                {loading && <LoadingScreen />}
                            </>
                        ) : (
                            <>
                                <h3>Your Outfit Suggestions</h3>
                                <div className="occasion-display">
                                    <strong>Occasion:</strong> {occasion}
                                </div>

                                <div className="outfit-suggestions">
                                    {outfits.map((outfit, index) => (
                                        <div key={index} className="outfit-card">
                                            <h4>Outfit {index + 1}</h4>

                                            {/* Outfit Items with Images */}
                                            <div className="outfit-items-carousel">
                                                {outfit.items.map((item, i) => (
                                                    <div key={i} className="outfit-item-card">
                                                        <div className="item-image-container">
                                                            {item.images && item.images.length > 0 ? (
                                                                <img
                                                                    src={item.images[0]}
                                                                    alt={item.name || `${item.category} item`}
                                                                    className="item-image"
                                                                />
                                                            ) : (
                                                                <div className="no-image">
                                                                    <i className="fas fa-tshirt"></i>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="item-details">
                                                            <span className="item-category">{item.category}</span>
                                                            {item.name && <span className="item-name">{item.name}</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="outfit-styling">
                                                <h5>Styling Tips</h5>
                                                <p>{outfit.styling}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="form-actions">
                                    <button type="button" className="btn btn-secondary" onClick={handleReset}>
                                        Try Another Occasion
                                    </button>
                                    <button type="button" className="btn btn-primary" onClick={handleClose}>
                                        Close
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default OutfitSuggestionModal;