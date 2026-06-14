import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import HoverStatCard from './HoverStatCard';
import CrManagerCard from './CrManagerCard';
import {
  fetchJobOpportunitiesOverview,
  fetchCardBreakdown,
  fetchCrManagers,
} from '../../../services/jobOpportunities';

function SectionBar({ title }) {
  return (
    <div className="bg-[#c5d9e8] px-4 py-2 rounded-t-md border border-[#b0c9db] border-b-0">
      <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
    </div>
  );
}

const METRIC_TONES = {
  good: { card: 'bg-emerald-50 border-emerald-200', value: 'text-emerald-800' },
  bad: { card: 'bg-red-50 border-red-200', value: 'text-red-800' },
  warn: { card: 'bg-amber-50 border-amber-200', value: 'text-amber-800' },
  neutral: { card: 'bg-sky-50 border-sky-200', value: 'text-slate-800' },
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
    <div className={`rounded-md px-3 py-3 min-h-[88px] min-w-[110px] flex-1 border-2 shadow-sm flex flex-col justify-center ${styles.card}`}>
      <p className="text-xs text-gray-700 font-medium leading-tight">{label}</p>
      <p className={`text-2xl sm:text-3xl font-bold tabular-nums mt-1 ${styles.value}`}>{value ?? 0}</p>
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

/** Job Opportunities block — use embedded on Admin Dashboard or standalone page */
export function JobOpportunitiesSection({ embedded = false, showAdminOverview = true }) {
  const [overview, setOverview] = useState(null);
  const [crData, setCrData] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const breakdownCacheEpoch = useRef(0);
  const filterCacheKey = '{}';

  const loadAll = useCallback(async () => {
    setLoadingOverview(true);
    setLoadError(null);
    try {
      const [ov, cr] = await Promise.all([
        fetchJobOpportunitiesOverview({}),
        fetchCrManagers({}),
      ]);
      setOverview(ov?.row1 ? ov : EMPTY_OVERVIEW);
      setCrData(cr || { jdsPunched: 0, managers: [] });
    } catch (e) {
      console.error('Job opportunities load error:', e);
      setLoadError(
        e?.response?.data?.error
        || e?.message
        || 'Could not load dashboard data. Restart the backend server and ensure you are logged in as Admin.',
      );
      setOverview(EMPTY_OVERVIEW);
      setCrData({ jdsPunched: 0, managers: [] });
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const loadBreakdown = useCallback(async (cardKey) => {
    const epoch = breakdownCacheEpoch.current;
    const data = await fetchCardBreakdown(cardKey, {});
    if (epoch !== breakdownCacheEpoch.current) throw new Error('stale');
    return data;
  }, []);

  const r1 = overview?.row1 || EMPTY_OVERVIEW.row1;
  const r2 = overview?.row2 || EMPTY_OVERVIEW.row2;

  const content = (
    <>
        {!embedded && (
          <header>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Job Opportunities</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Track Your Institute&apos;s Activity &amp; Performance at Glance
            </p>
          </header>
        )}

        {embedded && (
          <div className="relative">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Job Opportunities</h2>
            <p className="text-sm text-gray-500 mt-0.5">Track your institute&apos;s activity &amp; performance at a glance</p>
            <div className="absolute -bottom-1 left-0 w-32 h-0.5 bg-gradient-to-r from-blue-500 to-transparent" />
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
        <section className="bg-white rounded-md border border-[#b0c9db] shadow-sm overflow-visible">
          <SectionBar title="Overview" />
          <div className="relative space-y-2.5 min-h-[200px] p-3 bg-[#eef4fa] border border-[#b0c9db] border-t-0 rounded-b-md">
            {loadingOverview && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-b-md bg-[#eef4fa]/80">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}
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
          </div>
        </section>

        {/* Admins overview */}
        {showAdminOverview && (
        <section className="bg-white rounded-md border border-[#b0c9db] shadow-sm overflow-visible">
          <SectionBar title="Admins Overview" />
          <div className="p-3 bg-[#eef4fa] border border-[#b0c9db] border-t-0 rounded-b-md">
            {loadingOverview ? (
              <Loader2 className="w-6 h-6 animate-spin mx-auto my-6 text-blue-600" />
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
  return <JobOpportunitiesSection embedded={false} />;
}
