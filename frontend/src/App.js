import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './styles/main.css';
import Header from './components/Header';
import Footer from './components/Footer';
import TryOnPage from './components/TryOnPage';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import HistoryPage from './components/HistoryPage'; 
import Wardrobe from './components/Wardrobe';
import { AuthProvider, useAuth } from './components/AuthContext';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, authChecked } = useAuth();
  
  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }
  
  // Only redirect after authentication has been checked
  if (authChecked && !isAuthenticated()) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

function AppContent() {
  const { loading, authChecked } = useAuth();
  
  if (loading) {
    return (
      <div className="app">
        <Header />
        <main className="container">
          <div className="loading-screen">
            <div className="loader"></div>
            <p>Loading Sustainable Shopper...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="app">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          
          <Route 
            path="/login" 
            element={
              authChecked && <AuthPage initialMode="login" />
            } 
          />
          
          <Route 
            path="/signup" 
            element={
              authChecked && <AuthPage initialMode="signup" />
            } 
          />
          
          <Route 
            path="/try-on" 
            element={
              <ProtectedRoute>
                <TryOnPage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/history" 
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/wardrobe" 
            element={
              <ProtectedRoute>
                <Wardrobe />
              </ProtectedRoute>
            } 
          />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;