import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ allowRoles }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div className="w-full h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Normalize role to lowercase for comparison (backend returns uppercase)
  const roleLower = role ? role.toLowerCase() : null;
  const allowRolesLower = allowRoles ? allowRoles.map(r => r.toLowerCase()) : [];

  if (allowRoles && Array.isArray(allowRoles) && roleLower && !allowRolesLower.includes(roleLower)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}


