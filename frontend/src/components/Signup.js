import React, { useState } from 'react';
import { useAuth } from './AuthContext';

function Signup({ onToggleForm }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate inputs
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      const result = await register(name, email, password);
      
      if (!result.success) {
        setError(result.error);
      }
    } catch (err) {
      setError('An error occurred during registration');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="auth-form-container">
      <h2>Create an Account</h2>
      <p className="auth-description">
        Join Sustainable Shopper to try on garments virtually
      </p>
      
      {error && (
        <div className="auth-error">
          <p>{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="name">Full Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            placeholder="Enter your full name"
            required
          />
        </div>
        
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
            placeholder="Create a password"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            placeholder="Confirm your password"
            required
          />
        </div>
        
        <button 
          type="submit" 
          className="btn btn-primary btn-block" 
          disabled={loading}
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>
      
      <div className="auth-toggle">
        <p>
          Already have an account?{' '}
          <button 
            onClick={onToggleForm} 
            className="auth-toggle-btn"
            disabled={loading}
          >
            Login
          </button>
        </p>
      </div>
    </div>
  );
}

export default Signup;