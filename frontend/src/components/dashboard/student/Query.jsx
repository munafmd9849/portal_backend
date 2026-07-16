import React, { useState, useEffect, useRef } from 'react';
import { 
  FaPaperPlane, 
  FaQuestionCircle, 
  FaChartLine, 
  FaCalendarAlt,
  FaCheckCircle,
  FaFileUpload,
  FaChevronDown,
  FaChevronUp,
  FaClock,
  FaListOl,
} from 'react-icons/fa';
import { useAuth } from '../../../hooks/useAuth';
import QueryErrorBoundary from '../../common/QueryErrorBoundary';
import { getTargetedJobsForStudent } from '../../../services/jobs';

// Import query services (ES module syntax)
import * as queryServices from '../../../services/queries.js';

const StudentQuerySystem = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('question');
  const [activeView, setActiveView] = useState('new'); // 'new' or 'history'
  const [formData, setFormData] = useState({
    type: 'question',
    subject: '',
    selectedJobId: '', // New field for job selection
    message: '',
    cgpa: '',
    backlogs: '',
    proof: null,
    startDate: '',
    endDate: '',
    timeSlot: '',
    reason: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedQuery, setExpandedQuery] = useState(null);
  const [referenceId, setReferenceId] = useState('');
  const [loadingQueries, setLoadingQueries] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [showJobSelector, setShowJobSelector] = useState(false);
  const jobSelectorRef = useRef(null);

  // Real queries data from Firebase
  const [pastQueries, setPastQueries] = useState([]);

  // Load jobs on component mount
  useEffect(() => {
    const loadJobs = async () => {
      if (!user?.id) return;
      
      setLoadingJobs(true);
      try {
        const jobsData = await getTargetedJobsForStudent(user.id);
        // Filter only posted jobs
        const postedJobs = jobsData.filter(job => job.isPosted || job.posted || job.status === 'POSTED' || job.status === 'posted');
        setJobs(postedJobs);
      } catch (error) {
        console.error('Failed to load jobs:', error);
        setJobs([]);
      } finally {
        setLoadingJobs(false);
      }
    };

    loadJobs();
  }, [user?.id]);

  // Handle click outside to close job selector
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (jobSelectorRef.current && !jobSelectorRef.current.contains(event.target)) {
        setShowJobSelector(false);
      }
    };

    if (showJobSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showJobSelector]);

  // Load queries on component mount and set up real-time subscription
  useEffect(() => {
    if (!user?.id || !queryServices?.subscribeToStudentQueries) {
      setLoadingQueries(false);
      return;
    }

    setLoadingQueries(true);
    
    try {
      // Set up real-time subscription to queries
      const unsubscribe = queryServices.subscribeToStudentQueries(user.id, (queries) => {
        setPastQueries(queries);
        setLoadingQueries(false);
      });

      // Cleanup subscription on unmount
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    } catch (error) {
      console.warn('Failed to set up query subscription:', error);
      setLoadingQueries(false);
    }
  }, [user?.id]);

  const queryTypes = [
    {
      id: 'question',
      name: 'Ask a Question',
      icon: <FaQuestionCircle />,
      idle: 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:border-indigo-300',
      active: 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200/60',
    },
    {
      id: 'cgpa',
      name: 'Update CGPA',
      icon: <FaChartLine />,
      idle: 'bg-sky-50 text-sky-800 border-sky-100 hover:border-sky-300',
      active: 'bg-sky-600 text-white border-sky-600 shadow-sm shadow-sky-200/60',
    },
    {
      id: 'backlog',
      name: 'Update Backlogs',
      icon: <FaListOl />,
      idle: 'bg-amber-50 text-amber-900 border-amber-100 hover:border-amber-300',
      active: 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-200/60',
    },
    {
      id: 'calendar',
      name: 'Block Calendar',
      icon: <FaCalendarAlt />,
      idle: 'bg-violet-50 text-violet-800 border-violet-100 hover:border-violet-300',
      active: 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-200/60',
    },
  ];

  const typeIconClass = {
    question: 'text-indigo-600',
    cgpa: 'text-sky-600',
    backlog: 'text-amber-600',
    calendar: 'text-violet-600',
  };

  const timeSlots = [
    '9:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '1:00 PM - 2:00 PM',
    '2:00 PM - 3:00 PM',
    '3:00 PM - 4:00 PM',
    '4:00 PM - 5:00 PM'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for CGPA: enforce exactly 2 decimal places
    if (name === 'cgpa') {
      // Allow only numbers and one decimal point
      const sanitized = value.replace(/[^0-9.]/g, '');
      // Ensure only one decimal point
      const parts = sanitized.split('.');
      let finalValue = parts[0] || '';
      
      // If user has typed a decimal point, ensure we format to 2 decimal places
      if (parts.length > 1) {
        const decimals = parts.slice(1).join('').substring(0, 2);
        // Always show 2 decimal places if decimal point is present
        finalValue += '.' + decimals.padEnd(2, '0');
      }
      
      // Ensure value doesn't exceed 10.00
      if (finalValue) {
        const numValue = parseFloat(finalValue);
        if (!isNaN(numValue) && numValue > 10) {
          finalValue = '10.00';
        } else if (!isNaN(numValue) && numValue < 0) {
          finalValue = '0.00';
        }
      }
      
      setFormData({
        ...formData,
        [name]: finalValue
      });
    } else if (name === 'backlogs') {
      // Special handling for backlogs: allow only non-negative integers or "X+" format
      const sanitized = value.replace(/[^0-9+]/g, '');
      // Allow formats like "0", "1", "2", "3+", etc.
      let finalValue = sanitized;
      
      // Ensure only one '+' at the end
      if (finalValue.includes('+')) {
        const parts = finalValue.split('+');
        finalValue = parts[0] + (parts.length > 1 ? '+' : '');
      }
      
      setFormData({
        ...formData,
        [name]: finalValue
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
    
    // Clear submit error when user makes any change
    if (formErrors.submit) {
      setFormErrors({
        ...formErrors,
        submit: ''
      });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    // Validate file (fallback validation)
    let validation = { isValid: true, error: null };
    
    if (!file) {
      validation = { isValid: false, error: 'No file selected' };
    } else if (file.size > 5 * 1024 * 1024) {
      validation = { isValid: false, error: 'File size must be less than 5MB' };
    } else if (!['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      validation = { isValid: false, error: 'Only PDF, JPG, and PNG files are allowed' };
    }
    
    if (!validation.isValid) {
      setFormErrors({
        ...formErrors,
        proof: validation.error
      });
      return;
    }
    
    setFormData({
      ...formData,
      proof: file
    });
    
    if (formErrors.proof) {
      setFormErrors({
        ...formErrors,
        proof: ''
      });
    }
  };

  const validateForm = () => {
    const errors = {};

    if (activeTab === 'question') {
      // For question type, require job selection instead of subject
      if (!formData.selectedJobId) {
        errors.selectedJobId = 'Please select a job posting to ask a question about';
      }
      if (!formData.message.trim()) {
        errors.message = 'Your question is required';
      }
    } else {
      // For other types, keep subject requirement
      if (!formData.subject.trim()) {
        errors.subject = 'Subject is required';
      }
    }

    if (activeTab === 'cgpa') {
      const cgpaValue = formData.cgpa;
      if (!cgpaValue || cgpaValue.trim() === '') {
        errors.cgpa = 'CGPA is required';
      } else {
        // Validate CGPA format: 0.00 to 10.00 with EXACTLY 2 decimal places
        const cgpaStr = String(cgpaValue).trim();
        const cgpaRegex = /^(10\.00|[0-9]\.[0-9]{2})$/;
        
        // Check if it's a valid format with exactly 2 decimal places
        if (!cgpaRegex.test(cgpaStr)) {
          // Check if user entered value without 2 decimals (e.g., 9, 9.0, 9.5)
          if (/^\d+$/.test(cgpaStr)) {
            errors.cgpa = 'Enter CGPA with 2 decimals (e.g., 9.00)';
          } else if (/^\d+\.\d?$/.test(cgpaStr)) {
            errors.cgpa = 'Enter CGPA with 2 decimals (e.g., 9.00)';
          } else {
            errors.cgpa = 'CGPA must be between 0.00 and 10.00 with exactly 2 decimal places (e.g., 9.00, 8.75)';
          }
        } else {
          // Validate range without using parseFloat to avoid rounding errors
          const parts = cgpaStr.split('.');
          const integerPart = parseInt(parts[0], 10);
          const decimalPart = parseInt(parts[1], 10);
          
          if (isNaN(integerPart) || isNaN(decimalPart)) {
            errors.cgpa = 'Invalid CGPA format';
          } else if (integerPart > 10 || (integerPart === 10 && decimalPart > 0)) {
            errors.cgpa = 'CGPA must be between 0.00 and 10.00';
          } else if (integerPart < 0) {
            errors.cgpa = 'CGPA must be between 0.00 and 10.00';
          }
        }
      }
      if (!formData.proof) {
        errors.proof = 'Proof document is required';
      }
    }

    if (activeTab === 'backlog') {
      const backlogsValue = formData.backlogs;
      if (!backlogsValue || backlogsValue.trim() === '') {
        errors.backlogs = 'Backlogs count is required';
      } else {
        // Validate backlogs format: non-negative integer or "X+" format
        const backlogsStr = String(backlogsValue).trim();
        const backlogsRegex = /^(\d+|\d+\+)$/;
        
        if (!backlogsRegex.test(backlogsStr)) {
          errors.backlogs = 'Backlogs must be a non-negative integer (e.g., 0, 1, 2, 3+)';
        } else {
          // Extract numeric value (remove + if present)
          const numericValue = parseInt(backlogsStr.replace('+', ''), 10);
          if (isNaN(numericValue) || numericValue < 0) {
            errors.backlogs = 'Backlogs must be a non-negative integer';
          }
        }
      }
      if (!formData.proof) {
        errors.proof = 'Proof document is required';
      }
    }

    if (activeTab === 'calendar') {
      const today = new Date().toISOString().split('T')[0];
      if (!formData.startDate) {
        errors.startDate = 'Start date is required';
      } else if (formData.startDate < today) {
        errors.startDate = 'Start date cannot be in the past';
      }

      if (!formData.endDate) {
        errors.endDate = 'End date is required';
      } else if (formData.endDate < formData.startDate) {
        errors.endDate = 'End date cannot be before start date';
      } else if (formData.startDate > formData.endDate) {
        errors.startDate = 'Start date cannot be after the end date';
      }

      if (!formData.timeSlot) {
        errors.timeSlot = 'Time slot is required';
      }

      if (!formData.reason) {
        errors.reason = 'Reason is required';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Check if user is authenticated
    if (!user?.id) {
      setFormErrors({
        ...formErrors,
        submit: 'Please log in to submit a query'
      });
      return;
    }

    setSubmitting(true);
    
    try {
      // Submit query to Firebase if service is available
      if (queryServices?.submitQuery) {
        const result = await queryServices.submitQuery(user.id, formData, jobs);
        
        // Set reference ID for success message
        setReferenceId(result.referenceId || (queryServices.generateReferenceId ? queryServices.generateReferenceId() : `STU${Math.floor(1000 + Math.random() * 9000)}`));
        
        console.log('Query submitted successfully:', result);
      } else {
        // Fallback: Generate reference ID without Firebase
        setReferenceId(`STU${Math.floor(1000 + Math.random() * 9000)}`);
        console.warn('Query services not available, using local mode');
      }
      
      // Always add to local state for immediate UI feedback
      const newQuery = {
        id: Date.now(),
        type: formData.type,
        subject: formData.subject,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        adminResponse: '',
        responseDate: '',
        ...formData
      };
      
      setPastQueries(prev => [newQuery, ...prev]);
      setSubmitted(true);
      
    } catch (error) {
      console.error('Error submitting query:', error);
      
      // Extract error message
      let errorMessage = 'Failed to submit query. Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.error) {
        errorMessage = error.response.error;
      } else if (error.response?.errors && Array.isArray(error.response.errors)) {
        // Show validation errors
        const validationErrors = error.response.errors.map(e => `${e.param}: ${e.msg}`).join(', ');
        errorMessage = `Validation failed: ${validationErrors}`;
      }
      
      // Set error in form errors
      setFormErrors({
        ...formErrors,
        submit: errorMessage
      });
      
      // Don't show success - show error instead
      setSubmitted(false);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'question',
      subject: '',
      selectedJobId: '',
      message: '',
      cgpa: '',
      backlogs: '',
      proof: null,
      startDate: '',
      endDate: '',
      timeSlot: '',
      reason: ''
    });
    setFormErrors({});
    setSubmitted(false);
    setShowJobSelector(false);
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'resolved':
        return 'Resolved';
      case 'rejected':
        return 'Rejected';
      case 'under_review':
        return 'Under Review';
      default:
        return 'Pending';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved':
        return 'bg-emerald-50 text-emerald-800 border border-emerald-100';
      case 'rejected':
        return 'bg-rose-50 text-rose-800 border border-rose-100';
      case 'under_review':
        return 'bg-indigo-50 text-indigo-800 border border-indigo-100';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  const fieldClass = (hasError) =>
    `w-full px-3.5 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
      hasError ? 'border-rose-500' : 'border-slate-300'
    }`;

  const toggleQueryExpand = (id) => {
    if (expandedQuery === id) {
      setExpandedQuery(null);
    } else {
      setExpandedQuery(id);
    }
  };

  if (submitted) {
    return (
      <div className="query-surface w-full max-w-full min-w-0 overflow-x-hidden flex items-center justify-center py-10 px-3 sm:px-4 pb-24 sm:pb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-7 max-w-sm w-full border border-slate-200/80">
          <div className="text-center">
            <div className="bg-emerald-50 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 border border-emerald-100">
              <FaCheckCircle className="text-emerald-600 text-xl" />
            </div>
            <h2 className="text-base font-semibold text-slate-900 mb-1">Submitted</h2>
            <p className="text-sm text-slate-600 mb-4 font-mono">#{referenceId}</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveView('history');
                  setSubmitted(false);
                }}
                className="min-h-[40px] px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors flex-1"
              >
                History
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="min-h-[40px] px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex-1"
              >
                New query
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="query-surface w-full max-w-full min-w-0 overflow-x-hidden space-y-3 sm:space-y-4 pb-24 sm:pb-8">
      <style>{`
        .query-surface .query-row {
          transition: border-color 150ms ease, background-color 150ms ease;
        }
        @media (prefers-reduced-motion: reduce) {
          .query-surface .query-row { transition: none !important; }
        }
      `}</style>

      <div className="inline-flex w-full sm:w-auto rounded-lg border border-slate-200 bg-slate-50 p-0.5">
        <button
          type="button"
          onClick={() => setActiveView('new')}
          className={`flex-1 sm:flex-none min-h-[36px] px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeView === 'new'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          New
        </button>
        <button
          type="button"
          onClick={() => setActiveView('history')}
          className={`flex-1 sm:flex-none min-h-[36px] px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeView === 'history'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          History
        </button>
      </div>

      {activeView === 'history' ? (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden min-w-0">
          <div className="p-3 sm:p-4">
            {loadingQueries ? (
              <div className="flex items-center justify-center py-12 text-sm text-slate-500 gap-2">
                <FaClock className="text-indigo-500 animate-spin" />
                Loading…
              </div>
            ) : pastQueries.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-slate-600 mb-3">No queries yet</p>
                <button
                  type="button"
                  onClick={() => setActiveView('new')}
                  className="min-h-[36px] px-3.5 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  New query
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 -mx-3 sm:-mx-4">
                {pastQueries.map((query) => (
                  <div key={query.id} className="query-row min-w-0">
                    <button
                      type="button"
                      className="w-full px-3 sm:px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors"
                      onClick={() => toggleQueryExpand(query.id)}
                    >
                      <div className="flex items-center min-w-0 flex-1 gap-2.5">
                        <span className={`flex-shrink-0 ${typeIconClass[query.type] || 'text-slate-400'}`}>
                          {query.type === 'question' && <FaQuestionCircle />}
                          {query.type === 'cgpa' && <FaChartLine />}
                          {query.type === 'backlog' && <FaListOl />}
                          {query.type === 'calendar' && <FaCalendarAlt />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900 text-sm truncate">{query.subject || 'Query'}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {new Date(query.date || query.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center flex-shrink-0 gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${getStatusColor(query.status)}`}>
                          {getStatusText(query.status)}
                        </span>
                        {expandedQuery === query.id
                          ? <FaChevronUp className="text-slate-400 w-3 h-3" />
                          : <FaChevronDown className="text-slate-400 w-3 h-3" />}
                      </div>
                    </button>

                    {expandedQuery === query.id && (
                      <div className="px-3 sm:px-4 pb-3.5 pt-0 space-y-2.5 text-sm">
                        {query.type === 'question' && query.message && (
                          <p className="text-slate-700 whitespace-pre-wrap">{query.message}</p>
                        )}
                        {query.type === 'cgpa' && (
                          <p className="text-slate-700">CGPA: {query.cgpa}</p>
                        )}
                        {query.type === 'backlog' && (
                          <p className="text-slate-700">Backlogs: {query.backlogs || query.metadata?.backlogs || 'N/A'}</p>
                        )}
                        {query.type === 'calendar' && (
                          <p className="text-slate-700">
                            {new Date(query.startDate).toLocaleDateString()} – {new Date(query.endDate).toLocaleDateString()}
                            {query.timeSlot ? ` · ${query.timeSlot}` : ''}
                          </p>
                        )}
                        {(query.adminResponse || query.response) && (
                          <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-3">
                            <p className="text-slate-800">{query.adminResponse || query.response}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden min-w-0">
          <div className="border-b border-slate-100 px-3 sm:px-5 py-3.5 sm:py-4">
            <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5">
              {queryTypes.map((type) => {
                const isActive = activeTab === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(type.id);
                      setFormData({ ...formData, type: type.id });
                      setShowJobSelector(false);
                    }}
                    className={`inline-flex items-center justify-center gap-2 min-h-[40px] px-3.5 sm:px-4 py-2 rounded-xl border text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-150 ${
                      isActive ? type.active : type.idle
                    }`}
                  >
                    <span className={`text-base ${isActive ? 'text-white' : ''}`}>{type.icon}</span>
                    <span className="whitespace-nowrap">{type.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 min-w-0">
            {activeTab === 'question' ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Job <span className="text-rose-500">*</span>
                </label>
                {loadingJobs ? (
                  <div className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50 flex items-center text-sm text-slate-500 gap-2">
                    <FaClock className="animate-spin text-indigo-500" />
                    Loading…
                  </div>
                ) : jobs.length === 0 ? (
                  <p className="text-sm text-slate-500 py-2">No job postings available.</p>
                ) : (
                  <div className="relative min-w-0" ref={jobSelectorRef}>
                    <button
                      type="button"
                      onClick={() => setShowJobSelector(!showJobSelector)}
                      className={`w-full min-h-[40px] border ${formErrors.selectedJobId ? 'border-rose-500' : 'border-slate-300'} rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between gap-2 bg-white hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors`}
                    >
                      <span className="truncate flex-1 text-slate-900">
                        {formData.selectedJobId
                          ? (() => {
                              const selectedJob = jobs.find((j) => j.id === formData.selectedJobId);
                              return selectedJob
                                ? `${selectedJob.jobTitle} — ${selectedJob.companyName || selectedJob.company}`
                                : 'Select job';
                            })()
                          : 'Select job'}
                      </span>
                      <FaChevronDown className={`w-3 h-3 text-slate-400 flex-shrink-0 transition-transform ${showJobSelector ? 'rotate-180' : ''}`} />
                    </button>

                    {showJobSelector && (
                      <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-lg shadow-md mt-1 max-h-72 overflow-y-auto">
                        <div className="py-1">
                          {jobs.map((job) => {
                            const isSelected = formData.selectedJobId === job.id;
                            return (
                              <button
                                key={job.id}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, selectedJobId: job.id });
                                  setShowJobSelector(false);
                                  if (formErrors.selectedJobId) {
                                    setFormErrors({ ...formErrors, selectedJobId: '' });
                                  }
                                }}
                                className={`w-full text-left px-3 py-2.5 transition-colors ${
                                  isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'
                                }`}
                              >
                                <p className={`text-sm font-medium ${isSelected ? 'text-indigo-900' : 'text-slate-900'}`}>
                                  {job.jobTitle}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {job.companyName || job.company}
                                  {job.companyLocation ? ` · ${job.companyLocation}` : ''}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {formErrors.selectedJobId && <p className="text-rose-500 text-xs mt-1">{formErrors.selectedJobId}</p>}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder="Subject"
                  className={fieldClass(formErrors.subject)}
                  required
                />
                {formErrors.subject && <p className="text-rose-500 text-xs mt-1">{formErrors.subject}</p>}
              </div>
            )}

            {activeTab === 'question' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Question</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Your question"
                  rows={4}
                  className={`${fieldClass(formErrors.message)} min-h-[100px] max-h-[280px] resize-y`}
                  required
                />
                {formErrors.message && <p className="text-rose-500 text-xs mt-1">{formErrors.message}</p>}
              </div>
            )}

            {activeTab === 'cgpa' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                    CGPA <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="cgpa"
                    value={formData.cgpa}
                    onChange={handleInputChange}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      if (value && !value.includes('.')) {
                        setFormData({ ...formData, cgpa: value + '.00' });
                      } else if (value && value.includes('.')) {
                        const parts = value.split('.');
                        if (parts[1] && parts[1].length < 2) {
                          setFormData({
                            ...formData,
                            cgpa: parts[0] + '.' + parts[1].padEnd(2, '0'),
                          });
                        }
                      }
                    }}
                    placeholder="9.00"
                    pattern="^(10\.00|[0-9]\.[0-9]{2})$"
                    maxLength="5"
                    className={fieldClass(formErrors.cgpa)}
                    required
                  />
                  {formErrors.cgpa && <p className="text-rose-500 text-xs mt-1">{formErrors.cgpa}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                    Proof <span className="text-rose-500">*</span>
                  </label>
                  <div className={`relative border ${formErrors.proof ? 'border-rose-500' : 'border-slate-300'} rounded-lg p-3.5 text-center hover:border-indigo-400 transition-colors group`}>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept=".pdf,.jpg,.jpeg,.png"
                      required
                    />
                    <FaFileUpload className="text-slate-400 text-lg mx-auto mb-1.5 group-hover:text-indigo-600 transition-colors" />
                    <p className="text-sm text-slate-600 truncate px-2">
                      {formData.proof ? formData.proof.name : 'Upload file'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">PDF, JPG, PNG · 5MB</p>
                  </div>
                  {formErrors.proof && <p className="text-rose-500 text-xs mt-1">{formErrors.proof}</p>}
                </div>
              </div>
            )}

            {activeTab === 'backlog' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                    Count <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="backlogs"
                    value={formData.backlogs}
                    onChange={handleInputChange}
                    placeholder="0"
                    pattern="^(\d+|\d+\+)$"
                    maxLength="10"
                    className={fieldClass(formErrors.backlogs)}
                    required
                  />
                  {formErrors.backlogs && <p className="text-rose-500 text-xs mt-1">{formErrors.backlogs}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                    Proof <span className="text-rose-500">*</span>
                  </label>
                  <div className={`relative border ${formErrors.proof ? 'border-rose-500' : 'border-slate-300'} rounded-lg p-3.5 text-center hover:border-indigo-400 transition-colors group`}>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept=".pdf,.jpg,.jpeg,.png"
                      required
                    />
                    <FaFileUpload className="text-slate-400 text-lg mx-auto mb-1.5 group-hover:text-indigo-600 transition-colors" />
                    <p className="text-sm text-slate-600 truncate px-2">
                      {formData.proof ? formData.proof.name : 'Upload file'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">PDF, JPG, PNG · 5MB</p>
                  </div>
                  {formErrors.proof && <p className="text-rose-500 text-xs mt-1">{formErrors.proof}</p>}
                </div>
              </div>
            )}

            {activeTab === 'calendar' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Start</label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                      className={fieldClass(formErrors.startDate)}
                      required
                    />
                    {formErrors.startDate && <p className="text-rose-500 text-xs mt-1">{formErrors.startDate}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">End</label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      min={formData.startDate || new Date().toISOString().split('T')[0]}
                      className={fieldClass(formErrors.endDate)}
                      required
                    />
                    {formErrors.endDate && <p className="text-rose-500 text-xs mt-1">{formErrors.endDate}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Time slot</label>
                    <div className="relative">
                      <select
                        name="timeSlot"
                        value={formData.timeSlot}
                        onChange={handleInputChange}
                        className={`${fieldClass(formErrors.timeSlot)} appearance-none pr-10`}
                        required
                      >
                        <option value="">Select</option>
                        {timeSlots.map((slot) => (
                          <option key={slot} value={slot}>{slot}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                        <FaChevronDown className="w-3 h-3" />
                      </div>
                    </div>
                    {formErrors.timeSlot && <p className="text-rose-500 text-xs mt-1">{formErrors.timeSlot}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason</label>
                    <div className="relative">
                      <select
                        name="reason"
                        value={formData.reason}
                        onChange={handleInputChange}
                        className={`${fieldClass(formErrors.reason)} appearance-none pr-10`}
                        required
                      >
                        <option value="">Select</option>
                        <option value="interview">Company Interview</option>
                        <option value="exam">University Exam</option>
                        <option value="personal">Personal</option>
                        <option value="other">Other</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                        <FaChevronDown className="w-3 h-3" />
                      </div>
                    </div>
                    {formErrors.reason && <p className="text-rose-500 text-xs mt-1">{formErrors.reason}</p>}
                  </div>
                </div>

                {formData.reason === 'other' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Details</label>
                    <input
                      type="text"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Reason"
                      className={fieldClass(false)}
                      required
                    />
                  </div>
                )}
              </>
            )}

            {formErrors.submit && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg">
                <p className="text-rose-700 text-sm break-words">{formErrors.submit}</p>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={submitting}
                className={`min-h-[40px] px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 ${
                  submitting
                    ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {submitting ? (
                  <>
                    <FaClock className="animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <FaPaperPlane className="w-3.5 h-3.5" />
                    Submit
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// Wrap the component with error boundary to prevent cascade errors
const QueryWithErrorBoundary = () => (
  <QueryErrorBoundary>
    <StudentQuerySystem />
  </QueryErrorBoundary>
);

export default QueryWithErrorBoundary;