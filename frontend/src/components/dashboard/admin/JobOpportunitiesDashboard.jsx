import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Download } from 'lucide-react';
import { SkeletonFunnelRow, SkeletonTableCard } from '../../ui/loading';
import HoverStatCard from './HoverStatCard';
import CrManagerCard from './CrManagerCard';
import CustomDropdown from '../../common/CustomDropdown';
import { useAuth } from '../../../hooks/useAuth';
import {
  fetchJobOpportunitiesOverview,
  fetchCardBreakdown,
  fetchCrManagers,
  fetchMomTable,
  fetchJobOpportunitiesFilterOptions,
} from '../../../services/jobOpportunities';

function SectionBar({ title }) {
  return (
    <div className="px-4 py-3 border-b border-slate-200 bg-white">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
    </div>
  );
}

const METRIC_TONES = {
  good: { card: 'bg-white border-emerald-200', label: 'text-emerald-700', value: 'text-emerald-900' },
  bad: { card: 'bg-white border-rose-200', label: 'text-rose-700', value: 'text-rose-900' },
  warn: { card: 'bg-white border-amber-200', label: 'text-amber-700', value: 'text-amber-900' },
  neutral: { card: 'bg-white border-slate-200', label: 'text-sky-700', value: 'text-slate-900' },
};

function toneForMetric(label, value) {
  const n = Number(value) || 0;
  const badLabels = ['Hold', 'Yet to Start', 'Learner Not Applied', 'Not Deliverable'];
  const goodLabels = ['Companies Onboarded', 'JDs Announced', 'In Process'];
  if (badLabels.includes(label)) return n > 0 ? 'bad' : 'good';
  if (goodLabels.includes(label)) return n > 0 ? 'good' : 'warn';
  return 'neutral';
}

function StaticStatCard({ label, value, tone }) {
  const resolved = tone || toneForMetric(label, value);
  const styles = METRIC_TONES[resolved] || METRIC_TONES.neutral;
  return (
    <div className={`rounded-lg px-3 py-3 min-h-[88px] min-w-[110px] flex-1 border shadow-sm flex flex-col justify-center transition-all duration-200 hover:ring-2 hover:ring-indigo-200 ${styles.card}`}>
      <p className={`text-xs font-medium leading-tight ${styles.label}`}>{label}</p>
      <p className={`text-2xl font-semibold tabular-nums mt-1 ${styles.value}`}>{value ?? 0}</p>
    </div>
  );
}

const EMPTY_OVERVIEW = {
  row1: {
    totalCsPool: 0, activeCsPool: 0, inactiveCsPool: 0, companiesOnboarded: 0,
    jdsAnnounced: 0, openPositions: 0, applicationsShared: 0, transitions: 0,
  },
  row2: {
    active: 0, hold: 0, inProcess: 0, yetToStart: 0, closedDrives: 0,
    learnerNotApplied: 0, notDeliverable: 0,
  },
};

/** Job Opportunities block — Control Tower tab, or standalone page */
export function JobOpportunitiesSection({
  embedded = false,
  hideHeading = false,
  showAdminOverview = true,
  showMomAnalysis = true,
}) {
  const [filterOpts, setFilterOpts] = useState({ segments: [], quarters: [], months: [], crManagers: [] });
  const [filters, setFilters] = useState({
    segment: '',
    quarter: '',
    month: '',
    crManager: '',
    search: '',
  });
  const [appliedSearch, setAppliedSearch] = useState('');
  const [overview, setOverview] = useState(null);
  const [crData, setCrData] = useState(null);
  const [momRows, setMomRows] = useState([]);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingTable, setLoadingTable] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const breakdownCacheEpoch = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setAppliedSearch(filters.search), 400);
    return () => clearTimeout(t);
  }, [filters.search]);

  const queryParams = useMemo(() => {
    const p = {};
    if (filters.segment) p.segment = filters.segment;
    if (filters.quarter) p.quarter = filters.quarter;
    if (filters.month) p.month = filters.month;
    if (filters.crManager) p.crManager = filters.crManager;
    if (appliedSearch) p.search = appliedSearch;
    return p;
  }, [filters.segment, filters.quarter, filters.month, filters.crManager, appliedSearch]);

  const filterCacheKey = JSON.stringify(queryParams);

  useEffect(() => {
    breakdownCacheEpoch.current += 1;
  }, [filterCacheKey]);

  useEffect(() => {
    if (!showMomAnalysis && !showAdminOverview) return undefined;
    fetchJobOpportunitiesFilterOptions().then(setFilterOpts).catch(console.error);
  }, [showMomAnalysis, showAdminOverview]);

  const loadAll = useCallback(async () => {
    setLoadingOverview(true);
    if (showMomAnalysis) setLoadingTable(true);
    else setLoadingTable(false);
    setLoadError(null);
    try {
      const requests = [fetchJobOpportunitiesOverview(queryParams)];
      if (showAdminOverview) requests.push(fetchCrManagers(queryParams));
      if (showMomAnalysis) requests.push(fetchMomTable(queryParams));

      const results = await Promise.all(requests);
      let i = 0;
      const ov = results[i++];
      setOverview(ov?.row1 ? ov : EMPTY_OVERVIEW);
      if (showAdminOverview) {
        setCrData(results[i++] || { jdsPunched: 0, managers: [] });
      } else {
        setCrData({ jdsPunched: 0, managers: [] });
      }
      if (showMomAnalysis) {
        setMomRows(results[i++]?.rows || []);
      } else {
        setMomRows([]);
      }
    } catch (e) {
      console.error('Job opportunities load error:', e);
      setLoadError(
        e?.response?.data?.error
        || e?.message
        || 'Could not load dashboard data. Restart the backend server and ensure you are logged in as Admin.',
      );
      setOverview(EMPTY_OVERVIEW);
      setCrData({ jdsPunched: 0, managers: [] });
      setMomRows([]);
    } finally {
      setLoadingOverview(false);
      setLoadingTable(false);
    }
  }, [queryParams, showAdminOverview, showMomAnalysis]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const loadBreakdown = useCallback(
    async (cardKey) => {
      const epoch = breakdownCacheEpoch.current;
      const data = await fetchCardBreakdown(cardKey, queryParams);
      if (epoch !== breakdownCacheEpoch.current) throw new Error('stale');
      return data;
    },
    [queryParams],
  );

  const r1 = overview?.row1 || EMPTY_OVERVIEW.row1;
  const r2 = overview?.row2 || EMPTY_OVERVIEW.row2;

  const exportCsv = () => {
    const headers = [
      'Admin', 'Segment', 'Goal', 'Closed Drives', 'Achieved %',
      'Companies', 'Jobs', 'Transitions', 'Yet To Start', 'Hold', 'In Process', 'Not Applied', 'Not Deliverable',
    ];
    const lines = momRows.map((row) => [
      row.crManager, row.segment, row.goal, row.closedDrives, row.achievedGoalPct,
      row.companies, row.jobs, row.transitions, row.yetToStart, row.hold, row.inProcess, row.notApplied, row.notDeliverable,
    ]);
    const csv = [headers, ...lines].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `job-opportunities-mom-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const groupedMom = useMemo(() => {
    const map = new Map();
    momRows.forEach((row) => {
      if (!map.has(row.crManager)) map.set(row.crManager, []);
      map.get(row.crManager).push(row);
    });
    return map;
  }, [momRows]);

  const content = (
    <>
        {!hideHeading && !embedded && (
          <header>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Job Opportunities</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Track your institute&apos;s activity &amp; performance at a glance
            </p>
          </header>
        )}

        {!hideHeading && embedded && (
          <div>
            <h2 className="text-base font-semibold text-slate-900">Job Opportunities</h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Track your institute&apos;s activity &amp; performance at a glance
            </p>
          </div>
        )}

        {loadError && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex flex-wrap items-center justify-between gap-2">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={loadAll}
              className="px-3 py-1.5 bg-amber-800 text-white rounded-md text-xs font-medium hover:bg-amber-900"
            >
              Retry
            </button>
          </div>
        )}

        {/* Overview */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-visible">
          <SectionBar title="Overview" />
          <div className="space-y-2.5 min-h-[200px] p-4 bg-slate-50">
            {loadingOverview ? (
              <>
                <SkeletonFunnelRow count={5} />
                <SkeletonFunnelRow count={6} />
              </>
            ) : (
            <>
            <div className="flex flex-wrap gap-2.5">
              <HoverStatCard
                embedded={embedded}
                overviewStyle
                tone="neutral"
                key={`cs-pool-${filterCacheKey}`}
                label="Total CS Pool"
                value={r1.totalCsPool}
                cardKey="total_cs_pool"
                loadBreakdown={loadBreakdown}
              />
              <StaticStatCard label="Companies Onboarded" value={r1.companiesOnboarded} tone="good" />
              <HoverStatCard
                embedded={embedded}
                overviewStyle
                tone={(r1.transitions ?? 0) > 0 ? 'good' : 'warn'}
                key={`trans-${filterCacheKey}`}
                label="Transitions"
                value={r1.transitions}
                cardKey="transitions"
                loadBreakdown={loadBreakdown}
              />
              <HoverStatCard
                embedded={embedded}
                overviewStyle
                tone={(r1.applicationsShared ?? 0) > 0 ? 'good' : 'warn'}
                popoverAlign="end"
                key={`apps-${filterCacheKey}`}
                label="Applications Shared"
                value={r1.applicationsShared}
                cardKey="applications_shared"
                loadBreakdown={loadBreakdown}
              />
              <StaticStatCard label="JDs Announced" value={r1.jdsAnnounced} tone="good" />
            </div>
            <div className="flex flex-wrap gap-2.5">
              <StaticStatCard label="Hold" value={r2.hold} />
              <StaticStatCard label="In Process" value={r2.inProcess} />
              <StaticStatCard label="Yet to Start" value={r2.yetToStart} />
              <HoverStatCard
                embedded={embedded}
                overviewStyle
                tone="neutral"
                key={`closed-${filterCacheKey}`}
                label="Closed Drives"
                value={r2.closedDrives}
                cardKey="closed_drives"
                loadBreakdown={loadBreakdown}
              />
              <StaticStatCard label="Learner Not Applied" value={r2.learnerNotApplied} />
              <StaticStatCard label="Not Deliverable" value={r2.notDeliverable} />
            </div>
            </>
            )}
          </div>
        </section>

        {/* Admins overview */}
        {showAdminOverview && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-visible">
          <SectionBar title="Admins Overview" />
          <div className="p-4 bg-slate-50">
            {loadingOverview ? (
              <SkeletonFunnelRow count={4} />
            ) : (
              <div className="flex flex-wrap gap-2.5">
                <CrManagerCard
                  name="JDs Punched"
                  value={crData?.jdsPunched ?? 0}
                  variant="jds"
                />
                {(crData?.managers || []).map((m, i) => (
                  <CrManagerCard
                    key={m.id}
                    name={m.name}
                    value={m.count}
                    breakdown={m.breakdown || []}
                    adminStatusLabel={m.adminStatusLabel}
                    popoverAlign={i >= (crData.managers.length - 2) ? 'end' : 'start'}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
        )}

        {/* MoM Table — SUPER_ADMIN only when gated via showMomAnalysis */}
        {showMomAnalysis && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <SectionBar title="Admin wise MoM Detailed Analysis" />
          <div className="space-y-3 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              <div className="min-w-0 w-full">
                <CustomDropdown
                  label="Select Segments"
                  options={[
                    { value: '', label: 'All Segments' },
                    ...filterOpts.segments.map((s) => ({ value: s, label: s })),
                  ]}
                  value={filters.segment}
                  onChange={(v) => setFilters((f) => ({ ...f, segment: v }))}
                />
              </div>
              <div className="min-w-0 w-full">
                <CustomDropdown
                  label="Select Quarter"
                  options={[
                    { value: '', label: 'All Quarters' },
                    ...(filterOpts.quarters || []).map((q) => ({
                      value: q.id || q.value,
                      label: q.name || q.label,
                    })),
                  ]}
                  value={filters.quarter}
                  onChange={(v) => setFilters((f) => ({ ...f, quarter: v, month: v ? '' : f.month }))}
                />
              </div>
              <div className="min-w-0 w-full">
                <CustomDropdown
                  label="Select Month"
                  options={[
                    { value: '', label: 'All Months' },
                    ...(filterOpts.months || []).map((m) => ({
                      value: m.id || m.value,
                      label: m.name || m.label,
                    })),
                  ]}
                  value={filters.month}
                  onChange={(v) => setFilters((f) => ({ ...f, month: v, quarter: v ? '' : f.quarter }))}
                />
              </div>
              <div className="min-w-0 w-full">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">Search Admin</label>
                  <button
                    type="button"
                    onClick={exportCsv}
                    disabled={!momRows.length}
                    className="p-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40"
                    title="Export CSV"
                  >
                    <Download className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                    className="w-full pl-9 pr-4 py-3 text-sm border-2 border-gray-300 rounded-lg bg-white outline-none hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    placeholder="Search..."
                  />
                </div>
              </div>
            </div>

            {loadingTable ? (
              <SkeletonTableCard rows={8} />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-900">
                      {[
                        'Admin', 'Segment', 'Goal', 'Closed Drives', 'Achieved Goal %',
                        'Companies', 'Jobs', 'Transitions', 'Yet To Start', 'Hold', 'In Process', 'Not Applied', 'Not Deliverable',
                      ].map((h) => (
                        <th key={h} className="px-2 py-2 text-left font-semibold border border-slate-200 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {momRows.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="text-center py-10 text-gray-500 border border-gray-200">
                          No data for selected filters
                        </td>
                      </tr>
                    ) : (
                      [...groupedMom.entries()].map(([manager, rows]) =>
                        rows.map((row, idx) => (
                          <tr key={`${row.crManagerId}-${row.segment}`} className="bg-white hover:bg-sky-50/50">
                            {idx === 0 ? (
                              <td
                                rowSpan={rows.length}
                                className="px-2 py-2 border border-gray-200 font-medium text-gray-900 align-top bg-gray-50/80"
                              >
                                {manager}
                              </td>
                            ) : null}
                            <td className="px-2 py-2 border border-gray-200">{row.segment}</td>
                            <td className="px-2 py-2 border border-gray-200 text-center tabular-nums">{row.goal}</td>
                            <td className="px-2 py-2 border border-gray-200 text-center tabular-nums">
                              {row.closedDrives}
                            </td>
                            <td className="px-2 py-2 border border-gray-200 text-center tabular-nums">{row.achievedGoalPct}%</td>
                            <td className="px-2 py-2 border border-gray-200 text-center tabular-nums">{row.companies}</td>
                            <td className="px-2 py-2 border border-gray-200 text-center tabular-nums">{row.jobs}</td>
                            <td className="px-2 py-2 border border-gray-200 text-center tabular-nums">{row.transitions}</td>
                            <td className="px-2 py-2 border border-gray-200 text-center tabular-nums">{row.yetToStart}</td>
                            <td className="px-2 py-2 border border-gray-200 text-center tabular-nums">{row.hold}</td>
                            <td className="px-2 py-2 border border-gray-200 text-center tabular-nums">{row.inProcess}</td>
                            <td className="px-2 py-2 border border-gray-200 text-center tabular-nums">{row.notApplied}</td>
                            <td className="px-2 py-2 border border-gray-200 text-center tabular-nums">{row.notDeliverable}</td>
                          </tr>
                        )),
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
        )}
    </>
  );

  if (embedded) {
    return <div className="space-y-5 w-full">{content}</div>;
  }

  return (
    <div className="min-h-full bg-[#eef1f4] p-4 md:p-6">
      <div className="max-w-[1680px] mx-auto space-y-5">{content}</div>
    </div>
  );
}

export default function JobOpportunitiesDashboard() {
  const { user, role } = useAuth();
  const isSuperAdmin = (role || user?.role || '').toUpperCase() === 'SUPER_ADMIN';
  return (
    <JobOpportunitiesSection
      embedded={false}
      showAdminOverview={isSuperAdmin}
      showMomAnalysis={isSuperAdmin}
    />
  );
}
