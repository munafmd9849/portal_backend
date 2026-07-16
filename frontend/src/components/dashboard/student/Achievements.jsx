import React, { useState, useEffect, useRef } from 'react';
import { Award, SquarePen, Plus, ExternalLink, Calendar } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { addAchievementArray, updateAchievementArray, deleteAchievementArray, getStudentProfile } from '../../../services/students';

function mergeAchievementsAndCertifications(achievements = [], certifications = []) {
  const awards = Array.isArray(achievements) ? achievements : [];
  const certs = (Array.isArray(certifications) ? certifications : []).map((cert) => ({
    ...cert,
    hasCertificate: true,
    description: cert.description || cert.issuer || '',
    date: cert.date || cert.issuedDate || null,
    certificateUrl: cert.certificateUrl || '',
  }));
  return [...awards, ...certs];
}

const Achievements = ({
  isAdminView = false,
  viewStudentId = null,
  initialAchievements = null,
  initialCertifications = null,
}) => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editedAchievement, setEditedAchievement] = useState({
    title: "",
    description: "",
    hasCertificate: false,
    certificateUrl: ""
  });
  const [isAwardAddButtonActive, setIsAwardAddButtonActive] = useState(false);
  const [isCertAddButtonActive, setIsCertAddButtonActive] = useState(false);
  const achievementsLoadedRef = useRef(false);

  useEffect(() => {
    achievementsLoadedRef.current = false;
  }, [viewStudentId, initialAchievements, initialCertifications]);

  // Load achievements data once on mount
  useEffect(() => {
    if (initialAchievements !== null || initialCertifications !== null) {
      setAchievements(mergeAchievementsAndCertifications(initialAchievements, initialCertifications));
      achievementsLoadedRef.current = true;
      return;
    }

    const profileKey = isAdminView && viewStudentId ? viewStudentId : user?.id;
    if (!profileKey && !user?.id) return;

    if (achievementsLoadedRef.current) return;

    let isMounted = true;
    achievementsLoadedRef.current = true;

    const loadAchievements = async () => {
      try {
        setLoading(true);
        console.log('🚀 [Achievements] Starting loadAchievements, isMounted:', isMounted);
        const profile = await getStudentProfile(isAdminView && viewStudentId ? viewStudentId : user.id);
        
        // CRITICAL: Log raw API response
        console.log('📥 [Achievements] PROFILE API RESPONSE:', profile);
        console.log('📥 [Achievements] Achievements field:', profile?.achievements);
        console.log('📥 [Achievements] Certifications field:', profile?.certifications);
        console.log('📥 [Achievements] Achievements type:', typeof profile?.achievements);
        console.log('📥 [Achievements] Certifications type:', typeof profile?.certifications);
        console.log('📥 [Achievements] Achievements isArray:', Array.isArray(profile?.achievements));
        console.log('📥 [Achievements] Certifications isArray:', Array.isArray(profile?.certifications));
        console.log('🔍 [Achievements] isMounted check:', isMounted);
        
        // CRITICAL: Always process data, but check isMounted before setState
        // SAFE: Normalize to arrays, never null/undefined
        const achievementsArray = Array.isArray(profile?.achievements)
          ? profile.achievements
          : (profile?.achievements ? [profile.achievements] : []);
        const certificationsArray = Array.isArray(profile?.certifications)
          ? profile.certifications
          : (profile?.certifications ? [profile.certifications] : []);
        const allItems = mergeAchievementsAndCertifications(achievementsArray, certificationsArray);
        const hasRealData = allItems.length > 0;
        
        console.log('🔍 [Achievements] Processed data:', {
          achievementsCount: achievementsArray.length,
          certificationsCount: certificationsArray.length,
          totalRealItems: allItems.length,
          hasRealData,
          firstAchievement: achievementsArray[0] || null,
          firstCertification: certificationsArray[0] || null,
          isMounted,
        });
        
        // CRITICAL: Update state regardless of isMounted (React handles cleanup)
        if (hasRealData) {
          console.log('✅ [Achievements] Setting real achievements/certifications:', allItems);
          setAchievements(allItems);
        } else {
          console.log('📭 [Achievements] No achievements/certifications found. Using empty array.');
          setAchievements([]);
        }
      } catch (error) {
        console.error('❌ [Achievements] Error loading achievements:', error);
        setError('Failed to load achievements');
        setAchievements([]);
        // Reset on error to allow retry
        achievementsLoadedRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    loadAchievements();

    return () => {
      isMounted = false;
    };
  }, [user?.id, isAdminView, viewStudentId, initialAchievements, initialCertifications]);

  // URL normalization helper
  const normalizeUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  // Handle input changes
  const handleChange = (field, value) => {
    setEditedAchievement(prev => ({ ...prev, [field]: value }));
  };

  // SAFE: Split groups - ensure achievements is always an array
  const achievementsArray = Array.isArray(achievements) ? achievements : [];
  const certificates = achievementsArray.filter(item => item.hasCertificate);
  const awardsAndAchievements = achievementsArray.filter(item => !item.hasCertificate);
  
  // CRITICAL: Log rendering state
  console.log('🎨 [Achievements] Rendering with:', {
    achievementsCount: achievementsArray.length,
    certificatesCount: certificates.length,
    awardsCount: awardsAndAchievements.length,
    loading,
    achievementsArray: achievementsArray,
    isArray: Array.isArray(achievements),
  });

  // Add achievement or certificate
  const addNewAchievement = (isCertificate = false) => {
    const isCurrentlyAdding = editingId === 'new' && editedAchievement.hasCertificate === isCertificate;
    
    if (isCurrentlyAdding) {
      // Cancel adding
      setEditingId(null);
      if (isCertificate) {
        setIsCertAddButtonActive(false);
      } else {
        setIsAwardAddButtonActive(false);
      }
    } else {
      // Start adding
      const newAchievement = {
        title: "",
        description: "",
        hasCertificate: isCertificate,
        certificateUrl: ""
      };
      setEditingId('new');
      setEditedAchievement(newAchievement);
      if (isCertificate) {
        setIsCertAddButtonActive(true);
        setIsAwardAddButtonActive(false);
      } else {
        setIsAwardAddButtonActive(true);
        setIsCertAddButtonActive(false);
      }
    }
  };

  // Start editing
  const startEditing = (achievement) => {
    setEditingId(achievement.id);
    setEditedAchievement({ ...achievement });
  };

  // Save edited achievement
  const saveAchievement = async () => {
    const title = String(editedAchievement.title || '').trim();
    const description = String(editedAchievement.description || '').trim();
    if (!title || !description) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!user?.id) {
      setError('You must be signed in to save achievements.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Only send fields the Achievement model accepts
      const achievementData = {
        title,
        description,
        hasCertificate: Boolean(editedAchievement.hasCertificate),
        certificateUrl: editedAchievement.certificateUrl
          ? normalizeUrl(String(editedAchievement.certificateUrl).trim())
          : null,
      };

      if (editingId === 'new') {
        await addAchievementArray(user.id, achievementData);
        setSuccess(achievementData.hasCertificate ? 'Certification added successfully!' : 'Award added successfully!');
      } else {
        await updateAchievementArray(user.id, editingId, achievementData);
        setSuccess('Updated successfully!');
      }

      const profile = await getStudentProfile(user.id);
      setAchievements(mergeAchievementsAndCertifications(profile?.achievements, profile?.certifications));

      setEditingId(null);
      setEditedAchievement({ title: '', description: '', hasCertificate: false, certificateUrl: '' });
      setIsAwardAddButtonActive(false);
      setIsCertAddButtonActive(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving achievement:', error);
      const apiMsg = error?.response?.data?.error || error?.message;
      if (error.code === 'permission-denied') {
        setError('You do not have permission to save achievements. Please contact support.');
      } else {
        setError(apiMsg || 'Failed to save. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Delete achievement
  const handleDeleteAchievement = async (id) => {
    if (id === 'new') {
      // Just cancel editing for new items
      setEditingId(null);
      return;
    }

    if (!window.confirm('Are you sure you want to delete this achievement?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      await deleteAchievementArray(user.id, id);
      
      // Refresh achievements list after delete
      const profile = await getStudentProfile(user.id);
      setAchievements(mergeAchievementsAndCertifications(profile?.achievements, profile?.certifications));
      
      setSuccess('Achievement deleted successfully!');
      
      if (editingId === id) {
        setEditingId(null);
      }
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting achievement:', error);
      setError('Failed to delete achievement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null);
    setIsAwardAddButtonActive(false);
    setIsCertAddButtonActive(false);
  };

  // View certificate url
  const handleViewCertificate = (achievement) => {
    if (achievement.hasCertificate && achievement.certificateUrl) {
      window.open(achievement.certificateUrl, "_blank");
    }
  };

  const addBtnClass = (active, disabled) => {
    if (disabled) return 'rounded-full p-2 shadow bg-gray-400 cursor-not-allowed opacity-60';
    if (active) return 'rounded-full p-2 shadow bg-[#5e9ad6] hover:bg-[#4a7bb8] transition';
    return 'rounded-full p-2 shadow bg-[#8ec5ff] hover:bg-[#5e9ad6] transition';
  };

  const editBtnClass = (disabled) =>
    disabled
      ? 'p-1.5 rounded-md text-gray-300 cursor-not-allowed'
      : 'p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors';

  const CERT_ACCENTS = [
    { iconBg: 'bg-amber-50 text-amber-800 border-amber-100', issuer: 'text-amber-800' },
    { iconBg: 'bg-sky-50 text-sky-800 border-sky-100', issuer: 'text-sky-800' },
    { iconBg: 'bg-emerald-50 text-emerald-800 border-emerald-100', issuer: 'text-emerald-800' },
    { iconBg: 'bg-indigo-50 text-indigo-800 border-indigo-100', issuer: 'text-indigo-800' },
  ];

  const renderEditForm = (isCertificate) => (
    <div className="rounded-lg p-3 md:p-4 bg-slate-50/80 border border-slate-200 sm:col-span-2 xl:col-span-3">
      <label className="text-xs md:text-sm font-medium text-slate-700 mb-1 block">
        {isCertificate ? 'Certification Title' : 'Award Title'} <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        value={editedAchievement.title}
        onChange={(e) => handleChange('title', e.target.value)}
        placeholder={isCertificate ? 'Enter certification title' : 'Enter award title'}
        className="w-full mb-2 px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
      />
      <label className="text-xs md:text-sm font-medium text-slate-700 mb-1 block">
        Description <span className="text-red-500">*</span>
      </label>
      <textarea
        value={editedAchievement.description}
        onChange={(e) => handleChange('description', e.target.value)}
        placeholder={isCertificate ? 'Enter certification description' : 'Enter award description'}
        rows={2}
        className="w-full mb-2 px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
      />
      {isCertificate && (
        <>
          <label className="text-xs md:text-sm font-medium text-slate-700 mb-1 block">Certificate URL</label>
          <input
            type="url"
            value={editedAchievement.certificateUrl}
            onChange={(e) => handleChange('certificateUrl', e.target.value)}
            placeholder="https://example.com/certificate"
            className="w-full mb-2 px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
          />
        </>
      )}
      <div className="flex flex-wrap gap-2 justify-end">
        <button type="button" onClick={saveAchievement} className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50" disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={cancelEditing} className="px-3 py-1.5 text-sm rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700">
          Cancel
        </button>
        {editingId !== 'new' && (
          <button type="button" onClick={() => handleDeleteAchievement(editingId)} className="px-3 py-1.5 text-sm rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-100 disabled:opacity-50" disabled={loading}>
            Delete
          </button>
        )}
      </div>
    </div>
  );

  const renderAwardCard = (achievement, index) => {
    if (editingId === achievement.id || (editingId === 'new' && achievement.isNew)) {
      return <div key={achievement.id || 'award-edit'}>{renderEditForm(false)}</div>;
    }
    const dateLabel = achievement.date || achievement.issuedDate || achievement.year || null;
    return (
      <article
        key={achievement.id || `award-${index}`}
        className="relative flex flex-col items-center text-center rounded-xl border border-slate-200 bg-white px-4 py-5 hover:border-slate-300 transition-colors min-w-0"
      >
        <div className="mb-3 h-10 w-10 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center">
          <Award className="h-4 w-4 text-amber-700/80" strokeWidth={1.75} />
        </div>
        <h4 className="text-sm md:text-base font-semibold text-slate-900 leading-snug line-clamp-3 pr-6" style={{ textWrap: 'balance' }}>
          {achievement.title}
        </h4>
        {dateLabel ? <p className="mt-1 text-xs text-slate-500">{dateLabel}</p> : null}
        {achievement.description ? (
          <p className="mt-2 text-xs md:text-sm text-slate-600 leading-relaxed line-clamp-3">{achievement.description}</p>
        ) : null}
        <button
          type="button"
          onClick={() => startEditing(achievement)}
          disabled={isAdminView}
          className={`absolute top-2 right-2 ${editBtnClass(isAdminView)}`}
          title={isAdminView ? 'Admin view - cannot edit' : 'Edit award'}
        >
          <SquarePen className="h-3.5 w-3.5" />
        </button>
      </article>
    );
  };

  const renderCertCard = (achievement, index) => {
    if (editingId === achievement.id || (editingId === 'new' && achievement.isNew)) {
      return <div key={achievement.id || 'cert-edit'} className="sm:col-span-2">{renderEditForm(true)}</div>;
    }
    const accent = CERT_ACCENTS[index % CERT_ACCENTS.length];
    const issuer = achievement.issuer || achievement.organization || null;
    const dateLabel = achievement.date || achievement.issuedDate || null;
    const initial = (achievement.title || 'C').trim().charAt(0).toUpperCase();
    return (
      <article
        key={achievement.id || `cert-${index}`}
        className="relative flex gap-3 rounded-xl border border-slate-200 bg-white p-3.5 md:p-4 hover:border-slate-300 transition-colors min-w-0"
      >
        <div className={`h-10 w-10 shrink-0 rounded-lg border flex items-center justify-center text-sm font-semibold ${accent.iconBg}`}>
          {initial}
        </div>
        <div className="flex-1 min-w-0 flex flex-col pr-6">
          <h4 className="text-sm md:text-base font-semibold text-slate-900 leading-snug line-clamp-2">{achievement.title}</h4>
          {issuer ? <p className={`mt-0.5 text-xs font-medium ${accent.issuer}`}>{issuer}</p> : null}
          {achievement.description ? (
            <p className="mt-1.5 text-xs md:text-sm text-slate-600 leading-relaxed line-clamp-2">{achievement.description}</p>
          ) : null}
          <div className="mt-auto pt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-xs text-slate-500 min-w-0">
              {dateLabel ? (
                <>
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{dateLabel}</span>
                </>
              ) : (
                <span />
              )}
            </div>
            {achievement.certificateUrl ? (
              <button
                type="button"
                onClick={() => handleViewCertificate(achievement)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-100 touch-manipulation"
              >
                VERIFY
                <ExternalLink className="h-3 w-3" />
              </button>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => startEditing(achievement)}
          disabled={isAdminView}
          className={`absolute top-2 right-2 ${editBtnClass(isAdminView)}`}
          title={isAdminView ? 'Admin view - cannot edit' : 'Edit certification'}
        >
          <SquarePen className="h-3.5 w-3.5" />
        </button>
      </article>
    );
  };

  return (
    <div className="w-full relative space-y-4 md:space-y-6 min-w-0">
      {error && (
        <div className="p-2.5 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs md:text-sm break-words">{error}</div>
      )}
      {success && (
        <div className="p-2.5 bg-green-50 border border-green-200 rounded-md text-green-700 text-xs md:text-sm">{success}</div>
      )}

      <fieldset className="bg-white rounded-xl border-2 border-[#8ec5ff] pt-1 pb-3 md:pb-5 px-3 md:px-6 transition-all duration-200 shadow-lg hover:shadow-xl min-w-0 overflow-hidden">
        <legend className="text-base md:text-xl font-bold px-2 bg-gradient-to-r from-[#211868] to-[#b5369d] rounded-full text-transparent bg-clip-text select-none">
          Awards & Achievements
        </legend>
        <div className="flex items-center justify-end mb-2 md:mb-4 mr-0 md:mr-[-1%]">
          <button
            type="button"
            onClick={() => addNewAchievement(false)}
            disabled={isAdminView}
            aria-label="Add new award"
            className={addBtnClass(isAwardAddButtonActive, isAdminView)}
            title={isAdminView ? 'Admin view' : 'Add award'}
          >
            <Plus size={18} className="text-white" />
          </button>
        </div>
        {editingId === 'new' && !editedAchievement.hasCertificate && renderEditForm(false)}
        {Array.isArray(awardsAndAchievements) && awardsAndAchievements.length === 0 && !(editingId === 'new' && !editedAchievement.hasCertificate) && (
          <p className="text-sm text-gray-500 py-6 text-center">No awards yet. Click + to add one.</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
          {Array.isArray(awardsAndAchievements) && awardsAndAchievements.map((a, i) => renderAwardCard(a, i))}
        </div>
      </fieldset>

      <fieldset className="bg-white rounded-xl border-2 border-[#8ec5ff] pt-1 pb-3 md:pb-4 px-3 md:px-6 transition-all duration-200 shadow-lg hover:shadow-xl min-w-0 overflow-hidden">
        <legend className="text-base md:text-xl font-bold px-2 bg-gradient-to-r from-[#211868] to-[#b5369d] rounded-full text-transparent bg-clip-text select-none">
          Certifications
        </legend>
        <div className="flex items-center justify-end mb-2 md:mb-3 mr-0 md:mr-[-1%]">
          <button
            type="button"
            onClick={() => addNewAchievement(true)}
            disabled={isAdminView}
            aria-label="Add new certificate"
            className={addBtnClass(isCertAddButtonActive, isAdminView)}
            title={isAdminView ? 'Admin view' : 'Add certificate'}
          >
            <Plus size={18} className="text-white" />
          </button>
        </div>
        {editingId === 'new' && editedAchievement.hasCertificate && renderEditForm(true)}
        {Array.isArray(certificates) && certificates.length === 0 && !(editingId === 'new' && editedAchievement.hasCertificate) && (
          <p className="text-sm text-gray-500 py-6 text-center">No certifications yet. Click + to add one.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {Array.isArray(certificates) && certificates.map((c, i) => renderCertCard(c, i))}
        </div>
      </fieldset>
    </div>
  );
};

export default Achievements;
