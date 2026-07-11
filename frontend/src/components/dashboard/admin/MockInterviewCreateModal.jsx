import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Video,
  X,
  ChevronRight,
  Calendar,
  Clock,
  BookOpen,
  Info,
  Users,
  Layout,
  MessageSquare,
  Terminal,
  CheckCircle2,
  Plus,
  Search,
  AlertCircle,
} from 'lucide-react';
import api from '../../../services/api';
import { useToast } from '../../ui/Toast';
import { au } from '../../assessment/assessmentUi';
import {
  WizardProgress,
  WizardField,
  WizardFooter,
  WizardModalHeader,
  StatHighlight,
  ToggleRow,
} from '../../assessment/WizardPrimitives';
import { createCodingQuestion } from '../../../utils/mockInterviewQuestions';

const INITIAL_FORM = {
  title: '',
  category: 'TECHNICAL',
  enableCodeConsole: true,
  description: '',
  instructions: '',
  date: '',
  startTime: '',
  endTime: '',
  slotDuration: 30,
  bufferTime: 0,
  targetBatches: [],
  targetBranches: [],
  targetStudentIds: [],
};

const CATEGORIES = [
  { id: 'TECHNICAL', label: 'Technical', icon: Layout },
  { id: 'HR', label: 'HR Interview', icon: Users },
  { id: 'BEHAVIORAL', label: 'Behavioral', icon: MessageSquare },
  { id: 'COMMUNICATION', label: 'Communication', icon: BookOpen },
  { id: 'GD_PREP', label: 'GD Prep', icon: Users },
];

function estimateSlots(formData) {
  if (!formData.startTime || !formData.endTime) return 0;
  const mins =
    (new Date(`2000-01-01T${formData.endTime}`) - new Date(`2000-01-01T${formData.startTime}`)) /
    60000;
  const block = parseInt(formData.slotDuration, 10);
  if (!block || mins <= 0) return 0;
  return Math.floor(mins / block);
}

export default function MockInterviewCreateModal({ isOpen, onClose, onSuccess }) {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [codingQuestions, setCodingQuestions] = useState([]);

  const resetForm = useCallback(() => {
    setStep(1);
    setFormData(INITIAL_FORM);
    setSelectedStudents([]);
    setStudentSearch('');
    setCodingQuestions([]);
  }, []);

  const loadStudents = useCallback(async () => {
    try {
      const res = await api.getAllStudents();
      setStudents(res.students || []);
    } catch {
      console.error('Failed to load students');
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetForm();
      loadStudents();
    }
  }, [isOpen, resetForm, loadStudents]);

  const filteredStudents = useMemo(
    () =>
      students.filter(
        (s) =>
          s.fullName?.toLowerCase().includes(studentSearch.toLowerCase()) ||
          s.email?.toLowerCase().includes(studentSearch.toLowerCase())
      ),
    [students, studentSearch]
  );

  const estSlots = estimateSlots(formData);

  const toggleStudent = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const validateStep = (s) => {
    if (s === 1) {
      if (!formData.title.trim()) {
        toast.error('Interview title is required');
        return false;
      }
      return true;
    }
    if (s === 2) {
      if (!formData.date || !formData.startTime || !formData.endTime) {
        toast.error('Date and time window are required');
        return false;
      }
      const start = new Date(`${formData.date}T${formData.startTime}`);
      const end = new Date(`${formData.date}T${formData.endTime}`);
      if (end <= start) {
        toast.error('End time must be after start time');
        return false;
      }
      if (estSlots < 1) {
        toast.error('Time window is too short for at least one slot');
        return false;
      }
      return true;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(3, s + 1));
  };

  const buildPayload = (publish) => {
    const startDateTime =
      formData.date && formData.startTime
        ? new Date(`${formData.date}T${formData.startTime}`)
        : null;
    const endDateTime =
      formData.date && formData.endTime
        ? new Date(`${formData.date}T${formData.endTime}`)
        : null;
    return {
      ...formData,
      date: formData.date || undefined,
      slotDuration: parseInt(formData.slotDuration, 10) || 30,
      breakDuration: 0,
      bufferTime: parseInt(formData.bufferTime, 10) || 0,
      startTime: startDateTime?.toISOString(),
      endTime: endDateTime?.toISOString(),
      targetStudentIds: selectedStudents,
      enableCodeConsole: Boolean(formData.enableCodeConsole),
      codingQuestions: formData.enableCodeConsole ? codingQuestions : [],
      publish,
    };
  };

  const handleSaveDraft = async () => {
    if (!validateStep(1)) return;
    setSubmitting(true);
    try {
      const res = await api.createMockInterviewDrive(buildPayload(false));
      toast.success('Draft saved — publish when schedule is ready');
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast.error(err.message || 'Failed to save draft');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async () => {
    if (!validateStep(1) || !validateStep(2)) return;
    setSubmitting(true);
    try {
      const res = await api.createMockInterviewDrive(buildPayload(true));
      toast.success(
        `Published · ${res.slotsGenerated} slots · ${res.studentsAssigned} students assigned`
      );
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast.error(err.message || 'Failed to publish mock interview drive');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={au.backdropLg}>
      <div className={`${au.modalLg} h-[85vh]`}>
        <WizardModalHeader
          title="New mock interview drive"
          subtitle={`Step ${step} of 3`}
          onClose={onClose}
          icon={Video}
        />

        <WizardProgress step={step} total={3} />

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar bg-white">
          {step === 1 && (
            <div className="max-w-3xl mx-auto space-y-5">
              <WizardField label="Drive title">
                <input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={au.wizardInput}
                  placeholder="e.g. Q2 technical round — frontend"
                />
              </WizardField>

              <WizardField label="Interview category">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          category: cat.id,
                          enableCodeConsole: cat.id === 'TECHNICAL',
                        })
                      }
                      className={`p-3 rounded-lg border transition-colors flex items-center gap-2.5 text-left ${
                        formData.category === cat.id
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <cat.icon className="w-4 h-4 shrink-0" />
                      <span className="text-sm font-medium truncate">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </WizardField>

              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                <ToggleRow
                  icon={Terminal}
                  label="Code console (tech board)"
                  description="Shared coding panel for technical rounds. Turn off for HR or video-only sessions."
                  enabled={formData.enableCodeConsole}
                  onToggle={() =>
                    setFormData({ ...formData, enableCodeConsole: !formData.enableCodeConsole })
                  }
                />
              </div>

              <WizardField label="Description">
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={au.wizardTextarea}
                  placeholder="What is this mock interview for? Who should attend?"
                />
              </WizardField>

              <WizardField label="Instructions for students">
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  className={au.wizardTextarea}
                  rows={3}
                  placeholder="Preparation tips, prerequisites..."
                />
              </WizardField>
            </div>
          )}

          {step === 2 && (
            <div className="max-w-3xl mx-auto space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <WizardField label="Interview date">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className={`${au.wizardInput} pl-10`}
                    />
                  </div>
                </WizardField>
                <div className="grid grid-cols-2 gap-3">
                  <WizardField label="Start time">
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className={au.wizardInput}
                    />
                  </WizardField>
                  <WizardField label="End time">
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className={au.wizardInput}
                    />
                  </WizardField>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'slotDuration', label: 'Slot duration (minutes)' },
                  { key: 'bufferTime', label: 'Buffer between slots (minutes)' },
                ].map((field) => (
                  <WizardField key={field.key} label={field.label}>
                    <input
                      type="number"
                      min={0}
                      value={formData[field.key]}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      className={au.wizardInput}
                    />
                  </WizardField>
                ))}
              </div>

              {formData.enableCodeConsole && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Coding questions (optional)</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Pre-load problems for the live room, or add them during the interview.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCodingQuestions((prev) => [...prev, createCodingQuestion()])}
                      className={`${au.btnPrimary} text-xs`}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                  {codingQuestions.length === 0 ? (
                    <p className="text-xs text-slate-500">No questions added yet.</p>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {codingQuestions.map((q, idx) => (
                        <div key={q.id} className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-600">Question {idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => setCodingQuestions((prev) => prev.filter((x) => x.id !== q.id))}
                              className="text-xs text-rose-600 hover:text-rose-700"
                            >
                              Remove
                            </button>
                          </div>
                          <input
                            value={q.title}
                            onChange={(e) =>
                              setCodingQuestions((prev) =>
                                prev.map((x) => (x.id === q.id ? { ...x, title: e.target.value } : x))
                              )
                            }
                            placeholder="Title"
                            className={au.wizardInput}
                          />
                          <textarea
                            value={q.description}
                            onChange={(e) =>
                              setCodingQuestions((prev) =>
                                prev.map((x) => (x.id === q.id ? { ...x, description: e.target.value } : x))
                              )
                            }
                            placeholder="Problem statement"
                            rows={2}
                            className={au.wizardTextarea}
                          />
                          <textarea
                            value={q.starterCode || ''}
                            onChange={(e) =>
                              setCodingQuestions((prev) =>
                                prev.map((x) => (x.id === q.id ? { ...x, starterCode: e.target.value } : x))
                              )
                            }
                            placeholder="Starter code"
                            rows={4}
                            className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg resize-none bg-slate-800 text-slate-100"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <StatHighlight
                icon={Clock}
                label="Estimated slots"
                value={estSlots}
                hint="Generated on publish. Selected students are assigned in order."
              />
            </div>
          )}

          {step === 3 && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Assign candidates</h3>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Optional — limit who receives automatic slot assignment.
                  </p>
                </div>
                <p className="text-sm text-slate-600 tabular-nums">
                  <span className="font-semibold text-slate-900">{selectedStudents.length}</span> selected
                  <span className="text-slate-400 mx-1">·</span>
                  {students.length} available
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name or email"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className={au.searchInput}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => toggleStudent(student.id)}
                      className={`p-3 flex items-center justify-between rounded-lg border transition-colors text-left ${
                        selectedStudents.includes(student.id)
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium shrink-0 ${
                            selectedStudents.includes(student.id)
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {student.fullName?.[0] || '?'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">{student.fullName}</div>
                          <div className="text-xs text-slate-500 truncate">{student.batch || student.email}</div>
                        </div>
                      </div>
                      {selectedStudents.includes(student.id) ? (
                        <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                      ) : (
                        <Plus className="w-4 h-4 text-slate-300 shrink-0" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className={`col-span-full ${au.emptyState}`}>No candidates match your search</div>
                )}
              </div>
            </div>
          )}
        </div>

        <WizardFooter onBack={() => setStep((s) => s - 1)} backDisabled={step === 1}>
            {step < 3 ? (
              <button type="button" onClick={goNext} className={au.btnPrimary}>
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button type="button" onClick={handleSaveDraft} disabled={submitting} className={au.btnSecondary}>
                  Save draft
                </button>
                <button type="button" onClick={handlePublish} disabled={submitting} className={au.btnPrimary}>
                  {submitting ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : null}
                  Publish drive
                </button>
              </>
            )}
        </WizardFooter>
      </div>
    </div>
  );
}
