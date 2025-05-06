import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

function Header() {
  const { currentUser, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Determine active link based on current path
  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };
  
  const handleLogout = () => {
    logout();
    navigate('/');
  };
  
  return (
    <header className="header">
      <div className="container header-content">
        <div className="logo">
          <Link to="/">
            <h1>Sustainable Shopper</h1>
            <div className="logo-tagline">Try before you buy. Save the planet.</div>
          </Link>
        </div>
        <nav className="main-nav">
          <ul>
            {isAuthenticated() && currentUser ? (
              // Authenticated navigation
              <>
                <li><Link to="/try-on" className={isActive('/try-on')}>Virtual Try-On</Link></li>
                <li><Link to="/wardrobe" className={isActive('/wardrobe')}>My Wardrobe</Link></li>
                <li><Link to="/history" className={isActive('/history')}>My History</Link></li>
                <li><Link to="/alternatives" className={isActive('/alternatives')}>Sustainability</Link></li>
                <li><Link to="/about" className={isActive('/about')}>About</Link></li>
                <li>
                  <div className="user-menu">
                    <span className="user-greeting">Hi, {currentUser.name.split(' ')[0]}</span>
                    <button onClick={handleLogout} className="btn btn-small btn-secondary">Logout</button>
                  </div>
                </li>
              </>
            ) : (
              // Unauthenticated navigation
              <>
                <li><Link to="/about" className={isActive('/about')}>About</Link></li>
                <li><Link to="/sustainability" className={isActive('/sustainability')}>Sustainability</Link></li>
                <li><Link to="/login" className={`btn btn-small ${isActive('/login')}`}>Login</Link></li>
                <li><Link to="/signup" className={`btn btn-primary btn-small ${isActive('/signup')}`}>Sign Up</Link></li>
              </>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}

export default Header;