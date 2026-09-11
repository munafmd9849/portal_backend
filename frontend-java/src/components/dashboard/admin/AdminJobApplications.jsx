import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../../../services/api';
import { Search, Users, ExternalLink, ArrowLeft, ChevronLeft, ChevronRight, GraduationCap, Building2, Briefcase, X } from 'lucide-react';
import CustomDropdown from '../../common/CustomDropdown';
import { Skeleton } from '../../ui/loading';

const STAGE_OPTIONS = [
  { label: 'All stages', value: '' },
  { label: 'Applied', value: 'Applied' },
  { label: 'Screening Qualified', value: 'Screening Qualified' },
  { label: 'Test Qualified', value: 'Qualified for Interview' },
  { label: 'Interview Round 1', value: 'Interview Round 1' },
  { label: 'Interview Round 2', value: 'Interview Round 2' },
  { label: 'Selected', value: 'Selected' },
  { label: 'Rejected', value: 'Rejected' },
];

const FINAL_STATUS_OPTIONS = [
  { label: 'All outcomes', value: '' },
  { label: 'Ongoing', value: 'ONGOING' },
  { label: 'Selected', value: 'SELECTED' },
  { label: 'Rejected', value: 'REJECTED' },
];

function SkeletonRow() {
  return (
    <tr>
      <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-48" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-20" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-16 mx-auto" /></td>
      <td className="px-6 py-4"><Skeleton className="h-9 w-28 rounded-md ml-auto" /></td>
    </tr>
  );
}

function StatusPill({ value }) {
  const v = String(value || '').toUpperCase();
  const config = {
SELECTED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
    REJECTED: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100' },
    ONGOING: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-100' },
    REVOKED_BY_ADMIN: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
    WITHDRAWN: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  };
  const style = config[v] || config.ONGOING;
  const label =
    v === 'REVOKED_BY_ADMIN' ? 'Revoked'
      : v === 'WITHDRAWN' ? 'Withdrawn'
      : v === 'ONGOING' ? 'Ongoing'
        : v === 'SELECTED' ? 'Selected'
          : v === 'REJECTED' ? 'Rejected'
            : v;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}>
      {label}
    </span>
  );
}

function StageBadge({ stage }) {
  const stages = {
Applied: { color: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Applied' },
    'Screening Qualified': { color: 'bg-sky-50 text-sky-700 border-sky-100', label: 'Screening' },
    'Qualified for Interview': { color: 'bg-blue-50 text-blue-700 border-blue-100', label: 'Interview ready' },
    'Interview Round 1': { color: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Round 1' },
    'Interview Round 2': { color: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Round 2' },
    Selected: { color: 'bg-emerald-50 text-emerald-700 border-emerald-100', label: 'Selected' },
    Rejected: { color: 'bg-rose-50 text-rose-700 border-rose-100', label: 'Rejected' },
    REVOKED_BY_ADMIN: { color: 'bg-gray-200 text-gray-700 border-gray-300', label: 'Revoked' },
    WITHDRAWN: { color: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Withdrawn' },
  };
  const stageConfig = stages[stage] || stages.Applied;
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium border ${stageConfig.color}`}>
      {stageConfig.label}
    </span>
  );
}

export default function AdminJobApplications() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const jobId = params.jobId || location.pathname.match(/\/admin\/jobs\/([^/]+)\/applications/)?.[1] ||
    location.pathname.match(/\/super-admin\/jobs\/([^/]+)\/applications/)?.[1];

  const basePath = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    applicationStatus: '',
    stage: '',
    finalStatus: '',
    lastRoundReached: '',
  });
  const [sortBy] = useState('appliedAt');
  const [order] = useState('desc');
  const [page, setPage] = useState(1);
  const LIMIT = 50;

  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 400);
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    async function load() {
      if (!jobId) return;
      try {
        setLoading(true);
        setError('');
        const queryParams = {
          page,
          limit: LIMIT,
          sortBy,
          order,
          q: debouncedSearch || undefined,
          stage: filters.stage || undefined,
          finalStatus: filters.finalStatus || undefined,
        };
        const res = await api.get(`/admin/jobs/${jobId}/applications`, { params: queryParams });
        setPayload(res.data);
      } catch (err) {
        setError(err.message || 'Failed to load applications');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [jobId, page, sortBy, order, debouncedSearch, filters.stage, filters.finalStatus]);

  const stats = payload?.stats || {};
  const applications = payload?.applications || [];
  const pagination = payload?.pagination || { total: 0, totalPages: 1 };
  const job = payload?.job || {};
  const hasFilters = !!(filters.search || filters.stage || filters.finalStatus);
  const selectedCount = stats.selected ?? stats.Selected ?? 0;

  const resetFilters = () => {
    setFilters({
      search: '',
      applicationStatus: '',
      stage: '',
      finalStatus: '',
      lastRoundReached: '',
    });
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 bg-white border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-900">Application review</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5 truncate">
                <Building2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                {job.companyName || '—'}
              </span>
              <span className="w-1 h-1 bg-gray-300 rounded-full hidden sm:block" />
              <span className="inline-flex items-center gap-1.5 truncate">
                <Briefcase className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                {job.title || job.jobTitle || '—'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-2 bg-white border border-gray-200 rounded-md text-center min-w-[72px]">
            <span className="text-xs text-gray-500 block">Total</span>
            <span className="text-base font-semibold text-gray-900">{pagination.total}</span>
          </div>
          <div className="px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-md text-center min-w-[72px]">
            <span className="text-xs text-emerald-700 block">Selected</span>
            <span className="text-base font-semibold text-emerald-700">{selectedCount}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col lg:flex-row items-stretch lg:items-center gap-3 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, search: e.target.value }));
              setPage(1);
            }}
            placeholder="Search by student name, email, or USN…"
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-800 placeholder:text-gray-400 focus:ring-1 focus:ring-sky-400 focus:border-sky-400 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="w-full sm:w-48">
            <CustomDropdown
              options={STAGE_OPTIONS}
              value={filters.stage}
              onChange={(val) => {
                setFilters((prev) => ({ ...prev, stage: val }));
                setPage(1);
              }}
              placeholder="Stage"
              className="rounded-md border-gray-200 shadow-none"
            />
          </div>
          <div className="w-full sm:w-44">
            <CustomDropdown
              options={FINAL_STATUS_OPTIONS}
              value={filters.finalStatus}
              onChange={(val) => {
                setFilters((prev) => ({ ...prev, finalStatus: val }));
                setPage(1);
              }}
              placeholder="Outcome"
              className="rounded-md border-gray-200 shadow-none"
            />
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div className="bg-white rounded-lg border border-red-200 p-12 text-center">
          <p className="text-base font-semibold text-gray-900">Unable to load applicants</p>
          <p className="text-sm text-gray-600 mt-1">{error}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500">Candidate</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500">Academic details</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500">Stage</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 text-center">Outcome</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                ) : applications.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-20 text-center">
                      <div className="w-14 h-14 bg-sky-50 text-sky-400 rounded-md flex items-center justify-center mx-auto mb-4">
                        <Users className="w-7 h-7" />
                      </div>
                      <p className="text-gray-900 font-medium">
                        {hasFilters ? 'No candidates match your filters' : 'No applicants yet'}
                      </p>
                      <p className="text-gray-500 text-sm mt-1">
                        {hasFilters
                          ? 'Try adjusting the stage, outcome, or search term'
                          : 'Applications will show up here once students apply'}
                      </p>
                      {hasFilters && (
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="mt-5 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                        >
                          Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  applications.map((app) => {
                    const applicationId = app.applicationId || app.id;
                    const studentName = app.student?.name || app.student?.user?.displayName || 'Unknown';
                    const studentInitial = studentName.charAt(0).toUpperCase();
                    return (
                      <tr key={applicationId} className="hover:bg-sky-50/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-sky-50 text-sky-700 rounded-md flex items-center justify-center font-semibold text-xs border border-sky-100 shrink-0">
                              {studentInitial}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{studentName}</p>
                              <p className="text-xs text-gray-500 truncate">{app.student?.enrollmentId || app.student?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-xs text-gray-600 flex items-center gap-1.5">
                              <GraduationCap className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="truncate">
                                {[app.student?.school, app.student?.branch].filter(Boolean).join(' · ') || '—'}
                              </span>
                            </p>
                            {app.student?.batch && (
                              <p className="text-xs text-gray-500 pl-5">Batch {app.student.batch}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StageBadge stage={app.currentStage} />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <StatusPill value={app.finalStatus} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {app.student?.profileLink && (
                              <a
                                href={app.student.profileLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-gray-50 text-gray-400 hover:text-sky-700 hover:bg-sky-50 rounded-md transition-colors"
                                title="View profile"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => navigate(`${basePath}/jobs/${jobId}/applications/${applicationId}`)}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-colors"
                            >
                              View details
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loading && pagination.total > LIMIT && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                Showing {applications.length} of {pagination.total} candidates
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 bg-white border border-gray-200 rounded-md text-gray-600 disabled:opacity-30 hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600 px-2">
                  Page {page} of {pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="p-2 bg-white border border-gray-200 rounded-md text-gray-600 disabled:opacity-30 hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
