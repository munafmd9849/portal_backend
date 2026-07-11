import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
  Plus, Search, Filter, MoreVertical, 
  Clock, Users, CheckCircle, AlertCircle,
  Settings, Trash2, Edit3, Eye, FileText, Camera,
  Video, Shield, Maximize2, Mic, AlertTriangle,
  Layout, BookOpen, Terminal, ChevronRight,
  MoreHorizontal, Activity, Target, X, Layers
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import AssessmentSettingsModal from '../../components/dashboard/admin/AssessmentSettingsModal';
import { fromDatetimeLocalValue } from '../../utils/assessmentEntryWindow';
import StudentSelectorModal from '../../components/dashboard/admin/StudentSelectorModal';
import DirectoryLoadingPanel from '../../components/dashboard/admin/DirectoryLoading';
import CodingQuestionEditor from '../../components/admin/CodingQuestionEditor';
import AssessmentQuestionExcelUpload from '../../components/admin/AssessmentQuestionExcelUpload';
import { au } from '../../components/assessment/assessmentUi';
import {
  WizardProgress,
  WizardSection,
  WizardField,
  ToggleList,
  ToggleRow,
  WizardFooter,
} from '../../components/assessment/WizardPrimitives';
import AllowedCodingLanguagesPicker from '../../components/admin/AllowedCodingLanguagesPicker';
import {
  createEmptyStarterCodesByLang,
  parseStarterCodesByLang,
  mergeCodingIntoConfig,
  ALL_CODING_LANGUAGE_IDS,
} from '../../coding-engine/starterCodeStorage';

const COMPLETED_SESSION_STATUSES = new Set(['SUBMITTED', 'COMPLETED', 'PENDING_REVIEW', 'TERMINATED']);

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

export default function AdminAssessments() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [settingsAssessment, setSettingsAssessment] = useState(null);
  const [step, setStep] = useState(1);
  const [batches, setBatches] = useState([]);
  const [showStudentSelector, setShowStudentSelector] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'MOCK_TEST', 
    difficulty: 'MEDIUM',
    duration: 60,
    startTime: '',
    endTime: '',
    questions: [],
    targetBatchIds: [],
    targetStudentIds: [],
    scheduledAtMap: {},
    config: {
      proctoring: { webcam: true, mic: true, tabSwitch: true, fullscreen: true, snapshotInterval: 60 },
      joinWindow: { opensMinutesBeforeStart: 10, closesMinutesAfterStart: 10 },
      coding: { allowedLanguages: [...ALL_CODING_LANGUAGE_IDS] },
    },
  });

  const hasCodingQuestions =
    formData.type === 'CODING_TEST' ||
    (formData.questions || []).some((q) => q.type === 'CODING');

  const fetchBatches = useCallback(async () => {
    try {
      const data = await api.getBatches();
      setBatches(data);
    } catch (e) {
      console.error('Failed to load batches');
    }
  }, []);

  const fetchAssessments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getAssessments();
      const list = Array.isArray(data) ? data : (data?.assessments || []);
      setAssessments(list);
    } catch (e) {
      toast?.error(e?.message || 'Failed to load assessments');
      setAssessments([]);
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
  const [studentSearch, setStudentSearch] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    if (step === 3 && formData.type === 'MOCK_INTERVIEW_LIVE') {
      const fetchStudents = async () => {
        try {
          setLoadingStudents(true);
          const data = await api.getAllStudents();
          setAvailableStudents(data?.students || (Array.isArray(data) ? data : []));
        } catch (e) {
          console.error('Failed to load students');
        } finally {
          setLoadingStudents(false);
        }
      };
      fetchStudents();
    }
  }, [step, formData.type]);

  const filteredStudents = Array.isArray(availableStudents) 
    ? availableStudents.filter(s => 
        s.fullName?.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.enrollmentId?.toLowerCase().includes(studentSearch.toLowerCase())
      )
    : [];

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

  const buildAssessmentPayload = (publish) => ({
    ...formData,
    title: formData.title?.trim(),
    config: mergeCodingIntoConfig(formData.config, {
      allowedLanguages: hasCodingQuestions ? allowedLangs : undefined,
    }),
    questions: (formData.questions || []).map((q) =>
      q.type === 'CODING'
        ? { ...q, starterCodes: parseStarterCodesByLang(q.starterCodes ?? q.starterCode) }
        : q
    ),
    startTime: fromDatetimeLocalValue(formData.startTime),
    endTime: fromDatetimeLocalValue(formData.endTime),
    joinOpensMinutesBeforeStart: formData.config?.joinWindow?.opensMinutesBeforeStart,
    joinClosesMinutesAfterStart: formData.config?.joinWindow?.closesMinutesAfterStart,
    allowedCodingLanguages: hasCodingQuestions ? allowedLangs : undefined,
    publish,
  });

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
          examples: [{ input: '', output: '', explanation: '' }],
          testCases: [{ input: '', expectedOutput: '', hidden: false }]
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

  return (
    <>
      <div className="space-y-5 p-4 sm:p-6 max-w-[1600px] mx-auto">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setStep(1);
              setShowCreateModal(true);
            }}
            className={`flex items-center justify-center gap-2 ${au.btnPrimary}`}
          >
            <Plus className="w-4 h-4" /> New assessment
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total', val: totalAssessments },
            { label: 'Upcoming', val: upcomingScheduled },
            { label: 'Active', val: activeSessions },
            { label: 'Completed', val: completedAttempts },
          ].map((stat, i) => (
            <div
              key={i}
              className={`${au.statCard} flex flex-col gap-1`}
            >
              <p className={au.statLabel}>{stat.label}</p>
              <p className={`text-xl ${au.statValue}`}>{stat.val}</p>
            </div>
          ))}
        </div>

        <div className={`${au.panel} flex flex-col`}>
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className={`grid w-full grid-cols-4 gap-1 rounded-lg ${au.tabBar} lg:max-w-3xl lg:flex-1`}>
              {[
                { id: 'all', label: 'All', shortLabel: 'All', count: totalAssessments },
                { id: 'active', label: 'Active', shortLabel: 'Active', count: activeAssessmentsCount },
                { id: 'upcoming', label: 'Upcoming', shortLabel: 'Upcoming', count: upcomingScheduled },
                { id: 'past', label: 'Past', shortLabel: 'Past', count: pastAssessmentsCount },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors sm:gap-2 sm:px-3 ${
                    activeTab === tab.id ? au.tabActive : au.tabIdle
                  }`}
                >
                  <span className="hidden sm:inline whitespace-nowrap">{tab.label}</span>
                  <span className="sm:hidden whitespace-nowrap">{tab.shortLabel}</span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] tabular-nums ${
                      activeTab === tab.id ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative w-full shrink-0 lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search assessments…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="p-4">
            {loading ? (
              <DirectoryLoadingPanel title="Loading assessments..." subtitle="Please wait while we fetch the data" />
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
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
                  >
                    Create assessment
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAssessments.map((item) => (
            <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors flex flex-col h-full">
              <div className="flex justify-between items-start mb-3 gap-2">
                <span className="text-xs text-gray-500 font-medium">
                  {item.type?.replace(/_/g, ' ')}
                </span>
                {assessmentIsDraft(item) && (
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded border bg-amber-50 border-amber-200 text-amber-800">
                    Draft
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 mb-1 truncate">{item.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 mb-4">{item.description || 'No description.'}</p>

                <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
                  <span>{item.duration} min</span>
                  <span>{item.sessions?.length || 0} attempts</span>
                  <span>{item.questions?.length || 0} questions</span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
                {assessmentIsDraft(item) ? (
                  <button
                    type="button"
                    onClick={() => handlePublishExisting(item.id)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Publish
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate(`${basePath}/assessments/${item.id}/live-monitor`)}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                      <Video className="w-3.5 h-3.5" /> Live monitor
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`${basePath}?tab=assessmentResults&assessmentId=${item.id}`)}
                      className="w-full py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-medium rounded-md transition-colors"
                    >
                      Results
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setSettingsAssessment(item)}
                  className="w-full py-2 text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-md transition-colors flex items-center justify-center gap-2 text-xs font-medium"
                >
                  <Settings className="w-3.5 h-3.5" /> Settings
                </button>
              </div>
            </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full-Screen Overlay Components - Placed outside animated container to ensure true fixed inset-0 */}
      
      {/* Creation Wizard - Clean Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-[9999] flex items-center justify-center p-4">
          <div className={`${au.modalLg} h-[85vh]`}>
            <div className={au.modalHeader}>
               <div>
                  <p className={au.modalTitle}>New assessment</p>
                  <p className={au.modalSubtitle}>Step {step} of 3</p>
               </div>
               <button 
                 type="button"
                 onClick={() => setShowCreateModal(false)}
                 className={au.closeBtn}
               >
                 <X className="w-5 h-5" />
               </button>
            </div>

            <WizardProgress step={step} total={3} />

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar bg-white">
               {step === 1 && (
                 <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-2.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Assessment Title</label>
                          <input 
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 ring-indigo-500/10 outline-none font-bold text-slate-900 transition-all" 
                            placeholder="e.g. SOT Fullstack Mock Test" 
                          />
                       </div>
                       <div className="space-y-2.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Assessment Category</label>
                          <div className="grid grid-cols-2 gap-2">
                             {[
                               { id: 'MOCK_TEST', label: 'MCQ Test', icon: FileText },
                               { id: 'CODING_TEST', label: 'Coding', icon: Terminal },
                               { id: 'DESCRIPTIVE', label: 'Descriptive', icon: BookOpen },
                               { id: 'MIXED', label: 'Mixed Mode', icon: Layers }
                             ].map(type => (
                               <button 
                                 key={type.id}
                                 onClick={() => setFormData({...formData, type: type.id})}
                                 className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${formData.type === type.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md shadow-indigo-500/5' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'}`}
                               >
                                 <type.icon className="w-4 h-4 flex-shrink-0" />
                                 <span className="text-[10px] font-bold uppercase truncate">{type.label}</span>
                               </button>
                             ))}
                          </div>
                       </div>
                    </div>

                    <div className="space-y-2.5">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Assessment Description</label>
                       <textarea 
                         value={formData.description}
                         onChange={e => setFormData({...formData, description: e.target.value})}
                         className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 ring-indigo-500/10 outline-none font-medium text-slate-700 h-32 resize-none transition-all shadow-inner" 
                         placeholder="Describe the scope and rules of this test..." 
                       />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                       {[
                         { label: 'Duration (Min)', type: 'number', key: 'duration' },
                         { label: 'Scheduled Start', type: 'datetime-local', key: 'startTime' },
                         { label: 'Overall End (optional)', type: 'datetime-local', key: 'endTime' },
                       ].map((field) => (
                         <div key={field.key} className="space-y-2.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{field.label}</label>
                            <input
                              type={field.type}
                              value={formData[field.key]}
                              onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 ring-indigo-500/10 outline-none font-bold text-slate-900 transition-all text-xs"
                            />
                         </div>
                       ))}
                    </div>

                    <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-4">
                      <p className="text-xs font-bold text-indigo-900">Join window (when students can enter)</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Can join before start (minutes)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={formData.config.joinWindow.opensMinutesBeforeStart}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                config: {
                                  ...formData.config,
                                  joinWindow: {
                                    ...formData.config.joinWindow,
                                    opensMinutesBeforeStart: parseInt(e.target.value, 10) || 0,
                                  },
                                },
                              })
                            }
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Must join within after start (minutes)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={formData.config.joinWindow.closesMinutesAfterStart}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                config: {
                                  ...formData.config,
                                  joinWindow: {
                                    ...formData.config.joinWindow,
                                    closesMinutesAfterStart: parseInt(e.target.value, 10) || 0,
                                  },
                                },
                              })
                            }
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium">
                        Example: start 10:00, join within 10 min after start → students must enter by 10:10.
                        Pre-check can open 10 min early if you set 10 above.
                      </p>
                    </div>
                 </div>
               )}

               {step === 2 && (
                 <div className="max-w-4xl mx-auto space-y-5">
                    <AssessmentQuestionExcelUpload onImport={handleExcelQuestionsImport} />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-slate-200 bg-slate-50">
                       <p className="text-sm text-slate-600">
                         {formData.questions.length
                           ? `${formData.questions.length} question${formData.questions.length === 1 ? '' : 's'} in this assessment`
                           : 'Add questions manually or upload from Excel.'}
                       </p>
                       <button 
                         type="button"
                         onClick={addQuestion}
                         className={`${au.btnPrimary} text-xs shrink-0`}
                       >
                         <Plus className="w-4 h-4" /> Add question
                       </button>
                    </div>

                    <div className="space-y-4">
                       {formData.questions.map((q, idx) => (
                         <div key={idx} className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm space-y-6 relative group">
                            <button 
                              onClick={() => {
                                const newQs = [...formData.questions];
                                newQs.splice(idx, 1);
                                setFormData({ ...formData, questions: newQs });
                              }}
                              className="absolute top-4 right-4 w-8 h-8 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                               {q.type !== 'CODING' && (
                               <div className="md:col-span-8 space-y-2.5">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Question {idx + 1}</label>
                                  <input 
                                     value={q.text}
                                     onChange={e => updateQuestion(idx, 'text', e.target.value)}
                                     className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:ring-2 ring-indigo-500/10 outline-none transition-all" 
                                     placeholder="Enter question text here..." 
                                  />
                               </div>
                               )}
                               {q.type === 'CODING' && <div className="md:col-span-8" />}
                               <div className="md:col-span-4 space-y-2.5">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Type & Points</label>
                                  <div className="flex gap-2">
                                     <select 
                                       value={q.type}
                                       onChange={e => updateQuestion(idx, 'type', e.target.value)}
                                       className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[10px] uppercase tracking-widest cursor-pointer outline-none focus:ring-2 ring-indigo-500/10"
                                     >
                                       <option value="MCQ">MCQ</option>
                                       <option value="CODING">Coding</option>
                                       <option value="DESCRIPTIVE">Descriptive</option>
                                     </select>
                                     <input 
                                       type="number"
                                       value={q.points}
                                       onChange={e => updateQuestion(idx, 'points', e.target.value)}
                                       className="w-20 p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-center outline-none focus:ring-2 ring-indigo-500/10" 
                                     />
                                  </div>
                               </div>
                            </div>

                            {q.type === 'MCQ' && (
                              <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-100 space-y-4">
                                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Options (Click Circle to Mark Correct)</label>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(q.options || ['', '', '', '']).map((opt, optIdx) => (
                                      <div key={optIdx} className="flex gap-2 group/opt">
                                         <button 
                                           onClick={() => updateQuestion(idx, 'correctAnswer', optIdx.toString())}
                                           className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all border shrink-0 ${q.correctAnswer === optIdx.toString() ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white text-slate-300 border-slate-200'}`}
                                           title="Mark as correct"
                                         >
                                            <CheckCircle className="w-4 h-4" />
                                         </button>
                                         <div className="relative flex-1">
                                           <input 
                                             value={opt}
                                             onChange={e => {
                                               const newOpts = [...q.options];
                                               newOpts[optIdx] = e.target.value;
                                               updateQuestion(idx, 'options', newOpts);
                                             }}
                                             className="w-full p-3 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-400 transition-all pr-10" 
                                             placeholder={`Option ${String.fromCharCode(65 + optIdx)}`} 
                                           />
                                           {q.options?.length > 2 && (
                                             <button 
                                               onClick={() => {
                                                 const newOpts = q.options.filter((_, i) => i !== optIdx);
                                                 updateQuestion(idx, 'options', newOpts);
                                                 if (q.correctAnswer === optIdx.toString()) {
                                                   updateQuestion(idx, 'correctAnswer', '');
                                                 } else if (parseInt(q.correctAnswer) > optIdx) {
                                                   updateQuestion(idx, 'correctAnswer', (parseInt(q.correctAnswer) - 1).toString());
                                                 }
                                               }}
                                               className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover/opt:opacity-100"
                                               title="Remove option"
                                             >
                                               <Trash2 className="w-3.5 h-3.5" />
                                             </button>
                                           )}
                                         </div>
                                      </div>
                                    ))}
                                    <button 
                                      onClick={() => {
                                        const newOpts = [...(q.options || []), ''];
                                        updateQuestion(idx, 'options', newOpts);
                                      }}
                                      className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-indigo-300 hover:text-indigo-600 transition-all text-[10px] font-bold uppercase tracking-widest"
                                    >
                                       <Plus className="w-3.5 h-3.5" /> Add Option
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
                         <div className="py-20 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-slate-300">
                            <Layers className="w-12 h-12 mb-3 opacity-20" />
                            <p className="font-bold text-xs">No questions defined yet.</p>
                         </div>
                       )}
                    </div>
                 </div>
               )}

               {step === 3 && (
                 <div className="max-w-3xl mx-auto space-y-6">
                    <WizardSection
                      title="Proctoring & security"
                      description="Choose what to monitor while students take this assessment."
                    >
                      <ToggleList>
                        {[
                          { key: 'webcam', label: 'Webcam snapshots', icon: Camera, desc: 'Capture periodic images during the session' },
                          { key: 'mic', label: 'Microphone monitoring', icon: Mic, desc: 'Flag speech or sustained background noise' },
                          { key: 'tabSwitch', label: 'Tab switching', icon: Layers, desc: 'Log when the candidate leaves the assessment tab' },
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

                    <WizardSection
                      title="Target audience"
                      description="Assign batches or pick individual students."
                    >
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
                          {batches.map(batch => (
                            <button 
                              key={batch.id}
                              type="button"
                              onClick={() => {
                                const ids = formData.targetBatchIds.includes(batch.id)
                                  ? formData.targetBatchIds.filter(id => id !== batch.id)
                                  : [...formData.targetBatchIds, batch.id];
                                setFormData({...formData, targetBatchIds: ids});
                              }}
                              className={`p-3 rounded-lg border text-left transition-colors ${
                                formData.targetBatchIds.includes(batch.id)
                                ? 'border-indigo-600 bg-indigo-50'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <div className="text-sm font-medium text-slate-900">{batch.label || batch.year}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{batch.school?.name || 'General batch'}</div>
                            </button>
                          ))}
                       </div>
                       
                       <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-500">
                            {formData.targetBatchIds.length} batch{formData.targetBatchIds.length === 1 ? '' : 'es'} selected
                          </span>
                          <button 
                             type="button"
                             onClick={() => setShowStudentSelector(true)}
                             className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                           >
                             Select students
                           </button>
                       </div>
                    </WizardSection>
                 </div>
               )}
            </div>

            <WizardFooter
              onBack={() => setStep(step - 1)}
              backDisabled={step === 1}
            >
               {step < 3 ? (
                 <button 
                   type="button"
                   onClick={() => setStep(step + 1)}
                   className={`${au.btnPrimary}`}
                 >
                   Continue <ChevronRight className="w-4 h-4" />
                 </button>
               ) : (
                 <>
                   <button
                     type="button"
                     onClick={handleSaveDraft}
                     className={au.btnSecondary}
                   >
                     Save draft
                   </button>
                   <button
                     type="button"
                     onClick={handlePublish}
                     className={au.btnPrimary}
                   >
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

      {/* Student Selector Modal for Advanced Targeting */}
      <StudentSelectorModal 
        isOpen={showStudentSelector}
        onClose={() => setShowStudentSelector(false)}
        onSelect={(studentIds) => {
          setFormData({ ...formData, targetStudentIds: studentIds });
          toast?.success(`${studentIds.length} students selected for targeting`);
        }}
        initialSelected={formData.targetStudentIds}
        jobTitle={formData.title || 'New Assessment'}
      />
    </>
  );
}
