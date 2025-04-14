import React from 'react';

function Header() {
  return (
    <header className="header">
      <div className="container header-content">
        <div className="logo">
          <h1>Sustainable Shopper</h1>
          <div className="logo-tagline">Try before you buy. Save the planet.</div>
        </div>
        <nav className="main-nav">
          <ul>
            <li><a href="/" className="active">Virtual Try-On</a></li>
            <li><a href="/about">About</a></li>
            <li><a href="/sustainability">Sustainability</a></li>
            <li><a href="/contact">Contact</a></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

export default Header;
