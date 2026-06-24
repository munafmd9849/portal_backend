import React from 'react';
import MetricCard, { SectionHeader, SectionBody } from '../shared/MetricCard';
import FunnelBar from '../shared/FunnelBar';

export default function CareerServicesTab({ data }) {
  if (!data || data.blocked) {
    return <p className="text-sm text-gray-500 p-4">No data for your scope.</p>;
  }

  const km = data.keyMetrics || {};
  const funnel = data.funnel || [];

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-md border border-[#b0c9db] shadow-sm overflow-hidden">
        <SectionHeader title="Key Metrics" />
        <SectionBody>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            <MetricCard label="Program Pool" value={km.programPool} />
            <MetricCard label="ET Eligible" value={km.etEligible} />
            <MetricCard label="ET Attempted" value={km.etAttempted} variant="blue" />
            <MetricCard label="ET Cleared" value={km.etCleared} variant="green" />
            <MetricCard label="ET Failed" value={km.etFailed} variant="amber" />
            <MetricCard label="ET Pass Rate" value={`${km.etPassRate ?? 0}%`} />
            <MetricCard label="Placement Rate" value={`${km.placementRate ?? 0}%`} variant="green" />
            <MetricCard label="Profile Completion" value={`${km.profileCompletionRate ?? 0}%`} />
            <MetricCard label="Resume Verification" value={`${km.resumeVerificationRate ?? 0}%`} />
            <MetricCard label="Mock Completion" value={km.mockCompletion} />
            <MetricCard label="Mock Avg Score" value={`${km.mockAvgScore ?? 0}%`} />
            <MetricCard label="Mock Eligible" value={km.mockEligible} />
            <MetricCard label="0–3 Months" value={km.tenure0to3} />
            <MetricCard label="3–6 Months" value={km.tenure3to6} />
            <MetricCard label="6 Months & Above" value={km.tenure6plus} />
          </div>
        </SectionBody>
      </section>

      <section className="bg-white rounded-md border border-[#b0c9db] shadow-sm overflow-hidden">
        <SectionHeader title="CS Journey Funnel" />
        <SectionBody>
          <FunnelBar steps={funnel} />
        </SectionBody>
      </section>
    </div>
  );
}
