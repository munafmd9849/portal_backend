import React from 'react';
import { JobOpportunitiesSection } from '../../JobOpportunitiesDashboard';
import { useAuth } from '../../../../../hooks/useAuth';

/**
 * Control Tower → Job Opportunities tab.
 * Single source for the overview (and MoM for super admins) — not duplicated on Admin Home.
 */
export default function JobOpportunitiesTab() {
  const { user, role } = useAuth();
  const isSuperAdmin = (role || user?.role || '').toUpperCase() === 'SUPER_ADMIN';

  return (
    <JobOpportunitiesSection
      embedded
      hideHeading
      showAdminOverview={false}
      showMomAnalysis={isSuperAdmin}
    />
  );
}
