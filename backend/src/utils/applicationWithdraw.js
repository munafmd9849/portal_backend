/**
 * Student application withdrawal rules
 */

const BLOCKED_STATUSES = new Set([
  'SELECTED',
  'OFFERED',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
  'REVOKED_BY_ADMIN',
]);

const BLOCKED_SCREENING_ALWAYS = new Set([
  'RESUME_SELECTED',
  'SCREENING_SELECTED',
  'TEST_SELECTED',
  'SCREENING_REJECTED',
  'TEST_REJECTED',
  'REJECTED',
]);

const INTERVIEW_NOT_STARTED = new Set(['', 'APPLIED', 'PENDING']);

function upper(value) {
  return String(value || '').trim().toUpperCase();
}

function jobHasPreInterviewGate(application) {
  const job = application?.job;
  if (!job) return false;
  return Boolean(job.requiresScreening || job.requiresTest);
}

function resolveInterviewStatusCode(application) {
  const raw = application?.interviewStatus;
  if (raw == null || raw === '') return '';
  if (typeof raw === 'string') return upper(raw);
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    if (raw.hasSession) return upper(raw.statusText || raw.code || 'IN_PROGRESS');
    return 'PENDING';
  }
  return upper(raw);
}

function resolveLastRoundReached(application) {
  if ((application?.lastRoundReached || 0) > 0) {
    return application.lastRoundReached;
  }
  const nested = application?.interviewStatus;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested.lastRoundReached || 0;
  }
  return 0;
}

/**
 * @param {object} application - Application row (or subset with status fields)
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function canStudentWithdrawApplication(application) {
  if (!application) {
    return { allowed: false, reason: 'Application not found' };
  }

  const status = upper(application.status);
  if (BLOCKED_STATUSES.has(status)) {
    if (status === 'WITHDRAWN') {
      return { allowed: false, reason: 'Application is already withdrawn' };
    }
    return { allowed: false, reason: 'This application can no longer be withdrawn' };
  }

  const screening = upper(application.screeningStatus);
  if (screening && screening !== 'APPLIED') {
    if (BLOCKED_SCREENING_ALWAYS.has(screening)) {
      return { allowed: false, reason: 'Cannot withdraw after screening or shortlisting has started' };
    }
    if (screening === 'INTERVIEW_ELIGIBLE' && jobHasPreInterviewGate(application)) {
      return { allowed: false, reason: 'Cannot withdraw after screening or shortlisting has started' };
    }
  }

  const interviewStatus = resolveInterviewStatusCode(application);
  if (interviewStatus && !INTERVIEW_NOT_STARTED.has(interviewStatus)) {
    return { allowed: false, reason: 'Cannot withdraw after interview process has started' };
  }

  if (application.interviewDate) {
    return { allowed: false, reason: 'Cannot withdraw after an interview has been scheduled' };
  }

  if (resolveLastRoundReached(application) > 0) {
    return { allowed: false, reason: 'Cannot withdraw after interview rounds have started' };
  }

  return { allowed: true };
}
