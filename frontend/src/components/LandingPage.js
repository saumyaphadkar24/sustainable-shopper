import React from 'react';
import { useAuth } from './AuthContext';

function LandingPage() {
  const { isAuthenticated } = useAuth();
  
  return (
    <div className="landing-page">
      <div className="hero-section">
        <div className="container">
          <div className="hero-content">
            <h1>Try Before You Buy, <span className="text-highlight">Sustainably</span></h1>
            <p className="hero-description">
              Use our virtual try-on technology to see how clothes look on you before purchasing.
              Reduce returns, save money, and help the environment.
            </p>
            
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
          
          <div className="hero-image">
            {/* Hero image or illustration */}
            <img src="/assets/hero-image.svg" alt="Virtual try-on illustration" />
          </div>
        </div>
      </div>
      
      <div className="benefits-section">
        <div className="container">
          <h2>Why Choose <span className="text-highlight">Sustainable Shopper</span>?</h2>
          
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">
                <i className="fas fa-tshirt"></i>
              </div>
              <h3>Virtual Try-On</h3>
              <p>See exactly how garments look on you before you buy</p>
            </div>
            
            <div className="benefit-card">
              <div className="benefit-icon">
                <i className="fas fa-leaf"></i>
              </div>
              <h3>Eco-Friendly</h3>
              <p>Reduce returns and shipping, lowering carbon emissions</p>
            </div>
            
            <div className="benefit-card">
              <div className="benefit-icon">
                <i className="fas fa-wallet"></i>
              </div>
              <h3>Save Money</h3>
              <p>Buy only what you love, avoiding costly returns</p>
            </div>
            
            <div className="benefit-card">
              <div className="benefit-icon">
                <i className="fas fa-clock"></i>
              </div>
              <h3>Save Time</h3>
              <p>No more lengthy try-on sessions in physical stores</p>
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