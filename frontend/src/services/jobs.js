/**
 * Jobs Service - API Implementation
 * Replaces Firebase Firestore operations with backend API calls
 */

import api from './api.js';

/**
 * List jobs with filters
 */
export async function listJobs({ limitTo = 50, recruiterId, status } = {}) {
  try {
    const params = {};
    if (limitTo) params.limit = limitTo;
    if (recruiterId) params.recruiterId = recruiterId;
    if (status) params.status = status;
    
    const jobs = await api.getJobs(params);
    return jobs || [];
  } catch (error) {
    console.error('listJobs error:', error);
    throw error;
  }
}

/**
 * Get single job by ID
 */
export async function getJob(jobId) {
  try {
    const job = await api.getJob(jobId);
    return job;
  } catch (error) {
    console.error('getJob error:', error);
    throw error;
  }
}

/**
 * Get job details (alias for getJob)
 */
export async function getJobDetails(jobId) {
  return getJob(jobId);
}

/**
 * Create new job
 */
export async function createJob(recruiterId, jobData) {
  try {
    const job = await api.createJob(jobData);
    return job;
  } catch (error) {
    console.error('createJob error:', error);
    throw error;
  }
}

/**
 * Update existing job
 */
export async function updateJob(jobId, jobData) {
  try {
    const job = await api.updateJob(jobId, jobData);
    return job;
  } catch (error) {
    console.error('updateJob error:', error);
    throw error;
  }
}

/**
 * Delete job
 */
export async function deleteJob(jobId) {
  try {
    await api.deleteJob(jobId);
    return { success: true };
  } catch (error) {
    console.error('deleteJob error:', error);
    throw error;
  }
}

/**
 * Get targeted jobs for student
 * Replaces real-time subscription with one-time API call
 */
export async function getTargetedJobsForStudent(studentId) {
  try {
    const jobs = await api.getTargetedJobs();
    return jobs || [];
  } catch (error) {
    console.error('getTargetedJobsForStudent error:', error);
    throw error;
  }
}

/**
 * Subscribe to jobs (replaced with load-once pattern)
 * For real-time updates, use Socket.IO instead
 * This function now returns an empty unsubscribe for backward compatibility
 */
export function subscribeJobs(callback, filters = {}) {
  // Load jobs once instead of real-time subscription
  (async () => {
    try {
      const jobs = await listJobs(filters);
      callback(jobs);
    } catch (error) {
      console.error('subscribeJobs error:', error);
      callback([]);
    }
  })();
  
  // Return empty unsubscribe function for backward compatibility
  return () => {};
}

/**
 * Subscribe to posted jobs (replaced with load-once pattern)
 */
export function subscribePostedJobs(callback, filters = {}) {
  // Load posted jobs once
  (async () => {
    try {
      const jobs = await listJobs({ ...filters, status: 'POSTED' });
      callback(jobs);
    } catch (error) {
      console.error('subscribePostedJobs error:', error);
      callback([]);
    }
  })();
  
  // Return empty unsubscribe function for backward compatibility
  return () => {};
}

/**
 * Save job as draft
 * TODO: Replace with API call - save to local storage or backend
 */
export async function saveJobDraft(jobData) {
  // TODO: Replace with API call or localStorage for draft saving
  console.warn('saveJobDraft: Placeholder - needs API implementation');
  // For now, save to localStorage
  try {
    const drafts = JSON.parse(localStorage.getItem('jobDrafts') || '[]');
    drafts.push({ ...jobData, draftId: Date.now().toString(), createdAt: new Date().toISOString() });
    localStorage.setItem('jobDrafts', JSON.stringify(drafts));
    return { success: true, draftId: drafts[drafts.length - 1].draftId };
  } catch (error) {
    console.error('saveJobDraft error:', error);
    throw error;
  }
}

/**
 * Add another position draft (save current and prepare new form)
 * TODO: Replace with API call
 */
export async function addAnotherPositionDraft(jobData) {
  // TODO: Replace with API call
  console.warn('addAnotherPositionDraft: Placeholder - needs API implementation');
  // Save current position and return autofill data for next form
  try {
    await saveJobDraft(jobData);
    // Return autofill data (company info to prefill in next form)
    return {
      autofill: {
        company: jobData.company || '',
        website: jobData.website || '',
        linkedin: jobData.linkedin || '',
        companyLocation: jobData.companyLocation || '',
        spocs: jobData.spocs || [],
        serviceAgreement: jobData.serviceAgreement || '',
        baseRoundDetails: jobData.baseRoundDetails || ['', '', ''],
        extraRounds: jobData.extraRounds || [],
      },
    };
  } catch (error) {
    console.error('addAnotherPositionDraft error:', error);
    throw error;
  }
}

/**
 * Post job (admin only - directly posts without review)
 * Posts an existing job (jobId required)
 */
export async function postJob(jobId, targeting = {}) {
  try {
    const result = await api.postJob(jobId, targeting);
    return { success: true, jobId, ...result };
  } catch (error) {
    console.error('postJob error:', error);
    throw error;
  }
}

/**
 * Submit job for review (recruiter/admin - creates job in IN_REVIEW status)
 * Creates a new job that will be reviewed by admin
 */
export async function submitJobForReview(jobData) {
  try {
    // Create job - backend will set status to IN_REVIEW for non-admin users
    const job = await createJob(null, jobData);
    return { success: true, jobId: job.id };
  } catch (error) {
    console.error('submitJobForReview error:', error);
    throw error;
  }
}
