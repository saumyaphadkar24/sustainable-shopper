import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

function WeatherWidget({ onWeatherUpdate = () => {} }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        err => {
          console.error('Error getting location:', err);
          setError('Could not determine your location. Weather information is unavailable.');
          setLoading(false);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser. Weather information is unavailable.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (location && token) {
      fetchWeather();
    }
    // eslint-disable-next-line
  }, [location, token]);

  const fetchWeather = async () => {
    if (!location) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/weather?lat=${location.lat}&lon=${location.lon}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }

      const data = await response.json();
      setWeather(data);
      if (onWeatherUpdate) onWeatherUpdate(data);
      getOutfitRecommendation(data);
      setError(null);
    } catch (err) {
      setError('Error loading weather information.');
      console.error('Error fetching weather:', err);
    } finally {
      setLoading(false);
    }
  };

  const [outfitSuggestion, setOutfitSuggestion] = useState('');

  const [expanded, setExpanded] = useState(false);

  // Helper function to get weather icon
  const getWeatherIcon = (iconCode) => {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  };

  const getOutfitRecommendation = async (weatherData) => {
    try {
      const response = await fetch('/api/suggest-outfit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          weather: weatherData,
          wardrobe: []
        })
      });
      console.log("Weather:", weather)
  
      const data = await response.json();
      setOutfitSuggestion(data.recommendation);
    } catch (err) {
      console.error('Failed to fetch GPT outfit suggestion:', err);
      setOutfitSuggestion('Could not load smart outfit suggestion.');
    }
  };

  if (error) {
    return (
      <div className="weather-widget error">
        <i className="fas fa-cloud-rain"></i>
        <p>{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="weather-widget loading">
        <div className="loader-small"></div>
        <p>Loading weather & recommendations...</p>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="weather-widget error">
        <i className="fas fa-cloud-rain"></i>
        <p>Weather information unavailable</p>
      </div>
    );
  }

  const formatSuggestionAsHTML = (text) => {
    if (!text) return "";
    return text
      .replace(/###/g, "<br/>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/(?:\r\n|\r|\n)/g, "<br/>");
  };

  return (
    <div className="weather-widget">
      <div className="weather-current">
        <div className="weather-location">
          <i className="fas fa-map-marker-alt"></i>
          <h4>{weather.name}, {weather.sys.country}</h4>
        </div>
        <div className="weather-info">
          <div className="weather-icon">
            {weather.weather && weather.weather[0] && (
              <img 
                src={getWeatherIcon(weather.weather[0].icon)} 
                alt={weather.weather[0].description} 
              />
            )}
          </div>
          <div className="weather-temp">
            <span className="temp">{Math.round(weather.main.temp)}°C</span>
            <span className="feels-like">Feels like {Math.round(weather.main.feels_like)}°C</span>
          </div>
          <div className="weather-desc">
            {weather.weather && weather.weather[0] && (
              <span>{weather.weather[0].description}</span>
            )}
            <span>Humidity: {weather.main.humidity}%</span>
            <span>Wind: {Math.round(weather.wind.speed * 3.6)} km/h</span>
          </div>
        </div>
      </div>
      <div className="weather-recommendation">
        <h4>Today's Outfit Recommendation</h4>
        <div className="outfit-text-container">
          <div
            className={`outfit-text ${expanded ? 'expanded' : 'collapsed'}`}
            dangerouslySetInnerHTML={{ __html: formatSuggestionAsHTML(outfitSuggestion) }}
          ></div>
          {outfitSuggestion.length > 300 && (
            <button className="read-more-btn" onClick={() => setExpanded(!expanded)}>
              {expanded ? "Read less" : "Read more"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default WeatherWidget;