import React from 'react';
import MetricCard, { SectionHeader, SectionBody } from '../shared/MetricCard';

export default function JobOpportunitiesTab({ data }) {
  if (!data || data.blocked) {
    return <p className="text-sm text-gray-500 p-4">No data for your scope.</p>;
  }

  const r1 = data.overview?.row1 || {};
  const r2 = data.overview?.row2 || {};

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <SectionHeader title="Overview — Track Your Institute's Activity & Performance at a Glance" />
        <SectionBody className="space-y-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            <MetricCard label="Total CS Pool" value={r1.totalCsPool} variant="blue" />
            <MetricCard label="Active CS Pool" value={r1.activeCsPool} variant="blue" />
            <MetricCard label="Inactive CS Pool" value={r1.inactiveCsPool} variant="blue" />
            <MetricCard label="Companies Onboarded" value={r1.companiesOnboarded} variant="green" />
            <MetricCard label="JDs Announced" value={r1.jdsAnnounced} variant="green" />
            <MetricCard label="Open Positions" value={r1.openPositions} variant="blue" />
            <MetricCard label="Applications Shared" value={r1.applicationsShared} variant="blue" />
            <MetricCard label="Transitions" value={r1.transitions} variant="green" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            <MetricCard label="Active" value={r2.active} variant="blue" />
            <MetricCard label="Hold" value={r2.hold} variant="amber" />
            <MetricCard label="In Process" value={r2.inProcess} variant="blue" />
            <MetricCard label="Yet to Start" value={r2.yetToStart} variant="amber" />
            <MetricCard label="Closed Drives" value={r2.closedDrives} variant="default" />
            <MetricCard label="Learner Not Applied" value={r2.learnerNotApplied} variant="amber" />
            <MetricCard label="Not Deliverable" value={r2.notDeliverable} variant="amber" />
          </div>
        </SectionBody>
      </section>
    </div>
  );
}
