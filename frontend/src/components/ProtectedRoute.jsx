import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoadingPage } from './ui/loading';

function roleDashboardPath(roleUpper) {
  switch (roleUpper) {
    case 'STUDENT':
      return '/student';
    case 'RECRUITER':
      return '/recruiter';
    case 'ADMIN':
      return '/admin';
    case 'SUPER_ADMIN':
      return '/super-admin';
    default:
      return '/';
  }
}

export default function ProtectedRoute({ allowRoles }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <LoadingPage />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const roleLower = role ? role.toLowerCase() : null;
  const allowRolesLower = allowRoles ? allowRoles.map((r) => r.toLowerCase()) : [];
  const hasAccess =
    allowRolesLower.length === 0 ||
    (roleLower && allowRolesLower.includes(roleLower));

  if (allowRoles && Array.isArray(allowRoles) && roleLower && !hasAccess) {
    const roleUpper = role?.toUpperCase() || user?.role?.toUpperCase() || '';
    const redirectPath = roleDashboardPath(roleUpper);
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
}
