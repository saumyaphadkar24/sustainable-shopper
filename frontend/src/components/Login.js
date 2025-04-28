import React, { useState } from 'react';
import { useAuth } from './AuthContext';

function Login({ onToggleForm }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate inputs
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      const result = await login(email, password);
      
      if (!result.success) {
        setError(result.error);
      }
    } catch (err) {
      setError('An error occurred during login');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="auth-form-container">
      <h2>Login to Sustainable Shopper</h2>
      <p className="auth-description">
        Sign in to access your virtual try-on experience
      </p>
      
      {error && (
        <div className="auth-error">
          <p>{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            placeholder="Enter your email"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            placeholder="Enter your password"
            required
          />
        </div>
        
        <button 
          type="submit" 
          className="btn btn-primary btn-block" 
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      
      <div className="auth-toggle">
        <p>
          Don't have an account?{' '}
          <button 
            onClick={onToggleForm} 
            className="auth-toggle-btn"
            disabled={loading}
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;