import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Shield, AlertTriangle, Clock, ChevronRight, ChevronLeft, 
  CheckCircle, XCircle, Loader2, Video, Code, FileText,
  Maximize2, Terminal, AlertCircle, Save, Send, Ban, ScanFace
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import {
  CodingWorkspace,
  parseCodingAnswer,
  serializeCodingAnswer,
  parseTestCases,
  parseExamples,
  parseStarterCodesByLang,
  getStarterForLanguage,
  parseAllowedCodingLanguages,
} from '../../coding-engine';
import CodingProblemPanel from '../../components/coding/CodingProblemPanel';
import ProctoringConsole from '../../components/assessment/ProctoringConsole';
import SecureExamStatusBar from '../../components/assessment/SecureExamStatusBar';
import ViolationTimeline from '../../components/assessment/ViolationTimeline';
import { ProctoringEngine } from '../../proctoring-engine/ProctoringEngine';
import { defaultProctoringConfig } from '../../proctoring-engine/constants';
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
import { initSocket } from '../../services/socket';
import { ProctoringBroadcaster } from '../../proctoring-engine/liveProctoringRtc';

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
            <h2 className="text-base font-semibold text-slate-900 leading-snug text-balance">
              {question?.questionText || 'Question'}
            </h2>
            {question?.description ? (
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
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
          <h2 className="text-base font-semibold text-slate-900 leading-snug">
            {question?.questionText || 'Question'}
          </h2>
        </div>
        <div className="flex-1 min-h-0 flex flex-col px-5 py-5 gap-6">
          {question?.description ? (
            <section>
              <p className="text-xs font-medium text-slate-500 mb-2">Description</p>
              <div className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
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
  const [answers, setAnswers] = useState({}); // Stores MCQ options or Code snippets
  const [cameraLive, setCameraLive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPreCheckDone, setIsPreCheckDone] = useState(false);
  const [violations, setViolations] = useState(0);
  const [lastViolationType, setLastViolationType] = useState(null);
  const [violationTimeline, setViolationTimeline] = useState([]);
  const [secureStatus, setSecureStatus] = useState({
    secureMode: false,
    fullscreen: false,
    camera: false,
    microphone: false,
    online: true,
    multiMonitor: null,
  });
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const submittingRef = useRef(false);
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
    error: '',
  });
  const [starting, setStarting] = useState(false);
  const precheckIntervalRef = useRef(null);

  const [entryStatus, setEntryStatus] = useState('ALLOWED'); // ALLOWED, TOO_EARLY, TOO_LATE, WAITING

  // 1. Initialize Assessment & Session
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const details = await api.getAssessmentDetails(assessmentId);
        const allowedCodingLanguages = parseAllowedCodingLanguages(details.config);
        const questions = (details.questions || []).map((q) => ({
          ...q,
          testCases: parseTestCases(q.testCases),
          starterCodesByLang: parseStarterCodesByLang(q.starterCode),
        }));
        setAssessment({ ...details, questions, allowedCodingLanguages });
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
        setAssessment(fresh);
        const entry = getAssessmentEntryStatus(fresh);
        setEntryStatus(entry.status);
      } catch {
        /* ignore poll errors */
      }
    };

    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [assessmentId, entryStatus, isInterviewer, loading]);

  // 2. Timer Logic
  useEffect(() => {
    if (!loading && isPreCheckDone && timeLeft > 0 && !isInterviewer) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            submitAssessment();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerIntervalRef.current);
    }
  }, [loading, isPreCheckDone, isInterviewer]);

  // Re-sync countdown from session start (tab return, background throttling)
  useEffect(() => {
    if (!isPreCheckDone || isInterviewer || !session?.startTime || !assessment?.duration) return;

    const syncTimer = () => {
      const remaining = getRemainingSecondsFromSession(session, assessment.duration);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timerIntervalRef.current);
        submitAssessment();
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
  }, [isPreCheckDone, isInterviewer, session?.id, session?.startTime, assessment?.duration]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const logViolation = useCallback(async (type, details, meta) => {
    const sess = sessionRef.current;
    if (!sess || isInterviewer) return;
    try {
      await api.logProctoringViolation(sess.id, { type, details, meta });
      setViolations(v => v + 1);
      setLastViolationType(type.replace(/_/g, ' '));
      setViolationTimeline((prev) => [
        ...prev,
        {
          type,
          details,
          severity: meta?.severity || 'MEDIUM',
          at: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      console.error('Violation log failed', e);
    }
  }, [isInterviewer]);

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
        micRequired: p.mic === true,
        tabSwitch: p.tabSwitch !== false,
        windowBlur: true,
        fullscreenRequired: p.fullscreen !== false,
        periodicSnapshotBaseMs: Math.max(25000, (Number(p.snapshotInterval) || 45) * 1000),
        periodicSnapshotJitterMs: Math.min(15000, Math.max(5000, Math.round((Number(p.snapshotInterval) || 60) * 1000 * 0.15))),
        screenshotDebounceMs: 8000,
        liveFrameToAdmin: false,
        faceMonitoring: true,
        clipboardGuard: true,
        contextMenuGuard: true,
        selectionGuard: false,
        shortcutGuard: true,
        resizeGuard: true,
        navigationGuard: true,
        multiMonitorWarn: true,
        connectivityMonitor: true,
        autoSubmit: {
          enabled: p.autoSubmit !== false && p.autoSubmitEnabled !== false,
          threshold: Number(p.violationLimit || p.autoSubmitThreshold || 10) || 10,
        },
      };
    } catch {
      return { ...defaultProctoringConfig };
    }
  }, [assessment]);

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
        if (level === 'error') toast?.error(message);
        else if (level === 'warn') toast?.warning(message);
      },
      onViolation: ({ type, details, severity, count, at }) => {
        setSecureStatus((prev) => ({ ...prev, ...(engine.getSecureStatus?.() || {}) }));
        setLastViolationType(String(type || '').replace(/_/g, ' '));
      },
      onAutoSubmit: async ({ reason, count, threshold }) => {
        toast?.error(
          reason
            ? `${reason} (${count}/${threshold}). Auto-submitting your attempt…`
            : 'Violation limit reached. Auto-submitting…'
        );
        try {
          await submitAssessmentRef.current?.();
        } catch (err) {
          console.error('Auto-submit failed', err);
          toast?.error('Auto-submit failed. Please submit manually.');
        }
      },
      config: cfg,
    });
    proctorRef.current = engine;
    return engine;
  }, [getProctoringConfig, logViolation, toast, assessmentId]);

  const runPrecheckValidation = useCallback(async () => {
    const e = proctorRef.current;
    if (!e) return;
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

    setPrecheck((p) => ({
      ...p,
      cameraReady: streamActive,
      fullscreen: e.cfg.fullscreenRequired ? e.isFullscreen : true,
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
          : e?.message || 'Failed to start camera';
      setPrecheck((p) => ({ ...p, error: msg, cameraReady: false, faceLoading: false }));
      toast?.error('Camera access is required for proctoring');
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
    const attach = () => proctorRef.current?.reattachVideo();
    attach();
    const t = setTimeout(attach, 100);
    const t2 = setTimeout(attach, 500);
    return () => {
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
      setAssessment(fresh);
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
      initSocket();
      await engine.start();

      if (proctorRtcRef.current) {
        proctorRtcRef.current.stop();
      }
      const sess = sessionRef.current;
      if (sess?.id) {
        proctorRtcRef.current = new ProctoringBroadcaster({
          sessionId: sess.id,
          assessmentId,
          getStream: () => proctorRef.current?.getStream?.() ?? null,
        });
        await proctorRtcRef.current.start();
      }
    } finally {
      setStarting(false);
    }
  };

  const executeTestStart = async () => {
    try {
      setLoading(true);
      const sess = await api.startAssessmentSession(assessmentId, { silent: true });
      const remaining = resolveSessionRemainingSeconds(sess, assessment?.duration ?? sess.durationMinutes);

      if (remaining <= 0) {
        toast?.error('Assessment time has expired');
        navigate('/student/dashboard');
        return;
      }

      sessionRef.current = sess;
      setSession(sess);
      setTimeLeft(remaining);
      if (sess.responses) setAnswers(JSON.parse(sess.responses));
      setIsPreCheckDone(true);
      setEntryStatus('ALLOWED');
    } catch (e) {
      if (e.response?.data?.code === 'TIME_EXPIRED') {
        toast?.error('Assessment time has expired');
        navigate('/student/dashboard');
        return;
      }
      if (e.response?.data?.error === 'Assessment already completed') {
        toast?.error('You have already completed this assessment');
        navigate('/student/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  // Video Recording for VIDEO questions
  const startRecording = () => {
    if (!videoRef.current?.srcObject) return;
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

  const submitAssessment = async () => {
    try {
      if (submittingRef.current) return;
      const sess = sessionRef.current;
      if (!sess?.id) return;
      submittingRef.current = true;
      await api.completeAssessment(sess.id, { answers: JSON.stringify(answers) });
      toast?.success('Assessment submitted successfully');
      if (document.fullscreenElement) document.exitFullscreen();
      try {
        proctorRtcRef.current?.stop();
        proctorRef.current?.destroy?.();
      } catch {}
      navigate('/student/dashboard');
    } catch (e) {
      toast?.error('Submission failed');
    } finally {
      submittingRef.current = false;
    }
  };
  submitAssessmentRef.current = submitAssessment;

  useEffect(() => {
    if (!isPreCheckDone || isInterviewer) return undefined;
    const syncSecureStatus = () => {
      const engine = proctorRef.current;
      if (!engine?.getSecureStatus) return;
      setSecureStatus(engine.getSecureStatus());
      setCameraLive(engine.isCameraActive());
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

  const recheckEntryWindow = useCallback(async () => {
    try {
      setLoading(true);
      const fresh = await api.getAssessmentDetails(assessmentId);
      setAssessment(fresh);
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

  if (loading) {
    return (
      <div className="h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500">Preparing assessment…</p>
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
    const allChecksPass = precheck.cameraReady && precheck.faceOk && precheck.fullscreen;
    const passedCount = [precheck.cameraReady, precheck.faceOk, precheck.fullscreen].filter(Boolean).length;

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
                  <Loader2 className="w-4 h-4 animate-spin" />
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
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
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

  // LIVE ASSESSMENT UI
  const currentQuestion = assessment?.questions?.[currentQuestionIdx];

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden text-slate-900">
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
            onClick={submitAssessment}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-indigo-600/20 flex items-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Submit</span>
          </button>
        </div>
        </header>
        {!isInterviewer && (
          <div className="mt-3">
            <SecureExamStatusBar
              status={secureStatus}
              violations={violations}
              threshold={getProctoringConfig()?.autoSubmit?.threshold ?? 10}
              autoSubmitEnabled={getProctoringConfig()?.autoSubmit?.enabled !== false}
            />
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        <main className="flex-1 flex overflow-hidden bg-slate-50 relative min-w-0">
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 p-4">
            <div className="w-full flex-1 flex flex-col min-h-0">
              <div className="flex-1 min-h-0 flex flex-col">
                {currentQuestion?.type === 'MCQ' ? (
                  <QuestionPanelShell
                    question={currentQuestion}
                    questionIndex={currentQuestionIdx}
                    layout="mcq"
                  >
                    <div className="grid gap-3">
                        {JSON.parse(currentQuestion.options || '[]').map((opt, i) => {
                          const opts = currentQuestion.options;
                          const selected =
                            normalizeMcqAnswer(answers[currentQuestion.id], opts) === String(i);
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleAnswerChange(currentQuestion.id, String(i))}
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
                                {String.fromCharCode(65 + i)}
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
                        hideHeaderMeta
                      />
                    </div>
                    <div className="hidden lg:block w-[42%] min-w-[280px] max-w-[480px] shrink-0 border-r border-slate-700/50">
                      <CodingProblemPanel
                        title={currentQuestion.questionText}
                        problem={currentQuestion.description}
                        constraints={currentQuestion.constraints}
                        examples={parseExamples(currentQuestion.examples)}
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
                              toast?.success(
                                `Saved · Tests ${ev.passed}/${ev.total}${ev.score != null ? ` (${ev.score}%)` : ''}`
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
                {assessment?.questions?.map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentQuestionIdx(i)}
                    className={`w-9 h-9 rounded-md flex items-center justify-center text-xs font-medium transition-colors ${
                      currentQuestionIdx === i
                        ? 'bg-indigo-600 text-white'
                        : answers[q.id]
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 shrink-0 pt-3">
                <button
                  type="button"
                  disabled={currentQuestionIdx === 0}
                  onClick={() => setCurrentQuestionIdx((v) => v - 1)}
                  className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors flex items-center justify-center disabled:opacity-30 border border-slate-200"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={currentQuestionIdx === assessment?.questions?.length - 1}
                  onClick={() => setCurrentQuestionIdx((v) => v + 1)}
                  className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors flex items-center justify-center disabled:opacity-30 border border-slate-200"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
