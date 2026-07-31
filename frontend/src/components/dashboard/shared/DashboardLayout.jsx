import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { getStudentProfile } from '../../../services/students';
import PWIOILOGO from '../../../assets/images/brand_logo.webp';
import { useStudentMobileMenu } from '../../../contexts/StudentMobileMenuContext';
import { User, SquarePen, Menu, BadgeCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton, SkeletonText } from '../../ui/loading';

/** Format CGPA for display (avoids floating-point like 8.699999999999999 → "8.70") */
function formatCgpaDisplay(val) {
  if (val === undefined || val === null || val === '') return '';
  const n = parseFloat(val);
  if (Number.isNaN(n)) return String(val);
  const clamped = Math.max(0, Math.min(10, n));
  return clamped.toFixed(2);
}

const SCHOOL_LABELS = {
  SOT: 'School of Technology',
  SOM: 'School of Management',
  SOH: 'School of Healthcare',
};

/** Soft scalloped seal path (quadratic lobes). */
function scallopedMedalPath(cx, cy, tipR, valleyR, lobes = 12) {
  let d = '';
  for (let i = 0; i < lobes; i += 1) {
    const aV0 = (i / lobes) * Math.PI * 2 - Math.PI / 2;
    const aTip = ((i + 0.5) / lobes) * Math.PI * 2 - Math.PI / 2;
    const aV1 = ((i + 1) / lobes) * Math.PI * 2 - Math.PI / 2;
    const v0x = cx + Math.cos(aV0) * valleyR;
    const v0y = cy + Math.sin(aV0) * valleyR;
    const tx = cx + Math.cos(aTip) * tipR;
    const ty = cy + Math.sin(aTip) * tipR;
    const v1x = cx + Math.cos(aV1) * valleyR;
    const v1y = cy + Math.sin(aV1) * valleyR;
    if (i === 0) d += `M ${v0x.toFixed(2)} ${v0y.toFixed(2)} `;
    d += `Q ${tx.toFixed(2)} ${ty.toFixed(2)} ${v1x.toFixed(2)} ${v1y.toFixed(2)} `;
  }
  return `${d}Z`;
}

/**
 * Flat award medallion matching the reference:
 * scalloped gold disc + charcoal ribbons with triangular fold shade at the tuck.
 */
function AchievementMedalBadge({ school }) {
  const label = SCHOOL_LABELS[school] || SCHOOL_LABELS.SOT;
  const cx = 32;
  const cy = 26;
  const tipR = 20;
  const valleyR = 16.4;
  const medalPath = scallopedMedalPath(cx, cy, tipR, valleyR, 12);
  const gold = '#FFC542';
  const ink = '#2A3038';
  const ribbon = '#343A40';
  const ribbonShade = '#1A1F26';
  const ribbonEdge = '#252A31';

  return (
    <div
      className="relative flex items-center justify-end shrink-0 select-none"
      title={label}
      aria-label={`Achievement badge · ${label}`}
    >
      <svg
        width="64"
        height="72"
        viewBox="0 0 64 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
      >
        {/* Left ribbon — body, outer hem, top-inner fold, outline */}
        <path
          d="M27.4 39.2 L16.2 64.8 L20.8 60.6 L23.6 66.2 L30.2 41.4 Z"
          fill={ribbon}
          stroke={ink}
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <path d="M27.2 40.2 L17.05 63.9 L18.35 62.7 L28.2 40.8 Z" fill={ribbonEdge} />
        <path d="M27.4 39.2 L29.1 45.8 L30.2 41.4 Z" fill={ribbonShade} />

        {/* Right ribbon (mirror) */}
        <path
          d="M36.6 39.2 L47.8 64.8 L43.2 60.6 L40.4 66.2 L33.8 41.4 Z"
          fill={ribbon}
          stroke={ink}
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <path d="M36.8 40.2 L46.95 63.9 L45.65 62.7 L35.8 40.8 Z" fill={ribbonEdge} />
        <path d="M36.6 39.2 L34.9 45.8 L33.8 41.4 Z" fill={ribbonShade} />

        {/* Gold scalloped medallion on top of ribbons */}
        <path
          d={medalPath}
          fill={gold}
          stroke={ink}
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
        {/* Inner face ring — thin concentric stroke only */}
        <circle cx={cx} cy={cy} r="12.4" fill={gold} stroke={ink} strokeWidth="1.25" />
        {/* Quiet school mark (title/label still carry full name) */}
        <text
          x={cx}
          y={cy + 2.4}
          textAnchor="middle"
          fill={ink}
          fontSize="7.5"
          fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
          fontWeight="700"
          letterSpacing="0.9"
        >
          {school}
        </text>
      </svg>
    </div>
  );
}

export default function DashboardLayout({ children, studentProfile: profileProp = null }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [studentProfile, setStudentProfile] = useState(profileProp);
  const [loading, setLoading] = useState(!profileProp);
  const profileLoadedRef = useRef(!!profileProp);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const profile = await getStudentProfile(userId);
      setStudentProfile(profile);
      setLoading(false);
    } catch (error) {
      console.error('Error loading profile:', error);
      setStudentProfile(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profileProp !== null && profileProp !== undefined) {
      setStudentProfile(profileProp);
      setLoading(false);
      profileLoadedRef.current = true;
      return;
    }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profileProp]);

  useEffect(() => {
    if (profileProp !== null) {
      return;
    }

    const handleProfileUpdate = (event) => {
      if (event.detail?.userId === user?.id) {
        profileLoadedRef.current = false;
        loadProfile(user.id).then(() => {
          profileLoadedRef.current = true;
        });
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [user?.id, loadProfile, profileProp]);

  // School-specific header texts (desktop center tagline) — do not change school mapping
  const getSchoolHeaderText = (school) => {
    const schoolTexts = {
      SOT: 'Building with Code. Empowering with Innovation.',
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

  const getStudentSchool = () => {
    const raw = studentProfile?.school || user?.school || 'SOT';
    return normalizeSchool(raw);
  };

  const calculateProfileCompletion = () => {
    if (!studentProfile) return 50;

    let completion = 50;
    const stepValue = 5;

    if (studentProfile.fullName) completion += stepValue;
    if (studentProfile.email) completion += stepValue;
    if (studentProfile.phone) completion += stepValue;
    if (studentProfile.enrollmentId) completion += stepValue;
    if (studentProfile.school) completion += stepValue;
    if (studentProfile.batch) completion += stepValue;
    if (studentProfile.cgpa) completion += stepValue;
    if (studentProfile.headline || studentProfile.tagline) completion += stepValue;
    if (studentProfile.bio) completion += stepValue;
    if (studentProfile.city) completion += stepValue;

    return Math.min(completion, 100);
  };

  const completionPercentage = calculateProfileCompletion();
  const profileImageSrc =
    studentProfile?.profilePhoto || studentProfile?.profileImageUrl || user?.profilePhoto;

  const getProgressColor = (percentage) => {
    if (percentage < 40) return '#ef4444';
    if (percentage < 70) return '#eab308';
    return '#22c55e';
  };

  const studentMobileMenu = useStudentMobileMenu();
  const displayName = loading
    ? 'Loading...'
    : studentProfile?.fullName || user?.displayName || user?.email || 'Student Name';
  const schoolCode = getStudentSchool();
  const personalHeadline =
    studentProfile?.headline || studentProfile?.tagline || '';
  const cgpaLabel = (() => {
    const cgpaValue = studentProfile?.cgpa;
    if (cgpaValue === undefined || cgpaValue === null || cgpaValue === '') {
      return 'Click edit to set';
    }
    return formatCgpaDisplay(cgpaValue);
  })();
  const enrollmentLabel = studentProfile?.enrollmentId || 'Click edit to set';

  const ringR = 20;
  const ringC = 2 * Math.PI * ringR;

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-br from-white via-sky-100 to-blue-200 border-b border-blue-200 shadow-sm">
        <div className="max-w-[100vw] px-3 sm:px-4 md:px-6">
          {/* Mobile */}
          <div className="flex md:hidden justify-between items-center min-h-[3.75rem] gap-2">
            <div className="flex-shrink-0 flex items-center">
              {studentMobileMenu && (
                <button
                  type="button"
                  onClick={() => studentMobileMenu.setMobileMenuOpen(true)}
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
            <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0 justify-end">
              <span className="truncate text-xs font-semibold text-slate-900 max-w-[7rem] sm:max-w-[9rem]">
                {loading ? <SkeletonText className="w-20 sm:w-24" lineClassName="h-3.5" /> : displayName}
              </span>
              <div className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center overflow-hidden ring-2 ring-indigo-100 shrink-0">
                {profileImageSrc ? (
                  <img src={profileImageSrc} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="text-white h-3.5 w-3.5" />
                )}
              </div>
            </div>
          </div>

          {/* Desktop — admin shell: left identity | center logo + school tagline | right seal */}
          <div className="hidden md:flex items-center justify-between gap-4 min-h-[5.25rem] py-2 relative">
            <div className="flex items-center gap-3 min-w-0 flex-1 z-10">
              <div className="relative h-12 w-12 shrink-0">
                <svg
                  className="absolute inset-0 -rotate-90"
                  width={48}
                  height={48}
                  aria-hidden
                >
                  <circle
                    cx={24}
                    cy={24}
                    r={ringR}
                    stroke="#e2e8f0"
                    strokeWidth={3}
                    fill="none"
                  />
                  <circle
                    cx={24}
                    cy={24}
                    r={ringR}
                    stroke={getProgressColor(completionPercentage)}
                    strokeWidth={3}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={ringC}
                    strokeDashoffset={ringC - (completionPercentage / 100) * ringC}
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-[5px] rounded-full bg-indigo-600 flex items-center justify-center overflow-hidden ring-2 ring-white">
                  {profileImageSrc ? (
                    <img src={profileImageSrc} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="text-white h-5 w-5" />
                  )}
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-lg font-semibold text-slate-900 truncate">
                    {loading ? <SkeletonText className="w-36" lineClassName="h-5" /> : displayName}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/student?tab=editProfile', { replace: true });
                      window.dispatchEvent(new CustomEvent('editProfileClicked'));
                    }}
                    className="p-1 text-slate-400 hover:text-indigo-600 transition-colors rounded-md hover:bg-indigo-50"
                    aria-label="Edit profile"
                  >
                    <SquarePen className="h-3.5 w-3.5" />
                  </button>
                  <BadgeCheck
                    className="h-4 w-4 text-sky-600 shrink-0"
                    aria-label="Verified"
                    strokeWidth={2}
                  />
                </div>
                {personalHeadline ? (
                  <p className="text-sm text-slate-600 truncate max-w-[18rem] lg:max-w-[22rem]">
                    {personalHeadline}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-slate-500">
                  <span className="truncate max-w-[12rem]" title={enrollmentLabel}>
                    <span className="font-medium text-slate-600">ID</span>{' '}
                    {loading ? <Skeleton className="inline-block h-3 w-14 align-middle" /> : enrollmentLabel}
                  </span>
                  <span className="text-slate-300" aria-hidden>
                    ·
                  </span>
                  <span className="truncate" title={cgpaLabel}>
                    <span className="font-medium text-slate-600">CGPA</span>{' '}
                    {loading ? <Skeleton className="inline-block h-3 w-10 align-middle" /> : cgpaLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 shrink-0 px-4 pointer-events-none max-w-[min(42vw,28rem)]">
              <img src={PWIOILOGO} alt="PWIOI Portal" className="h-9 w-auto object-contain" />
              <p
                className="text-center text-nowrap text-[1.35rem] leading-tight text-slate-800/90 font-caveat"
                style={{ fontFamily: "'Caveat', cursive" }}
              >
                {getSchoolHeaderText(schoolCode)}
              </p>
            </div>

            <div className="flex-1 flex justify-end z-10">
              <AchievementMedalBadge school={schoolCode} />
            </div>
          </div>
        </div>
      </nav>

      <main className="min-h-screen pt-[3.75rem] md:pt-[5.25rem] bg-slate-50">
        {children}
      </main>
    </div>
  );
}
