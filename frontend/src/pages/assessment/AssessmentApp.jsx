import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Shield, AlertTriangle, Clock, ChevronRight, ChevronLeft, 
  CheckCircle, XCircle, Video, Code, FileText,
  Maximize2, Terminal, AlertCircle, Save, Send, Ban, ScanFace, Flag, Monitor
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { LoadingPage, Spinner } from '../../components/ui/loading';
import {
  CodingWorkspace,
  parseCodingAnswer,
  serializeCodingAnswer,
  parseTestCases,
  parseExamples,
  getPublicTestCases,
  parseStarterCodesByLang,
  getStarterForLanguage,
  parseAllowedCodingLanguages,
  VERDICT_LABEL,
} from '../../coding-engine';
import CodingProblemPanel from '../../components/coding/CodingProblemPanel';
import ProctoringConsole from '../../components/assessment/ProctoringConsole';
import SecureExamStatusBar from '../../components/assessment/SecureExamStatusBar';
import ViolationTimeline from '../../components/assessment/ViolationTimeline';
import AssessmentModal from '../../components/assessment/AssessmentModal';
import { au } from '../../components/assessment/assessmentUi';
import { ProctoringEngine } from '../../proctoring-engine/ProctoringEngine';
import { defaultProctoringConfig, formatViolationLabel } from '../../proctoring-engine/constants';
import { auditDisplayEnvironment } from '../../proctoring-engine/screenShareGuard';
import { createAssessmentSecurityMonitor } from '../../proctoring-engine/assessmentSecurityMonitor';
import {
  getAssessmentEntryStatus,
  formatAssessmentWindow,
} from '../../utils/assessmentEntryWindow';
import { getJitsiDomain } from '../../utils/jitsiMeet';
import { normalizeMcqAnswer } from '../../utils/mcqAnswers';
import {
  getRemainingSecondsFromSession,
  resolveSessionRemainingSeconds,
} from '../../utils/assessmentTimer';
import { initSocket, subscribeAssessmentSessionControl } from '../../services/socket';
import { ProctoringBroadcaster } from '../../proctoring-engine/liveProctoringRtc';
import { getExamDeviceId } from '../../utils/examDevice';

function draftStorageKey(sessionId) {
  return `pwioi_exam_draft_${sessionId}`;
}

function readLocalDraft(sessionId) {
  if (!sessionId) return null;
  try {
    const raw = localStorage.getItem(draftStorageKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function writeLocalDraft(sessionId, answers, markedForReview = []) {
  if (!sessionId) return;
  try {
    localStorage.setItem(
      draftStorageKey(sessionId),
      JSON.stringify({
        answers,
        markedForReview: Array.isArray(markedForReview) ? markedForReview : [],
        savedAt: new Date().toISOString(),
      })
    );
  } catch {
    /* quota / private mode */
  }
}

function clearLocalDraft(sessionId) {
  if (!sessionId) return;
  try {
    localStorage.removeItem(draftStorageKey(sessionId));
  } catch {
    /* ignore */
  }
}

function hydrateAssessmentDetails(details) {
  if (!details) return details;
  const allowedCodingLanguages = parseAllowedCodingLanguages(details.config);
  const questions = (details.questions || []).map((q) => ({
    ...q,
    testCases: parseTestCases(q.testCases),
    starterCodesByLang: parseStarterCodesByLang(q.starterCode ?? q.starterCodes),
  }));
  return { ...details, questions, allowedCodingLanguages };
}

const STUDENT_ASSESSMENTS_PATH = '/student?tab=assessments';
const DONE_SESSION_STATUSES = new Set([
  'COMPLETED',
  'PENDING_REVIEW',
  'AUTO_SUBMITTED',
  'TERMINATED',
]);

function isAnswered(value) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return true;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return Boolean(value);
}

function isQuestionAnswered(question, value) {
  if (question?.type === 'CODING') {
    if (value == null || value === '') return false;
    const parsed = parseCodingAnswer(value, 'javascript');
    const code = String(parsed.code || '').trim();
    if (!code) return false;
    const starter = String(
      getStarterForLanguage(question.starterCodesByLang, parsed.language) || ''
    ).trim();
    if (starter && code === starter) return false;
    return true;
  }
  return isAnswered(value);
}

function isAlreadySubmittedError(error) {
  const status = error?.status || error?.response?.status;
  const data = error?.response?.data || {};
  if (status === 409) return true;
  const msg = String(data.error || error?.message || '').toLowerCase();
  return msg.includes('already submitted') || msg.includes('already completed');
}

const FULLSCREEN_PAUSE_REASON = 'FULLSCREEN_EXIT';
const FOCUS_LOST_PAUSE_REASON = 'FOCUS_LOST';
const SCREEN_CAPTURE_PAUSE_REASON = 'SCREEN_CAPTURE';

function getIntegrityFailure(secureStatus, proctorCfg) {
  if (!proctorCfg || !secureStatus) return null;
  if (proctorCfg.fullscreenRequired && !secureStatus.fullscreen) return 'fullscreen';
  if (proctorCfg.cameraRequired && !secureStatus.camera) return 'camera';
  if (proctorCfg.micRequired && !secureStatus.microphone) return 'mic';
  return null;
}

function pauseOverlayCopy(reason) {
  const r = String(reason || '');
  if (r === FULLSCREEN_PAUSE_REASON) {
    return {
      title: 'Exam locked — left fullscreen',
      body: 'You exited fullscreen mode. Your answers are saved and the timer is frozen. An admin must click Allow continue on the live monitor.',
      adminOnly: true,
    };
  }
  if (r === FOCUS_LOST_PAUSE_REASON) {
    return {
      title: 'Exam locked — focus lost',
      body: 'The exam window lost focus. Your answers are saved and the timer is frozen. An admin must click Allow continue on the live monitor.',
      adminOnly: true,
    };
  }
  if (r.startsWith('ADMIN')) {
    return {
      title: 'Exam paused by admin',
      body: 'A proctor paused your attempt for review. Your answers are saved and the timer is frozen. This screen unlocks automatically when they allow you to continue.',
      adminOnly: true,
    };
  }
  if (r === 'DEVTOOLS') {
    return {
      title: 'Exam locked — developer tools',
      body: 'Developer tools or view-source was detected. Your answers are saved and the timer is frozen. An admin must click Allow continue on the live monitor.',
      adminOnly: true,
    };
  }
  if (r === 'HEARTBEAT_MISSED') {
    return {
      title: 'Exam locked — connection lost',
      body: 'The exam lost contact with this browser tab for too long. Your answers are saved. An admin must click Allow continue on the live monitor.',
      adminOnly: true,
    };
  }
  if (r === 'SCREEN_SHARE' || r === SCREEN_CAPTURE_PAUSE_REASON) {
    return {
      title: 'Security violation',
      body: 'Screen capture/sharing activity was detected. Your assessment has been paused. Stop the capture and complete the security re-check to continue.',
      adminOnly: false,
      showSecurityRecovery: true,
    };
  }
  return {
    title: 'Exam locked — tab switch limit',
    body: 'You switched tabs or windows more than allowed. Answers are saved. Ask an admin to click Allow continue on the live monitor. Your timer is frozen until then.',
    adminOnly: true,
  };
}

function integrityOverlayCopy(kind) {
  if (kind === 'camera') {
    return {
      title: 'Camera required',
      body: 'Your camera must stay on for the entire exam. Turn it back on to continue answering.',
      action: 'Enable camera',
    };
  }
  if (kind === 'mic') {
    return {
      title: 'Microphone required',
      body: 'Your microphone must stay on for the entire exam. Re-enable it to continue answering.',
      action: 'Enable microphone',
    };
  }
  return {
    title: 'Fullscreen required',
    body: 'The exam must run in fullscreen. Return to fullscreen to continue answering.',
    action: 'Enter fullscreen',
  };
}

function sessionTimerAlreadyStarted(sess) {
  if (!sess) return false;
  if (sess.timerStarted === true) return true;
  let meta = sess.secureModeMeta;
  if (typeof meta === 'string') {
    try {
      meta = JSON.parse(meta);
    } catch {
      meta = {};
    }
  }
  meta = meta && typeof meta === 'object' ? meta : {};
  return Boolean(
    meta.timerStartedAt ||
      meta.readyAt ||
      meta.securityState === 'IN_PROGRESS' ||
      meta.securityState === 'SECURITY_PAUSED'
  );
}

function mergeSessionTimer(prev, { remainingSeconds, extraSeconds, paused, pauseReason } = {}) {
  if (!prev) return prev;
  let meta = prev.secureModeMeta;
  if (typeof meta === 'string') {
    try {
      meta = JSON.parse(meta);
    } catch {
      meta = {};
    }
  }
  if (!meta || typeof meta !== 'object') meta = {};
  const nextMeta = { ...meta };
  if (extraSeconds != null && Number.isFinite(Number(extraSeconds))) {
    nextMeta.extraSeconds = Number(extraSeconds);
  }
  return {
    ...prev,
    paused: paused == null ? prev.paused : Boolean(paused),
    pauseReason: pauseReason !== undefined ? pauseReason : prev.pauseReason,
    remainingSeconds: Number.isFinite(remainingSeconds) ? remainingSeconds : prev.remainingSeconds,
    extraSeconds: extraSeconds != null ? extraSeconds : prev.extraSeconds,
    secureModeMeta: nextMeta,
  };
}

function MetaSegment({ label, highlight = false }) {
  return (
    <div className="flex items-center px-4 py-2.5 border-l border-slate-200 first:border-l-0">
      <span
        className={`text-xs font-medium whitespace-nowrap ${
          highlight ? 'text-indigo-600' : 'text-slate-600'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function QuestionMetaBar({ question, questionIndex }) {
  const metaSegments = [
    { label: question?.type },
    ...(question?.difficulty ? [{ label: question.difficulty }] : []),
    ...(question?.points != null ? [{ label: `${question.points} pts`, highlight: true }] : []),
  ];

  return (
    <div className="bg-white border border-slate-200/80 rounded-lg shadow-sm overflow-hidden shrink-0">
      <div className="flex items-stretch justify-between">
        <MetaSegment label={`Question ${questionIndex + 1}`} />
        <div className="flex items-stretch border-l border-slate-200">
          {metaSegments.map((seg) => (
            <MetaSegment key={seg.label} label={seg.label} highlight={seg.highlight} />
          ))}
        </div>
      </div>
    </div>
  );
}

function QuestionPanelShell({ question, questionIndex, children, layout = 'default' }) {
  const isCardLayout = layout === 'mcq' || layout === 'descriptive';

  if (isCardLayout) {
    return (
      <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto text-slate-900">
        <QuestionMetaBar question={question} questionIndex={questionIndex} />
        <section className="bg-white border border-slate-200/80 rounded-lg p-5 space-y-5 shadow-sm flex-1 min-h-0">
          <div className="space-y-3 pb-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900 leading-snug text-balance select-none">
              {question?.questionText || 'Question'}
            </h2>
            {question?.description ? (
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap select-none">
                {question.description}
              </p>
            ) : null}
          </div>
          {children}
        </section>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-lg overflow-hidden border border-slate-200/80">
      <div className="flex flex-col h-full min-h-0 overflow-y-auto bg-[#f8f9fb] text-slate-900">
        <div className="px-5 py-4 border-b border-slate-200 bg-white sticky top-0 z-10 shrink-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
              Question {questionIndex + 1}
            </span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
              {question?.type}
            </span>
            {question?.difficulty && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                {question.difficulty}
              </span>
            )}
            {question?.points != null && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                {question.points} pts
              </span>
            )}
          </div>
          <h2 className="text-base font-semibold text-slate-900 leading-snug select-none">
            {question?.questionText || 'Question'}
          </h2>
        </div>
        <div className="flex-1 min-h-0 flex flex-col px-5 py-5 gap-6">
          {question?.description ? (
            <section>
              <p className="text-xs font-medium text-slate-500 mb-2">Description</p>
              <div className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed select-none">
                {question.description}
              </div>
            </section>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}

export default function AssessmentApp() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  
  // Role & Session Detection
  const searchParams = new URLSearchParams(location.search);
  const role = searchParams.get('role') || 'student';
  const studentIdParam = searchParams.get('studentId');
  const isInterviewer = role === 'interviewer';

  // Core State
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState(null);
  const [session, setSession] = useState(null);
  const sessionRef = useRef(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [visitedQuestionIds, setVisitedQuestionIds] = useState(() => new Set());
  const [markedForReview, setMarkedForReview] = useState(() => new Set());
  const markedForReviewRef = useRef(new Set());
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [submitAcknowledged, setSubmitAcknowledged] = useState(false);
  const [answers, setAnswers] = useState({}); // Stores MCQ options or Code snippets
  const [cameraLive, setCameraLive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPreCheckDone, setIsPreCheckDone] = useState(false);
  const [violations, setViolations] = useState(0);
  const [lastViolationType, setLastViolationType] = useState(null);
  const [violationTimeline, setViolationTimeline] = useState([]);
  const [examPaused, setExamPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState(null);
  const [focusStrikeCount, setFocusStrikeCount] = useState(0);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [screenShareBlocked, setScreenShareBlocked] = useState(false);
  const [captureRecoveryPending, setCaptureRecoveryPending] = useState(false);
  const screenShareBlockedRef = useRef(false);
  const captureRecoveryPendingRef = useRef(false);
  const securityMonitorRef = useRef(null);
  const [questionOrder, setQuestionOrder] = useState(null);
  const [optionOrders, setOptionOrders] = useState(null);
  const answersRef = useRef({});
  const examPausedRef = useRef(false);
  const pauseReasonRef = useRef(null);
  const sessionHydratingRef = useRef(false);
  const saveTimerRef = useRef(null);
  const [secureStatus, setSecureStatus] = useState({
    secureMode: false,
    fullscreen: false,
    camera: false,
    microphone: false,
    online: true,
    multiMonitor: null,
    screenSharing: false,
  });
  const [rightPanelOpen, setRightPanelOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 1024
  );
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const submitAssessmentRef = useRef(null);
  
  // Refs
  const videoRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const canvasRef = useRef(null);

  const proctorRef = useRef(null);
  const proctorRtcRef = useRef(null);
  const [precheck, setPrecheck] = useState({
    cameraReady: false,
    fullscreen: false,
    faceOk: false,
    faceLoading: false,
    faceDetectorFailed: false,
    faceHint: '',
    displayOk: true,
    displayHint: '',
    error: '',
  });
  const [starting, setStarting] = useState(false);
  const [needsProctorBoot, setNeedsProctorBoot] = useState(false);
  const precheckIntervalRef = useRef(null);

  const [entryStatus, setEntryStatus] = useState('ALLOWED'); // ALLOWED, TOO_EARLY, TOO_LATE, WAITING

  const hydrateViolationsFromServer = useCallback((sessionViolations, violationsCount) => {
    const list = Array.isArray(sessionViolations) ? sessionViolations : [];
    const timeline = list
      .filter((v) => String(v?.severity || 'MEDIUM') !== 'LOW')
      .map((v) => ({
        type: v.type,
        details: v.details,
        severity: v.severity || 'MEDIUM',
        at: v.timestamp,
      }));
    setViolationTimeline(timeline);
    const count = Number.isFinite(Number(violationsCount))
      ? Math.max(0, Number(violationsCount))
      : timeline.length;
    setViolations(count);
    if (timeline.length) {
      setLastViolationType(formatViolationLabel(timeline[timeline.length - 1].type));
    }
  }, []);

  // 1. Initialize Assessment & Session
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const details = await api.getAssessmentDetails(assessmentId);
        setAssessment(hydrateAssessmentDetails(details));
        // Student timer is set from session.startTime when the exam starts / resumes
        setTimeLeft(isInterviewer ? details.duration * 60 : 0);

        if (isInterviewer) {
          if (studentIdParam) {
            const profile = await api.getStudentProfile(studentIdParam);
            setStudentProfile(profile);
          }
          setIsPreCheckDone(true);
          setLoading(false);
        } else {
          const entry = getAssessmentEntryStatus(details);
          setEntryStatus(entry.status);

          // Fetch details but DO NOT start the session if they haven't finished PreCheck
          // The session will be started in startAssessment()
          setLoading(false);
          if (entry.status !== 'ALLOWED') return;
        }
      } catch (e) {
        console.error('Init failed:', e);
        toast?.error('Failed to initialize assessment');
        navigate(isInterviewer ? '/admin' : '/student');
      }
    };
    init();
  }, [assessmentId, isInterviewer, studentIdParam]);

  useEffect(() => {
    if (isInterviewer || loading) return;
    if (entryStatus !== 'TOO_EARLY' && entryStatus !== 'TOO_LATE') return;

    const tick = async () => {
      try {
        const fresh = await api.getAssessmentDetails(assessmentId);
        setAssessment(hydrateAssessmentDetails(fresh));
        const entry = getAssessmentEntryStatus(fresh);
        setEntryStatus(entry.status);
      } catch {
        /* ignore poll errors */
      }
    };

    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [assessmentId, entryStatus, isInterviewer, loading]);

  // 2. Timer Logic (frozen while examPaused)
  useEffect(() => {
    if (!loading && isPreCheckDone && timeLeft > 0 && !isInterviewer && !examPaused) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            queueMicrotask(() => submitAssessmentRef.current?.({ fromTimer: true }));
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerIntervalRef.current);
    }
  }, [loading, isPreCheckDone, isInterviewer, examPaused]);

  // Re-sync countdown from session start (tab return, background throttling)
  useEffect(() => {
    if (!isPreCheckDone || isInterviewer || !session?.startTime || !assessment?.duration || examPaused) return;

    const syncTimer = () => {
      const remaining = getRemainingSecondsFromSession(session, assessment.duration);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timerIntervalRef.current);
        submitAssessmentRef.current?.({ fromTimer: true });
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') syncTimer();
    };

    document.addEventListener('visibilitychange', onVisible);
    const id = setInterval(syncTimer, 30000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(id);
    };
  }, [isPreCheckDone, isInterviewer, session?.id, session?.startTime, session?.secureModeMeta, session?.paused, assessment?.duration, examPaused]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    markedForReviewRef.current = markedForReview;
  }, [markedForReview]);

  useEffect(() => {
    examPausedRef.current = examPaused;
  }, [examPaused]);

  useEffect(() => {
    pauseReasonRef.current = pauseReason;
  }, [pauseReason]);

  const saveProgress = useCallback(async () => {
    const sess = sessionRef.current;
    if (!sess?.id || isInterviewer) return;
    writeLocalDraft(sess.id, answersRef.current, [...(markedForReviewRef.current || [])]);
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    try {
      await api.saveAssessmentProgress(sess.id, answersRef.current, {
        markedForReview: [...(markedForReviewRef.current || [])],
      });
    } catch (e) {
      console.error('Progress save failed', e);
      if (isAlreadySubmittedError(e)) {
        submitAssessmentRef.current?.({ fromTimer: true });
      }
    }
  }, [isInterviewer]);

  const scheduleSaveProgress = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveProgress();
    }, 800);
  }, [saveProgress]);

  const applyPauseState = useCallback((paused, reason = null, remainingSeconds = null, extraSeconds = null) => {
    const nextPaused = Boolean(paused);
    const nextReason = nextPaused ? (reason || 'TAB_SWITCH') : null;
    examPausedRef.current = nextPaused;
    pauseReasonRef.current = nextReason;
    setExamPaused(nextPaused);
    setPauseReason(nextReason);
    if (Number.isFinite(remainingSeconds)) {
      setTimeLeft(Math.max(0, remainingSeconds));
    }
    setSession((prev) =>
      mergeSessionTimer(prev, {
        paused: nextPaused,
        pauseReason: nextReason,
        remainingSeconds,
        extraSeconds,
      })
    );
  }, []);

  const logViolation = useCallback(async (type, details, meta) => {
    const sess = sessionRef.current;
    if (!sess || isInterviewer) return;
    const severity = meta?.severity || 'MEDIUM';
    if (severity !== 'LOW') {
      setLastViolationType(formatViolationLabel(type));
      setViolationTimeline((prev) => [
        ...prev,
        {
          type,
          details,
          severity,
          at: new Date().toISOString(),
        },
      ]);
    }
    try {
      const result = await api.logProctoringViolation(sess.id, { type, details, meta });
      if (Number.isFinite(result?.violationsCount)) {
        setViolations(Math.max(0, Number(result.violationsCount)));
        proctorRef.current?.seedViolationCount?.(result.violationsCount);
      } else if (severity !== 'LOW') {
        setViolations((v) => v + 1);
      }
      if (result?.paused) {
        const reason = result.pauseReason || 'TAB_SWITCH';
        if (examPausedRef.current && pauseReasonRef.current === reason) return;
        await saveProgress();
        if (typeof result.focusStrikeCount === 'number') {
          setFocusStrikeCount(result.focusStrikeCount);
        }
        applyPauseState(true, reason, result.remainingSeconds);
        if (reason === SCREEN_CAPTURE_PAUSE_REASON) {
          setCaptureRecoveryPending(true);
          captureRecoveryPendingRef.current = true;
          setScreenShareBlocked(true);
          screenShareBlockedRef.current = true;
        }
        if (String(reason).startsWith('ADMIN')) {
          toast?.error('An admin paused your exam. Wait to be allowed to continue.');
        } else if (reason !== FULLSCREEN_PAUSE_REASON && reason !== FOCUS_LOST_PAUSE_REASON) {
          toast?.error('Exam locked. Wait for an admin to allow you to continue.');
        }
      }
    } catch (e) {
      console.error('Violation log failed', e);
    }
  }, [isInterviewer, saveProgress, applyPauseState, toast]);

  const applySessionControl = useCallback((payload) => {
    if (!payload) return;
    const remaining = Number(payload.remainingSeconds);
    const extra = payload.extraSeconds;

    if (payload.kind === 'force_submitted') {
      submitAssessmentRef.current?.({ fromTimer: true });
      return;
    }

    if (payload.kind === 'extended') {
      if (Number.isFinite(remaining)) setTimeLeft(Math.max(0, remaining));
      setSession((prev) => mergeSessionTimer(prev, {
        remainingSeconds: remaining,
        extraSeconds: extra,
      }));
      toast?.success(
        Number.isFinite(remaining)
          ? `Time extended · ${Math.ceil(remaining / 60)} min left`
          : 'Time extended by an admin'
      );
      return;
    }

    if (payload.kind === 'paused' || payload.paused === true) {
      const reason = payload.pauseReason || 'ADMIN_PAUSE';
      if (examPausedRef.current && pauseReasonRef.current === reason) return;
      if (typeof payload.focusStrikeCount === 'number') {
        setFocusStrikeCount(payload.focusStrikeCount);
      }
      applyPauseState(true, reason, remaining, extra);
      if (
        !String(reason).startsWith('ADMIN') &&
        reason !== FULLSCREEN_PAUSE_REASON &&
        reason !== FOCUS_LOST_PAUSE_REASON
      ) {
        toast?.error('Exam locked. Wait for an admin to allow you to continue.');
      } else if (String(reason).startsWith('ADMIN')) {
        toast?.error('An admin paused your exam. Wait to be allowed to continue.');
      }
      return;
    }

    if (payload.kind === 'unlocked' || payload.paused === false) {
      if (!examPausedRef.current) return;
      applyPauseState(false, null, remaining, extra);
      setFocusStrikeCount(typeof payload.focusStrikeCount === 'number' ? payload.focusStrikeCount : 0);
      if (payload.securityState === 'IN_PROGRESS' || payload.pauseReason == null) {
        setCaptureRecoveryPending(false);
        captureRecoveryPendingRef.current = false;
        setScreenShareBlocked(false);
        screenShareBlockedRef.current = false;
        securityMonitorRef.current?.reset();
      }
      toast?.success('Admin unlocked your exam. You may continue.');
    }
  }, [applyPauseState, toast]);

  useEffect(() => {
    if (!isPreCheckDone || isInterviewer || !session?.id) return undefined;
    initSocket();
    return subscribeAssessmentSessionControl(session.id, applySessionControl);
  }, [isPreCheckDone, isInterviewer, session?.id, applySessionControl]);

  // Autosave answers while in progress (supports resume after unlock)
  useEffect(() => {
    if (!isPreCheckDone || isInterviewer || !session?.id) return undefined;
    const id = setInterval(async () => {
      saveProgress();
      const sess = sessionRef.current;
      if (!sess?.id) return;
      try {
        const st = await api.getAssessmentSessionStatus(sess.id);
        if (DONE_SESSION_STATUSES.has(st?.status)) {
          submitAssessmentRef.current?.({ fromTimer: true });
          return;
        }
        if (Number.isFinite(st?.violationsCount)) {
          setViolations(Math.max(0, Number(st.violationsCount)));
        }
        if (typeof st?.focusStrikeCount === 'number') {
          setFocusStrikeCount(st.focusStrikeCount);
        }
        if (st.paused && !examPausedRef.current) {
          applyPauseState(true, st.pauseReason, st.remainingSeconds, st.extraSeconds);
        } else if (typeof st?.paused === 'boolean' && st.paused !== examPausedRef.current) {
          applyPauseState(st.paused, st.pauseReason, st.remainingSeconds, st.extraSeconds);
        } else if (Number.isFinite(st?.remainingSeconds)) {
          const next = Math.max(0, st.remainingSeconds);
          setTimeLeft((prev) => (Math.abs(next - prev) >= 2 ? next : prev));
          if (st.extraSeconds != null) {
            setSession((prev) => mergeSessionTimer(prev, {
              remainingSeconds: next,
              extraSeconds: st.extraSeconds,
            }));
          }
        }
      } catch {
        /* ignore */
      }
    }, 20000);
    return () => clearInterval(id);
  }, [isPreCheckDone, isInterviewer, session?.id, saveProgress, applyPauseState]);

  // Server heartbeat — detects tab kill / JS disabled / second device API abuse
  useEffect(() => {
    if (!isPreCheckDone || isInterviewer || !session?.id || examPaused) return undefined;
    const sendHeartbeat = () => {
      api.postAssessmentHeartbeat(session.id).catch(() => {});
    };
    sendHeartbeat();
    const id = setInterval(sendHeartbeat, 25000);
    return () => clearInterval(id);
  }, [isPreCheckDone, isInterviewer, session?.id, examPaused]);

  // When paused: freeze local countdown + poll until admin unlocks
  useEffect(() => {
    if (!examPaused || !session?.id || isInterviewer) return undefined;
    clearInterval(timerIntervalRef.current);
    const poll = setInterval(async () => {
      try {
        const status = await api.getAssessmentSessionStatus(session.id);
        if (DONE_SESSION_STATUSES.has(status?.status)) {
          submitAssessmentRef.current?.({ fromTimer: true });
          return;
        }
        if (!status?.paused && examPausedRef.current) {
          applyPauseState(false, null, status?.remainingSeconds, status?.extraSeconds);
          if (Number.isFinite(status?.violationsCount)) {
            setViolations(Math.max(0, Number(status.violationsCount)));
          }
          setFocusStrikeCount(typeof status.focusStrikeCount === 'number' ? status.focusStrikeCount : 0);
          toast?.success('Admin unlocked your exam. You may continue.');
        } else if (typeof status?.paused === 'boolean' && status.paused && !examPausedRef.current) {
          applyPauseState(true, status.pauseReason, status.remainingSeconds, status.extraSeconds);
          if (Number.isFinite(status?.violationsCount)) {
            setViolations(Math.max(0, Number(status.violationsCount)));
          }
        } else if (Number.isFinite(status?.remainingSeconds)) {
          setTimeLeft(Math.max(0, status.remainingSeconds));
          if (status.extraSeconds != null) {
            setSession((prev) => mergeSessionTimer(prev, {
              remainingSeconds: status.remainingSeconds,
              extraSeconds: status.extraSeconds,
              paused: true,
            }));
          }
        }
      } catch {
        /* ignore */
      }
    }, 4000);
    return () => clearInterval(poll);
  }, [examPaused, session?.id, isInterviewer, applyPauseState, toast]);

  // 4. Jitsi Integration (Configurable and robust)
  useEffect(() => {
    if (!loading && assessment?.type === 'MOCK_INTERVIEW_LIVE' && isPreCheckDone) {
      loadJitsiScript();
    }
    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
  }, [loading, assessment, isPreCheckDone]);

  const loadJitsiScript = () => {
    const jitsiDomain = getJitsiDomain();
    const scriptId = 'jitsi-external-api';
    
    const onScriptLoad = () => {
      if (window.temp_define) {
        window.define = window.temp_define;
        delete window.temp_define;
      }
      initJitsi(jitsiDomain);
    };

    if (window.JitsiMeetExternalAPI) {
      onScriptLoad();
      return;
    }

    let script = document.getElementById(scriptId);
    if (script) {
      const interval = setInterval(() => {
        if (window.JitsiMeetExternalAPI) {
          clearInterval(interval);
          onScriptLoad();
        }
      }, 100);
      return;
    }

    if (window.define && window.define.amd) {
      window.temp_define = window.define;
      window.define = undefined;
    }

    script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://${jitsiDomain}/external_api.js`;
    script.async = true;
    script.onload = onScriptLoad;
    script.onerror = () => {
      if (window.temp_define) {
        window.define = window.temp_define;
        delete window.temp_define;
      }
    };
    document.head.appendChild(script);
  };

  const initJitsi = (domain) => {
    if (!window.JitsiMeetExternalAPI || !jitsiContainerRef.current) return;
    
    jitsiContainerRef.current.innerHTML = '';
    
    const roomName = `PWIOI_Assessment_${assessmentId}_${isInterviewer ? studentIdParam : session?.studentId}`;
    const options = {
      roomName,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      userInfo: { displayName: isInterviewer ? 'Interviewer' : (studentProfile?.fullName || 'Candidate') },
      configOverwrite: { prejoinPageEnabled: false, disableDeepLinking: true, enableWelcomePage: false },
      interfaceConfigOverwrite: { SHOW_JITSI_WATERMARK: false, SHOW_WATERMARK_FOR_GUESTS: false }
    };
    const apiInstance = new window.JitsiMeetExternalAPI(domain, options);
    jitsiApiRef.current = apiInstance;
  };

  // 5. Actions
  const getProctoringConfig = useCallback(() => {
    try {
      const cfg = assessment?.config ? (typeof assessment.config === 'string' ? JSON.parse(assessment.config) : assessment.config) : {};
      const p = cfg?.proctoring || {};
      return {
        ...defaultProctoringConfig,
        enabled: true,
        cameraRequired: p.webcam !== false,
        micRequired: p.mic !== false,
        tabSwitch: p.tabSwitch !== false,
        pauseOnTabSwitch: p.pauseOnTabSwitch !== false,
        tabSwitchGraceCount: Math.max(0, Number(p.tabSwitchGraceCount ?? 2) || 2),
        windowBlur: true,
        fullscreenRequired: p.fullscreen !== false,
        periodicSnapshotBaseMs: Math.max(25000, (Number(p.snapshotInterval) || 45) * 1000),
        periodicSnapshotJitterMs: Math.min(15000, Math.max(5000, Math.round((Number(p.snapshotInterval) || 60) * 1000 * 0.15))),
        screenshotDebounceMs: 8000,
        liveFrameToAdmin: false,
        faceMonitoring: true,
        noFaceGraceMs: 5000,
        faceCheckIntervalMs: 1000,
        clipboardGuard: true,
        contextMenuGuard: true,
        selectionGuard: true,
        shortcutGuard: true,
        resizeGuard: true,
        navigationGuard: true,
        multiMonitorWarn: true,
        screenShareGuard: true,
        connectivityMonitor: true,
        // Violation-threshold auto-submit removed
        autoSubmit: {
          enabled: false,
          threshold: 10,
        },
      };
    } catch {
      return { ...defaultProctoringConfig };
    }
  }, [assessment]);

  const proctorCfg = useMemo(() => getProctoringConfig(), [getProctoringConfig]);
  const integrityFailure = useMemo(() => {
    if (examPaused || isInterviewer || !isPreCheckDone) return null;
    return getIntegrityFailure(secureStatus, proctorCfg);
  }, [examPaused, isInterviewer, isPreCheckDone, secureStatus, proctorCfg]);
  const interactionBlocked = examPaused || Boolean(integrityFailure) || screenShareBlocked;

  const retryIntegrityFix = useCallback(async () => {
    if (examPausedRef.current) return;
    const cfg = getProctoringConfig();
    const engine = proctorRef.current;
    const failure = getIntegrityFailure(engine?.getSecureStatus?.() || secureStatus, cfg);
    if (!failure) return;

    try {
      if (failure === 'fullscreen') {
        await engine?.requestFullscreen?.();
      } else {
        await engine?.initCamera?.({ withAudio: cfg.micRequired });
        if (engine && !engine._running) await engine.start?.();
      }
      setSecureStatus(engine?.getSecureStatus?.() || {});
      setCameraLive(Boolean(engine?.isCameraActive?.()));
    } catch (e) {
      toast?.error(e?.message || 'Could not restore exam requirements');
    }
  }, [getProctoringConfig, secureStatus, toast]);

  const retrySecurityRecovery = useCallback(async () => {
    const sess = sessionRef.current;
    const engine = proctorRef.current;
    if (!sess?.id || !engine) return;

    try {
      if (typeof engine._refreshDisplayAudit === 'function') {
        await engine._refreshDisplayAudit({ force: true });
      }
      const secure = engine.getSecureStatus?.() || {};
      if (secure.screenSharing || secure.multiMonitor) {
        toast?.warning('Screen sharing or an extra display is still active.');
        return;
      }
      if (engine.cfg?.fullscreenRequired && !engine.isFullscreen) {
        await engine.requestFullscreen();
      }
      if (!engine.isCameraActive()) {
        await engine.initCamera({ withAudio: engine.cfg.micRequired });
      }
      await engine.precheck();

      const result = await api.postSecurityRecovery(sess.id, { checksPassed: true });
      if (result?.paused) {
        applyPauseState(true, SCREEN_CAPTURE_PAUSE_REASON, result.remainingSeconds);
        return;
      }
      applyPauseState(false, null, result?.remainingSeconds);
      setCaptureRecoveryPending(false);
      captureRecoveryPendingRef.current = false;
      setScreenShareBlocked(false);
      screenShareBlockedRef.current = false;
      securityMonitorRef.current?.reset();
      toast?.success('Security re-check passed. You may continue.');
    } catch (e) {
      toast?.error(e?.response?.data?.error || e?.message || 'Security re-check failed');
    }
  }, [applyPauseState, toast]);

  const ensureProctorEngine = useCallback(async () => {
    if (proctorRef.current) return proctorRef.current;
    if (!videoRef.current) throw new Error('Video element not ready');

    const cfg = getProctoringConfig();

    const engine = new ProctoringEngine({
      getVideoEl: () => videoRef.current,
      getSessionId: async () => sessionRef.current?.id,
      logViolation: async (type, details, meta) => logViolation(type, details, meta),
      uploadScreenshot: async (blob, meta) => {
        const sess = sessionRef.current;
        if (!sess?.id) return;
        await api.uploadProctoringScreenshot(sess.id, blob, meta);
      },
      onWarning: ({ level, message }) => {
        const msg = String(message || '');
        if (/exited fullscreen/i.test(msg) || /window lost focus/i.test(msg)) return;
        if (level === 'error') toast?.error(message);
        else if (level === 'warn') toast?.warning(message);
      },
      onDisplayRiskChange: async ({ active, reason }) => {
        const monitor = securityMonitorRef.current;
        if (active) {
          await monitor?.reportCaptureDetected(reason || 'Screen capture/sharing detected');
        } else if (monitor?.isCaptureActive?.()) {
          await monitor.reportCaptureStopped('Screen capture/sharing stopped');
          setCaptureRecoveryPending(true);
          captureRecoveryPendingRef.current = true;
        }
        setSecureStatus((prev) => ({
          ...prev,
          ...(engine.getSecureStatus?.() || {}),
        }));
      },
      onViolation: ({ type, details, severity, count, at }) => {
        setSecureStatus((prev) => ({ ...prev, ...(engine.getSecureStatus?.() || {}) }));
        setLastViolationType(formatViolationLabel(type));
        if (type === 'FULLSCREEN_EXIT' && engine.cfg.fullscreenRequired && !examPausedRef.current) {
          saveProgress();
          applyPauseState(true, FULLSCREEN_PAUSE_REASON);
        } else if (type === 'WINDOW_BLUR' && !examPausedRef.current) {
          saveProgress();
          applyPauseState(true, FOCUS_LOST_PAUSE_REASON);
        }
      },
      config: cfg,
    });
    proctorRef.current = engine;
    return engine;
  }, [getProctoringConfig, logViolation, toast, assessmentId, saveProgress, applyPauseState]);

  const applyRestoredSession = useCallback((sess, serverViolations = []) => {
    sessionRef.current = sess;
    setSession(sess);
    setTimeLeft(resolveSessionRemainingSeconds(sess, assessment?.duration ?? sess.durationMinutes));
    setQuestionOrder(Array.isArray(sess.questionOrder) ? sess.questionOrder : null);
    setOptionOrders(sess.optionOrders && typeof sess.optionOrders === 'object' ? sess.optionOrders : null);

    let restored = null;
    let restoredMarks = [];
    if (sess.responses) {
      try {
        const parsed = typeof sess.responses === 'string' ? JSON.parse(sess.responses) : sess.responses;
        restored = parsed?.rawAnswers && typeof parsed.rawAnswers === 'object' ? parsed.rawAnswers : parsed;
        if (Array.isArray(parsed?.markedForReview)) restoredMarks = parsed.markedForReview;
      } catch {
        restored = null;
      }
    }
    const localDraft = readLocalDraft(sess.id);
    if (!restored || !Object.keys(restored).length) {
      restored = localDraft?.answers && typeof localDraft.answers === 'object' ? localDraft.answers : {};
    }
    if (!restoredMarks.length && Array.isArray(localDraft?.markedForReview)) {
      restoredMarks = localDraft.markedForReview;
    }
    setAnswers(restored && typeof restored === 'object' ? restored : {});
    answersRef.current = restored && typeof restored === 'object' ? restored : {};
    const markSet = new Set(restoredMarks.filter(Boolean).map(String));
    setMarkedForReview(markSet);
    markedForReviewRef.current = markSet;
    writeLocalDraft(sess.id, answersRef.current, [...markSet]);

    hydrateViolationsFromServer(serverViolations, sess.violationsCount);
    if (typeof sess.focusStrikeCount === 'number') {
      setFocusStrikeCount(sess.focusStrikeCount);
    }

    if (sess.paused) {
      applyPauseState(true, sess.pauseReason || 'TAB_SWITCH', sess.remainingSeconds, sess.extraSeconds);
      if (sess.pauseReason === SCREEN_CAPTURE_PAUSE_REASON) {
        setCaptureRecoveryPending(true);
        captureRecoveryPendingRef.current = true;
        setScreenShareBlocked(true);
        screenShareBlockedRef.current = true;
      }
    } else {
      applyPauseState(false, null, sess.remainingSeconds, sess.extraSeconds);
    }

    setIsPreCheckDone(true);
    setEntryStatus('ALLOWED');
  }, [assessment?.duration, applyPauseState, hydrateViolationsFromServer]);

  const bootProctoringForSession = useCallback(async () => {
    const sess = sessionRef.current;
    if (!sess?.id || isInterviewer) return;
    initSocket();
    if (!securityMonitorRef.current) {
      securityMonitorRef.current = createAssessmentSecurityMonitor({
        logViolation: (type, details, meta) => logViolation(type, details, meta),
        onCaptureStateChange: (active) => {
          setScreenShareBlocked(active);
          screenShareBlockedRef.current = active;
          if (active) {
            setCaptureRecoveryPending(true);
            captureRecoveryPendingRef.current = true;
          }
        },
      });
    }
    const engine = await ensureProctorEngine();
    if (Number.isFinite(sess.violationsCount)) {
      engine.seedViolationCount?.(sess.violationsCount);
    }
    await engine.start();

    try {
      if (sessionTimerAlreadyStarted(sess)) {
        const st = await api.getAssessmentSessionStatus(sess.id);
        if (Number.isFinite(st?.remainingSeconds)) {
          setTimeLeft(Math.max(0, st.remainingSeconds));
        }
      } else {
        const ready = await api.postSecurityReady(sess.id);
        if (Number.isFinite(ready?.remainingSeconds)) {
          setTimeLeft(Math.max(0, ready.remainingSeconds));
        }
      }
    } catch (e) {
      toast?.error(e?.response?.data?.error || 'Could not sync assessment timer');
    }

    if (proctorRtcRef.current) {
      proctorRtcRef.current.stop();
    }
    proctorRtcRef.current = new ProctoringBroadcaster({
      sessionId: sess.id,
      assessmentId,
      getStream: () => proctorRef.current?.getStream?.() ?? null,
    });
    await proctorRtcRef.current.start();
  }, [assessmentId, ensureProctorEngine, isInterviewer, logViolation, toast]);

  useEffect(() => {
    if (isInterviewer || loading || isPreCheckDone) return undefined;
    if (entryStatus !== 'ALLOWED') return undefined;
    let cancelled = false;
    (async () => {
      try {
        const active = await api.getActiveAssessmentSession(assessmentId);
        if (cancelled || !active?.active || !active.session) return;
        const remaining = resolveSessionRemainingSeconds(active.session, assessment?.duration);
        if (remaining <= 0) return;
        applyRestoredSession(active.session, active.violations);
        sessionHydratingRef.current = true;
        window.setTimeout(() => {
          sessionHydratingRef.current = false;
        }, 4000);
        setNeedsProctorBoot(true);
      } catch {
        /* no in-progress attempt */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    assessmentId,
    assessment?.duration,
    isInterviewer,
    loading,
    isPreCheckDone,
    entryStatus,
    applyRestoredSession,
  ]);

  useEffect(() => {
    if (!needsProctorBoot || !isPreCheckDone || !session?.id || isInterviewer) return undefined;
    let cancelled = false;
    setLoading(true);
    bootProctoringForSession()
      .catch((e) => {
        if (!cancelled) toast?.error(e?.message || 'Could not resume proctoring');
      })
      .finally(() => {
        if (!cancelled) {
          setNeedsProctorBoot(false);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [needsProctorBoot, isPreCheckDone, session?.id, isInterviewer, bootProctoringForSession, toast]);

  const runPrecheckValidation = useCallback(async () => {
    const e = proctorRef.current;
    if (!e) return;
    // Avoid MediaPipe 0×0 ROI errors when the <video> remounts or fullscreen flips.
    if (typeof e.reattachVideoAndWait === 'function') {
      await e.reattachVideoAndWait(2500);
    } else {
      e.reattachVideo?.();
    }
    const streamActive = e.isCameraActive();
    const detector = e.getFaceDetectorStatus();
    const faceCount = e.cfg.faceMonitoring && detector.state === 'ready'
      ? await e.detectFacesOnce()
      : e.cfg.faceMonitoring
        ? 0
        : 1;

    let faceHint = '';
    if (e.cfg.faceMonitoring && detector.state === 'ready') {
      if (faceCount === 0) faceHint = 'No face detected — center yourself in the frame with good lighting.';
      else if (faceCount > 1) faceHint = 'Multiple faces detected — only you should be visible on camera.';
    }

    if (typeof e._refreshDisplayAudit === 'function') {
      await e._refreshDisplayAudit({ force: true });
    } else if (typeof e._applyDisplayAudit === 'function') {
      const audit = await auditDisplayEnvironment();
      e._applyDisplayAudit(audit);
    }
    const secure = e.getSecureStatus?.() || {};
    const displayOk = !secure.screenSharing && secure.multiMonitor !== true;
    const displayHint = secure.screenSharingReason
      ? String(secure.screenSharingReason)
      : secure.multiMonitor
        ? 'Disconnect external monitors and turn off macOS Screen Mirroring / AirPlay.'
        : '';

    setPrecheck((p) => ({
      ...p,
      cameraReady: streamActive,
      fullscreen: e.cfg.fullscreenRequired ? e.isFullscreen : true,
      displayOk,
      displayHint,
      faceLoading: e.cfg.faceMonitoring && detector.state === 'loading' && streamActive,
      faceDetectorFailed: detector.state === 'failed',
      faceOk: e.cfg.faceMonitoring ? faceCount === 1 : true,
      faceHint,
      error:
        detector.state === 'failed'
          ? detector.error || 'Face detection could not load. Check your internet and click Retry below.'
          : streamActive
            ? ''
            : p.error,
    }));
  }, []);

  const retryFaceDetection = async () => {
    const e = proctorRef.current;
    if (!e) return;
    setPrecheck((p) => ({ ...p, faceLoading: true, faceDetectorFailed: false, error: '', faceHint: '' }));
    await e.retryFaceDetector();
    await runPrecheckValidation();
  };

  const startCameraPrecheck = async () => {
    try {
      setPrecheck((p) => ({ ...p, error: '', faceLoading: true }));
      const engine = await ensureProctorEngine();
      await engine.initCamera({ withAudio: engine.cfg.micRequired || engine.cfg.audioMonitoring });
      await runPrecheckValidation();

      if (precheckIntervalRef.current) clearInterval(precheckIntervalRef.current);
      precheckIntervalRef.current = setInterval(() => {
        runPrecheckValidation().catch(() => {});
      }, 1500);
    } catch (e) {
      const msg =
        e?.name === 'NotAllowedError'
          ? 'Camera permission denied. Allow camera access in browser settings and try again.'
          : e?.code === 'INSECURE_CONTEXT' || e?.code === 'MEDIA_DEVICES_UNAVAILABLE'
            ? e.message
            : e?.message || 'Failed to start camera';
      setPrecheck((p) => ({ ...p, error: msg, cameraReady: false, faceLoading: false }));
      toast?.error(
        e?.code === 'INSECURE_CONTEXT' || e?.code === 'MEDIA_DEVICES_UNAVAILABLE'
          ? 'Use HTTPS on port 5173 for camera'
          : 'Camera access is required for proctoring'
      );
    }
  };

  useEffect(() => {
    if (isPreCheckDone || isInterviewer || loading) return;
    import('../../proctoring-engine/mediapipeFaceDetector')
      .then((m) => m.ensureFaceDetector())
      .catch(() => {});
  }, [isPreCheckDone, isInterviewer, loading]);

  // Re-attach camera stream when exam UI mounts (new <video> DOM node after pre-check)
  useEffect(() => {
    if (!isPreCheckDone || isInterviewer || loading || !session) return;
    let cancelled = false;
    const attach = async () => {
      if (cancelled) return;
      const engine = proctorRef.current;
      if (!engine) return;
      if (typeof engine.reattachVideoAndWait === 'function') {
        await engine.reattachVideoAndWait(4000);
      } else {
        engine.reattachVideo?.();
      }
    };
    attach();
    const t = setTimeout(attach, 150);
    const t2 = setTimeout(attach, 600);
    return () => {
      cancelled = true;
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [isPreCheckDone, isInterviewer, loading, session?.id]);

  useEffect(() => {
    if (!isPreCheckDone || isInterviewer) return;
    const tick = () => setCameraLive(proctorRef.current?.isCameraActive() ?? false);
    tick();
    const id = setInterval(tick, 800);
    return () => clearInterval(id);
  }, [isPreCheckDone, isInterviewer, session?.id]);

  useEffect(() => {
    if (isPreCheckDone || isInterviewer) return;
    const onFsChange = () => runPrecheckValidation().catch(() => {});
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [isPreCheckDone, isInterviewer, runPrecheckValidation]);

  const enterFullscreenPrecheck = async () => {
    const engine = proctorRef.current;
    if (!engine) return;
    const ok = await engine.requestFullscreen();
    setPrecheck((p) => ({ ...p, fullscreen: ok || engine.isFullscreen }));
    runPrecheckValidation().catch(() => {});
  };

  const startAssessment = async () => {
    try {
      setStarting(true);
      const engine = await ensureProctorEngine();
      if (!precheck.cameraReady) {
        await startCameraPrecheck();
      }
      if (engine.cfg.fullscreenRequired && !engine.isFullscreen) {
        await engine.requestFullscreen();
      }

      const gate = await engine.precheck();
      if (!gate.ok) {
        const msg =
          gate.reason === 'FULLSCREEN_REQUIRED' ? 'Fullscreen is required to start.' :
            gate.reason === 'CAMERA_REQUIRED' ? 'Camera is not active. Click Enable Camera and allow permission.' :
              gate.reason === 'NO_FACE_DETECTED' ? 'Face not detected. Sit in front of the camera with good lighting.' :
                gate.reason === 'MULTIPLE_FACES' ? 'Multiple faces detected. Only one person should be visible.' :
                  'Pre-check failed. Please allow camera and stay in fullscreen.';
        toast?.error(msg);
        return;
      }

      const fresh = await api.getAssessmentDetails(assessmentId);
      setAssessment(hydrateAssessmentDetails(fresh));
      const entry = getAssessmentEntryStatus(fresh);
      if (entry.status === 'TOO_EARLY') {
        setEntryStatus('WAITING');
        setIsPreCheckDone(true);
        return;
      }
      if (entry.status === 'TOO_LATE') {
        setEntryStatus('TOO_LATE');
        toast?.error('The assessment entry window has closed.');
        return;
      }

      await executeTestStart();
      if (sessionRef.current?.id) {
        setNeedsProctorBoot(true);
      }
    } catch (err) {
      toast?.error(err.response?.data?.error || err.message || 'Could not start the assessment');
    } finally {
      setStarting(false);
    }
  };

  const executeTestStart = async (forceDeviceTakeover = false) => {
    try {
      setLoading(true);
      const sess = await api.startAssessmentSession(assessmentId, {
        silent: true,
        clientDeviceId: getExamDeviceId(),
        forceDeviceTakeover,
      });
      const remaining = resolveSessionRemainingSeconds(sess, assessment?.duration ?? sess.durationMinutes);

      if (remaining <= 0) {
        toast?.error('Assessment time has expired');
        navigate(STUDENT_ASSESSMENTS_PATH);
        return;
      }

      applyRestoredSession(sess, []);
      setNeedsProctorBoot(true);
    } catch (e) {
      if (e.response?.data?.code === 'DEVICE_CONFLICT') {
        const takeOver = window.confirm(
          'This assessment is already open on another device or browser. Take over on this device? The other session will be locked out.'
        );
        if (takeOver) {
          await executeTestStart(true);
          return;
        }
        toast?.error('Continue on the original device, or take over from here.');
        return;
      }
      if (e.response?.data?.code === 'TIME_EXPIRED') {
        toast?.error('Assessment time has expired');
        navigate(STUDENT_ASSESSMENTS_PATH);
        return;
      }
      if (DONE_SESSION_STATUSES.has(e.response?.data?.status) || e.response?.data?.error === 'Assessment already completed') {
        toast?.error('You have already completed this assessment');
        navigate(STUDENT_ASSESSMENTS_PATH);
        return;
      }
      toast?.error(e.response?.data?.error || e.message || 'Could not start the assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    if (submittingRef.current) return;
    if (examPausedRef.current) {
      toast?.warning('Exam is paused. Wait for an admin to unlock your attempt.');
      return;
    }
    if (integrityFailure) {
      toast?.warning('Camera, microphone, or fullscreen must be active to continue answering.');
      return;
    }
    if (screenShareBlocked) {
      toast?.warning('Screen sharing detected. Stop sharing to continue the assessment.');
      return;
    }
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: value };
      answersRef.current = next;
      const sess = sessionRef.current;
      if (sess?.id) writeLocalDraft(sess.id, next, [...(markedForReviewRef.current || [])]);
      return next;
    });
    scheduleSaveProgress();
  };

  // Video Recording for VIDEO questions
  const startRecording = () => {
    if (!videoRef.current?.srcObject || !currentQuestion?.id) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(videoRef.current.srcObject);
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      // In a real app, upload blob to Cloudinary/S3
      handleAnswerChange(currentQuestion.id, URL.createObjectURL(blob));
      toast?.success('Video answer recorded successfully');
    };
    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setIsRecording(false);
  };

  const submitAssessment = async ({ fromTimer = false } = {}) => {
    if (submittingRef.current) return;
    const sess = sessionRef.current;
    if (!sess?.id) {
      toast?.error('No active session. Rejoin the assessment and try again.');
      return;
    }
    if (!fromTimer && examPausedRef.current) {
      toast?.warning('Exam is paused. Wait for an admin to unlock before submitting.');
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);

    const finishSuccessfully = () => {
      clearLocalDraft(sess.id);
      try {
        proctorRtcRef.current?.stop();
        proctorRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      try {
        if (document.fullscreenElement) document.exitFullscreen();
      } catch {
        /* ignore */
      }
      toast?.success('Assessment submitted successfully');
      navigate(`/assessment/results/${sess.id}`);
    };

    try {
      try {
        await Promise.race([
          saveProgress().catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, 8000)),
        ]);
      } catch {
        /* still submit local answers */
      }
      const payload =
        answersRef.current && typeof answersRef.current === 'object' && !Array.isArray(answersRef.current)
          ? answersRef.current
          : {};
      await api.completeAssessment(sess.id, { answers: payload });
      finishSuccessfully();
    } catch (e) {
      if (isAlreadySubmittedError(e)) {
        finishSuccessfully();
        return;
      }
      toast?.error(
        e.message || 'Submission failed. Your answers are saved on this device — try Submit again.'
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };
  submitAssessmentRef.current = submitAssessment;

  const openSubmitConfirm = () => {
    if (submittingRef.current || examPausedRef.current) {
      if (examPausedRef.current) {
        toast?.warning('Exam is paused. Wait for an admin to unlock before submitting.');
      }
      return;
    }
    setSubmitAcknowledged(false);
    setSubmitConfirmOpen(true);
  };

  // Offline / reconnect: keep drafts local and flush when back online
  useEffect(() => {
    const onOffline = () => setIsOffline(true);
    const onOnline = () => {
      setIsOffline(false);
      saveProgress();
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [saveProgress]);

  // Persist draft on refresh / close
  useEffect(() => {
    if (!isPreCheckDone || isInterviewer) return undefined;
    const flush = () => {
      const sess = sessionRef.current;
      if (sess?.id) writeLocalDraft(sess.id, answersRef.current, [...(markedForReviewRef.current || [])]);
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        saveProgress();
      }
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [isPreCheckDone, isInterviewer, saveProgress]);

  useEffect(() => {
    if (!isPreCheckDone || isInterviewer) return undefined;
    const syncSecureStatus = () => {
      const engine = proctorRef.current;
      if (!engine?.getSecureStatus) return;
      const st = engine.getSecureStatus();
      setSecureStatus(st);
      setCameraLive(engine.isCameraActive());
      const sharing = Boolean(st.screenSharing);
      screenShareBlockedRef.current = sharing;
      setScreenShareBlocked(sharing);
    };
    syncSecureStatus();
    const id = setInterval(syncSecureStatus, 2000);
    return () => clearInterval(id);
  }, [isPreCheckDone, isInterviewer]);

  useEffect(() => {
    return () => {
      try {
        if (precheckIntervalRef.current) clearInterval(precheckIntervalRef.current);
      } catch {}
      try {
        proctorRtcRef.current?.stop();
        proctorRef.current?.destroy?.();
      } catch {}
    };
  }, []);

  useEffect(() => {
    if (!lastViolationType) return undefined;
    const id = setTimeout(() => setLastViolationType(null), 6000);
    return () => clearTimeout(id);
  }, [lastViolationType]);

  const recheckEntryWindow = useCallback(async () => {
    try {
      setLoading(true);
      const fresh = await api.getAssessmentDetails(assessmentId);
      setAssessment(hydrateAssessmentDetails(fresh));
      const entry = getAssessmentEntryStatus(fresh);
      setEntryStatus(entry.status);
      if (entry.status === 'ALLOWED') {
        toast?.success('You can enter the assessment now.');
      }
    } catch {
      toast?.error('Could not refresh assessment schedule');
    } finally {
      setLoading(false);
    }
  }, [assessmentId, toast]);

  const orderedQuestions = useMemo(() => {
    const list = Array.isArray(assessment?.questions) ? assessment.questions : [];
    if (!Array.isArray(questionOrder) || !questionOrder.length) return list;
    const byId = new Map(list.map((q) => [q.id, q]));
    const ordered = [];
    for (const id of questionOrder) {
      if (byId.has(id)) {
        ordered.push(byId.get(id));
        byId.delete(id);
      }
    }
    for (const q of byId.values()) ordered.push(q);
    return ordered;
  }, [assessment?.questions, questionOrder]);

  const currentQuestion = orderedQuestions?.[currentQuestionIdx];

  const mcqDisplayOptions = useMemo(() => {
    if (!currentQuestion || currentQuestion.type !== 'MCQ') return [];
    let opts = [];
    try {
      opts = JSON.parse(currentQuestion.options || '[]');
    } catch {
      opts = [];
    }
    if (!Array.isArray(opts)) return [];
    const order = optionOrders?.[currentQuestion.id];
    if (!Array.isArray(order) || order.length !== opts.length) {
      return opts.map((opt, originalIndex) => ({ opt, originalIndex }));
    }
    return order.map((originalIndex) => ({
      opt: opts[originalIndex],
      originalIndex,
    }));
  }, [currentQuestion, optionOrders]);

  const questionProgress = useMemo(() => {
    const list = orderedQuestions || [];
    let answered = 0;
    let visitedUnanswered = 0;
    let notVisited = 0;
    for (const q of list) {
      const done = isQuestionAnswered(q, answers[q.id]);
      const seen = visitedQuestionIds.has(q.id) || done;
      if (done) answered += 1;
      else if (seen) visitedUnanswered += 1;
      else notVisited += 1;
    }
    return {
      total: list.length,
      answered,
      visitedUnanswered,
      notVisited,
      notAnswered: visitedUnanswered + notVisited,
      marked: list.filter((q) => markedForReview.has(q.id)).length,
    };
  }, [orderedQuestions, answers, visitedQuestionIds, markedForReview]);

  useEffect(() => {
    setVisitedQuestionIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      if (currentQuestion?.id && !next.has(currentQuestion.id)) {
        next.add(currentQuestion.id);
        changed = true;
      }
      for (const q of orderedQuestions || []) {
        if (isQuestionAnswered(q, answers[q.id]) && !next.has(q.id)) {
          next.add(q.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [currentQuestion?.id, orderedQuestions, answers]);

  const goToQuestion = (idx) => {
    if (examPausedRef.current || submittingRef.current) return;
    const max = Math.max(0, (orderedQuestions?.length || 1) - 1);
    setCurrentQuestionIdx(Math.max(0, Math.min(max, idx)));
  };

  const toggleMarkForReview = () => {
    const qid = currentQuestion?.id;
    if (!qid || examPausedRef.current || submittingRef.current) return;
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      markedForReviewRef.current = next;
      const sess = sessionRef.current;
      if (sess?.id) writeLocalDraft(sess.id, answersRef.current, [...next]);
      return next;
    });
    scheduleSaveProgress();
  };

  if (loading) {
    return (
      <div className="h-screen bg-slate-50">
        <LoadingPage title="Preparing assessment…" />
      </div>
    );
  }

  if (entryStatus === 'TOO_EARLY') {
    const entry = assessment ? getAssessmentEntryStatus(assessment) : null;
    return (
      <div className="h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden">
        <div className="absolute inset-0 bg-slate-100" aria-hidden />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(79,70,229,0.12),_transparent_55%)]" aria-hidden />
        <div className="relative max-w-md w-full bg-white rounded-lg border border-slate-200/80 shadow-xl p-7 text-center">
          <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center mx-auto mb-4 border border-indigo-100">
            <Clock className="w-6 h-6 text-indigo-600" strokeWidth={1.75} />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">You&apos;re early</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Entry opens at{' '}
            <span className="font-semibold text-slate-800">{formatAssessmentWindow(entry?.entryOpensAt)}</span>
            {entry?.joinWindow
              ? ` (${entry.joinWindow.opensMinutesBeforeStart} minutes before start).`
              : '.'}
          </p>
          {assessment?.startTime && (
            <p className="text-xs text-slate-400 mt-3">
              Scheduled start: {formatAssessmentWindow(assessment.startTime)}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            <button
              type="button"
              onClick={recheckEntryWindow}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Check again
            </button>
            <button
              type="button"
              onClick={() => navigate('/student?tab=assessments')}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium border border-slate-200 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (entryStatus === 'TOO_LATE') {
    const entry = assessment ? getAssessmentEntryStatus(assessment) : null;
    return (
      <div className="h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden">
        <div className="absolute inset-0 bg-slate-100" aria-hidden />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(225,29,72,0.1),_transparent_55%)]" aria-hidden />
        <div className="relative max-w-md w-full bg-white rounded-lg border border-slate-200/80 shadow-xl p-7 text-center">
          <div className="w-12 h-12 bg-rose-50 rounded-lg flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <Ban className="w-6 h-6 text-rose-600" strokeWidth={1.75} />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Entry closed</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            The last time to join was{' '}
            <span className="font-semibold text-slate-800">{formatAssessmentWindow(entry?.entryClosesAt)}</span>
            {entry?.joinWindow
              ? ` (${entry.joinWindow.closesMinutesAfterStart} minutes after start).`
              : '.'}
          </p>
          {assessment?.startTime && (
            <p className="text-xs text-slate-400 mt-3">
              Scheduled start: {formatAssessmentWindow(assessment.startTime)}
              {assessment.endTime ? ` · Ends: ${formatAssessmentWindow(assessment.endTime)}` : ''}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            <button
              type="button"
              onClick={recheckEntryWindow}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Check again
            </button>
            <button
              type="button"
              onClick={() => navigate('/student?tab=assessments')}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium border border-slate-200 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (entryStatus === 'WAITING' && isPreCheckDone) {
    return (
      <div className="h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden">
        <div className="absolute inset-0 bg-slate-100" aria-hidden />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.12),_transparent_55%)]" aria-hidden />
        <div className="relative max-w-lg w-full bg-white rounded-lg border border-slate-200/80 shadow-xl p-7 text-center">
          <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center mx-auto mb-4 border border-amber-100">
            <Clock className="w-6 h-6 text-amber-600 animate-pulse" strokeWidth={1.75} />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Holding room</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-5">
            Device check is done. Questions will unlock at the scheduled start time.
          </p>
          <div className="bg-slate-50 rounded-lg border border-slate-200 px-5 py-4 mb-5">
            <p className="text-xs text-slate-500 mb-1">Scheduled start</p>
            <p className="text-xl font-semibold text-slate-900 tabular-nums">
              {new Date(assessment.startTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={executeTestStart}
            className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Start exam now
          </button>
          <p className="text-xs text-slate-400 mt-3">Only if it is past the start time.</p>
        </div>
      </div>
    );
  }

  // PRE-CHECK UI — full viewport layout (no centered card)
  if (!isPreCheckDone && !isInterviewer) {
    const allChecksPass =
      precheck.cameraReady && precheck.faceOk && precheck.fullscreen && precheck.displayOk;
    const passedCount = [
      precheck.cameraReady,
      precheck.faceOk,
      precheck.fullscreen,
      precheck.displayOk,
    ].filter(Boolean).length;

    const validationChecks = [
      {
        key: 'camera',
        label: 'Camera active',
        hint: 'Webcam feed is live',
        icon: Video,
        pass: precheck.cameraReady,
        loading: false,
      },
      {
        key: 'face',
        label: 'Face detectable',
        hint: precheck.faceLoading ? 'Detecting face…' : 'Face visible in frame',
        icon: ScanFace,
        pass: precheck.faceOk,
        loading: precheck.faceLoading,
      },
      {
        key: 'fullscreen',
        label: 'Fullscreen enabled',
        hint: 'Exam runs in fullscreen',
        icon: Maximize2,
        pass: precheck.fullscreen,
        loading: false,
      },
      {
        key: 'display',
        label: 'Single display only',
        hint: precheck.displayHint || 'No screen mirroring or extra monitors',
        icon: Monitor,
        pass: precheck.displayOk,
        loading: false,
      },
    ];

    return (
      <div className="h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-slate-100">
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(79,70,229,0.14),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(14,165,233,0.08),_transparent_50%)]"
          aria-hidden
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="assessment-precheck-title"
          className="relative w-full max-w-4xl bg-white rounded-lg border border-slate-200/80 shadow-xl shadow-indigo-900/5 overflow-hidden max-h-[min(92vh,900px)] flex flex-col"
        >
          <div className="px-5 sm:px-6 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
            <div className="min-w-0 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/20">
                <Shield className="w-4 h-4 text-white" strokeWidth={1.75} />
              </div>
              <h1 id="assessment-precheck-title" className="text-base font-semibold text-slate-900 truncate">
                {assessment.title}
              </h1>
            </div>
            <button
              type="button"
              onClick={startAssessment}
              disabled={starting || !allChecksPass}
              className={`shrink-0 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                starting || !allChecksPass
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/20'
              }`}
            >
              {starting ? (
                <>
                  <Spinner size="sm" />
                  Starting…
                </>
              ) : (
                <>
                  Start test
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[1.4fr_1fr] overflow-hidden">
            <section className="flex flex-col min-h-0 p-5 sm:p-6 overflow-hidden border-b md:border-b-0 md:border-r border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-2 shrink-0">Camera preview</p>
              <div className="flex-1 min-h-[200px] w-full rounded-md overflow-hidden border border-slate-800 bg-slate-900">
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              </div>
              {precheck.error && (
                <p className="text-xs text-rose-600 mt-2">{precheck.error}</p>
              )}
            </section>

            <section className="flex flex-col min-h-0 p-5 sm:p-6 overflow-y-auto">
              <div className="space-y-4">
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3.5 flex gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" strokeWidth={1.75} />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Webcam monitoring is on. Leaving the tab or frame may flag a violation.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-slate-500">Validation</p>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                        allChecksPass
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}
                    >
                      {passedCount}/3
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-3">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-300"
                      style={{ width: `${(passedCount / 3) * 100}%` }}
                    />
                  </div>
                  <div className="rounded-md border border-slate-200 overflow-hidden divide-y divide-slate-100">
                    {validationChecks.map((check) => {
                      const Icon = check.icon;
                      const statusPass = check.pass;
                      const statusLoading = check.loading;
                      return (
                        <div key={check.key} className="flex items-center gap-3 px-3 py-2.5 bg-white">
                          <div
                            className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 border ${
                              statusPass
                                ? 'bg-emerald-50 border-emerald-100'
                                : statusLoading
                                  ? 'bg-indigo-50 border-indigo-100'
                                  : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <Icon
                              className={`w-4 h-4 ${
                                statusPass
                                  ? 'text-emerald-600'
                                  : statusLoading
                                    ? 'text-indigo-600'
                                    : 'text-slate-400'
                              }`}
                              strokeWidth={1.75}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-800">{check.label}</p>
                            <p className="text-[11px] text-slate-500 truncate">{check.hint}</p>
                          </div>
                          {statusLoading ? (
                            <Spinner size="sm" />
                          ) : statusPass ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.75} />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-400" strokeWidth={1.75} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {precheck.faceDetectorFailed && (
                    <button
                      type="button"
                      onClick={retryFaceDetection}
                      className="w-full mt-2.5 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium border border-indigo-100 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ScanFace className="w-3.5 h-3.5" />
                      Retry face detection
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={startCameraPrecheck}
                    className="flex-1 px-3 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Video className="w-4 h-4" strokeWidth={1.75} />
                    Enable camera
                  </button>
                  <button
                    type="button"
                    onClick={enterFullscreenPrecheck}
                    className="flex-1 px-3 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Maximize2 className="w-4 h-4" strokeWidth={1.75} />
                    Fullscreen
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 text-center leading-snug">
                  Start only after all checks pass.
                  {precheck.faceLoading ? ' Face detection may take up to 20s.' : ''}
                  {precheck.faceHint ? ` ${precheck.faceHint}` : ''}
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden text-slate-900 relative">
      {isOffline && !isInterviewer && (
        <div className="absolute top-0 inset-x-0 z-[60] px-3 py-2 text-center text-xs font-semibold bg-amber-500 text-white">
          You are offline — answers are saved on this device and will sync when connection returns.
        </div>
      )}
      {examPaused && !isInterviewer && (() => {
        const overlay = pauseOverlayCopy(pauseReason);
        return (
        <div className="absolute inset-0 z-50 bg-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
              {overlay.showSecurityRecovery ? (
                <Monitor className="w-6 h-6 text-rose-600" />
              ) : (
                <Ban className="w-6 h-6 text-amber-600" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-slate-900">{overlay.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {overlay.body}
            </p>
            {overlay.showSecurityRecovery ? (
              <button
                type="button"
                onClick={() => retrySecurityRecovery()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-sm"
              >
                Re-check Security
              </button>
            ) : (
              <p className="text-xs text-slate-400">Waiting for an admin to unlock… this screen updates automatically.</p>
            )}
          </div>
        </div>
        );
      })()}
      {!examPaused && integrityFailure && !isInterviewer && (() => {
        const overlay = integrityOverlayCopy(integrityFailure);
        return (
        <div className="absolute inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
              <Video className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">{overlay.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{overlay.body}</p>
            <button
              type="button"
              onClick={() => retryIntegrityFix()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-sm"
            >
              {overlay.action}
            </button>
          </div>
        </div>
        );
      })()}
      <div className="shrink-0 px-4 sm:px-6 py-3 z-30 bg-white border-b border-slate-200/80">
        <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 shrink-0 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm shadow-indigo-600/20">
            {assessment?.type === 'MOCK_TEST' ? (
              <FileText className="w-4 h-4 text-white" strokeWidth={1.75} />
            ) : (
              <Video className="w-4 h-4 text-white" strokeWidth={1.75} />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900 tracking-tight truncate">{assessment?.title}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-medium text-slate-500">
                {assessment?.type?.replace(/_/g, ' ')}
              </span>
              <span className="w-1 h-1 bg-slate-300 rounded-full shrink-0" />
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                <span className="text-[11px] font-medium text-emerald-700">Live</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {!isInterviewer && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
              timeLeft < 300
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}>
              <Clock className={`w-3.5 h-3.5 ${timeLeft < 300 ? 'animate-pulse' : ''}`} strokeWidth={1.75} />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 leading-none">Time left</span>
                <span className="text-sm font-semibold tabular-nums leading-tight">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={openSubmitConfirm}
            disabled={submitting || interactionBlocked}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:pointer-events-none text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-indigo-600/20 flex items-center gap-2"
          >
            {submitting ? <Spinner size="sm" tone="white" /> : <Send className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{submitting ? 'Submitting…' : 'Submit'}</span>
          </button>
        </div>
        </header>
        {!isInterviewer && (
          <div className="mt-3">
            <SecureExamStatusBar
              status={secureStatus}
              violations={violations}
              lastAlert={
                secureStatus.face === false && /face/i.test(String(lastViolationType || ''))
                  ? null
                  : lastViolationType
              }
            />
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        <main className="flex-1 flex overflow-hidden bg-slate-50 relative min-w-0">
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 p-4">
            <div className="w-full flex-1 flex flex-col min-h-0">
              <div className="flex-1 min-h-0 flex flex-col">
                {currentQuestion ? (
                  <>
                {currentQuestion?.type === 'MCQ' ? (
                  <QuestionPanelShell
                    question={currentQuestion}
                    questionIndex={currentQuestionIdx}
                    layout="mcq"
                  >
                    <div className="grid gap-3">
                        {mcqDisplayOptions.map(({ opt, originalIndex }, displayIdx) => {
                          const opts = currentQuestion.options;
                          const selected =
                            normalizeMcqAnswer(answers[currentQuestion.id], opts) === String(originalIndex);
                          return (
                            <button
                              key={`${currentQuestion.id}-${originalIndex}`}
                              type="button"
                              onClick={() => handleAnswerChange(currentQuestion.id, String(originalIndex))}
                              className={`group p-4 text-left rounded-lg transition-colors flex items-center gap-4 border ${
                                selected
                                  ? 'bg-indigo-50 border-indigo-400 text-slate-900 shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <div
                                className={`w-9 h-9 rounded-md flex items-center justify-center font-semibold text-sm transition-colors ${
                                  selected
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                                }`}
                              >
                                {String.fromCharCode(65 + displayIdx)}
                              </div>
                              <span className="text-sm font-medium flex-1">{opt}</span>
                              {selected && <CheckCircle className="w-5 h-5 text-indigo-600 shrink-0" strokeWidth={1.75} />}
                            </button>
                          );
                        })}
                    </div>
                  </QuestionPanelShell>
                ) : currentQuestion?.type === 'CODING' ? (
                  <div className="flex-1 min-h-0 flex flex-col rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                    <div className="flex flex-col h-full min-h-0 bg-[#f8f9fb] p-5 gap-4">
                    <QuestionMetaBar question={currentQuestion} questionIndex={currentQuestionIdx} />
                    <div className="flex-1 min-h-0 flex flex-col lg:flex-row rounded-lg overflow-hidden bg-[#0d1117]">
                    <div className="lg:hidden max-h-[40vh] shrink-0 border-b border-slate-700/50 overflow-hidden">
                      <CodingProblemPanel
                        title={currentQuestion.questionText}
                        problem={currentQuestion.description}
                        constraints={currentQuestion.constraints}
                        examples={parseExamples(currentQuestion.examples)}
                        publicTests={getPublicTestCases(currentQuestion.testCases)}
                        timeLimitSec={currentQuestion.timeLimitSec}
                        memoryLimitMb={currentQuestion.memoryLimitMb}
                        hideHeaderMeta
                      />
                    </div>
                    <div className="hidden lg:block w-[42%] min-w-[280px] max-w-[480px] shrink-0 border-r border-slate-700/50">
                      <CodingProblemPanel
                        title={currentQuestion.questionText}
                        problem={currentQuestion.description}
                        constraints={currentQuestion.constraints}
                        examples={parseExamples(currentQuestion.examples)}
                        publicTests={getPublicTestCases(currentQuestion.testCases)}
                        timeLimitSec={currentQuestion.timeLimitSec}
                        memoryLimitMb={currentQuestion.memoryLimitMb}
                        hideHeaderMeta
                        className="h-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0 min-h-[360px]">
                    {(() => {
                      const allowed =
                        assessment?.allowedCodingLanguages?.length > 0
                          ? assessment.allowedCodingLanguages
                          : ['javascript'];
                      const defaultLang = allowed[0];
                      const parsed = parseCodingAnswer(
                        answers[currentQuestion.id],
                        defaultLang
                      );
                      let lang = parsed.language || defaultLang;
                      if (!allowed.includes(lang)) lang = defaultLang;
                      const starters = currentQuestion.starterCodesByLang;
                      const codeVal = answers[currentQuestion.id]
                        ? parsed.code
                        : parsed.codesByLang?.[lang] ?? getStarterForLanguage(starters, lang);
                      return (
                        <CodingWorkspace
                          key={currentQuestion.id}
                          lastRun={parsed.lastRun}
                          evaluation={parsed.evaluation}
                          readOnly={interactionBlocked}
                          sessionId={session?.id}
                          questionId={currentQuestion.id}
                          blockPaste
                          onPasteBlocked={() => {
                            logViolation('PASTE_ATTEMPT', 'Paste blocked in code editor', { severity: 'MEDIUM' });
                            toast?.warning('Paste is not allowed during the exam.');
                          }}
                          code={codeVal}
                          language={lang}
                          allowedLanguages={allowed}
                          showProblemHeader={false}
                          onCodeChange={(newCode) => {
                            const cur = parseCodingAnswer(answers[currentQuestion.id], lang);
                            const codesByLang = { ...cur.codesByLang, [lang]: newCode };
                            handleAnswerChange(
                              currentQuestion.id,
                              serializeCodingAnswer({
                                ...cur,
                                code: newCode,
                                language: lang,
                                codesByLang,
                              })
                            );
                          }}
                          onLanguageChange={(newLang) => {
                            const cur = parseCodingAnswer(answers[currentQuestion.id], lang);
                            const codesByLang = { ...cur.codesByLang, [lang]: cur.code };
                            const nextCode =
                              codesByLang[newLang] ?? getStarterForLanguage(starters, newLang);
                            handleAnswerChange(
                              currentQuestion.id,
                              serializeCodingAnswer({
                                ...cur,
                                code: nextCode,
                                language: newLang,
                                codesByLang,
                              })
                            );
                          }}
                          customInput={parsed.customInput}
                          onCustomInputChange={(input) => {
                            handleAnswerChange(
                              currentQuestion.id,
                              serializeCodingAnswer({ ...parsed, customInput: input })
                            );
                          }}
                          showSubmit
                          testCases={currentQuestion.testCases}
                          onTestsEmpty={() =>
                            toast?.error('No judge test cases configured for this question.')
                          }
                          onError={(msg) => toast?.error(msg)}
                          onSubmit={(payload) => {
                            handleAnswerChange(
                              currentQuestion.id,
                              serializeCodingAnswer(payload)
                            );
                            const ev = payload.evaluation;
                            if (ev?.total > 0) {
                              const verdict = VERDICT_LABEL[ev.verdict] || ev.verdict || 'Submitted';
                              toast?.success(
                                `${verdict} · ${ev.passed}/${ev.total} tests`
                              );
                            } else {
                              toast?.success('Coding answer saved');
                            }
                          }}
                          onRunComplete={(run) => {
                            handleAnswerChange(
                              currentQuestion.id,
                              serializeCodingAnswer({ ...parsed, code: codeVal, language: lang, lastRun: run })
                            );
                          }}
                          onEvaluateComplete={(ev) => {
                            handleAnswerChange(
                              currentQuestion.id,
                              serializeCodingAnswer({
                                ...parsed,
                                code: codeVal,
                                language: lang,
                                evaluation: ev,
                              })
                            );
                          }}
                        />
                      );
                    })()}
                    </div>
                    </div>
                    </div>
                  </div>
                ) : currentQuestion?.type === 'DESCRIPTIVE' ? (
                  <QuestionPanelShell
                    question={currentQuestion}
                    questionIndex={currentQuestionIdx}
                    layout="descriptive"
                  >
                    <textarea
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      placeholder="Type your answer here..."
                      className="flex-1 min-h-[280px] w-full p-4 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm leading-relaxed resize-y focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                    />
                  </QuestionPanelShell>
                ) : (
                  <div className="h-full bg-white rounded-lg border border-slate-200/80 flex flex-col items-center justify-center p-10 gap-6 shadow-sm">
                     <div className="text-center">
                        <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center transition-colors ${isRecording ? 'bg-rose-500 animate-pulse' : 'bg-slate-100 border border-slate-200'}`}>
                           <Video className={`w-8 h-8 ${isRecording ? 'text-white' : 'text-slate-400'}`} strokeWidth={1.75} />
                        </div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-1">Video response</h4>
                        <p className="text-xs text-slate-500">Question {currentQuestionIdx + 1}</p>
                     </div>

                     <div className="flex gap-3">
                        {!isRecording ? (
                          <button
                            type="button"
                            onClick={startRecording}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            Start recording
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-medium transition-colors animate-pulse"
                          >
                            Stop recording
                          </button>
                        )}
                     </div>

                     {answers[currentQuestion.id] && !isRecording && (
                       <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                          <CheckCircle className="w-4 h-4" strokeWidth={1.75} />
                          <span className="text-xs font-medium">Answer recorded</span>
                       </div>
                     )}
                  </div>
                )}
                <nav
                  className="shrink-0 mt-3 flex items-center gap-2"
                  aria-label="Question navigation"
                >
                  <button
                    type="button"
                    disabled={currentQuestionIdx === 0 || submitting}
                    onClick={() => goToQuestion(currentQuestionIdx - 1)}
                    className="min-h-11 flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium border border-slate-200 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={submitting || interactionBlocked || !currentQuestion}
                    onClick={toggleMarkForReview}
                    aria-pressed={Boolean(currentQuestion && markedForReview.has(currentQuestion.id))}
                    className={`min-h-11 flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40 disabled:pointer-events-none ${
                      currentQuestion && markedForReview.has(currentQuestion.id)
                        ? 'bg-violet-50 border-violet-300 text-violet-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Flag className={`w-4 h-4 ${currentQuestion && markedForReview.has(currentQuestion.id) ? 'fill-violet-600 text-violet-700' : ''}`} />
                    {currentQuestion && markedForReview.has(currentQuestion.id) ? 'Marked' : 'Mark for review'}
                  </button>
                  <p className="hidden sm:block text-xs font-medium text-slate-500 tabular-nums px-2">
                    {currentQuestionIdx + 1} / {orderedQuestions.length || 0}
                  </p>
                  {currentQuestionIdx >= (orderedQuestions.length || 1) - 1 ? (
                    <button
                      type="button"
                      disabled={submitting || interactionBlocked}
                      onClick={openSubmitConfirm}
                      className="min-h-11 flex-1 sm:flex-none sm:ml-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:pointer-events-none"
                    >
                      <Send className="w-4 h-4" />
                      Submit
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => goToQuestion(currentQuestionIdx + 1)}
                      className="min-h-11 flex-1 sm:flex-none sm:ml-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:pointer-events-none"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </nav>
                  </>
                ) : (
                  <div className="h-full bg-white rounded-lg border border-slate-200/80 flex flex-col items-center justify-center p-10 text-center">
                    <AlertCircle className="w-8 h-8 text-slate-400 mb-3" strokeWidth={1.75} />
                    <h4 className="text-sm font-semibold text-slate-900 mb-1">No questions available</h4>
                    <p className="text-xs text-slate-500 max-w-sm">
                      This assessment has no questions yet. Ask your admin to add questions and try again.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        <button
          type="button"
          onClick={() => setRightPanelOpen((open) => !open)}
          className={`absolute top-1/2 -translate-y-1/2 z-30 w-6 h-14 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors ${
            rightPanelOpen ? 'right-[316px] rounded-l-md border-r-0' : 'right-0 rounded-l-md'
          }`}
          title={rightPanelOpen ? 'Collapse panel' : 'Expand panel'}
          aria-expanded={rightPanelOpen}
          aria-label={rightPanelOpen ? 'Collapse panel' : 'Expand panel'}
        >
          {rightPanelOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <aside
          className={`shrink-0 h-full flex flex-col min-h-0 z-20 overflow-hidden transition-[width,padding] duration-300 ease-in-out py-4 ${
            rightPanelOpen ? 'w-[316px] pr-4' : 'w-0 pr-0'
          }`}
        >
          <div className="w-[300px] h-full min-h-0 flex flex-col rounded-lg border border-slate-200/80 bg-white overflow-hidden shadow-sm">
            <div className="flex-1 basis-0 min-h-0 flex flex-col overflow-hidden border-b border-slate-100">
              <ProctoringConsole
                videoRef={videoRef}
                violations={violations}
                lastViolationType={lastViolationType}
                cameraLive={cameraLive}
                borderless
                compact
                variant="light"
              />
              <div className="shrink-0 max-h-36 overflow-y-auto border-t border-slate-800 p-2">
                <p className="mb-1.5 text-[8px] font-black uppercase tracking-widest text-slate-500">Violation Timeline</p>
                <ViolationTimeline items={violationTimeline} compact emptyLabel="Clean session so far." />
              </div>
            </div>

            <div className="flex-1 basis-0 min-h-0 flex flex-col p-3 overflow-hidden">
              <p className="text-xs font-medium text-slate-500 mb-2 shrink-0">Questions</p>
              <div className="flex-1 min-h-0 flex flex-wrap content-start gap-2 overflow-y-auto">
                {orderedQuestions?.map((q, i) => {
                  const done = isQuestionAnswered(q, answers[q.id]);
                  const seen = visitedQuestionIds.has(q.id) || done;
                  const marked = markedForReview.has(q.id);
                  return (
                  <button
                    key={q.id || i}
                    type="button"
                    onClick={() => goToQuestion(i)}
                    className={`w-9 h-9 rounded-md flex items-center justify-center text-xs font-medium transition-colors ${
                      currentQuestionIdx === i
                        ? 'bg-indigo-600 text-white'
                        : marked
                          ? done
                            ? 'bg-emerald-50 text-emerald-800 border-2 border-violet-400'
                            : 'bg-violet-50 text-violet-800 border border-violet-300'
                          : done
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : seen
                              ? 'bg-amber-50 text-amber-800 border border-amber-100'
                              : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                    }`}
                    aria-label={`Question ${i + 1}${marked ? ', marked for review' : ''}${done ? ', answered' : seen ? ', seen' : ', not visited'}`}
                  >
                    {i + 1}
                  </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500 pt-2 shrink-0">
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 border border-emerald-200" /> Answered</span>
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-violet-100 border border-violet-300" /> Review</span>
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-100 border border-amber-200" /> Seen</span>
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-100 border border-slate-200" /> Not visited</span>
              </div>
              <div className="flex gap-2 shrink-0 pt-3">
                <button
                  type="button"
                  disabled={currentQuestionIdx === 0 || submitting}
                  onClick={() => goToQuestion(currentQuestionIdx - 1)}
                  className="flex-1 min-h-11 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1 text-xs font-medium disabled:opacity-30 border border-slate-200"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentQuestionIdx === orderedQuestions?.length - 1 || submitting}
                  onClick={() => goToQuestion(currentQuestionIdx + 1)}
                  className="flex-1 min-h-11 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1 text-xs font-medium disabled:opacity-30 border border-slate-200"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <AssessmentModal
        open={submitConfirmOpen}
        onClose={() => !submitting && setSubmitConfirmOpen(false)}
        title="Submit assessment?"
        subtitle="This cannot be undone. Review your attempt first."
        size="md"
        className="max-w-md"
        footer={(
          <>
            <button
              type="button"
              className={au.btnSecondary}
              disabled={submitting}
              onClick={() => setSubmitConfirmOpen(false)}
            >
              Review again
            </button>
            <button
              type="button"
              className={au.btnPrimary}
              disabled={submitting || !submitAcknowledged}
              onClick={() => {
                setSubmitConfirmOpen(false);
                submitAssessment();
              }}
            >
              {submitting ? <Spinner size="sm" tone="white" /> : <Send className="w-4 h-4" />}
              Submit exam
            </button>
          </>
        )}
      >
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Total', value: questionProgress.total, tone: 'text-slate-900' },
            { label: 'Answered', value: questionProgress.answered, tone: 'text-emerald-700' },
            { label: 'Not answered', value: questionProgress.notAnswered, tone: 'text-amber-700' },
            { label: 'Not visited', value: questionProgress.notVisited, tone: 'text-slate-600' },
            { label: 'Marked for review', value: questionProgress.marked, tone: 'text-violet-700' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-[11px] text-slate-500">{stat.label}</p>
              <p className={`text-xl font-semibold tabular-nums leading-tight ${stat.tone}`}>{stat.value}</p>
            </div>
          ))}
        </div>
        {questionProgress.notAnswered > 0 && (
          <p className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={1.75} />
            {questionProgress.notVisited > 0
              ? `${questionProgress.notAnswered} question${questionProgress.notAnswered === 1 ? '' : 's'} still unanswered, including ${questionProgress.notVisited} not opened yet.`
              : `${questionProgress.notAnswered} question${questionProgress.notAnswered === 1 ? '' : 's'} still unanswered.`}
          </p>
        )}
        <label className="flex items-start gap-2.5 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            checked={submitAcknowledged}
            onChange={(e) => setSubmitAcknowledged(e.target.checked)}
          />
          <span>
            I understand that after submitting I cannot change my answers.
          </span>
        </label>
      </AssessmentModal>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
