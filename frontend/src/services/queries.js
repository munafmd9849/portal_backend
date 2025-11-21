/**
 * Queries Service - PLACEHOLDER
 * TODO: Replace all functions with API calls to backend
 * This file previously used Firebase Firestore operations
 */

// Query types
export const QUERY_TYPES = {
  QUESTION: 'question',
  CGPA_UPDATE: 'cgpa',
  CALENDAR_BLOCK: 'calendar'
};

// Query status
export const QUERY_STATUS = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  RESOLVED: 'resolved',
  REJECTED: 'rejected'
};

// Placeholder functions - will be replaced with API calls
export async function submitQuery(userId, queryData) {
  // TODO: Replace with API call
  console.warn('submitQuery: Placeholder - needs API implementation');
  return { referenceId: `STU${Math.floor(1000 + Math.random() * 9000)}` };
}

export function generateReferenceId() {
  return `STU${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function getQueriesByUser(userId) {
  // TODO: Replace with API call
  console.warn('getQueriesByUser: Placeholder - needs API implementation');
  return [];
}

export async function uploadQueryAttachment(file) {
  // TODO: Replace with API call for file upload
  console.warn('uploadQueryAttachment: Placeholder - needs API implementation');
  return null;
}

// Export all other functions as placeholders
export async function subscribeToQueries(userId, callback) {
  // TODO: Replace with Socket.IO subscription
  console.warn('subscribeToQueries: Placeholder - needs Socket.IO implementation');
  return () => {}; // Return unsubscribe function
}
