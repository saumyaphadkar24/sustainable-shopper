import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Login from './Login';
import Signup from './Signup';
import { useAuth } from './AuthContext';

function AuthPage({ initialMode = 'login' }) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // If user is already authenticated, redirect to try-on page
    if (isAuthenticated()) {
      navigate('/try-on');
    }
  }, [isAuthenticated, navigate]);
  
  const toggleForm = () => {
    setIsLogin(!isLogin);
  };
  
  return (
    <div className="auth-page">
      <div className="auth-container">
        {isLogin ? (
          <Login onToggleForm={toggleForm} />
        ) : (
          <Signup onToggleForm={toggleForm} />
        )}
      </div>
    </div>
  );
}

export default AuthPage;