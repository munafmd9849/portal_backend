/**
 * Admin Dashboard Service
 * Handles admin dashboard data fetching and real-time subscriptions
 * Replaces Firebase Firestore operations with API calls
 */

import api from './api.js';

/**
 * Admin Dashboard Service Class
 */
export class AdminDashboardService {
  constructor() {
    this.subscribers = [];
    this.pollingIntervals = new Map(); // Track polling intervals per subscription
    this.cachedData = {
      stats: {
        totalJobsPosted: 0,
        activeRecruiters: 0,
        activeStudents: 0,
        pendingQueries: 0,
        totalApplications: 0,
        placedStudents: 0
      },
      chartData: {
        placementTrend: [],
        recruiterActivity: [],
        applicationStatus: []
      }
    };
  }

  /**
   * Fetch dashboard data from API
   * @param {Object} filters - Filter options (campus, school, batch, etc.)
   * @returns {Promise<Object>} Dashboard data with stats and chartData
   */
  async fetchData(filters = {}) {
    try {
      // Build query params from filters
      const params = new URLSearchParams();
      if (filters.campus && filters.campus.length > 0) {
        params.append('campus', filters.campus.join(','));
      }
      if (filters.school && filters.school.length > 0) {
        params.append('school', filters.school.join(','));
      }
      if (filters.batch && filters.batch.length > 0) {
        params.append('batch', filters.batch.join(','));
      }

      const queryString = params.toString();
      const endpoint = queryString 
        ? `/admin/dashboard?${queryString}`
        : '/admin/dashboard';

      // For now, aggregate data from existing endpoints
      // TODO: Create dedicated /admin/dashboard endpoint
      // Fetch data from available endpoints
      let jobs = [];
      let students = [];
      let recruiters = [];
      let applications = [];

      try {
        const jobsResponse = await api.getJobs({ limit: 1000 });
        jobs = jobsResponse.jobs || [];
      } catch (error) {
        console.warn('Failed to fetch jobs:', error);
      }

      // Fetch applications (admin endpoint)
      try {
        const applicationsResponse = await api.getAllApplications();
        applications = Array.isArray(applicationsResponse.applications) ? applicationsResponse.applications : (applicationsResponse?.applications || []);
      } catch (error) {
        console.warn('Failed to fetch applications:', error);
      }

      // For students and recruiters, use placeholder data
      // TODO: Replace with actual API calls when endpoints are ready
      // const students = [];
      // const recruiters = [];

      // Calculate stats from available data
      const stats = {
        totalJobsPosted: jobs.length,
        activeRecruiters: 0, // TODO: Fetch recruiters data
        activeStudents: 0, // TODO: Fetch students data
        pendingQueries: 0, // TODO: Add queries endpoint
        totalApplications: applications.length,
        placedStudents: applications.filter(a => a.status === 'ACCEPTED' || a.status === 'OFFERED').length
      };

      // Calculate chart data
      const chartData = {
        placementTrend: this.calculatePlacementTrend(applications),
        recruiterActivity: this.calculateRecruiterActivity([], jobs), // Empty array until recruiters endpoint exists
        applicationStatus: this.calculateApplicationStatus(applications)
      };

      const data = { stats, chartData };
      this.cachedData = data;
      return data;
    } catch (error) {
      console.error('AdminDashboardService.fetchData error:', error);
      // Return cached data on error
      return this.cachedData;
    }
  }

  /**
   * Calculate placement trend data
   */
  calculatePlacementTrend(applications) {
    const last30Days = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const count = applications.filter(a => {
        const appDate = new Date(a.createdAt || a.appliedAt);
        return appDate.toISOString().split('T')[0] === dateStr && 
               (a.status === 'ACCEPTED' || a.status === 'OFFERED');
      }).length;
      
      last30Days.push({ date: dateStr, count });
    }
    
    return last30Days;
  }

  /**
   * Calculate recruiter activity data
   */
  calculateRecruiterActivity(recruiters, jobs) {
    return recruiters.map(recruiter => {
      const recruiterJobs = jobs.filter(j => j.recruiterId === recruiter.id);
      return {
        name: recruiter.user?.displayName || recruiter.user?.email || 'Unknown',
        jobsPosted: recruiterJobs.length,
        applications: 0 // TODO: Count applications for this recruiter's jobs
      };
    }).sort((a, b) => b.jobsPosted - a.jobsPosted).slice(0, 10);
  }

  /**
   * Calculate application status distribution
   */
  calculateApplicationStatus(applications) {
    const statusCounts = {
      PENDING: 0,
      REVIEWED: 0,
      SHORTLISTED: 0,
      INTERVIEWED: 0,
      ACCEPTED: 0,
      REJECTED: 0,
      OFFERED: 0
    };

    applications.forEach(app => {
      const status = app.status || 'PENDING';
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
      } else {
        statusCounts.PENDING++;
      }
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count
    }));
  }

  /**
   * Subscribe to dashboard data updates
   * @param {Function} callback - Callback function that receives data
   * @param {Object} filters - Filter options for the data
   * @returns {Function} Unsubscribe function
   */
  subscribeToDashboardData(callback, filters = {}) {
    if (typeof callback !== 'function') {
      console.error('AdminDashboardService.subscribeToDashboardData: callback must be a function');
      return () => {}; // Return no-op unsubscribe
    }

    // Store subscription info
    const subscriptionId = Date.now() + Math.random();
    this.subscribers.push({ id: subscriptionId, callback, filters });

    // Initial fetch
    this.fetchData(filters).then(data => {
      callback(data);
    });

    // Set up polling (every 30 seconds)
    // TODO: Replace with Socket.IO subscription for real-time updates
    const intervalId = setInterval(async () => {
      const data = await this.fetchData(filters);
      callback(data);
    }, 30000); // Poll every 30 seconds

    this.pollingIntervals.set(subscriptionId, intervalId);

    // Return unsubscribe function
    return () => {
      // Remove from subscribers
      this.subscribers = this.subscribers.filter(sub => sub.id !== subscriptionId);
      
      // Clear polling interval
      if (this.pollingIntervals.has(subscriptionId)) {
        clearInterval(this.pollingIntervals.get(subscriptionId));
        this.pollingIntervals.delete(subscriptionId);
      }
    };
  }

  /**
   * Legacy subscribe method (for backwards compatibility)
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    return this.subscribeToDashboardData(callback, {});
  }

  /**
   * Cleanup all subscriptions and intervals
   */
  cleanup() {
    // Clear all polling intervals
    this.pollingIntervals.forEach(intervalId => {
      clearInterval(intervalId);
    });
    this.pollingIntervals.clear();

    // Clear all subscribers
    this.subscribers = [];
  }
}

// Export singleton instance
export const adminDashboardService = new AdminDashboardService();