import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AdminHome from './AdminHome';
import ControlTowerDashboard from './control-tower/ControlTowerDashboard';
import { useAuth } from '../../../hooks/useAuth';

export default function AdminDashboardHub() {
  const { user, role } = useAuth();
  const location = useLocation();
  const userRole = (role || user?.role || '').toUpperCase();
  const showControlTower = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  useEffect(() => {
    if (!showControlTower) return;
    const hash = location.hash?.replace('#', '');
    if (hash === 'control-tower') {
      const el = document.getElementById('control-tower');
      if (el) {
        requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      }
    }
  }, [location.hash, showControlTower]);

  return (
    <div className="overflow-x-hidden">
      <AdminHome embedded={showControlTower} />
      {showControlTower && (
        <div id="control-tower">
          <ControlTowerDashboard embedded />
        </div>
      )}
    </div>
  );
}
