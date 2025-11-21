import React from 'react';
import { useAuth } from '../../../hooks/useAuth';
import PWIOILOGO from '../../../assets/images/brand_logo.webp';
import { User } from 'lucide-react';

export default function AdminLayout({ children }) {
  const { user } = useAuth();

  // School-specific header texts (same as DashboardLayout)
  const getSchoolHeaderText = (school) => {
    const schoolTexts = {
      SOT: 'Fostering Innovation. Strengthening Foundations.',
      SOM: 'Leading with Vision. Strategizing with Innovation.',
      SOH: 'Healing with Science. Caring with Innovation.',
    };
    return schoolTexts[school] || schoolTexts['SOT'];
  };

  const normalizeSchool = (value) => {
    if (!value) return 'SOT';
    const v = String(value).trim().toUpperCase();
    if (v === 'SOT' || v === 'SCHOOL OF TECHNOLOGY') return 'SOT';
    if (v === 'SOM' || v === 'SCHOOL OF MANAGEMENT') return 'SOM';
    if (v === 'SOH' || v === 'SCHOOL OF HEALTHCARE' || v === 'SCHOOL OF HEALTH CARE') return 'SOH';
    return 'SOT';
  };

  const getUserSchool = () => normalizeSchool(user?.school || 'SOT');

  // Profile image sizing (reuse simplified config)
  const profileConfig = {
    imageSize: 16,
    iconSize: 8,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50">
      {/* Horizontal Navbar (mirrors DashboardLayout without progress ring and details) */}
      <nav className="bg-white border-b border-blue-100 sticky top-0 z-50">
        <div className="w-full px-2 py-1">
          <div className="px-6 py-1 rounded-xl bg-gradient-to-br from-white to-blue-300 border-2 border-gray-400">
            <div className="flex justify-between items-center h-20 gap-2 relative">
              {/* Left Side - Admin avatar and name (no progress ring) */}
              <div className="flex items-center flex-1">
                {/* Simple Profile Image (no completion circle) */}
                <div className="flex-shrink-0">
                  <div
                    className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg"
                    style={{
                      width: `${profileConfig.imageSize * 0.25}rem`,
                      height: `${profileConfig.imageSize * 0.25}rem`,
                    }}
                  >
                    <User
                      className="text-white"
                      style={{
                        width: `${profileConfig.iconSize * 0.25}rem`,
                        height: `${profileConfig.iconSize * 0.25}rem`,
                      }}
                    />
                  </div>
                </div>

                {/* Admin Details (only name/email, no tagline/ID/CGPA) */}
                <div className="ml-4 space-y-0">
                  <div className="flex items-center">
                    <h2 className="text-2xl font-bold text-black flex items-center">
                      {user?.displayName || user?.email?.split('@')[0] || 'Admin'}
                    </h2>
                  </div>
                  <p className='font-medium'><span className='text-gray-600'>Role:</span> Admin</p>
                </div>
              </div>

              {/* Center - PWIOI logo and school-specific motto */}
              <div className="absolute top-1 start-1/2 -translate-x-1/5 w-fit flex flex-col items-center gap-1">
                <img src={PWIOILOGO} alt="Brand" className="w-30" />
                <h1 className="text-nowrap text-3xl text-black-300 opacity-90 font-caveat">{getSchoolHeaderText(getUserSchool())}</h1>
              </div>

              {/* Right Side - empty (no actions) */}
              <div className="flex items-center gap-2"></div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50">
        {children}
      </main>
    </div>
  );
}
