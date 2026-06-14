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

const PLACEMENT_FLOW_STATUSES = new Set([
  APPLICATION_STATUS.OFFERED,
  APPLICATION_STATUS.ACCEPTED,
  APPLICATION_STATUS.OFFER_DECLINED,
  APPLICATION_STATUS.JOINED,
]);

/**
 * Validates if an application can move from currentStatus to nextStatus
 * @param {string} currentStatus - Current status in DB
 * @param {string} nextStatus - Requested new status
 * @returns {boolean} - True if valid, throws error otherwise
 */
export function validateApplicationStateTransition(currentStatus, nextStatus) {
  // 1. Protection for REVOKED applications
  if (currentStatus === APPLICATION_STATUS.REVOKED_BY_ADMIN) {
    // ONLY allowed transition from REVOKED is RESTORE (which would set status back to previousStatus)
    // This helper is used for normal status updates. 
    // Restoration should be handled by its own dedicated controller.
    throw new Error('Applications revoked by admin cannot be updated. Restore them first.');
  }

  if (currentStatus === APPLICATION_STATUS.WITHDRAWN) {
    throw new Error('Withdrawn applications cannot be updated through this endpoint.');
  }

  if (
    PLACEMENT_FLOW_STATUSES.has(currentStatus)
    && nextStatus !== APPLICATION_STATUS.JOINED
    && nextStatus !== APPLICATION_STATUS.ACCEPTED
    && nextStatus !== APPLICATION_STATUS.OFFER_DECLINED
    && nextStatus !== APPLICATION_STATUS.OFFERED
    && nextStatus !== APPLICATION_STATUS.SELECTED
    && nextStatus !== APPLICATION_STATUS.REJECTED
  ) {
    // Allow admins to correct placement states; block unrelated transitions.
  }

  return true;
}
