import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
  Plus, Search,
  Clock, Users, CheckCircle, AlertCircle,
  Settings, Trash2,
  FileText, Camera,
  Video, Shield, Maximize2, Mic,
  Layout, BookOpen, Terminal, ChevronRight,
  Activity, Calendar, Layers, Link2
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import AssessmentSettingsModal from '../../components/dashboard/admin/AssessmentSettingsModal';
import AssessmentInviteModal from '../../components/assessment/AssessmentInviteModal';
import { fromDatetimeLocalValue } from '../../utils/assessmentEntryWindow';
import { SkeletonTable } from '../../components/ui/loading';
import CodingQuestionEditor from '../../components/admin/CodingQuestionEditor';
import AssessmentQuestionExcelUpload from '../../components/admin/AssessmentQuestionExcelUpload';
import AssessmentAudiencePicker from '../../components/admin/AssessmentAudiencePicker';
import ClockTimePicker from '../../components/ui/ClockTimePicker';
import { au } from '../../components/assessment/assessmentUi';
import {
  WizardProgress,
  WizardSection,
  WizardField,
  ToggleList,
  ToggleRow,
  WizardFooter,
  WizardModalHeader,
} from '../../components/assessment/WizardPrimitives';
import AllowedCodingLanguagesPicker from '../../components/admin/AllowedCodingLanguagesPicker';
import {
  createEmptyStarterCodesByLang,
  parseStarterCodesByLang,
  mergeCodingIntoConfig,
  ALL_CODING_LANGUAGE_IDS,
} from '../../coding-engine/starterCodeStorage';

const COMPLETED_SESSION_STATUSES = new Set(['SUBMITTED', 'COMPLETED', 'PENDING_REVIEW', 'TERMINATED']);

const WIZARD_STEP_LABELS = {
  1: 'Audience & details',
  2: 'Questions',
  3: 'Security & publish',
};

const INITIAL_FORM = {
  title: '',
  description: '',
  type: 'MOCK_TEST',
  difficulty: 'MEDIUM',
  duration: 60,
  scheduleDate: '',
  startClock: '',
  endClock: '',
  questions: [],
  targetBatchIds: [],
  targetStudentIds: [],
  targetSchoolIds: [],
  targetCenterIds: [],
  scheduledAtMap: {},
  config: {
    proctoring: {
      webcam: true,
      mic: true,
      tabSwitch: true,
      fullscreen: true,
      pauseOnTabSwitch: true,
      tabSwitchGraceCount: 2,
      snapshotInterval: 60,
    },
    shuffleQuestions: false,
    shuffleOptions: false,
    joinWindow: { opensMinutesBeforeStart: 10, closesMinutesAfterStart: 10 },
    coding: { allowedLanguages: [...ALL_CODING_LANGUAGE_IDS] },
  },
};

function resolveAudiencePayload(formData, { schools, centers, students }) {
  const targetBatchIds = [...(formData.targetBatchIds || [])];
  const studentUserIds = new Set(formData.targetStudentIds || []);
  const schoolSet = new Set(formData.targetSchoolIds || []);
  const centerSet = new Set(formData.targetCenterIds || []);

  if (schoolSet.size || centerSet.size) {
    for (const s of students) {
      const uid = s.userId || s.id;
      if (!uid) continue;

      if (schoolSet.size) {
        const schoolMatch =
          (s.schoolId && schoolSet.has(s.schoolId)) ||
          [...schoolSet].some((id) => {
            const school = schools.find((sc) => sc.id === id);
            return (
              school &&
              String(s.school || '').toLowerCase() === String(school.name).toLowerCase()
            );
          });
        if (schoolMatch) studentUserIds.add(uid);
      }

      if (centerSet.size) {
        const centerMatch =
          (s.centerId && centerSet.has(s.centerId)) ||
          [...centerSet].some((id) => {
            const center = centers.find((c) => c.id === id);
            return (
              center &&
              String(s.center || '').toLowerCase() === String(center.name).toLowerCase()
            );
          });
        if (centerMatch) studentUserIds.add(uid);
      }
    }
  }

  return { targetBatchIds, targetStudentIds: [...studentUserIds] };
}

function assessmentHasLiveSession(assessment) {
  return (assessment.sessions || []).some((s) => s.status === 'IN_PROGRESS');
}

function assessmentIsDraft(assessment) {
  return assessment.status === 'DRAFT';
}

function assessmentIsActiveWindow(assessment) {
  if (assessmentIsDraft(assessment)) return false;
  const now = new Date();
  const start = assessment.startTime ? new Date(assessment.startTime) : null;
  const end = assessment.endTime ? new Date(assessment.endTime) : null;
  if (assessmentHasLiveSession(assessment)) return true;
  if (start && end && now >= start && now <= end) return true;
  if (start && !end && now >= start) return true;
  return false;
}

function assessmentIsUpcoming(assessment) {
  if (assessmentIsDraft(assessment)) return false;
  if (!assessment.startTime || assessmentHasLiveSession(assessment)) return false;
  return new Date(assessment.startTime) > new Date();
}

function assessmentIsPast(assessment) {
  if (assessmentIsDraft(assessment)) return false;
  if (assessmentHasLiveSession(assessment)) return false;
  const end = assessment.endTime ? new Date(assessment.endTime) : null;
  if (end) return end < new Date();
  const start = assessment.startTime ? new Date(assessment.startTime) : null;
  return start ? start < new Date() : false;
}

const assessmentsPageCache = {
  assessments: null,
  batches: null,
};

export default function AdminAssessments() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';
  const [assessments, setAssessments] = useState(() => assessmentsPageCache.assessments || []);
  const [loading, setLoading] = useState(() => !assessmentsPageCache.assessments);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [settingsAssessment, setSettingsAssessment] = useState(null);
  const [inviteAssessment, setInviteAssessment] = useState(null);
  const [step, setStep] = useState(1);
  const [batches, setBatches] = useState(() => assessmentsPageCache.batches || []);
  const [schools, setSchools] = useState([]);
  const [centers, setCenters] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();

  const [formData, setFormData] = useState(INITIAL_FORM);

  const hasCodingQuestions =
    formData.type === 'CODING_TEST' ||
    (formData.questions || []).some((q) => q.type === 'CODING');

  const fetchBatches = useCallback(async () => {
    try {
      const data = await api.getBatches();
      assessmentsPageCache.batches = data;
      setBatches(data);
    } catch (e) {
      if (assessmentsPageCache.batches) setBatches(assessmentsPageCache.batches);
      console.error('Failed to load batches');
    }
  }, []);

  const fetchAssessments = useCallback(async () => {
    const hasCache = Array.isArray(assessmentsPageCache.assessments);
    try {
      if (!hasCache) setLoading(true);
      const data = await api.getAssessments({ silent: hasCache });
      const list = Array.isArray(data) ? data : (data?.assessments || []);
      assessmentsPageCache.assessments = list;
      setAssessments(list);
    } catch (e) {
      if (hasCache) {
        setAssessments(assessmentsPageCache.assessments);
      } else {
        setAssessments([]);
      }
      if (e?.status !== 429 || !hasCache) {
        toast?.error(e?.message || 'Failed to load assessments');
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAssessments();
    fetchBatches();
  }, [fetchAssessments, fetchBatches]);

  // Drop stale localStorage cache from before assessments existed (5-min TTL hid new items)
  useEffect(() => {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.includes('api_cache_/assessments/all')) localStorage.removeItem(key);
      });
    } catch {
      /* ignore */
    }
  }, []);

  const [availableStudents, setAvailableStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    if (!showCreateModal) return;
    setStep(1);
    setFormData(INITIAL_FORM);
    const loadAudienceData = async () => {
      try {
        setLoadingStudents(true);
        const [schoolData, centerData, studentData] = await Promise.all([
          api.getSchools(),
          api.getCenters(),
          api.getAllStudents(),
        ]);
        setSchools(Array.isArray(schoolData) ? schoolData : []);
        setCenters(Array.isArray(centerData) ? centerData : []);
        setAvailableStudents(studentData?.students || (Array.isArray(studentData) ? studentData : []));
      } catch {
        console.error('Failed to load audience data');
      } finally {
        setLoadingStudents(false);
      }
    };
    loadAudienceData();
  }, [showCreateModal]);

  const allowedLangs =
    formData.config?.coding?.allowedLanguages?.length > 0
      ? formData.config.coding.allowedLanguages
      : [...ALL_CODING_LANGUAGE_IDS];

  const validateCodingQuestions = (forPublish = true) => {
    const codingQs = (formData.questions || []).filter((q) => q.type === 'CODING');
    if (!codingQs.length) return true;

    if (forPublish) {
      if (allowedLangs.length < 1) {
        toast?.error('Select at least one allowed coding language');
        return false;
      }
    }

    for (const q of codingQs) {
      if (!q.text?.trim()) {
        toast?.error('Each coding question needs a title');
        return false;
      }
      if (forPublish) {
        const starters = parseStarterCodesByLang(q.starterCodes ?? q.starterCode);
        for (const lang of allowedLangs) {
          if (!String(starters[lang] ?? '').trim()) {
            toast?.error(
              `"${q.text}": add starter code for ${lang}`
            );
            return false;
          }
        }
        const cases = Array.isArray(q.testCases) ? q.testCases : [];
        const valid = cases.filter(
          (tc) =>
            String(tc.input ?? '').trim() &&
            String(tc.expectedOutput ?? tc.output ?? '').trim()
        );
        if (valid.length === 0) {
          toast?.error(
            `"${q.text || 'Coding question'}": add at least one judge test case with input and expected output`
          );
          return false;
        }
      }
    }
    return true;
  };

  const toggleAudienceId = (key, id) => {
    setFormData((prev) => {
      const list = prev[key] || [];
      return {
        ...prev,
        [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
      };
    });
  };

  const toggleTargetStudent = (userId) => {
    setFormData((prev) => ({
      ...prev,
      targetStudentIds: prev.targetStudentIds.includes(userId)
        ? prev.targetStudentIds.filter((id) => id !== userId)
        : [...prev.targetStudentIds, userId],
    }));
  };

  const buildAssessmentPayload = (publish) => {
    const audience = resolveAudiencePayload(formData, {
      schools,
      centers,
      students: availableStudents,
    });
    const startIso = formData.scheduleDate && formData.startClock
      ? fromDatetimeLocalValue(`${formData.scheduleDate}T${formData.startClock}`)
      : null;
    const endIso = formData.scheduleDate && formData.endClock
      ? fromDatetimeLocalValue(`${formData.scheduleDate}T${formData.endClock}`)
      : null;

    return {
      ...formData,
      title: formData.title?.trim(),
      ...audience,
      config: mergeCodingIntoConfig(formData.config, {
        allowedLanguages: hasCodingQuestions ? allowedLangs : undefined,
      }),
      questions: (formData.questions || []).map((q) =>
        q.type === 'CODING'
          ? { ...q, starterCodes: parseStarterCodesByLang(q.starterCodes ?? q.starterCode) }
          : q
      ),
      startTime: startIso,
      endTime: endIso,
      joinOpensMinutesBeforeStart: formData.config?.joinWindow?.opensMinutesBeforeStart,
      joinClosesMinutesAfterStart: formData.config?.joinWindow?.closesMinutesAfterStart,
      allowedCodingLanguages: hasCodingQuestions ? allowedLangs : undefined,
      publish,
    };
  };

  const handleSaveDraft = async () => {
    if (!formData.title?.trim()) {
      toast?.error('Assessment title is required');
      return;
    }
    try {
      await api.createAssessment(buildAssessmentPayload(false));
      toast?.success('Draft saved');
      setShowCreateModal(false);
      setStep(1);
      fetchAssessments();
    } catch (e) {
      toast?.error(e?.message || 'Failed to save draft');
    }
  };

  const handlePublish = async () => {
    if (!formData.title?.trim()) {
      toast?.error('Assessment title is required');
      return;
    }
    if (!validateCodingQuestions(true)) return;
    try {
      await api.createAssessment(buildAssessmentPayload(true));
      toast?.success('Assessment published');
      setShowCreateModal(false);
      setStep(1);
      fetchAssessments();
    } catch (e) {
      toast?.error(e?.message || 'Failed to publish assessment');
    }
  };

  const handlePublishExisting = async (id) => {
    try {
      await api.publishAssessment(id);
      toast?.success('Assessment published');
      fetchAssessments();
    } catch (e) {
      toast?.error(e?.message || 'Failed to publish');
    }
  };

  const addQuestion = () => {
    const defaultType = formData.type === 'MOCK_TEST' ? 'MCQ' : 
                       formData.type === 'CODING_TEST' ? 'CODING' : 'DESCRIPTIVE';
    setFormData({
      ...formData,
      questions: [
        ...formData.questions, 
        { 
          text: '', 
          description: '',
          type: defaultType, 
          options: defaultType === 'MCQ' ? ['', '', '', ''] : [''], 
          correctAnswer: '', 
          points: 1,
          difficulty: 'MEDIUM',
          starterCodes: createEmptyStarterCodesByLang(),
          constraints: '',
          timeLimitSec: 2,
          memoryLimitMb: 256,
          examples: [{ input: '', output: '', explanation: '' }],
          testCases: [{ input: '', expectedOutput: '', hidden: false, weight: 1 }]
        }
      ]
    });
  };

  const handleExcelQuestionsImport = (imported, { warnings = [] } = {}) => {
    if (!imported?.length) return;
    setFormData((prev) => ({
      ...prev,
      questions: [...(prev.questions || []), ...imported],
    }));
    toast?.success(`Imported ${imported.length} question${imported.length === 1 ? '' : 's'} from Excel`);
    if (warnings.length) {
      toast?.warning(warnings[0]);
    }
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...formData.questions];
    newQuestions[index][field] = value;

    // Auto-initialize 4 options if type is changed to MCQ and it doesn't have 4 yet
    if (field === 'type' && value === 'MCQ' && (!newQuestions[index].options || newQuestions[index].options.length < 4)) {
      newQuestions[index].options = ['', '', '', ''];
    }

    setFormData({ ...formData, questions: newQuestions });
  };

  const getAssessmentTypeIcon = (type) => {
    switch (type) {
      case 'MOCK_TEST': return <FileText className="w-5 h-5" />;
      case 'CODING_TEST': return <Terminal className="w-5 h-5" />;
      case 'DESCRIPTIVE': return <BookOpen className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const totalAssessments = assessments.length;
  const upcomingScheduled = assessments.filter(assessmentIsUpcoming).length;
  const activeSessions = assessments.reduce(
    (acc, a) => acc + (a.sessions || []).filter((s) => s.status === 'IN_PROGRESS').length,
    0,
  );
  const completedAttempts = assessments.reduce(
    (acc, a) => acc + (a.sessions || []).filter((s) => COMPLETED_SESSION_STATUSES.has(s.status)).length,
    0,
  );
  const activeAssessmentsCount = assessments.filter(
    (a) => assessmentIsActiveWindow(a) || assessmentHasLiveSession(a),
  ).length;
  const pastAssessmentsCount = assessments.filter(assessmentIsPast).length;

  const filteredAssessments = assessments.filter((item) => {
    if (searchQuery && !item.title?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (activeTab === 'all') return true;
    if (activeTab === 'active') {
      return assessmentIsActiveWindow(item) || assessmentHasLiveSession(item);
    }
    if (activeTab === 'upcoming') return assessmentIsUpcoming(item);
    if (activeTab === 'past') return assessmentIsPast(item);
    return true;
  });

  const filterTabs = [
    { id: 'all', label: 'All', shortLabel: 'All', count: totalAssessments },
    { id: 'active', label: 'Active', shortLabel: 'Active', count: activeAssessmentsCount },
    { id: 'upcoming', label: 'Upcoming', shortLabel: 'Upcoming', count: upcomingScheduled },
    { id: 'past', label: 'Past', shortLabel: 'Past', count: pastAssessmentsCount },
  ];

  const statsStrip = [
    { label: 'Total', val: totalAssessments },
    { label: 'Upcoming', val: upcomingScheduled },
    { label: 'Active sessions', val: activeSessions },
    { label: 'Completed', val: completedAttempts },
  ];

  return (
    <>
      <div className="space-y-3">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setStep(1);
              setShowCreateModal(true);
            }}
            className="flex items-center justify-center gap-2 px-3.5 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New assessment
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3.5">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            {statsStrip.map((stat, i) => (
              <div key={i} className="px-3 py-2 md:py-0 first:pt-0 last:pb-0 md:first:pl-0 md:last:pr-0">
                <p className="text-xs font-medium text-gray-500">{stat.label}</p>
                <p className="text-2xl font-semibold text-gray-900 tabular-nums mt-0.5">{stat.val}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-100 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div
              className="inline-flex flex-wrap rounded-md border border-gray-200 bg-white p-0.5 shadow-sm w-full lg:w-auto"
              role="tablist"
            >
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors flex-1 lg:flex-none ${
                    activeTab === tab.id
                      ? 'bg-slate-800 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="hidden sm:inline whitespace-nowrap">{tab.label}</span>
                  <span className="sm:hidden whitespace-nowrap">{tab.shortLabel}</span>
                  <span
                    className={`shrink-0 tabular-nums ${
                      activeTab === tab.id ? 'text-white/80' : 'text-gray-400'
                    }`}
                  >
                    ({tab.count})
                  </span>
                </button>
              ))}
            </div>

            <div className="relative w-full shrink-0 lg:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search assessments…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400 focus:bg-white"
              />
            </div>
          </div>

          <div>
            {loading ? (
              <div className="p-4">
                <SkeletonTable rows={6} columns={5} />
              </div>
            ) : filteredAssessments.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center gap-4 text-center">
                <AlertCircle className="w-10 h-10 text-gray-200" />
                <p className="text-sm font-medium text-gray-700">
                  No {activeTab === 'all' ? '' : `${activeTab} `}assessments found
                </p>
                {assessments.length === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setShowCreateModal(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    Create assessment
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[780px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Assessment</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Type</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-center">Duration</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-center">Attempts</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-center">Questions</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAssessments.map((item) => {
                      const isDraft = assessmentIsDraft(item);
                      const isLive = assessmentHasLiveSession(item);
                      const statusLabel = isDraft
                        ? 'Draft'
                        : isLive
                          ? 'Live'
                          : assessmentIsActiveWindow(item)
                            ? 'Active'
                            : assessmentIsUpcoming(item)
                              ? 'Upcoming'
                              : assessmentIsPast(item)
                                ? 'Past'
                                : 'Published';
                      const statusClass = isDraft
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : isLive || assessmentIsActiveWindow(item)
                          ? 'bg-sky-50 text-sky-700 border-sky-100'
                          : assessmentIsUpcoming(item)
                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                            : 'bg-gray-50 text-gray-600 border-gray-200';

                      return (
                        <tr key={item.id} className="hover:bg-sky-50/40 transition-colors">
                          <td className="px-4 py-3 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                              {item.description || 'No description'}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {item.type?.replace(/_/g, ' ') || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-center tabular-nums">
                            {item.duration}m
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-center tabular-nums">
                            {item.sessions?.length || 0}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-center tabular-nums">
                            {item.questions?.length || 0}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border ${statusClass}`}
                            >
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {isDraft ? (
                                <button
                                  type="button"
                                  onClick={() => handlePublishExisting(item.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" /> Publish
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate(`${basePath}/assessments/${item.id}/live-monitor`)
                                    }
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md"
                                  >
                                    <Video className="w-3.5 h-3.5" /> Monitor
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setInviteAssessment(item)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-medium rounded-md"
                                  >
                                    <Link2 className="w-3.5 h-3.5" /> Invite
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate(
                                        `${basePath}?tab=assessmentResults&assessmentId=${item.id}`,
                                      )
                                    }
                                    className="px-2.5 py-1.5 border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-medium rounded-md"
                                  >
                                    Results
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => setSettingsAssessment(item)}
                                className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-50 border border-gray-200 rounded-md"
                                title="Settings"
                              >
                                <Settings className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full-Screen Overlay Components - Placed outside animated container to ensure true fixed inset-0 */}
      
      {/* Creation Wizard - Clean Modal */}
      {showCreateModal && (
        <div className={au.backdropLg}>
          <div className={`${au.modalLg} h-[85vh]`}>
            <WizardModalHeader
              title="New assessment"
              subtitle={`Step ${step} of 3 · ${WIZARD_STEP_LABELS[step]}`}
              onClose={() => setShowCreateModal(false)}
              icon={FileText}
            />

            <WizardProgress step={step} total={3} />

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar bg-white">
              {step === 1 && (
                <div className="max-w-4xl mx-auto space-y-5">
                  <AssessmentAudiencePicker
                    schools={schools}
                    centers={centers}
                    batches={batches}
                    students={availableStudents}
                    targetSchoolIds={formData.targetSchoolIds}
                    targetCenterIds={formData.targetCenterIds}
                    targetBatchIds={formData.targetBatchIds}
                    targetStudentIds={formData.targetStudentIds}
                    onSchoolToggle={(id) => toggleAudienceId('targetSchoolIds', id)}
                    onCenterToggle={(id) => toggleAudienceId('targetCenterIds', id)}
                    onBatchToggle={(id) => toggleAudienceId('targetBatchIds', id)}
                    onStudentToggle={toggleTargetStudent}
                    onClearAll={() =>
                      setFormData((prev) => ({
                        ...prev,
                        targetSchoolIds: [],
                        targetCenterIds: [],
                        targetBatchIds: [],
                        targetStudentIds: [],
                      }))
                    }
                    loading={loadingStudents}
                  />

                  <div className="border-t border-slate-100 pt-5 space-y-5">
                    <WizardField label="Assessment title">
                      <input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className={au.wizardInput}
                        placeholder="e.g. SOT fullstack mock test"
                      />
                    </WizardField>

                    <WizardField label="Assessment type">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'MOCK_TEST', label: 'MCQ test', icon: FileText },
                          { id: 'CODING_TEST', label: 'Coding', icon: Terminal },
                          { id: 'DESCRIPTIVE', label: 'Descriptive', icon: BookOpen },
                          { id: 'MIXED', label: 'Mixed', icon: Layers },
                        ].map((type) => (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, type: type.id })}
                            className={`p-3 rounded-lg border transition-colors flex flex-col items-center gap-1.5 text-center ${
                              formData.type === type.id
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <type.icon className="w-4 h-4 shrink-0" />
                            <span className="text-xs font-medium">{type.label}</span>
                          </button>
                        ))}
                      </div>
                    </WizardField>

                    <WizardField label="Description">
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className={au.wizardTextarea}
                        placeholder="What is this assessment for? Any rules students should know?"
                      />
                    </WizardField>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <WizardField label="Duration (minutes)">
                        <input
                          type="number"
                          min={1}
                          value={formData.duration}
                          onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                          className={au.wizardInput}
                        />
                      </WizardField>
                      <WizardField label="Assessment date">
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input
                            type="date"
                            value={formData.scheduleDate}
                            onChange={(e) => setFormData({ ...formData, scheduleDate: e.target.value })}
                            className={`${au.wizardInput} pl-10`}
                          />
                        </div>
                      </WizardField>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <WizardField label="Start time">
                        <ClockTimePicker
                          value={formData.startClock}
                          onChange={(startClock) => setFormData({ ...formData, startClock })}
                          placeholder="Start"
                        />
                      </WizardField>
                      <WizardField label="End time (optional)" hint="Last moment students can still begin the test.">
                        <ClockTimePicker
                          value={formData.endClock}
                          onChange={(endClock) => setFormData({ ...formData, endClock })}
                          placeholder="End"
                        />
                      </WizardField>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="max-w-5xl mx-auto space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">Add questions</p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Build manually or import rows from the Excel template.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <AssessmentQuestionExcelUpload
                          compact
                          onImport={handleExcelQuestionsImport}
                        />
                        <button type="button" onClick={addQuestion} className={`${au.btnSecondary} text-xs`}>
                          <Plus className="w-4 h-4" /> Add manually
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-200/80">
                      {formData.questions.length
                        ? `${formData.questions.length} question${formData.questions.length === 1 ? '' : 's'} added`
                        : 'No questions yet — import from Excel or add one manually.'}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {formData.questions.map((q, idx) => (
                      <div key={idx} className="p-5 bg-white border border-slate-200 rounded-xl space-y-4 relative group">
                        <button
                          type="button"
                          onClick={() => {
                            const newQs = [...formData.questions];
                            newQs.splice(idx, 1);
                            setFormData({ ...formData, questions: newQs });
                          }}
                          className="absolute top-4 right-4 w-8 h-8 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-600 hover:text-white transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                          aria-label="Remove question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                          {q.type !== 'CODING' && (
                            <div className="md:col-span-8">
                              <WizardField label={`Question ${idx + 1}`}>
                                <input
                                  value={q.text}
                                  onChange={(e) => updateQuestion(idx, 'text', e.target.value)}
                                  className={au.wizardInput}
                                  placeholder="Enter question text"
                                />
                              </WizardField>
                            </div>
                          )}
                          {q.type === 'CODING' && <div className="md:col-span-8" />}
                          <div className="md:col-span-4">
                            <WizardField label="Type & points">
                              <div className="flex gap-2">
                                <select
                                  value={q.type}
                                  onChange={(e) => updateQuestion(idx, 'type', e.target.value)}
                                  className={`${au.wizardInput} flex-1`}
                                >
                                  <option value="MCQ">MCQ</option>
                                  <option value="CODING">Coding</option>
                                  <option value="DESCRIPTIVE">Descriptive</option>
                                </select>
                                <input
                                  type="number"
                                  value={q.points}
                                  onChange={(e) => updateQuestion(idx, 'points', e.target.value)}
                                  className={`${au.wizardInput} w-20 text-center`}
                                />
                              </div>
                            </WizardField>
                          </div>
                        </div>

                        {q.type === 'MCQ' && (
                          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-3">
                            <p className={au.label}>Options — click the circle to mark correct</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {(q.options || ['', '', '', '']).map((opt, optIdx) => (
                                <div key={optIdx} className="flex gap-2 group/opt">
                                  <button
                                    type="button"
                                    onClick={() => updateQuestion(idx, 'correctAnswer', optIdx.toString())}
                                    className={`w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 ${
                                      q.correctAnswer === optIdx.toString()
                                        ? 'bg-emerald-600 border-emerald-600 text-white'
                                        : 'bg-white text-slate-300 border-slate-200'
                                    }`}
                                    title="Mark as correct"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <div className="relative flex-1">
                                    <input
                                      value={opt}
                                      onChange={(e) => {
                                        const newOpts = [...q.options];
                                        newOpts[optIdx] = e.target.value;
                                        updateQuestion(idx, 'options', newOpts);
                                      }}
                                      className={au.wizardInput}
                                      placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                    />
                                    {q.options?.length > 2 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newOpts = q.options.filter((_, i) => i !== optIdx);
                                          updateQuestion(idx, 'options', newOpts);
                                          if (q.correctAnswer === optIdx.toString()) {
                                            updateQuestion(idx, 'correctAnswer', '');
                                          } else if (parseInt(q.correctAnswer, 10) > optIdx) {
                                            updateQuestion(idx, 'correctAnswer', (parseInt(q.correctAnswer, 10) - 1).toString());
                                          }
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover/opt:opacity-100"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  const newOpts = [...(q.options || []), ''];
                                  updateQuestion(idx, 'options', newOpts);
                                }}
                                className="flex items-center justify-center gap-2 p-3 border border-dashed border-slate-200 rounded-lg text-slate-500 hover:border-indigo-300 hover:text-indigo-600 text-xs font-medium"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add option
                              </button>
                            </div>
                          </div>
                        )}

                        {q.type === 'CODING' && (
                          <CodingQuestionEditor
                            question={q}
                            onChange={(updated) => {
                              const newQuestions = [...formData.questions];
                              newQuestions[idx] = { ...newQuestions[idx], ...updated };
                              setFormData({ ...formData, questions: newQuestions });
                            }}
                          />
                        )}
                      </div>
                    ))}

                    {formData.questions.length === 0 && (
                      <div className={`${au.emptyState} border border-dashed border-slate-200 rounded-xl`}>
                        No questions yet. Use Import from Excel or Add manually above.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="max-w-4xl mx-auto space-y-5">
                  <WizardSection
                    title="Question bank delivery"
                    description="Randomize order per student so shared papers are harder to coordinate."
                  >
                    <ToggleList>
                      {[
                        { key: 'shuffleQuestions', label: 'Shuffle questions', desc: 'Each student gets questions in a different order (locked for resume)' },
                        { key: 'shuffleOptions', label: 'Shuffle MCQ options', desc: 'Each student sees answer choices in a different order' },
                      ].map((feature) => (
                        <ToggleRow
                          key={feature.key}
                          icon={Layers}
                          label={feature.label}
                          description={feature.desc}
                          enabled={Boolean(formData.config[feature.key])}
                          onToggle={() =>
                            setFormData({
                              ...formData,
                              config: {
                                ...formData.config,
                                [feature.key]: !formData.config[feature.key],
                              },
                            })
                          }
                        />
                      ))}
                    </ToggleList>
                  </WizardSection>

                  <WizardSection
                    title="Proctoring & security"
                    description="Choose what to monitor while students take this assessment."
                  >
                    <ToggleList>
                      {[
                        { key: 'webcam', label: 'Webcam snapshots', icon: Camera, desc: 'Capture periodic images during the session' },
                        { key: 'mic', label: 'Microphone monitoring', icon: Mic, desc: 'Flag speech or sustained background noise' },
                        { key: 'tabSwitch', label: 'Tab switching', icon: Layers, desc: 'Log when the candidate leaves the assessment tab' },
                        { key: 'pauseOnTabSwitch', label: 'Pause on tab switch', icon: Maximize2, desc: 'After 2 warnings, lock the exam until an admin allows continue (timer freezes)' },
                        { key: 'fullscreen', label: 'Require fullscreen', icon: Maximize2, desc: 'Keep the assessment in fullscreen mode' },
                      ].map((feature) => (
                        <ToggleRow
                          key={feature.key}
                          icon={feature.icon}
                          label={feature.label}
                          description={feature.desc}
                          enabled={Boolean(formData.config.proctoring[feature.key])}
                          onToggle={() =>
                            setFormData({
                              ...formData,
                              config: {
                                ...formData.config,
                                proctoring: {
                                  ...formData.config.proctoring,
                                  [feature.key]: !formData.config.proctoring[feature.key],
                                },
                              },
                            })
                          }
                        />
                      ))}
                    </ToggleList>
                  </WizardSection>

                  {hasCodingQuestions && (
                    <AllowedCodingLanguagesPicker
                      selected={allowedLangs}
                      onChange={(ids) =>
                        setFormData({
                          ...formData,
                          config: mergeCodingIntoConfig(formData.config, {
                            allowedLanguages: ids,
                          }),
                        })
                      }
                    />
                  )}

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <p className="font-medium text-slate-900">Ready to publish?</p>
                    <p className="mt-1 text-xs leading-relaxed">
                      {formData.title || 'Untitled assessment'} · {formData.questions.length} question
                      {formData.questions.length === 1 ? '' : 's'} · {formData.duration} min
                      {formData.scheduleDate && formData.startClock
                        ? ` · starts ${formData.scheduleDate} at ${formData.startClock}`
                        : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <WizardFooter onBack={() => setStep((s) => s - 1)} backDisabled={step === 1}>
              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 1 && !formData.title?.trim()) {
                      toast?.error('Assessment title is required');
                      return;
                    }
                    setStep((s) => s + 1);
                  }}
                  className={au.btnPrimary}
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button type="button" onClick={handleSaveDraft} className={au.btnSecondary}>
                    Save draft
                  </button>
                  <button type="button" onClick={handlePublish} className={au.btnPrimary}>
                    Publish
                  </button>
                </>
              )}
            </WizardFooter>
          </div>
        </div>
      )}

      {/* Settings Modal Hookup */}
      {settingsAssessment && (
        <AssessmentSettingsModal
          assessment={settingsAssessment}
          onUpdate={fetchAssessments}
          onClose={() => setSettingsAssessment(null)}
        />
      )}
      {inviteAssessment && (
        <AssessmentInviteModal
          open
          assessmentId={inviteAssessment.id}
          assessmentTitle={inviteAssessment.title}
          onClose={() => setInviteAssessment(null)}
        />
      )}

    </>
  );
}
