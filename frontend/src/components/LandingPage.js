import React from 'react';
import { useAuth } from './AuthContext';
import bg from '../assets/hero-image.jpg';
import tryOnImg from '../assets/try-on-clothes.jpeg';
import ecoImg from '../assets/eco-friendly-clothes.webp';
import saveMoneyImg from '../assets/save-money-clothes.jpeg';
import saveTimeImg from '../assets/save-time-clothes.jpeg';

function LandingPage() {
  const { isAuthenticated } = useAuth();
  
  return (
    <div className="landing-page">
      <div
        className="hero-section"
        style={{
          backgroundImage: `url(${bg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'top',
          backgroundRepeat: 'no-repeat',
          padding: '60px 0',
          color: '#fff',
        }}
      >
        <div className="container">
          <div className="hero-content">
          <div className="text-highlight-block">
            <h1>Smart Closet. <span className="text-highlight">Sustainable Style.</span></h1>
          </div>
          <div className="text-highlight-block">
            <p>Use our virtual try-on and closet organizer to manage your wardrobe, experiment with new looks, and shop sustainably. Get weather-based outfit suggestions and eco-friendly alternatives—fashion that fits your values.</p>
          </div>
            
            <div className="hero-cta">
              {isAuthenticated() ? (
                <a href="/try-on" className="btn btn-primary btn-large">
                  Try On Garments
                </a>
              ) : (
                <>
                  <a href="/login" className="btn btn-primary btn-large">
                    Log In
                  </a>
                  <a href="/signup" className="btn btn-secondary btn-large">
                    Sign Up
                  </a>
                </>
              )}
            </div>
          </div>
          
          {/* 
            <div className="hero-image">
              <img src="/assets/hero-image.svg" alt="Virtual try-on illustration" />
            </div> 
          */}
        </div>
      </div>
      
      <div className="benefits-section" style={{ marginTop: '60px' }}>
        <div className="container">
          <h2>Why Choose <span className="text-highlight-no-glow">Sustainable Shopper</span>?</h2>

          {/* Row 1 - image left, text right */}
          <div className="benefit-row">
            <div className="benefit-image">
              <img src={tryOnImg} alt="Virtual try-on" />
            </div>
            <div className="benefit-text">
              <h3>👚 Virtual Try-On</h3>
              <p><em>No changing rooms, no guesswork.</em></p>
              <p>Try on clothes virtually to see how they really fit and flow — all from your phone, without the awkward lighting.</p>
            </div>
          </div>

          {/* Row 2 - text left, image right */}
          <div className="benefit-row reverse">
            <div className="benefit-text">
              <h3>🌿 Eco-Friendly</h3>
              <p><em>Fashion that respects the planet.</em></p>
              <p>Cut down on waste and returns by choosing pieces that fit right the first time. Smart shopping is sustainable shopping.</p>
            </div>
            <div className="benefit-image">
              <img src={ecoImg} alt="Eco friendly clothing" />
            </div>
          </div>

          {/* Row 3 - image left, text right */}
          <div className="benefit-row">
            <div className="benefit-image">
              <img src={saveMoneyImg} alt="Save money" />
            </div>
            <div className="benefit-text">
              <h3>💸 Save Money</h3>
              <p><em>Spend on what matters.</em></p>
              <p>Know exactly what works for you before buying. Fewer regrets, more value, and a closet full of things you actually wear.</p>
            </div>
          </div>

          {/* Row 4 - text left, image right */}
          <div className="benefit-row reverse">
            <div className="benefit-text">
              <h3>⏱️ Save Time</h3>
              <p><em>Style in seconds.</em></p>
              <p>Find the right fit without wasting time in stores. Try on outfits virtually, plan looks faster, and get back to living.</p>
            </div>
            <div className="benefit-image">
              <img src={saveTimeImg} alt="Save time" />
            </div>
          </div>
        </div>
      </div>

      
      <div className="cta-section">
        <div className="container">
          <h2>Ready to Try On?</h2>
          <p>Join thousands of sustainable shoppers making smarter fashion choices</p>
          
          {isAuthenticated() ? (
            <a href="/try-on" className="btn btn-primary btn-large">
              Start Virtual Try-On
            </a>
          ) : (
            <a href="/signup" className="btn btn-primary btn-large">
              Create Free Account
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default LandingPage;