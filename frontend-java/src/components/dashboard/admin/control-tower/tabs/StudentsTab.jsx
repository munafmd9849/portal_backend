import React from 'react';
import MetricCard, { SectionHeader, SectionBody } from '../shared/MetricCard';

export default function StudentsTab({ data }) {
  if (!data || data.blocked) {
    return <p className="text-sm text-gray-500 p-4">No data for your scope.</p>;
  }

  const km = data.keyMetrics || {};
  const pr = data.profileReadiness || {};
  const co = data.careerOutcomes || {};
  const academic = data.academicOverview || [];

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <SectionHeader title="Key Metrics" />
        <SectionBody>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            <MetricCard label="Total Students" value={km.totalStudents} />
            <MetricCard label="Total Students Marked as Active" value={km.activeStudents} subValue={`${km.activeRate ?? 0}%`} variant="green" />
            <MetricCard label="Total Invitations Sent" value={km.invitationsSent} subValue="100%" />
            <MetricCard label="Total Invitations Accepted" value={km.invitationsAccepted} subValue={`${km.invitationAcceptanceRate ?? 0}%`} variant="green" />
            <MetricCard label="Invitation Acceptance Rate" value={`${km.invitationAcceptanceRate ?? 0}%`} />
            <MetricCard label="Students NOT Accepted Invite" value={km.invitationsNotAccepted} variant="amber" />
            <MetricCard label="Total Male Students" value={km.maleStudents} subValue={km.totalStudents ? `${Math.round((km.maleStudents / km.totalStudents) * 1000) / 10}%` : '0%'} />
            <MetricCard label="Total Female Students" value={km.femaleStudents} subValue={km.totalStudents ? `${Math.round((km.femaleStudents / km.totalStudents) * 1000) / 10}%` : '0%'} />
            <MetricCard label="Inactive Students" value={km.inactiveStudents} />
          </div>
        </SectionBody>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <SectionHeader title="Profile Readiness Overview" />
        <SectionBody className="space-y-4">
          <MetricCard
            label="Avg. Profile Completion Rate"
            value={`${pr.avgProfileCompletion ?? 0}%`}
            className="max-w-xs"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(pr.brackets || []).map((b) => (
              <MetricCard key={b.label} label={b.label} value={b.count} variant="blue" />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <MetricCard label="Resume Uploaded" value={pr.resumeUploaded} variant="green" />
            <MetricCard label="Profile Picture" value={pr.profilePicture} />
            <MetricCard label="Skills Section" value={pr.skillsSection} />
            <MetricCard label="Having Profile Picture" value={pr.profilePictureMetric} />
          </div>
        </SectionBody>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <SectionHeader title="Internship & Career Outcomes" />
        <SectionBody>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            <MetricCard label="Total Placement" value={co.totalPlacement} variant="green" />
            <MetricCard label="Internship Placed" value={co.internshipPlaced} />
            <MetricCard label="Students with Multiple Internships" value={co.studentsWithMultipleInternships} />
            <MetricCard label="Total Full Time Placed" value={co.totalFullTimePlaced} />
            <MetricCard label="Unique Internship Placed" value={co.uniqueInternshipPlaced} />
            <MetricCard label="Unique Fulltime Placed" value={co.uniqueFulltimePlaced} />
            <MetricCard label="Currently Active Internships" value={co.currentlyActiveInternships} variant="blue" />
            <MetricCard label="Completed Internships" value={co.completedInternships} variant="green" />
            <MetricCard label="Students who Left Midway" value={co.studentsLeftMidway} variant="amber" />
            <MetricCard label="Internship Offers Rejected" value={co.internshipOffersRejected} />
            <MetricCard label="Full Time Offers Rejected" value={co.fullTimeOffersRejected} />
            <MetricCard label="Avg Stipend for Internship" value={co.avgStipendTpm ? `${co.avgStipendTpm} TPM` : '—'} />
            <MetricCard label="Highest Stipend for Internship" value={co.highestStipendTpm ? `${co.highestStipendTpm} TPM` : '—'} />
            <MetricCard label="Total Self Sourced" value={co.totalSelfSourced} />
          </div>
        </SectionBody>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <SectionHeader title="Academic Overview" />
        <SectionBody>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {academic.map((band) => (
              <MetricCard key={band.label} label={band.label} value={band.count} variant="blue" />
            ))}
          </div>
        </SectionBody>
      </section>
    </div>
  );
}
