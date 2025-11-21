/**
 * Job Moderation Service - API Implementation
 * Replaces Firebase Firestore operations with backend API calls
 */

import api from './api.js';

// Placeholder functions - will be replaced with API calls
export function subscribeJobsWithDetails(onChange, filters = {}) {
  // TODO: Replace with Socket.IO subscription or API polling
  // For now, load jobs once
  (async () => {
    try {
      const jobs = await api.getJobs(filters);
      onChange(jobs?.jobs || jobs || []);
    } catch (error) {
      console.error('subscribeJobsWithDetails error:', error);
      onChange([]);
    }
  })();
  
  return () => {}; // Return unsubscribe function
}

export function subscribeJobAnalytics(onChange, filters = {}) {
  // TODO: Replace with Socket.IO subscription or API polling
  console.warn('subscribeJobAnalytics: Placeholder - needs API/Socket.IO implementation');
  // For now, return empty analytics
  onChange({});
  return () => {}; // Return unsubscribe function
}

export async function approveJob(jobId, user = null) {
  try {
    // Use API endpoint for job approval
    const result = await api.approveJob?.(jobId) || await api.updateJob(jobId, { status: 'POSTED', isPosted: true });
    return { success: true, jobId, ...result };
  } catch (error) {
    console.error('approveJob error:', error);
    throw error;
  }
}

export async function rejectJob(jobId, reason, user = null) {
  try {
    // Use API endpoint for job rejection
    const result = await api.rejectJob?.(jobId, { reason }) || await api.updateJob(jobId, { status: 'REJECTED' });
    return { success: true, jobId, ...result };
  } catch (error) {
    console.error('rejectJob error:', error);
    throw error;
  }
}

export async function archiveJob(jobId, user = null) {
  try {
    // Archive job by setting status to ARCHIVED
    const result = await api.updateJob(jobId, { status: 'ARCHIVED', isActive: false });
    return { success: true, jobId, ...result };
  } catch (error) {
    console.error('archiveJob error:', error);
    throw error;
  }
}

export async function getJobWithDetails(jobId) {
  try {
    const job = await api.getJob(jobId);
    return job;
  } catch (error) {
    console.error('getJobWithDetails error:', error);
    throw error;
  }
}

export async function getCompaniesForDropdown() {
  try {
    // TODO: Replace with API call to get companies list
    console.warn('getCompaniesForDropdown: Placeholder - needs API implementation');
    // For now, return empty array
    return [];
  } catch (error) {
    console.error('getCompaniesForDropdown error:', error);
    return [];
  }
}

export async function getRecruitersForDropdown() {
  try {
    // TODO: Replace with API call to get recruiters list
    console.warn('getRecruitersForDropdown: Placeholder - needs API implementation');
    // For now, return empty array
    return [];
  } catch (error) {
    console.error('getRecruitersForDropdown error:', error);
    return [];
  }
}

export async function autoArchiveExpiredJobs(user = null) {
  try {
    // TODO: Replace with API call or backend cron job
    console.warn('autoArchiveExpiredJobs: Placeholder - needs API implementation');
    // This should be handled by backend cron job, not frontend
    // For now, return success with 0 archived (backend should handle this)
    return { success: true, successful: 0, archived: 0 };
  } catch (error) {
    console.error('autoArchiveExpiredJobs error:', error);
    return { success: false, successful: 0, archived: 0 };
  }
}
