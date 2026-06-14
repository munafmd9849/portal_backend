/**
 * Derived drive lifecycle phase for ops dashboards and job cards.
 */

export function computeDrivePhase(job = {}, context = {}) {
  const now = Date.now();
  const session = context.session || job.interviewSession || null;
  const screeningFinalized = Boolean(
    context.screeningFinalized
    || job.screeningSession?.finalizedAt
    || job.recruiterScreeningFinalized,
  );

  if (job.resultsDeclaredAt || job.resultsLocked || session?.resultsDeclaredAt || session?.resultsLocked) {
    return 'RESULTS_DECLARED';
  }

  if (session?.status === 'ONGOING') return 'INTERVIEWS_LIVE';
  if (session?.status === 'COMPLETED') return 'INTERVIEWS_COMPLETED';
  if (session?.status === 'INCOMPLETE') return 'INTERVIEWS_INCOMPLETE';

  if (screeningFinalized && (job.requiresScreening || job.requiresTest)) {
    return 'SCREENING';
  }

  const deadline = job.applicationDeadline ? new Date(job.applicationDeadline).getTime() : null;
  if (deadline && now > deadline) return 'APPLICATIONS_CLOSED';

  if (job.isPosted || job.status === 'POSTED') return 'APPLICATIONS_OPEN';
  if (job.status === 'IN_REVIEW') return 'IN_REVIEW';
  if (job.status === 'REJECTED') return 'REJECTED';
  if (job.status === 'ARCHIVED') return 'ARCHIVED';

  return 'DRAFT';
}

export const DRIVE_PHASE_LABELS = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In review',
  APPLICATIONS_OPEN: 'Applications open',
  APPLICATIONS_CLOSED: 'Applications closed',
  SCREENING: 'Screening in progress',
  INTERVIEWS_LIVE: 'Interviews live',
  INTERVIEWS_COMPLETED: 'Interviews completed',
  INTERVIEWS_INCOMPLETE: 'Interviews incomplete',
  RESULTS_DECLARED: 'Results declared',
  REJECTED: 'Rejected',
  ARCHIVED: 'Archived',
};

export function getDrivePhaseLabel(phase) {
  return DRIVE_PHASE_LABELS[phase] || phase || 'Unknown';
}
