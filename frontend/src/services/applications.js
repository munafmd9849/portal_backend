/**
 * Applications Service - API Implementation
 * Replaces Firebase Firestore operations with backend API calls
 */

import api from './api.js';

/**
 * Get student applications
 */
export const getStudentApplications = async (studentId) => {
  try {
    const applications = await api.getStudentApplications();
    return applications || [];
  } catch (error) {
    console.error('getStudentApplications error:', error);
    throw error;
  }
};

/**
 * Apply to job
 */
export const applyToJob = async (studentId, jobId, applicationData = {}) => {
  try {
    const application = await api.applyToJob(jobId);
    return application;
  } catch (error) {
    console.error('applyToJob error:', error);
    throw error;
  }
};

/**
 * Update application status (admin/recruiter only)
 */
export const updateApplicationStatus = async (applicationId, status, interviewDate) => {
  try {
    const application = await api.updateApplicationStatus(applicationId, status, interviewDate);
    return application;
  } catch (error) {
    console.error('updateApplicationStatus error:', error);
    throw error;
  }
};

/**
 * Get single application by ID
 */
export const getApplication = async (applicationId) => {
  try {
    // TODO: Backend needs GET /api/applications/:applicationId endpoint
    console.warn('getApplication: Backend endpoint needed');
    return null;
  } catch (error) {
    console.error('getApplication error:', error);
    throw error;
  }
};

/**
 * Subscribe to student applications (replaced with load-once pattern)
 * For real-time updates, use Socket.IO instead
 * This function now returns an empty unsubscribe for backward compatibility
 */
export const subscribeStudentApplications = (studentId, callback) => {
  // Load applications once instead of real-time subscription
  (async () => {
    try {
      const applications = await getStudentApplications(studentId);
      callback(applications);
    } catch (error) {
      console.error('subscribeStudentApplications error:', error);
      callback([]);
    }
  })();
  
  // Return empty unsubscribe function for backward compatibility
  return () => {};
};

/**
 * Subscribe to applications (alias)
 */
export const subscribeToApplications = subscribeStudentApplications;
