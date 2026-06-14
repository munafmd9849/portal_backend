/**
 * Endorsement Management Component
 * Student Dashboard - Manage endorsement requests and received endorsements
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Mail,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Star,
  Loader,
  AlertCircle,
  Building2,
  Send,
  RefreshCw,
  Search,
} from 'lucide-react';
import { FaInfoCircle } from 'react-icons/fa';
import api from '../../../services/api';

function normalizeEndorsement(endorsement) {
  let relatedSkills = [];
  if (Array.isArray(endorsement.relatedSkills)) {
    relatedSkills = endorsement.relatedSkills.filter((skill) => skill && skill.trim());
  } else if (endorsement.relatedSkills && typeof endorsement.relatedSkills === 'string') {
    relatedSkills = endorsement.relatedSkills.split(',').map((s) => s.trim()).filter(Boolean);
  }

  let skillRatings = {};
  if (endorsement.skillRatings) {
    try {
      skillRatings =
        typeof endorsement.skillRatings === 'string'
          ? JSON.parse(endorsement.skillRatings)
          : endorsement.skillRatings;
    } catch {
      skillRatings = {};
    }
  }

  return { ...endorsement, relatedSkills, skillRatings };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function nameFromEmail(email) {
  const local = email.split('@')[0] || 'Teacher';
  return local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || 'Teacher';
}

function resolveTeacherChoice(searchValue, teachers, selectedTeacher) {
  if (selectedTeacher) return selectedTeacher;

  const query = searchValue.trim().toLowerCase();
  if (!query) return null;

  const listMatch = teachers.find(
    (t) =>
      t.id === query ||
      t.email?.toLowerCase() === query ||
      t.name?.toLowerCase() === query
  );
  if (listMatch) return listMatch;

  if (EMAIL_REGEX.test(query)) {
    return {
      id: query,
      name: nameFromEmail(query),
      email: query,
      role: undefined,
      organization: undefined,
    };
  }

  return null;
}

export default function EndorsementManagement({ onEndorsementUpdate }) {
  const [endorsements, setEndorsements] = useState({
    received: [],
    pending: [],
    expired: [],
  });
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [monthlyRequestCount, setMonthlyRequestCount] = useState(0);
  const [monthlyLimit, setMonthlyLimit] = useState(2);
  const [canRequestMore, setCanRequestMore] = useState(true);

  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [showTeacherList, setShowTeacherList] = useState(false);
  const teacherPickerRef = useRef(null);
  const [endorsementMessage, setEndorsementMessage] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const loadTeachers = useCallback(async () => {
    try {
      setLoadingTeachers(true);
      const data = await api.getEndorsementTeachers();
      setTeachers(Array.isArray(data?.teachers) ? data.teachers : []);
    } catch (err) {
      console.error('Error loading teachers:', err);
      setTeachers([]);
    } finally {
      setLoadingTeachers(false);
    }
  }, []);

  const loadEndorsements = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getStudentEndorsements();
      setEndorsements({
        received: (data.received || []).map(normalizeEndorsement),
        pending: data.pending || [],
        expired: data.expired || [],
      });
      setMonthlyRequestCount(data.monthlyRequestCount || 0);
      setMonthlyLimit(data.monthlyLimit || 2);
      setCanRequestMore(data.canRequestMore !== false);
    } catch (err) {
      console.error('Error loading endorsements:', err);
      setError(err.response?.data?.error || 'Failed to load endorsements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEndorsements();
  }, [loadEndorsements]);

  useEffect(() => {
    if (showRequestForm) {
      loadTeachers();
    }
  }, [showRequestForm, loadTeachers]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (teacherPickerRef.current && !teacherPickerRef.current.contains(event.target)) {
        setShowTeacherList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredTeachers = useMemo(() => {
    const query = teacherSearch.trim().toLowerCase();
    if (!query) return teachers;
    return teachers.filter(
      (t) =>
        t.name?.toLowerCase().includes(query) ||
        t.email?.toLowerCase().includes(query) ||
        t.role?.toLowerCase().includes(query)
    );
  }, [teachers, teacherSearch]);

  const trimmedSearch = teacherSearch.trim();
  const isValidCustomEmail =
    EMAIL_REGEX.test(trimmedSearch) &&
    !teachers.some((t) => t.email?.toLowerCase() === trimmedSearch.toLowerCase());

  const activeTeacher =
    selectedTeacher || resolveTeacherChoice(teacherSearch, teachers, null);

  const resetForm = () => {
    setSelectedTeacher(null);
    setTeacherSearch('');
    setShowTeacherList(false);
    setEndorsementMessage('');
    setFormErrors({});
    setError('');
  };

  const openRequestForm = () => {
    resetForm();
    setShowRequestForm(true);
  };

  const validateForm = () => {
    const errors = {};
    const teacher = resolveTeacherChoice(teacherSearch, teachers, selectedTeacher);
    if (!teacher) {
      errors.teacher = 'Select a teacher from the list or enter a valid email address';
    } else if (!teacher.email || !EMAIL_REGEX.test(teacher.email)) {
      errors.teacher = 'Please enter a valid teacher email address';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRequestEndorsement = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!canRequestMore) {
      setError(`Monthly limit reached. You can only send ${monthlyLimit} endorsement requests per month. Please try again next month.`);
      return;
    }

    const teacher = resolveTeacherChoice(teacherSearch, teachers, selectedTeacher);
    if (!teacher) {
      setFormErrors({ teacher: 'Select a teacher or enter a valid email address' });
      return;
    }

    setRequesting(true);
    setError('');
    setSuccess('');

    try {
      await api.requestEndorsement({
        teacherName: teacher.name,
        teacherEmail: teacher.email.trim().toLowerCase(),
        role: teacher.role || undefined,
        organization: teacher.organization || undefined,
      });

      setSuccess('Endorsement request sent successfully! The teacher will receive an email with a secure link.');
      setShowRequestForm(false);
      resetForm();
      await loadEndorsements();
      onEndorsementUpdate?.();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error requesting endorsement:', err);
      setError(err.response?.data?.error || err.message || 'Failed to send endorsement request');
    } finally {
      setRequesting(false);
    }
  };

  // Handle delete request
  const handleDeleteRequest = async (tokenId) => {
    if (!window.confirm('Are you sure you want to cancel this endorsement request?')) {
      return;
    }

    setDeleting(tokenId);
    setError('');

    try {
      await api.deleteEndorsementRequest(tokenId);
      setSuccess('Endorsement request cancelled successfully');

      // Reload endorsements
      await loadEndorsements();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting endorsement request:', err);
      setError(err.response?.data?.error || 'Failed to cancel endorsement request');
    } finally {
      setDeleting(null);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border-2 border-gray-200 p-4 md:p-6 shadow-sm min-w-0">
        <div className="flex items-center justify-center py-6 md:py-8">
          <Loader className="w-5 h-5 md:w-6 md:h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-sm md:text-base text-gray-600">Loading endorsements...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-lg border border-gray-200 p-4 md:p-6 min-w-0 overflow-hidden">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4 md:mb-6">
        <h3 className="text-lg md:text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Mail className="w-5 h-5 flex-shrink-0" />
          Endorsements
        </h3>
        {!showRequestForm && (endorsements.received.length > 0 || endorsements.pending.length > 0 || endorsements.expired.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <button
              onClick={loadEndorsements}
              disabled={loading}
              className="px-3 py-2 text-sm md:text-base bg-gray-100 text-gray-700 rounded-lg md:rounded-xl hover:bg-gray-200 transition-all duration-200 flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh endorsements"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={openRequestForm}
              disabled={!canRequestMore}
              className={`px-4 py-2.5 md:px-6 md:py-3 text-sm md:text-base rounded-lg md:rounded-xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 font-medium ${canRequestMore
                  ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:from-orange-700 hover:to-orange-800'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                }`}
              title={!canRequestMore ? `Monthly limit reached (${monthlyRequestCount}/${monthlyLimit} requests)` : ''}
            >
              <Plus className="w-4 h-4" />
              Request Endorsement
            </button>
          </div>
        )}
      </div>

      {/* Request Form */}
      {showRequestForm && (
        <div className="mb-4 md:mb-6 bg-white rounded-xl md:rounded-2xl shadow-lg overflow-hidden border border-gray-200">
          <div className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h4 className="text-base md:text-xl font-semibold text-gray-800">Request New Endorsement</h4>
              <button
                type="button"
                onClick={() => {
                  setShowRequestForm(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors p-1"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRequestEndorsement} className="space-y-4 md:space-y-6">
              <div ref={teacherPickerRef} className="relative mb-4 md:mb-6">
                <label className="block text-sm md:text-base text-gray-700 font-medium mb-1.5 md:mb-2">
                  Teacher
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Search by name or type the teacher&apos;s email address.
                </p>
                <div className="relative">
                  <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5 pointer-events-none" />
                  <input
                    type="text"
                    value={teacherSearch}
                    onChange={(e) => {
                      setTeacherSearch(e.target.value);
                      setSelectedTeacher(null);
                      setShowTeacherList(true);
                      if (formErrors.teacher) {
                        setFormErrors((prev) => ({ ...prev, teacher: '' }));
                      }
                      if (error) setError('');
                    }}
                    onFocus={() => setShowTeacherList(true)}
                    placeholder={loadingTeachers ? 'Loading teachers...' : 'Search by name or enter email'}
                    disabled={loadingTeachers}
                    autoComplete="off"
                    className={`w-full pl-9 md:pl-12 pr-3 md:pr-4 py-2.5 md:py-3 text-sm md:text-base border rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 ${
                      formErrors.teacher ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>

                {showTeacherList && !loadingTeachers && (
                  <div className="absolute z-20 mt-2 w-full rounded-lg md:rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                    <div className="max-h-52 overflow-y-auto py-1">
                      {filteredTeachers.length > 0 ? (
                        filteredTeachers.map((teacher) => (
                          <button
                            key={teacher.id}
                            type="button"
                            onClick={() => {
                              setSelectedTeacher(teacher);
                              setTeacherSearch(teacher.email);
                              setShowTeacherList(false);
                              setFormErrors((prev) => ({ ...prev, teacher: '' }));
                            }}
                            className={`w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors border-b border-gray-50 last:border-b-0 ${
                              selectedTeacher?.id === teacher.id ? 'bg-orange-50' : ''
                            }`}
                          >
                            <p className="text-sm font-medium text-gray-900 truncate">{teacher.name}</p>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {teacher.email}
                              {teacher.role ? ` · ${teacher.role}` : ''}
                            </p>
                          </button>
                        ))
                      ) : (
                        <p className="px-4 py-3 text-sm text-gray-500">No teachers match your search.</p>
                      )}

                      {isValidCustomEmail && (
                        <button
                          type="button"
                          onClick={() => {
                            const custom = {
                              id: trimmedSearch.toLowerCase(),
                              name: nameFromEmail(trimmedSearch),
                              email: trimmedSearch.toLowerCase(),
                            };
                            setSelectedTeacher(custom);
                            setTeacherSearch(trimmedSearch.toLowerCase());
                            setShowTeacherList(false);
                            setFormErrors((prev) => ({ ...prev, teacher: '' }));
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-orange-50 border-t border-gray-100 bg-gray-50"
                        >
                          <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-gray-500" />
                            Use email: {trimmedSearch.toLowerCase()}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 pl-5">Send request to this address</p>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {formErrors.teacher && (
                  <p className="text-red-500 text-xs md:text-sm mt-1">{formErrors.teacher}</p>
                )}
                {activeTeacher && !formErrors.teacher && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    Request will be sent to{' '}
                    <span className="font-medium text-gray-700">{activeTeacher.email}</span>
                  </p>
                )}
              </div>

              <div className="mb-4 md:mb-6">
                <label className="block text-sm md:text-base text-gray-700 font-medium mb-1.5 md:mb-2">
                  Message (Optional)
                </label>
                <textarea
                  value={endorsementMessage}
                  onChange={(e) => setEndorsementMessage(e.target.value)}
                  placeholder="Add any additional message or context for the teacher..."
                  rows={3}
                  className="w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base border min-h-[80px] md:min-h-[120px] max-h-[300px] resize-y border-gray-300 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div className="bg-orange-50 rounded-lg md:rounded-xl p-3 md:p-4 mb-4 md:mb-6 border border-orange-200">
                <div className="flex items-start gap-2 md:gap-3">
                  <FaInfoCircle className="text-orange-600 mt-0.5 flex-shrink-0 w-4 h-4 md:w-5 md:h-5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm text-orange-700 mb-1.5 md:mb-2">
                      An email with a secure link will be sent to the teacher. The teacher will be able to fill in their details, write an endorsement message, and sign the document digitally.
                    </p>
                    <p className="text-xs md:text-sm text-orange-600 mb-1.5 md:mb-2">
                      The endorsement will be automatically associated with your profile once the teacher completes the form.
                    </p>
                    <p className="text-[10px] md:text-xs text-orange-600 font-medium mt-1.5 md:mt-2 pt-1.5 md:pt-2 border-t border-orange-200">
                      Note: You can send only {monthlyLimit} endorsement requests per month.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 md:gap-3 pt-3 md:pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowRequestForm(false);
                    resetForm();
                  }}
                  disabled={requesting}
                  className="px-4 py-2.5 md:px-6 md:py-3 text-sm md:text-base bg-gray-200 text-gray-700 rounded-lg md:rounded-xl hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requesting || !canRequestMore || loadingTeachers}
                  className={`px-4 py-2.5 md:px-6 md:py-3 text-sm md:text-base font-medium rounded-lg md:rounded-xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 ${requesting || !canRequestMore
                      ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:from-orange-700 hover:to-orange-800'
                    }`}
                >
                  {requesting ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 md:mb-6 p-3 md:p-4 bg-red-50 border border-red-200 rounded-lg md:rounded-xl flex items-start gap-2 md:gap-3 min-w-0">
          <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="text-red-800 font-medium text-sm md:text-base mb-0.5 md:mb-1">Error</h4>
            <p className="text-xs md:text-sm text-red-700 break-words">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-4 md:mb-6 p-3 md:p-4 bg-green-50 border border-green-200 rounded-lg md:rounded-xl flex items-start gap-2 md:gap-3 min-w-0">
          <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="text-green-800 font-medium text-sm md:text-base mb-0.5 md:mb-1">Success</h4>
            <p className="text-xs md:text-sm text-green-700 break-words">{success}</p>
          </div>
        </div>
      )}

      {/* Received Endorsements - Only show when form is closed */}
      {!showRequestForm && endorsements.received.length > 0 && (
        <div className="mb-4 md:mb-6">
          <div className="space-y-3 md:space-y-4">
            {endorsements.received.map((endorsement, index) => (
              <div
                key={endorsement.id || index}
                className="bg-white rounded-lg md:rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm hover:shadow-md transition-all duration-300 min-w-0 overflow-hidden"
              >
                {/* Header Section - stack on mobile */}
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                      <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm md:text-lg flex-shrink-0">
                        {endorsement.endorserName?.charAt(0)?.toUpperCase() || 'T'}
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-semibold text-gray-800 text-base md:text-lg truncate" title={endorsement.endorserName}>
                          {endorsement.endorserName}
                        </h5>
                        {endorsement.endorserRole && (
                          <p className="text-xs md:text-sm text-gray-600 flex items-center gap-1 mt-0.5 truncate" title={endorsement.endorserRole + (endorsement.organization ? ` at ${endorsement.organization}` : '')}>
                            <Building2 className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{endorsement.endorserRole}{endorsement.organization && ` at ${endorsement.organization}`}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="ml-0 md:ml-12 space-y-1 md:space-y-1.5">
                      {endorsement.endorserEmail && (
                        <p className="text-xs md:text-sm text-gray-600 flex items-center gap-2 min-w-0 truncate" title={endorsement.endorserEmail}>
                          <Mail className="w-3 h-3 md:w-4 md:h-4 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{endorsement.endorserEmail}</span>
                        </p>
                      )}
                      {endorsement.strengthRating && (
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 md:w-4 md:h-4 ${i < endorsement.strengthRating
                                    ? 'text-yellow-500 fill-current'
                                    : 'text-gray-300'
                                  }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs md:text-sm font-medium text-gray-700">
                            {endorsement.strengthRating}/5
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {endorsement.submittedAt && (
                    <span className="text-[10px] md:text-xs text-gray-500 whitespace-nowrap flex-shrink-0" title={formatDate(endorsement.submittedAt)}>
                      {formatDate(endorsement.submittedAt)}
                    </span>
                  )}
                </div>

                {/* Endorsement Message */}
                <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-100">
                  <div className="bg-gray-50 rounded-lg p-3 md:p-4 border border-gray-200 min-w-0">
                    <p className="text-sm md:text-base text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                      {endorsement.message}
                    </p>
                  </div>
                </div>

                {/* Related Skills */}
                {endorsement.relatedSkills && endorsement.relatedSkills.length > 0 && (
                  <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-100">
                    <p className="text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">Related Skills:</p>
                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                      {endorsement.relatedSkills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 md:px-3 md:py-1.5 bg-blue-100 text-blue-800 text-xs md:text-sm rounded-full font-medium truncate max-w-[140px] md:max-w-none"
                          title={skill}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Requests */}
      {endorsements.pending.length > 0 && (
        <div className="mb-4 md:mb-6">
          <h4 className="text-sm md:text-base font-semibold text-gray-800 mb-2 md:mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 md:w-5 md:h-5 text-yellow-600 flex-shrink-0" />
            Pending Requests ({endorsements.pending.length})
          </h4>
          <div className="space-y-2 md:space-y-3">
            {endorsements.pending.map((request) => (
              <div
                key={request.id}
                className="p-3 md:p-4 border-2 border-yellow-200 bg-yellow-50 rounded-lg min-w-0 overflow-hidden"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-gray-800 text-sm md:text-base truncate" title={request.teacherName || request.teacherEmail}>{request.teacherName || request.teacherEmail}</h5>
                    <div className="text-xs md:text-sm text-gray-600 mt-1">
                      {request.teacherRole && (
                        <p className="truncate">{request.teacherRole}{request.organization && ` at ${request.organization}`}</p>
                      )}
                      <p className="flex items-center gap-1 mt-1 truncate" title={request.teacherEmail}>
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{request.teacherEmail}</span>
                      </p>
                      <p className="text-[10px] md:text-xs text-gray-500 mt-1">
                        Expires: {formatDate(request.expiresAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteRequest(request.id)}
                    disabled={deleting === request.id}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0 touch-manipulation"
                    title="Cancel request"
                  >
                    {deleting === request.id ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expired Requests */}
      {endorsements.expired.length > 0 && (
        <div className="mb-4 md:mb-6">
          <h4 className="text-sm md:text-base font-semibold text-gray-800 mb-2 md:mb-3 flex items-center gap-2">
            <XCircle className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0" />
            Expired Requests ({endorsements.expired.length})
          </h4>
          <div className="space-y-2 md:space-y-3">
            {endorsements.expired.map((request) => (
              <div
                key={request.id}
                className="p-3 md:p-4 border-2 border-gray-200 bg-gray-50 rounded-lg opacity-60 min-w-0 overflow-hidden"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-gray-600 text-sm md:text-base truncate" title={request.teacherName || request.teacherEmail}>{request.teacherName || request.teacherEmail}</h5>
                    <p className="text-[10px] md:text-xs text-gray-500 mt-1">
                      Expired: {formatDate(request.expiresAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteRequest(request.id)}
                    disabled={deleting === request.id}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0 touch-manipulation"
                    title="Delete expired request"
                  >
                    {deleting === request.id ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State - Only show if form is closed and no requests/endorsements */}
      {endorsements.received.length === 0 &&
        endorsements.pending.length === 0 &&
        endorsements.expired.length === 0 && !showRequestForm && (
          <div className="text-center py-8 md:py-12 px-2">
            <div className="bg-orange-50 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 border-2 border-orange-200">
              <Mail className="w-8 h-8 md:w-10 md:h-10 text-orange-600" />
            </div>
            <h4 className="text-base md:text-xl font-semibold text-gray-800 mb-1.5 md:mb-2">No endorsements yet</h4>
            <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6 max-w-md mx-auto">
              Get started by requesting an endorsement from your teacher. They'll receive an email with a secure link to complete the endorsement.
            </p>
            <button
              onClick={openRequestForm}
              disabled={!canRequestMore}
              className={`px-4 py-2.5 md:px-6 md:py-3 text-sm md:text-base rounded-lg md:rounded-xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 font-medium mx-auto ${canRequestMore
                  ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:from-orange-700 hover:to-orange-800'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                }`}
              title={!canRequestMore ? `Monthly limit reached (${monthlyRequestCount}/${monthlyLimit} requests)` : ''}
            >
              <Plus className="w-4 h-4" />
              Request Endorsement
            </button>
          </div>
        )}
    </div>
  );
}

