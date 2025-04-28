import React, { createContext, useState, useEffect, useContext } from 'react';

// Create the context
const AuthContext = createContext();

// Create a provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Effect to load user on mount or token change
  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      
      if (token) {
        try {
          const response = await fetch('/api/user', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const user = await response.json();
            setCurrentUser(user);
          } else {
            // Token is invalid or expired
            console.log('Token validation failed, clearing auth state');
            localStorage.removeItem('token');
            setToken(null);
            setCurrentUser(null);
          }
        } catch (error) {
          console.error('Error loading user:', error);
          localStorage.removeItem('token');
          setToken(null);
          setCurrentUser(null);
        }
      } else {
        // No token found
        setCurrentUser(null);
      }
      
      setLoading(false);
      setAuthChecked(true);
    };
    
    loadUser();
  }, [token]);
  
  // Login function
  const login = async (email, password) => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      // Save token to localStorage
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setCurrentUser(data.user);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
  
  // Register function
  const register = async (name, email, password) => {
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      
      // Save token to localStorage
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setCurrentUser(data.user);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
  
  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
  };
  
  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!currentUser && !!token;
  };
  
  // Context value
  const value = {
    currentUser,
    loading,
    authChecked,
    login,
    register,
    logout,
    isAuthenticated,
    token
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

export default AuthContext;