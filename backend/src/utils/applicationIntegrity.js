/**
 * Application Integrity Utilities
 * Ensures consistent state transitions and data protection
 */

export const APPLICATION_STATUS = {
  APPLIED: 'APPLIED',
  SHORTLISTED: 'SHORTLISTED',
  REJECTED: 'REJECTED',
  SELECTED: 'SELECTED',
  OFFERED: 'OFFERED',
  ACCEPTED: 'ACCEPTED',
  OFFER_DECLINED: 'OFFER_DECLINED',
  JOINED: 'JOINED',
  WITHDRAWN: 'WITHDRAWN',
  REVOKED_BY_ADMIN: 'REVOKED_BY_ADMIN',
};

/** Allowed direct status transitions in the placement pipeline. */
const STATUS_TRANSITIONS = {
  [APPLICATION_STATUS.APPLIED]: new Set([
    APPLICATION_STATUS.SHORTLISTED,
    APPLICATION_STATUS.REJECTED,
  ]),
  [APPLICATION_STATUS.SHORTLISTED]: new Set([
    APPLICATION_STATUS.INTERVIEWED,
    APPLICATION_STATUS.SELECTED,
    APPLICATION_STATUS.REJECTED,
  ]),
  [APPLICATION_STATUS.INTERVIEWED]: new Set([
    APPLICATION_STATUS.SELECTED,
    APPLICATION_STATUS.OFFERED,
    APPLICATION_STATUS.REJECTED,
  ]),
  [APPLICATION_STATUS.SELECTED]: new Set([
    APPLICATION_STATUS.OFFERED,
    APPLICATION_STATUS.REJECTED,
  ]),
  [APPLICATION_STATUS.OFFERED]: new Set([
    APPLICATION_STATUS.ACCEPTED,
    APPLICATION_STATUS.OFFER_DECLINED,
    APPLICATION_STATUS.REJECTED,
  ]),
  [APPLICATION_STATUS.ACCEPTED]: new Set([
    APPLICATION_STATUS.JOINED,
    APPLICATION_STATUS.OFFER_DECLINED,
  ]),
  [APPLICATION_STATUS.OFFER_DECLINED]: new Set([]),
  [APPLICATION_STATUS.JOINED]: new Set([]),
  [APPLICATION_STATUS.REJECTED]: new Set([]),
};

/**
 * Validates if an application can move from currentStatus to nextStatus
 * @param {string} currentStatus - Current status in DB
 * @param {string} nextStatus - Requested new status
 * @returns {boolean} - True if valid, throws error otherwise
 */
export function validateApplicationStateTransition(currentStatus, nextStatus) {
  const from = String(currentStatus || APPLICATION_STATUS.APPLIED).toUpperCase();
  const to = String(nextStatus || '').toUpperCase();

  if (from === to) return true;

  if (from === APPLICATION_STATUS.REVOKED_BY_ADMIN) {
    throw new Error('Applications revoked by admin cannot be updated. Restore them first.');
  }

  if (from === APPLICATION_STATUS.WITHDRAWN) {
    throw new Error('Withdrawn applications cannot be updated through this endpoint.');
  }

  const allowed = STATUS_TRANSITIONS[from];
  if (!allowed || !allowed.has(to)) {
    throw new Error(`Invalid status transition: ${from} → ${to}`);
  }

  return true;
}
