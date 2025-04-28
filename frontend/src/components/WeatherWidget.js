import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

function WeatherWidget() {
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
      setError(null);
    } catch (err) {
      setError('Error loading weather information.');
      console.error('Error fetching weather:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get weather icon
  const getWeatherIcon = (iconCode) => {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  };

  // Get clothing recommendation based on temperature
  const getClothingRecommendation = (temp) => {
    if (temp > 30) {
      return "Very hot weather! Light, breathable clothing like shorts, t-shirts, and sunhats recommended.";
    } else if (temp > 25) {
      return "Hot weather! Lightweight clothing like shorts, t-shirts, and summer dresses recommended.";
    } else if (temp > 20) {
      return "Warm weather! Light clothing like short sleeves and light pants or skirts recommended.";
    } else if (temp > 15) {
      return "Mild weather! Medium-weight clothing like long sleeves and light jackets recommended.";
    } else if (temp > 10) {
      return "Cool weather! Layered clothing with light jackets or sweaters recommended.";
    } else if (temp > 5) {
      return "Chilly weather! Warm clothing like jackets, sweaters, and long pants recommended.";
    } else if (temp > 0) {
      return "Cold weather! Warm clothing like winter jackets, sweaters, scarves, and hats recommended.";
    } else {
      return "Very cold weather! Heavy winter clothing like thick coats, gloves, hats, and scarves recommended.";
    }
  };

  if (loading) {
    return (
      <div className="weather-widget loading">
        <div className="loader-small"></div>
        <p>Loading weather information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="weather-widget error">
        <i className="fas fa-cloud-rain"></i>
        <p>{error}</p>
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
        <p>{getClothingRecommendation(weather.main.temp)}</p>
      </div>
    </div>
  );
}

export default WeatherWidget;