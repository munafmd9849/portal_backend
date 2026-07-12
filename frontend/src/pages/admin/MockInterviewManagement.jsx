import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Calendar, Clock, Users,
  Search, MoreHorizontal, CheckCircle2,
  AlertCircle, Trash2, Edit2, Layout,
  ChevronRight, Sparkles, Video,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import MockInterviewCreateModal from '../../components/dashboard/admin/MockInterviewCreateModal';
import MockInterviewEditDriveModal from '../../components/dashboard/admin/MockInterviewEditDriveModal';
import DirectoryLoadingPanel from '../../components/dashboard/admin/DirectoryLoading';

function driveHasLiveSlots(drive) {
  return drive.slots?.some((s) => ['WAITING', 'LIVE'].includes(s.status));
}

function driveIsDraft(drive) {
  return drive.status === 'DRAFT';
}

function driveIsActive(drive) {
  if (driveIsDraft(drive)) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const driveDate = new Date(drive.date);
  driveDate.setHours(0, 0, 0, 0);
  const isToday = driveDate.getTime() === now.getTime();
  return isToday || driveHasLiveSlots(drive);
}

function driveIsUpcoming(drive) {
  if (driveIsDraft(drive)) return false;
  if (driveHasLiveSlots(drive)) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const driveDate = new Date(drive.date);
  driveDate.setHours(0, 0, 0, 0);
  return driveDate > now;
}

function driveIsPast(drive) {
  if (driveIsDraft(drive)) return false;
  if (driveHasLiveSlots(drive)) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const driveDate = new Date(drive.date);
  driveDate.setHours(0, 0, 0, 0);
  return driveDate < now;
}

function aiIsActive(iv) {
  if (iv.status === 'DRAFT') return false;
  const now = new Date();
  const start = iv.startDate ? new Date(iv.startDate) : null;
  const end = iv.endDate ? new Date(iv.endDate) : null;
  if (start && end) return now >= start && now <= end;
  return iv.status === 'PUBLISHED';
}

function aiIsUpcoming(iv) {
  if (!iv.startDate) return false;
  return new Date(iv.startDate) > new Date();
}

function aiIsPast(iv) {
  if (!iv.endDate) return false;
  return new Date(iv.endDate) < new Date();
}

export default function MockInterviewManagement({
  autoOpenCreate = false,
  forcedMode = null,
  dashboardTab = 'mockInterviews',
}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const urlMode = searchParams.get('mode') === 'ai' ? 'ai' : 'live';
  const initialMode = forcedMode === 'ai' || forcedMode === 'live' ? forcedMode : urlMode;
  const lockMode = forcedMode === 'ai' || forcedMode === 'live';

  const [loading, setLoading] = useState(true);
  const [drives, setDrives] = useState([]);
  const [aiInterviews, setAiInterviews] = useState([]);
  const [mainMode, setMainMode] = useState(initialMode);
  const [filterTab, setFilterTab] = useState('all');
  const [showMenu, setShowMenu] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(autoOpenCreate);
  const [editDrive, setEditDrive] = useState(null);

  const syncUrl = useCallback(
    (mode) => {
      const next = new URLSearchParams(searchParams);
      next.set('tab', dashboardTab || 'mockInterviews');
      if (mode === 'ai') next.set('mode', 'ai');
      else next.delete('mode');
      next.delete('aiFilter');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams, dashboardTab]
  );

  const setMode = (mode) => {
    if (lockMode) return;
    setMainMode(mode);
    setSearchQuery('');
    setFilterTab('all');
    syncUrl(mode);
  };

  useEffect(() => {
    if (lockMode && mainMode !== forcedMode) {
      setMainMode(forcedMode);
    }
  }, [lockMode, forcedMode, mainMode]);

  const openCreateModal = () => setShowCreateModal(true);

  useEffect(() => {
    if (autoOpenCreate) setShowCreateModal(true);
  }, [autoOpenCreate]);

  const loadDrives = useCallback(async () => {
    try {
      setLoading(true);
      const [data, ai] = await Promise.all([
        api.getMockInterviewDrives(),
        api.getAiMockInterviews().catch(() => []),
      ]);
      setDrives(data);
      setAiInterviews(Array.isArray(ai) ? ai : []);
    } catch {
      toast.error('Failed to load mock interviews');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDrives();
  }, [loadDrives]);

  useEffect(() => {
    const handleClickAway = (e) => {
      if (e.target.closest('[data-drive-menu-root]')) return;
      setShowMenu(null);
    };
    document.addEventListener('click', handleClickAway);
    return () => document.removeEventListener('click', handleClickAway);
  }, []);

  const handlePublishDrive = async (drive) => {
    if (drive.endTime && drive.startTime && new Date(drive.endTime) <= new Date(drive.startTime)) {
      toast.error('Edit the drive and set a valid schedule before publishing');
      return;
    }
    try {
      const res = await api.publishMockInterviewDrive(drive.id);
      toast.success(`Published · ${res.slotsGenerated} slots created`);
      loadDrives();
    } catch (err) {
      toast.error(err?.message || 'Failed to publish drive');
    }
  };

  const handleDeleteDrive = async (id) => {
    if (!window.confirm('Delete this drive? All slots and session data will be permanently removed.')) return;
    try {
      await api.deleteMockInterviewDrive(id);
      toast.success('Drive deleted');
      loadDrives();
    } catch {
      toast.error('Failed to delete drive');
    }
  };

  const handleDeleteAiInterview = async (id, title) => {
    if (
      !window.confirm(
        `Delete "${title}"?\n\nAll questions, enrollments, recordings, and reviews will be permanently removed.`
      )
    ) {
      return;
    }
    try {
      await api.deleteAiMockInterview(id);
      toast.success('AI interview deleted');
      loadDrives();
    } catch (err) {
      toast.error(err?.message || 'Failed to delete AI interview');
    }
  };

  const getDriveStats = (drive) => {
    const total = drive._count?.slots || 0;
    const assigned = drive.slots?.filter((s) => s.status !== 'AVAILABLE').length || 0;
    const completed = drive.slots?.filter((s) => s.status === 'COMPLETED').length || 0;
    return { total, assigned, completed };
  };

  const totalDrives = drives.length;
  const totalAi = aiInterviews.length;
  const aiActiveCount = aiInterviews.filter(aiIsActive).length;
  const aiUpcomingCount = aiInterviews.filter(aiIsUpcoming).length;
  const aiPastCount = aiInterviews.filter(aiIsPast).length;

  const filteredDrives = drives.filter((drive) => {
    if (searchQuery && !drive.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterTab === 'all') return true;
    if (filterTab === 'active') return driveIsActive(drive);
    if (filterTab === 'upcoming') return driveIsUpcoming(drive);
    if (filterTab === 'past') return driveIsPast(drive);
    return true;
  });

  const filteredAi = useMemo(() => {
    return aiInterviews.filter((iv) => {
      if (searchQuery && !iv.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterTab === 'all') return true;
      if (filterTab === 'active') return aiIsActive(iv);
      if (filterTab === 'upcoming') return aiIsUpcoming(iv);
      if (filterTab === 'past') return aiIsPast(iv);
      return true;
    });
  }, [aiInterviews, filterTab, searchQuery]);
  const upcomingDrivesCount = drives.filter(driveIsUpcoming).length;
  const activeDrivesCount = drives.filter(driveIsActive).length;
  const pastDrivesCount = drives.filter(driveIsPast).length;
  const ongoingSlots = drives.reduce(
    (acc, d) => acc + (d.slots || []).filter((s) => ['SCHEDULED', 'WAITING', 'LIVE'].includes(s.status)).length,
    0
  );
  const completedOverall = drives.reduce(
    (acc, d) => acc + (d.slots || []).filter((s) => s.status === 'COMPLETED').length,
    0
  );

  const waitingCandidates = drives.reduce(
    (acc, d) => acc + (d.slots || []).filter((s) => s.status === 'WAITING').length,
    0
  );

  const liveStats = [
    { label: 'Total drives', val: totalDrives },
    { label: 'Upcoming slots', val: ongoingSlots },
    { label: 'Waiting list', val: waitingCandidates },
    { label: 'Completed', val: completedOverall },
  ];

  const aiInProgress = aiInterviews.reduce((n, iv) => n + (iv.stats?.inProgress ?? 0), 0);
  const aiCompleted = aiInterviews.reduce((n, iv) => n + (iv.stats?.completed ?? 0), 0);

  const aiStats = [
    { label: 'Total AI', val: totalAi },
    { label: 'Upcoming', val: aiUpcomingCount },
    { label: 'In progress', val: aiInProgress },
    { label: 'Completed', val: aiCompleted },
  ];

  const filterTabs =
    mainMode === 'live'
      ? [
          { id: 'all', label: 'All Drives', shortLabel: 'All', count: totalDrives },
          { id: 'active', label: 'Active Sessions', shortLabel: 'Active', count: activeDrivesCount },
          { id: 'upcoming', label: 'Upcoming Drives', shortLabel: 'Upcoming', count: upcomingDrivesCount },
          { id: 'past', label: 'Past Archives', shortLabel: 'Past', count: pastDrivesCount },
        ]
      : [
          { id: 'all', label: 'All AI', shortLabel: 'All', count: totalAi },
          { id: 'active', label: 'Active Sessions', shortLabel: 'Active', count: aiActiveCount },
          { id: 'upcoming', label: 'Upcoming', shortLabel: 'Upcoming', count: aiUpcomingCount },
          { id: 'past', label: 'Past Archives', shortLabel: 'Past', count: aiPastCount },
        ];

  const statsStrip = mainMode === 'live' ? liveStats : aiStats;

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {!lockMode ? (
            <div className="inline-flex flex-wrap rounded-md border border-gray-200 bg-white p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setMode('live')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  mainMode === 'live'
                    ? 'bg-slate-800 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                Live 1:1 ({totalDrives})
              </button>
              <button
                type="button"
                onClick={() => setMode('ai')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  mainMode === 'ai'
                    ? 'bg-slate-800 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI video ({aiInterviews.length})
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              {mainMode === 'live' ? 'Live mock interview drives' : 'AI video interviews'}
            </p>
          )}
          {mainMode === 'live' ? (
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 px-3.5 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" /> New live drive
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/admin/mock-interviews/create-ai-interview')}
              className="flex items-center justify-center gap-2 px-3.5 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" /> New AI interview
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3.5">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            {statsStrip.map((stat, i) => (
              <div key={i} className="px-3 py-2 md:py-0 first:pt-0 last:pb-0 md:first:pl-0 md:last:pr-0">
                <p className="text-xs font-medium text-gray-500">{stat.label}</p>
                <p className="text-2xl font-semibold text-gray-900 tabular-nums mt-0.5">{stat.val}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-visible flex flex-col">
          <div className="p-3 border-b border-gray-100 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div
              className="inline-flex flex-wrap rounded-md border border-gray-200 bg-white p-0.5 shadow-sm w-full lg:w-auto"
              role="tablist"
            >
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={filterTab === tab.id}
                  onClick={() => setFilterTab(tab.id)}
                  className={`flex items-center justify-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors flex-1 lg:flex-none ${
                    filterTab === tab.id
                      ? 'bg-slate-800 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="hidden sm:inline whitespace-nowrap">{tab.label}</span>
                  <span className="sm:hidden whitespace-nowrap">{tab.shortLabel}</span>
                  <span
                    className={`shrink-0 tabular-nums ${
                      filterTab === tab.id ? 'text-white/80' : 'text-gray-400'
                    }`}
                  >
                    ({tab.count})
                  </span>
                </button>
              ))}
            </div>

            <div className="relative w-full shrink-0 lg:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder={
                  mainMode === 'live' ? 'Search drives…' : 'Search AI interviews…'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400 focus:bg-white"
              />
            </div>
          </div>

          <div className="overflow-visible">
            {loading ? (
              <div className="p-4 sm:p-6">
                <DirectoryLoadingPanel
                  title={
                    mainMode === 'live'
                      ? 'Loading mock interview drives...'
                      : 'Loading AI interviews...'
                  }
                  subtitle="Please wait while we fetch the data"
                />
              </div>
            ) : mainMode === 'live' ? (
              filteredDrives.length === 0 ? (
                <div className="py-20 flex flex-col items-center text-center gap-4">
                  <AlertCircle className="w-10 h-10 text-gray-200" />
                  <h3 className="text-base font-medium text-gray-900">
                    No {filterTab === 'all' ? '' : `${filterTab} `}drives found
                  </h3>
                  {filterTab === 'all' && !searchQuery && (
                    <button
                      type="button"
                      onClick={openCreateModal}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                    >
                      Create drive
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredDrives.map((drive) => {
                    const stats = getDriveStats(drive);
                    const isDraft = driveIsDraft(drive);
                    const isPast = !isDraft && new Date(drive.date) < new Date().setHours(0, 0, 0, 0);
                    const hasActiveSession = drive.slots?.some((s) =>
                      ['WAITING', 'LIVE'].includes(s.status)
                    );

                    return (
                      <div
                        key={drive.id}
                        className="p-4 sm:p-5 hover:bg-gray-50 transition-colors group relative text-left overflow-visible"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex gap-4 min-w-0">
                            <div
                              className={`w-11 h-11 rounded-md flex flex-col items-center justify-center flex-shrink-0 border ${
                                hasActiveSession
                                  ? 'bg-sky-50 text-sky-800 border-sky-200'
                                  : 'bg-gray-50 text-gray-700 border-gray-200'
                              }`}
                            >
                              <span className="text-[9px] font-medium uppercase opacity-80">
                                {drive.date
                                  ? new Date(drive.date).toLocaleString('default', { month: 'short' })
                                  : '---'}
                              </span>
                              <span className="text-base font-semibold leading-none">
                                {drive.date ? new Date(drive.date).getDate() : '--'}
                              </span>
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-medium rounded border ${
                                    isDraft
                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                      : hasActiveSession
                                        ? 'bg-blue-50 text-sky-700 border-blue-200'
                                        : isPast
                                          ? 'bg-gray-100 text-gray-600 border-gray-200'
                                          : 'bg-gray-50 text-gray-700 border-gray-200'
                                  }`}
                                >
                                  {isDraft
                                    ? 'Draft'
                                    : hasActiveSession
                                      ? 'Live'
                                      : isPast
                                        ? 'Past'
                                        : drive.category}
                                </span>
                                <span className="text-xs text-gray-500 tabular-nums">
                                  {stats.total} slots
                                </span>
                              </div>
                              <h3
                                className="text-sm font-semibold text-gray-900 cursor-pointer hover:text-sky-700 truncate"
                                onClick={() => navigate(`/admin?tab=mockInterviews-slots&id=${drive.id}`)}
                              >
                                {drive.title}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {drive.startTime
                                  ? new Date(drive.startTime).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : '--:--'}
                                {' – '}
                                {drive.endTime
                                  ? new Date(drive.endTime).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : '--:--'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap shrink-0">
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/mock-interviews/${drive.id}/results`)}
                              className="px-3 py-2 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700"
                            >
                              Results
                            </button>
                            {isDraft ? (
                              <button
                                type="button"
                                onClick={() => handlePublishDrive(drive)}
                                className="px-3 py-2 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700"
                              >
                                Publish
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => navigate(`/admin?tab=mockInterviews-slots&id=${drive.id}`)}
                                className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-50 flex items-center gap-1"
                              >
                                Manage slots <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <div className="relative" data-drive-menu-root>
                              <button
                                type="button"
                                onClick={() => setShowMenu(showMenu === drive.id ? null : drive.id)}
                                className="p-2 bg-gray-50 rounded-md border border-gray-200 text-gray-400 hover:text-gray-600"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              {showMenu === drive.id && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-[200]">
                                  {isDraft && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowMenu(null);
                                        handlePublishDrive(drive);
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Publish
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowMenu(null);
                                      setEditDrive(drive);
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" /> Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowMenu(null);
                                      handleDeleteDrive(drive.id);
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : filteredAi.length === 0 ? (
              <div className="py-20 flex flex-col items-center text-center gap-4">
                <Sparkles className="w-10 h-10 text-gray-200" />
                <h3 className="text-base font-medium text-gray-900">
                  No {filterTab === 'all' ? '' : `${filterTab} `}AI interviews found
                </h3>
                {filterTab === 'all' && !searchQuery && (
                  <button
                    type="button"
                    onClick={() => navigate('/admin/mock-interviews/create-ai-interview')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    Create AI interview
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredAi.map((iv) => {
                  const assigned = iv.stats?.assigned ?? 0;
                  const completed = iv.stats?.completed ?? 0;
                  const isActive = aiIsActive(iv);
                  const isPast = aiIsPast(iv);
                  const isDraft = iv.status === 'DRAFT';
                  const start = iv.startDate ? new Date(iv.startDate) : null;

                  return (
                    <div
                      key={iv.id}
                      className="p-4 sm:p-5 hover:bg-gray-50 transition-colors group relative text-left overflow-visible"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex gap-4 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-md flex flex-col items-center justify-center flex-shrink-0 border ${
                              isActive
                                ? 'bg-sky-50 text-sky-800 border-sky-200'
                                : 'bg-gray-50 text-gray-700 border-gray-200'
                            }`}
                          >
                            <span className="text-[9px] font-medium uppercase opacity-80">
                              {start
                                ? start.toLocaleString('default', { month: 'short' })
                                : '---'}
                            </span>
                            <span className="text-base font-semibold leading-none">
                              {start ? start.getDate() : '--'}
                            </span>
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-medium rounded border ${
                                  isActive
                                    ? 'bg-blue-50 text-sky-700 border-blue-200'
                                    : isPast
                                      ? 'bg-gray-100 text-gray-600 border-gray-200'
                                      : isDraft
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : 'bg-gray-50 text-gray-700 border-gray-200'
                                }`}
                              >
                                {isActive
                                  ? 'Active'
                                  : isPast
                                    ? 'Past'
                                    : isDraft
                                      ? 'Draft'
                                      : 'AI video'}
                              </span>
                              <span className="text-xs text-gray-500 tabular-nums">
                                {assigned} assigned
                              </span>
                            </div>
                            <h3 className="text-sm font-semibold text-gray-900 truncate">
                              {iv.title}
                            </h3>
                            <p className="text-xs text-gray-500 tabular-nums">
                              {iv.startDate
                                ? new Date(iv.startDate).toLocaleString([], {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                  })
                                : '—'}{' '}
                              –{' '}
                              {iv.endDate
                                ? new Date(iv.endDate).toLocaleString([], {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                  })
                                : '—'}
                              <span className="text-gray-400 ml-2">
                                · {completed} completed
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/mock-interviews/${iv.id}/review`)}
                            className="px-3 py-2 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700"
                          >
                            Results
                          </button>
                          <div className="relative" data-drive-menu-root>
                            <button
                              type="button"
                              onClick={() => setShowMenu(showMenu === iv.id ? null : iv.id)}
                              className="p-2 bg-gray-50 rounded-md border border-gray-200 text-gray-400 hover:text-gray-600"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {showMenu === iv.id && (
                              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-[200]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowMenu(null);
                                    handleDeleteAiInterview(iv.id, iv.title);
                                  }}
                                  className="w-full px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <MockInterviewCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadDrives}
      />

      <MockInterviewEditDriveModal
        drive={editDrive}
        isOpen={Boolean(editDrive)}
        onClose={() => setEditDrive(null)}
        onSuccess={loadDrives}
      />
    </>
  );
}
