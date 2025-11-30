import React, { useEffect, useState, useMemo } from 'react';
import { 
  subscribeJobsWithDetails, 
  subscribeJobAnalytics,
  approveJob, 
  rejectJob, 
  archiveJob,
  getCompaniesForDropdown,
  getRecruitersForDropdown,
  autoArchiveExpiredJobs
} from '../../../services/jobModeration';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../ui/Toast';
import { 
  FaSearch, 
  FaFilter, 
  FaEye, 
  FaCheck, 
  FaTimes, 
  FaArchive, 
  FaSpinner,
  FaBuilding,
  FaUser,
  FaCalendarAlt,
  FaDollarSign,
  FaMapMarkerAlt,
  FaChevronDown,
  FaChevronUp
} from 'react-icons/fa';

export default function JobPostingsManager() {
  const { user } = useAuth();
  const toast = useToast();
  
  // Core state
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({});
  const [lastSnapshot, setLastSnapshot] = useState(null);
  
  // Filter and search state - default to showing IN_REVIEW jobs (pending approval)
  const [filters, setFilters] = useState({
    status: 'in_review', // Default to showing jobs pending approval
    companyId: '',
    recruiterId: '',
    startDate: '',
    endDate: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Dropdown data
  const [companies, setCompanies] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  
  // Modal state
  const [jobDetailModal, setJobDetailModal] = useState({ isOpen: false, job: null });
  const [rejectModal, setRejectModal] = useState({ isOpen: false, job: null, reason: '' });
  
  // Action loading states
  const [actionLoading, setActionLoading] = useState({});
  
  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load companies and recruiters for dropdowns
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [companiesData, recruitersData] = await Promise.all([
          getCompaniesForDropdown(),
          getRecruitersForDropdown()
        ]);
        setCompanies(companiesData);
        setRecruiters(recruitersData);
      } catch (error) {
        console.error('Error loading dropdown data:', error);
      }
    };

    loadDropdownData();
  }, []);

  // Real-time jobs subscription
  useEffect(() => {
    console.log('📡 Setting up real-time job subscription with filters:', filters);
    setLoading(true);
    
    const filterParams = {
      ...filters,
      limit: 100 // Adjust as needed
    };
    
    const unsubscribe = subscribeJobsWithDetails((jobsData, snapshot) => {
      console.log('📊 Received jobs update:', jobsData.length);
      setJobs(jobsData);
      setLastSnapshot(snapshot);
      setLoading(false);
    }, filterParams);

    return () => {
      console.log('📡 Cleaning up job subscription');
      unsubscribe();
    };
  }, [filters]);

  // Real-time analytics subscription
  useEffect(() => {
    console.log('📈 Setting up analytics subscription');
    
    const unsubscribe = subscribeJobAnalytics((analyticsData) => {
      console.log('📊 Received analytics update:', analyticsData);
      setAnalytics(analyticsData);
    });

    return () => {
      console.log('📈 Cleaning up analytics subscription');
      unsubscribe();
    };
  }, []);

  // Filter and search jobs
  const filteredJobs = useMemo(() => {
    let result = [...jobs];
    
    // Apply search filter
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      result = result.filter(job => 
        job.jobTitle?.toLowerCase().includes(searchLower) ||
        job.company?.toLowerCase().includes(searchLower) ||
        job.companyName?.toLowerCase().includes(searchLower) ||
        job.companyDetails?.name?.toLowerCase().includes(searchLower) ||
        job.recruiter?.name?.toLowerCase().includes(searchLower)
      );
    }
    
    return result;
  }, [jobs, debouncedSearch]);

  // Paginated jobs
  const paginatedJobs = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;
    return filteredJobs.slice(startIndex, endIndex);
  }, [filteredJobs, pagination.currentPage, pagination.itemsPerPage]);

  // Update pagination when filtered jobs change
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      totalItems: filteredJobs.length,
      currentPage: prev.totalItems !== filteredJobs.length ? 1 : prev.currentPage
    }));
  }, [filteredJobs.length]);

  // Handle job moderation actions
  const handleApprove = async (job) => {
    if (!user || user.role !== 'admin') {
      toast.showError('Only admin users can approve jobs');
      return;
    }

    const actionKey = `approve_${job.id}`;
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));
      
      const result = await approveJob(job.id, user);
      
      if (result.success) {
        toast.showSuccess(`Job "${job.jobTitle}" approved successfully!`);
      } else {
        throw new Error('Approval failed');
      }
    } catch (error) {
      console.error('Error approving job:', error);
      toast.showError(`Failed to approve job: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleReject = async (job, reason = '') => {
    if (!user || user.role !== 'admin') {
      toast.showError('Only admin users can reject jobs');
      return;
    }

    const actionKey = `reject_${job.id}`;
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));
      
      const result = await rejectJob(job.id, reason, user);
      
      if (result.success) {
        toast.showSuccess(`Job "${job.jobTitle}" rejected successfully!`);
        setRejectModal({ isOpen: false, job: null, reason: '' });
      } else {
        throw new Error('Rejection failed');
      }
    } catch (error) {
      console.error('Error rejecting job:', error);
      toast.showError(`Failed to reject job: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleArchive = async (job) => {
    if (!user || user.role !== 'admin') {
      toast.showError('Only admin users can archive jobs');
      return;
    }

    if (!confirm(`Are you sure you want to archive "${job.jobTitle}"? This action cannot be undone.`)) {
      return;
    }

    const actionKey = `archive_${job.id}`;
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));
      
      const result = await archiveJob(job.id, user);
      
      if (result.success) {
        toast.showSuccess(`Job "${job.jobTitle}" archived successfully!`);
      } else {
        throw new Error('Archive failed');
      }
    } catch (error) {
      console.error('Error archiving job:', error);
      toast.showError(`Failed to archive job: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Auto archive expired jobs
  const handleAutoArchive = async () => {
    if (!user || user.role !== 'admin') {
      toast.showError('Only admin users can perform this action');
      return;
    }

    try {
      const result = await autoArchiveExpiredJobs(user);
      toast.showSuccess(`Auto-archived ${result.successful} expired jobs`);
    } catch (error) {
      console.error('Error auto-archiving jobs:', error);
      toast.showError(`Failed to auto-archive jobs: ${error.message}`);
    }
  };

  // Get status styling
  const getStatusChip = (status) => {
    const statusStyles = {
      active: { bg: 'bg-green-100', text: 'text-green-800', icon: '✓' },
      posted: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '📝' },
      draft: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⏳' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: '✗' },
      archived: { bg: 'bg-gray-100', text: 'text-gray-800', icon: '📦' }
    };
    
    const style = statusStyles[status?.toLowerCase()] || statusStyles.draft;
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text} flex items-center gap-1`}>
        <span>{style.icon}</span>
        {status || 'Draft'}
      </span>
    );
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString('en-GB');
    } catch {
      return 'N/A';
    }
  };

  const totalPages = Math.ceil(pagination.totalItems / pagination.itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header and Analytics */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Job Postings Manager</h2>
            <p className="text-gray-600">Moderate and manage all job postings</p>
          </div>
          
          <button
            onClick={handleAutoArchive}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors flex items-center gap-2"
          >
            <FaArchive className="w-4 h-4" />
            Auto Archive Expired
          </button>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-blue-600">{analytics.total || 0}</div>
            <div className="text-sm text-gray-600">Total Jobs</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-green-600">{analytics.active || 0}</div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-blue-600">{analytics.posted || 0}</div>
            <div className="text-sm text-gray-600">Posted</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-yellow-600">{analytics.pendingApproval || 0}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-red-600">{analytics.rejected || 0}</div>
            <div className="text-sm text-gray-600">Rejected</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-gray-600">{analytics.archived || 0}</div>
            <div className="text-sm text-gray-600">Archived</div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by job title, company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="posted">Posted</option>
            <option value="rejected">Rejected</option>
            <option value="archived">Archived</option>
          </select>

          {/* Company Filter */}
          <select
            value={filters.companyId}
            onChange={(e) => setFilters(prev => ({ ...prev, companyId: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Companies</option>
            {companies.map(company => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>

          {/* Recruiter Filter */}
          <select
            value={filters.recruiterId}
            onChange={(e) => setFilters(prev => ({ ...prev, recruiterId: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Recruiters</option>
            {recruiters.map(recruiter => (
              <option key={recruiter.id} value={recruiter.id}>{recruiter.name}</option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({
                status: 'all',
                companyId: '',
                recruiterId: '',
                startDate: '',
                endDate: ''
              })}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Search Results Summary */}
      {!loading && (
        <div className="text-sm text-gray-600">
          {debouncedSearch || Object.values(filters).some(f => f && f !== 'all') ? (
            <span>
              Showing {filteredJobs.length} of {jobs.length} jobs
              {debouncedSearch && <span className="font-medium"> matching "{debouncedSearch}"</span>}
            </span>
          ) : (
            <span>Showing all {jobs.length} jobs</span>
          )}
        </div>
      )}

      {/* Jobs Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <FaSpinner className="animate-spin text-blue-600 mr-3" />
            <span className="text-gray-600">Loading jobs...</span>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-2">No jobs found</div>
            <div className="text-sm text-gray-400">
              {searchTerm ? 'Try adjusting your search criteria' : 'No jobs have been created yet'}
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Job Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recruiter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Drive Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{job.jobTitle || 'N/A'}</div>
                          <div className="text-sm text-gray-500">
                            {job.jobType && <span className="mr-2">• {job.jobType}</span>}
                            {(job.salary || job.stipend) && (
                              <span>• ₹{job.jobType === 'Internship' ? job.stipend : job.salary}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {job.companyDetails?.name || job.company || job.companyName || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {job.companyLocation || job.companyDetails?.location || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{job.recruiter?.name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{job.recruiter?.email || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(job.driveDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusChip(job.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          {/* View Button */}
                          <button
                            onClick={() => setJobDetailModal({ isOpen: true, job })}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="View Details"
                          >
                            <FaEye className="w-4 h-4" />
                          </button>

                          {/* Approve Button - Show for draft and in_review status */}
                          {(job.status === 'draft' || job.status === 'in_review') && (
                            <button
                              onClick={() => handleApprove(job)}
                              disabled={actionLoading[`approve_${job.id}`]}
                              className="text-green-600 hover:text-green-900 transition-colors disabled:opacity-50"
                              title="Approve Job"
                            >
                              {actionLoading[`approve_${job.id}`] ? (
                                <FaSpinner className="w-4 h-4 animate-spin" />
                              ) : (
                                <FaCheck className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {/* Reject Button - Show for draft and in_review status */}
                          {(job.status === 'draft' || job.status === 'in_review') && (
                            <button
                              onClick={() => setRejectModal({ isOpen: true, job, reason: '' })}
                              disabled={actionLoading[`reject_${job.id}`]}
                              className="text-red-600 hover:text-red-900 transition-colors disabled:opacity-50"
                              title="Reject Job"
                            >
                              <FaTimes className="w-4 h-4" />
                            </button>
                          )}

                          {/* Archive Button */}
                          {(job.status === 'active' || job.status === 'posted') && (
                            <button
                              onClick={() => handleArchive(job)}
                              disabled={actionLoading[`archive_${job.id}`]}
                              className="text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
                              title="Archive Job"
                            >
                              {actionLoading[`archive_${job.id}`] ? (
                                <FaSpinner className="w-4 h-4 animate-spin" />
                              ) : (
                                <FaArchive className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredJobs.length > pagination.itemsPerPage && (
              <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                    {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                    {pagination.totalItems} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                      disabled={pagination.currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-700">
                      Page {pagination.currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                      disabled={pagination.currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Job Details Modal */}
      <JobDetailsModal 
        isOpen={jobDetailModal.isOpen}
        job={jobDetailModal.job}
        onClose={() => setJobDetailModal({ isOpen: false, job: null })}
        onApprove={handleApprove}
        onReject={(job) => setRejectModal({ isOpen: true, job, reason: '' })}
        onArchive={handleArchive}
        actionLoading={actionLoading}
        userRole={user?.role}
      />

      {/* Reject Modal */}
      <RejectModal 
        isOpen={rejectModal.isOpen}
        job={rejectModal.job}
        reason={rejectModal.reason}
        onReasonChange={(reason) => setRejectModal(prev => ({ ...prev, reason }))}
        onConfirm={() => handleReject(rejectModal.job, rejectModal.reason)}
        onClose={() => setRejectModal({ isOpen: false, job: null, reason: '' })}
        loading={actionLoading[`reject_${rejectModal.job?.id}`]}
      />
    </div>
  );
}

// Job Details Modal Component
const JobDetailsModal = ({ 
  isOpen, 
  job, 
  onClose, 
  onApprove, 
  onReject, 
  onArchive, 
  actionLoading, 
  userRole 
}) => {
  if (!isOpen || !job) return null;

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString('en-GB');
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Job Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FaTimes className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Job Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Job Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-600">Job Title</label>
                <p className="text-gray-900">{job.jobTitle || 'N/A'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600">Job Type</label>
                <p className="text-gray-900">{job.jobType || 'N/A'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600">Salary/Stipend</label>
                <p className="text-gray-900">
                  {job.salary || job.stipend ? 
                    `₹${job.jobType === 'Internship' ? job.stipend : job.salary}` : 
                    'N/A'
                  }
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600">Location</label>
                <p className="text-gray-900">{job.companyLocation || job.location || 'N/A'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600">Drive Date</label>
                <p className="text-gray-900">{formatDate(job.driveDate)}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600">Application Deadline</label>
                <p className="text-gray-900">{formatDate(job.applicationDeadline)}</p>
              </div>
            </div>

            {/* Company & Recruiter Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Company & Recruiter</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-600">Company</label>
                <p className="text-gray-900">
                  {job.companyDetails?.name || job.company || job.companyName || 'N/A'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600">Recruiter Name</label>
                <p className="text-gray-900">{job.recruiter?.name || 'N/A'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600">Recruiter Email</label>
                <p className="text-gray-900">{job.recruiter?.email || 'N/A'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600">Target Schools</label>
                <p className="text-gray-900">
                  {job.targetSchools?.length ? job.targetSchools.join(', ') : 'N/A'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600">Target Centers</label>
                <p className="text-gray-900">
                  {job.targetCenters?.length ? job.targetCenters.join(', ') : 'N/A'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600">Target Batches</label>
                <p className="text-gray-900">
                  {job.targetBatches?.length ? job.targetBatches.join(', ') : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Job Description */}
          {job.responsibilities && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Job Description</h3>
              <div className="p-4 bg-gray-50 rounded-md">
                <p className="text-gray-900 whitespace-pre-wrap">{job.responsibilities}</p>
              </div>
            </div>
          )}

          {/* Skills Required */}
          {job.skills && job.skills.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Skills Required</h3>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill, index) => (
                  <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Metadata</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600">Status</label>
                <p className="text-gray-900">{job.status || 'Draft'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Created At</label>
                <p className="text-gray-900">{formatDate(job.createdAt)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Posted At</label>
                <p className="text-gray-900">{formatDate(job.postedAt)}</p>
              </div>
            </div>
            
            {job.rejectionReason && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-600">Rejection Reason</label>
                <p className="text-red-900 bg-red-50 p-3 rounded-md">{job.rejectionReason}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Actions */}
        {userRole === 'admin' && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            {(job.status === 'draft' || job.status === 'in_review') && (
              <>
                <button
                  onClick={() => onReject(job)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <FaTimes className="w-4 h-4" />
                  Reject
                </button>
                <button
                  onClick={() => onApprove(job)}
                  disabled={actionLoading[`approve_${job.id}`]}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading[`approve_${job.id}`] ? (
                    <FaSpinner className="w-4 h-4 animate-spin" />
                  ) : (
                    <FaCheck className="w-4 h-4" />
                  )}
                  Approve
                </button>
              </>
            )}
            
            {(job.status === 'active' || job.status === 'posted') && (
              <button
                onClick={() => onArchive(job)}
                disabled={actionLoading[`archive_${job.id}`]}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading[`archive_${job.id}`] ? (
                  <FaSpinner className="w-4 h-4 animate-spin" />
                ) : (
                  <FaArchive className="w-4 h-4" />
                )}
                Archive
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Reject Modal Component
const RejectModal = ({ 
  isOpen, 
  job, 
  reason, 
  onReasonChange, 
  onConfirm, 
  onClose, 
  loading 
}) => {
  if (!isOpen || !job) return null;

  const rejectionReasons = [
    'Incomplete job description',
    'Invalid requirements',
    'Inappropriate content',
    'Spam or fraudulent posting',
    'Violation of platform policies',
    'Other'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Reject Job</h2>
          <p className="text-sm text-gray-600 mt-1">
            Job: {job.jobTitle}
          </p>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Rejection
            </label>
            <select
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select a reason</option>
              {rejectionReasons.map(reasonOption => (
                <option key={reasonOption} value={reasonOption}>{reasonOption}</option>
              ))}
            </select>
          </div>

          {reason === 'Other' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Reason
              </label>
              <textarea
                value={reason === 'Other' ? '' : reason}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder="Please provide a specific reason..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>
          )}

          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-800 text-sm">
              <strong>Warning:</strong> Rejecting this job will notify the recruiter and mark the job as rejected.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!reason || loading}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <FaSpinner className="w-4 h-4 animate-spin" />
            ) : (
              <FaTimes className="w-4 h-4" />
            )}
            Confirm Reject
          </button>
        </div>
      </div>
    </div>
  );
};