import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import PWIOILOGO from '../../../assets/images/brand_logo.webp';
import { User, SquarePen, Menu } from 'lucide-react';
import { useAdminMobileMenu } from '../../../contexts/AdminMobileMenuContext';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../../services/api';

export default function AdminLayout({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const base = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';
  const isSuperAdmin = (user?.role || '').toLowerCase() === 'super_admin';
  const [adminProfile, setAdminProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const profileLoadedRef = useRef(false);

  const loadProfile = useCallback(async (userId, forceReload = false) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      if (forceReload) setLoading(true);
      const userData = await api.getCurrentUser();
      setAdminProfile({
        displayName: userData.user?.displayName || '',
        profilePhoto: userData.user?.profilePhoto || '',
      });
      setLoading(false);
    } catch (error) {
      console.error('Error loading admin profile:', error);
      setAdminProfile(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    if (profileLoadedRef.current) {
      setLoading(false);
      return;
    }
    profileLoadedRef.current = true;
    loadProfile(user.id);
  }, [user?.id, loadProfile]);

  useEffect(() => {
    const handleProfileUpdate = (event) => {
      if (!event.detail?.userId || event.detail?.userId === user?.id) {
        profileLoadedRef.current = false;
        if (user?.id) {
          loadProfile(user.id, true).then(() => {
            profileLoadedRef.current = true;
          });
        }
      }
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [user?.id, loadProfile]);

  const getSchoolHeaderText = (school) => {
    const schoolTexts = {
      SOT: 'Fostering Innovation. Strengthening Foundations.',
      SOM: 'Leading with Vision. Strategizing with Innovation.',
      SOH: 'Healing with Science. Caring with Innovation.',
    };
    return schoolTexts[school] || schoolTexts.SOT;
  };

  const normalizeSchool = (value) => {
    if (!value) return 'SOT';
    const v = String(value).trim().toUpperCase();
    if (v === 'SOT' || v === 'SCHOOL OF TECHNOLOGY') return 'SOT';
    if (v === 'SOM' || v === 'SCHOOL OF MANAGEMENT') return 'SOM';
    if (v === 'SOH' || v === 'SCHOOL OF HEALTHCARE' || v === 'SCHOOL OF HEALTH CARE') return 'SOH';
    return 'SOT';
  };

  const adminMobileMenu = useAdminMobileMenu();
  const displayName = loading
    ? 'Loading...'
    : (adminProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Admin');
  const roleLabel = isSuperAdmin ? 'Super Admin' : 'Admin';

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-br from-white via-sky-100 to-blue-200 border-b border-blue-200 shadow-sm">
        <div className="max-w-[100vw] px-3 sm:px-4 md:px-6">
          <div className="flex md:hidden justify-between items-center min-h-[3.75rem] gap-2">
            <div className="flex-shrink-0">
              {adminMobileMenu && (
                <button
                  type="button"
                  onClick={() => adminMobileMenu.setMobileMenuOpen(true)}
                  className="p-2.5 -ml-1 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-indigo-700 transition-colors touch-manipulation"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
              )}
            </div>
            <div className="flex-1 flex justify-center min-w-0">
              <img src={PWIOILOGO} alt="PWIOI Portal" className="h-7 w-auto object-contain" />
            </div>
            <div
              className="bg-indigo-600 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-indigo-100"
              style={{ width: '2.25rem', height: '2.25rem' }}
            >
              {loading ? (
                <User className="text-white h-3.5 w-3.5" />
              ) : adminProfile?.profilePhoto ? (
                <img src={adminProfile.profilePhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="text-white h-3.5 w-3.5" />
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center justify-between gap-4 min-h-[5.25rem] py-2 relative">
            <div className="flex items-center gap-3 min-w-0 flex-1 z-10">
              <div className="h-11 w-11 rounded-full bg-indigo-600 flex items-center justify-center overflow-hidden ring-2 ring-indigo-100 shrink-0">
                {loading ? (
                  <User className="text-white h-5 w-5" />
                ) : adminProfile?.profilePhoto ? (
                  <img src={adminProfile.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="text-white h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-lg font-semibold text-slate-900 truncate">{displayName}</h2>
                  <button
                    type="button"
                    onClick={() => {
                      navigate(`${base}?tab=profile`);
                      setTimeout(() => window.dispatchEvent(new CustomEvent('editProfileClicked')), 100);
                    }}
                    className="p-1 text-slate-400 hover:text-indigo-600 transition-colors rounded-md hover:bg-indigo-50"
                    aria-label="Edit profile"
                  >
                    <SquarePen className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-sm font-medium text-slate-700">{roleLabel}</p>
              </div>
            </div>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 shrink-0 px-4 pointer-events-none">
              <img src={PWIOILOGO} alt="PWIOI Portal" className="h-9 w-auto object-contain" />
              <p className="text-nowrap text-xs font-medium tracking-wide text-slate-500">
                {getSchoolHeaderText(normalizeSchool(user?.school || 'SOT'))}
              </p>
            </div>

            <div className="flex-1" aria-hidden />
          </div>
        </div>
      </nav>

      <main className="min-h-screen pt-[3.75rem] md:pt-[5.25rem] bg-slate-50">
        {children}
      </main>
    </div>
  );
}
