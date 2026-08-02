import React, { useState, useEffect, useMemo } from 'react';

import CrManagerCard from './CrManagerCard';
import FunnelStatCard from './FunnelStatCard';
import { fetchCrManagers } from '../../../services/jobOpportunities';
import { PieChart } from 'react-minimal-pie-chart';
import { Filter, TrendingUp, Users, Briefcase, MessageSquare, X, MapPin, GraduationCap, Shield } from 'lucide-react';
import { SkeletonStatsGrid, SkeletonFunnelRow, SkeletonList } from '../../ui/loading';
import { FaMapMarkerAlt, FaGraduationCap, FaUsers, FaUserShield } from 'react-icons/fa';
import CustomDropdown from '../../common/CustomDropdown';
import { adminDashboardService } from '../../../services/adminDashboard';
import { useAuth } from '../../../hooks/useAuth';
import {
  getAdminDisplayName,
  getAdminWelcomePrefix,
  getDashboardWelcomeSubtitle,
} from '../../../utils/adminScopeDisplay';

export default function AdminHome({ embedded = false }) {
  const { user, role } = useAuth();
  const userRole = (role || user?.role || '').toUpperCase();
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  
  const [filters, setFilters] = useState({ campus: '', school: '', batch: '', admin: '' });

  // Chart.js color palette
  const chartColors = {
    blue: 'rgb(99, 102, 241)',
    purple: 'rgb(79, 70, 229)',
    green: 'rgb(16, 185, 129)',
    red: 'rgb(244, 63, 94)',
    blueLight: 'rgba(99, 102, 241, 0.12)',
    purpleLight: 'rgba(79, 70, 229, 0.12)',
    greenLight: 'rgba(16, 185, 129, 0.12)',
    redLight: 'rgba(244, 63, 94, 0.12)',
  };

  const STAT_ACCENTS = {
    'border-blue-200': { badge: 'bg-indigo-100 text-indigo-700', pie: '#6366f1', pieBg: '#e0e7ff' },
    'border-green-200': { badge: 'bg-emerald-100 text-emerald-700', pie: '#10b981', pieBg: '#d1fae5' },
    'border-purple-200': { badge: 'bg-violet-100 text-violet-700', pie: '#7c3aed', pieBg: '#ede9fe' },
    'border-red-200': { badge: 'bg-rose-100 text-rose-700', pie: '#f43f5e', pieBg: '#ffe4e6' },
  };

  // Real-time dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState({
    campuses: [],
    schools: [],
    batches: [],
    admins: []
  });
  const [academicData, setAcademicData] = useState({ schools: [], centers: [], batches: [] });
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [adminOverview, setAdminOverview] = useState({ jdsPunched: 0, managers: [] });
  const [loadingAdminOverview, setLoadingAdminOverview] = useState(true);

  const adminDisplayName = getAdminDisplayName(user);
  const welcomePrefix = useMemo(() => getAdminWelcomePrefix(user?.id), [user?.id]);
  const welcomeSubtitle = useMemo(
    () => getDashboardWelcomeSubtitle(user, userRole, academicData),
    [user, userRole, academicData]
  );

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        setLoadingFilters(true);
        const { fetchAcademicOptions, buildStandardFilterOptions } = await import(
          '../../../utils/academicOptions'
        );
        const raw = await fetchAcademicOptions();
        const academic = buildStandardFilterOptions(raw);
        setAcademicData(raw);
        setFilterOptions({
          campuses: academic.centers,
          schools: academic.schools,
          batches: academic.batches,
          admins: [{ id: 'all', name: 'All Admins' }],
        });
      } catch (error) {
        console.error('Error loading AdminHome filter options:', error);
        setFilterOptions({ campuses: [], schools: [], batches: [], admins: [{ id: 'all', name: 'All Admins' }] });
      } finally {
        setLoadingFilters(false);
      }
    };

    loadFilterOptions();
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) {
      setLoadingAdminOverview(false);
      return undefined;
    }
    let cancelled = false;
    const loadAdminOverview = async () => {
      setLoadingAdminOverview(true);
      try {
        const data = await fetchCrManagers({});
        if (!cancelled) setAdminOverview(data || { jdsPunched: 0, managers: [] });
      } catch (error) {
        console.error('Error loading admin overview:', error);
        if (!cancelled) setAdminOverview({ jdsPunched: 0, managers: [] });
      } finally {
        if (!cancelled) setLoadingAdminOverview(false);
      }
    };
    loadAdminOverview();
    return () => { cancelled = true; };
  }, [isSuperAdmin]);

  const mapFiltersForService = (uiFilters) => {
    return {
      center: uiFilters.campus ? [uiFilters.campus] : [],
      school: uiFilters.school ? [uiFilters.school] : [],
      batch: uiFilters.batch ? [uiFilters.batch] : [],
    };
  };


  // Subscribe to real-time dashboard data
  useEffect(() => {
    setIsLoading(true);
    const mappedFilters = mapFiltersForService(filters);
    console.log('🔄 Setting up dashboard data subscription with filters:', {
      uiFilters: filters,
      serviceFilters: mappedFilters
    });
    
    const unsubscribe = adminDashboardService.subscribeToDashboardData(
      (data) => {
        const safeData = data && typeof data === 'object' ? data : {};
        console.log('📊 Dashboard data received:', {
          stats: safeData.stats,
          chartDataKeys: Object.keys(safeData.chartData || {}),
          filters: mappedFilters
        });
        setDashboardData(safeData);
        setIsLoading(false);
      },
      mappedFilters // Pass mapped filters to service
    );

    return () => {
      console.log('🧹 Cleaning up dashboard subscription');
      unsubscribe();
    };
  }, [filters]); // Re-subscribe when filters change

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      adminDashboardService.cleanup();
    };
  }, []);

  // Handle filter changes (AdminPanel style)
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearAllFilters = () => setFilters({ campus: '', school: '', batch: '', admin: '' });

  // Stats with real-time data and consistent Chart.js colors
  const s = dashboardData?.stats;
  const stats = dashboardData && s ? [
    { 
      title: 'Job Postings', 
      value: s.totalJobsPosted ?? 0, 
      borderColor: 'border-blue-200', 
      icon: <Briefcase className="w-4 h-4" />, 
      chartData: [ 
        { title: 'Posted', value: s.totalJobsPosted ?? 0, color: STAT_ACCENTS['border-blue-200'].pie },
        { title: 'Total', value: Math.max(s.totalJobsPosted ?? 0, 1), color: STAT_ACCENTS['border-blue-200'].pieBg } 
      ] 
    },
    { 
      title: 'Active Students', 
      value: s.activeStudents ?? 0, 
      borderColor: 'border-green-200', 
      icon: <Users className="w-4 h-4" />, 
      chartData: [ 
        { title: 'Active', value: s.activeStudents ?? 0, color: STAT_ACCENTS['border-green-200'].pie },
        { title: 'Total', value: Math.max(s.totalStudents ?? s.activeStudents ?? 0, 1), color: STAT_ACCENTS['border-green-200'].pieBg } 
      ] 
    },
    { 
      title: 'Pending Queries', 
      value: s.pendingQueries ?? 0, 
      borderColor: 'border-purple-200', 
      icon: <MessageSquare className="w-4 h-4" />, 
      chartData: [ 
        { title: 'Pending', value: s.pendingQueries ?? 0, color: STAT_ACCENTS['border-purple-200'].pie },
        { title: 'Total', value: Math.max(s.pendingQueries ?? 0, 1), color: STAT_ACCENTS['border-purple-200'].pieBg } 
      ] 
    },
    { 
      title: 'Applications', 
      value: s.totalApplications ?? 0, 
      borderColor: 'border-red-200', 
      icon: <TrendingUp className="w-4 h-4" />, 
      chartData: [ 
        { title: 'Placed', value: s.placedStudents ?? 0, color: STAT_ACCENTS['border-red-200'].pie },
        { title: 'Applied', value: Math.max((s.totalApplications ?? 0) - (s.placedStudents ?? 0), 0), color: STAT_ACCENTS['border-red-200'].pieBg } 
      ] 
    }
  ] : [];

  const scopeFunnel = dashboardData?.myStats;
  const funnelStages = scopeFunnel?.stages || [];
  const funnelEligible = scopeFunnel?.eligible ?? 0;

  const activeDrives = dashboardData?.activeDrives || [];

  const formatDriveDate = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  const driveStatusLabel = (status) => {
    const map = {
      ACTIVE: 'Active',
      IN_PROCESS: 'In Process',
      HOLD: 'On Hold',
      YET_TO_START: 'Yet to Start',
      CLOSED: 'Closed',
      NOT_DELIVERABLE: 'Not Deliverable',
    };
    return map[status] || status || '—';
  };

  const renderStatCards = (items, loading) => {
    if (loading) {
      return <SkeletonStatsGrid count={4} />;
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((stat, idx) => {
          const accent = STAT_ACCENTS[stat.borderColor] || STAT_ACCENTS['border-blue-200'];
          return (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium ${accent.badge}`}>
                    {stat.icon}
                    <span>{stat.title}</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-slate-900 mt-2 tabular-nums">{stat.value}</h3>
                </div>
                {stat.chartData && (
                  <div className="w-14 h-14 shrink-0">
                    <PieChart
                      data={stat.chartData}
                      lineWidth={20}
                      radius={40}
                      label={() => ''}
                      labelStyle={{ fontSize: '0px', fill: '#000' }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`space-y-4 sm:space-y-6 p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-blue-50/30 overflow-x-hidden ${embedded ? 'pb-0' : 'min-h-screen'}`}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          {welcomePrefix}, {adminDisplayName}!
        </h1>
        {welcomeSubtitle && (
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            {welcomeSubtitle}
          </p>
        )}
      </div>

      {/* Filter Section — Super Admin only */}
      {isSuperAdmin && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            Filter Dashboard
          </h2>

        {(filters.campus || filters.school || filters.batch || filters.admin) && (
          <div className="mb-4 flex flex-wrap gap-2 items-center">
            {filters.campus && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                Campus: {filterOptions.campuses.find(opt => opt.id === filters.campus)?.name || filters.campus}
                <button onClick={() => handleFilterChange('campus', '')} className="ml-1.5 hover:text-indigo-900" aria-label="Remove campus filter">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.school && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                School: {filterOptions.schools.find(opt => opt.id === filters.school)?.name || filters.school}
                <button onClick={() => handleFilterChange('school', '')} className="ml-1.5 hover:text-emerald-900" aria-label="Remove school filter">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.batch && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
                Batch: {filterOptions.batches.find(opt => opt.id === filters.batch)?.name || filters.batch}
                <button onClick={() => handleFilterChange('batch', '')} className="ml-1.5 hover:text-violet-900" aria-label="Remove batch filter">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.admin && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                Admin: {filterOptions.admins.find(opt => opt.id === filters.admin)?.name || filters.admin}
                <button onClick={() => handleFilterChange('admin', '')} className="ml-1.5 hover:text-rose-900" aria-label="Remove admin filter">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button onClick={clearAllFilters} className="text-xs text-slate-500 hover:text-slate-700 underline">Clear all</button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CustomDropdown
            label="Campus"
            icon={MapPin}
            iconColor="text-indigo-600"
            options={[
              { value: '', label: 'Select Campus' },
              ...filterOptions.campuses.map(opt => ({ value: opt.id, label: opt.name }))
            ]}
            value={filters.campus}
            onChange={(value) => handleFilterChange('campus', value)}
            placeholder="Select Campus"
          />
          
          <CustomDropdown
            label="School"
            icon={GraduationCap}
            iconColor="text-violet-600"
            options={[
              { value: '', label: 'Select School' },
              ...filterOptions.schools.map(opt => ({ value: opt.id, label: opt.name }))
            ]}
            value={filters.school}
            onChange={(value) => handleFilterChange('school', value)}
            placeholder="Select School"
          />
          
          <CustomDropdown
            label="Batch"
            icon={Users}
            iconColor="text-indigo-600"
            options={[
              { value: '', label: 'Select Batch' },
              ...filterOptions.batches.map(opt => ({ value: opt.id, label: opt.name }))
            ]}
            value={filters.batch}
            onChange={(value) => handleFilterChange('batch', value)}
            placeholder="Select Batch"
          />
          
          <CustomDropdown
            label="Admin"
            icon={Shield}
            iconColor="text-rose-600"
            options={[
              { value: '', label: 'Select Admin' },
              ...filterOptions.admins.map(opt => ({ value: opt.id, label: opt.name }))
            ]}
            value={filters.admin}
            onChange={(value) => handleFilterChange('admin', value)}
            placeholder="Select Admin"
          />
        </div>
        </div>
      )}

      {/* Overall Campus Stats */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">Overall Campus Stats</h2>
        {renderStatCards(stats, isLoading)}
      </div>

      {/* My Stats — overview-style funnel cards */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-visible">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">My Stats</h2>
          {!isLoading && (
            <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
              {funnelEligible.toLocaleString()} eligible students in your assigned scope
            </p>
          )}
        </div>
        <div className="relative p-4 bg-slate-50 min-h-[120px]">
          {isLoading ? (
            <SkeletonFunnelRow count={5} />
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {funnelStages.map((stage, i) => (
                <FunnelStatCard
                  key={stage.key}
                  stageKey={stage.key}
                  label={stage.label}
                  count={stage.count}
                  pctOfEligible={stage.pctOfEligible}
                  drop={stage.drop}
                  popoverAlign={i >= funnelStages.length - 2 ? 'end' : 'start'}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Currently active drives — compact list */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Currently Active Drives</h2>
        </div>
        <div className="bg-slate-50">
          {isLoading ? (
            <SkeletonList rows={3} />
          ) : activeDrives.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">
              No active drives in your campus scope
            </p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {activeDrives.map((drive) => {
                const interviewLabel = formatDriveDate(drive.interviewDate);
                return (
                  <li
                    key={drive.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 bg-white hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{drive.company}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{drive.role}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:justify-end shrink-0">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium tabular-nums bg-white text-slate-600 border border-slate-200">
                        {drive.applications ?? 0} applications
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium tabular-nums bg-white text-slate-600 border border-slate-200">
                        {drive.shortlisted ?? 0} shortlisted
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-white text-slate-600 border border-slate-200">
                        {interviewLabel === '—' ? 'No interview date' : `Interview date ${interviewLabel}`}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {driveStatusLabel(drive.status)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Admins overview — SUPER_ADMIN only */}
      {isSuperAdmin && (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-visible">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Admins Overview</h2>
        </div>
        <div className="p-4 bg-slate-50">
          {loadingAdminOverview ? (
            <SkeletonFunnelRow count={4} />
          ) : (
            <div className="flex flex-wrap gap-2.5">
              <CrManagerCard name="JDs Punched" value={adminOverview?.jdsPunched ?? 0} variant="jds" />
              {(adminOverview?.managers || []).map((m, i) => (
                <CrManagerCard
                  key={m.id}
                  name={m.name}
                  value={m.count}
                  breakdown={m.breakdown || []}
                  adminStatusLabel={m.adminStatusLabel}
                  popoverAlign={i >= (adminOverview.managers.length - 2) ? 'end' : 'start'}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      )}

    </div>
  );
}