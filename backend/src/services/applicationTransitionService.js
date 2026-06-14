/**
 * Validated application state transitions — single write path for placement pipeline.
 */

import {
  validateApplicationStateTransition,
  APPLICATION_STATUS,
} from '../utils/applicationIntegrity.js';

const SCREENING_TRANSITIONS = {
  APPLIED: new Set(['SCREENING_SELECTED', 'SCREENING_REJECTED', 'TEST_SELECTED', 'TEST_REJECTED', 'INTERVIEW_ELIGIBLE']),
  SCREENING_SELECTED: new Set(['TEST_SELECTED', 'TEST_REJECTED', 'INTERVIEW_ELIGIBLE', 'SCREENING_REJECTED']),
  TEST_SELECTED: new Set(['INTERVIEW_ELIGIBLE', 'TEST_REJECTED']),
  TEST_REJECTED: new Set(['SCREENING_SELECTED', 'TEST_SELECTED']),
  SCREENING_REJECTED: new Set([]),
  INTERVIEW_ELIGIBLE: new Set(['TEST_REJECTED', 'SCREENING_REJECTED']),
};

export function validateScreeningTransition(fromStatus, toStatus) {
  const from = String(fromStatus || 'APPLIED').toUpperCase();
  const to = String(toStatus || '').toUpperCase();
  if (from === to) return true;
  const allowed = SCREENING_TRANSITIONS[from];
  if (!allowed || !allowed.has(to)) {
    throw new Error(`Invalid screening transition: ${from} → ${to}`);
  }
  return true;
}

export function validateStatusTransition(fromStatus, toStatus) {
  const from = String(fromStatus || APPLICATION_STATUS.APPLIED).toUpperCase();
  const to = String(toStatus || '').toUpperCase();
  if (from === to) return true;
  validateApplicationStateTransition(from, to);
  return true;
}

export function buildTransitionPatch({ status, screeningStatus, interviewStatus, extra = {} }) {
  const patch = { ...extra };
  if (status != null) patch.status = String(status).toUpperCase();
  if (screeningStatus != null) patch.screeningStatus = String(screeningStatus).toUpperCase();
  if (interviewStatus != null) patch.interviewStatus = String(interviewStatus).toUpperCase();
  return patch;
}

export async function assertTransitionAllowed(application, patch) {
  if (patch.status != null) {
    validateStatusTransition(application.status, patch.status);
  }
  if (patch.screeningStatus != null) {
    validateScreeningTransition(application.screeningStatus, patch.screeningStatus);
  }
}
