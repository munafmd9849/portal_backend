import React, { useCallback, useEffect, useState } from 'react';
import { SkeletonStatsGrid, SkeletonTable } from '../../../ui/loading';
import { fetchControlTowerAll } from '../../../../services/controlTower';
import ControlTowerFilters from './ControlTowerFilters';
import JobOpportunitiesTab from './tabs/JobOpportunitiesTab';
import StudentsTab from './tabs/StudentsTab';
import CareerServicesTab from './tabs/CareerServicesTab';

const TABS = [
  { id: 'jobOpportunities', label: 'Job Opportunities' },
  { id: 'students', label: 'Students' },
  { id: 'careerServices', label: 'Career Services' },
];

export default function ControlTowerDashboard({ embedded = false }) {
  const [activeTab, setActiveTab] = useState('jobOpportunities');
  const [filters, setFilters] = useState({});
  const [appliedFilters, setAppliedFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payload, setPayload] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchControlTowerAll(appliedFilters);
      setPayload(data);
    } catch (e) {
      console.error('Control Tower load failed', e);
      setError(e?.message || 'Failed to load Control Tower');
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div
      className={`space-y-4 sm:space-y-6 p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-blue-50/30 overflow-x-hidden ${
        embedded ? '' : 'min-h-full'
      }`}
    >
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className={`font-bold text-gray-900 ${embedded ? 'text-lg sm:text-xl' : 'text-xl md:text-2xl'}`}>
            Control Tower
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Institute analytics — Job Opportunities, Students &amp; Career Services
          </p>
        </div>
      </header>

      <ControlTowerFilters
        filterOptions={payload?.filters}
        filters={filters}
        onChange={setFilters}
        onApply={() => setAppliedFilters({ ...filters })}
      />

      <div className="overflow-hidden">
        <div className="flex border-b border-gray-200">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-transparent text-indigo-700 border-b-2 border-indigo-600'
                  : 'bg-transparent text-gray-600 hover:text-indigo-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="pt-4 md:pt-5">
          {loading ? (
            <div className="space-y-4">
              <SkeletonStatsGrid count={4} />
              <SkeletonTable rows={8} columns={6} />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {error}
              <button type="button" onClick={load} className="ml-3 underline font-medium">Retry</button>
            </div>
          ) : (
            <>
              {activeTab === 'jobOpportunities' && (
                <JobOpportunitiesTab data={payload?.jobOpportunities} />
              )}
              {activeTab === 'students' && (
                <StudentsTab data={payload?.students} />
              )}
              {activeTab === 'careerServices' && (
                <CareerServicesTab data={payload?.careerServices} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
