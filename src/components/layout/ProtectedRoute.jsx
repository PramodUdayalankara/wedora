import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../common/Spinner';

export const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Spinner text="Authenticating session..." />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--navy-900)', marginBottom: '0.5rem' }}>Access Restricted</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          You need Administrator privileges to access this area. Switch to Admin mode or contact your manager.
        </p>
      </div>
    );
  }

  return children;
};
