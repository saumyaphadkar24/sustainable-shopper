import React from 'react';

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Sustainable Shopper</h3>
            <p>Helping you shop sustainably with virtual try-on technology.</p>
          </div>
          
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/about">About Us</a></li>
              <li><a href="/sustainability">Sustainability</a></li>
              <li><a href="/privacy">Privacy Policy</a></li>
              <li><a href="/terms">Terms of Service</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Stay Connected</h4>
            <div className="social-links">
              <a href="https://instagram.com/sustainableshopper" aria-label="Instagram">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="https://twitter.com/sustainshop" aria-label="Twitter">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="https://facebook.com/sustainableshopper" aria-label="Facebook">
                <i className="fab fa-facebook"></i>
              </a>
              <a href="https://pinterest.com/sustainableshopper" aria-label="Pinterest">
                <i className="fab fa-pinterest"></i>
              </a>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Sustainable Shopper. All rights reserved.</p>
          <p>Powered by sustainable technology</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
