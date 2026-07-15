import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, Clock, ChevronRight, CheckCircle, XCircle, Loader2,
  Video, Maximize2, Send, RotateCcw, Mic,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { useInterviewSpeech } from '../../hooks/useInterviewSpeech';
import { ProctoringEngine } from '../../proctoring-engine/ProctoringEngine';
import { defaultProctoringConfig } from '../../proctoring-engine/constants';
import ProctoringConsole from '../../components/assessment/ProctoringConsole';

const PHASE = { LOAD: 'load', PRECHECK: 'precheck', LIVE: 'live', DONE: 'done' };

export default function AiMockInterviewSession() {
  const { id: interviewId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [phase, setPhase] = useState(PHASE.LOAD);
  const [session, setSession] = useState(null);
  const [enrollmentId, setEnrollmentId] = useState(null);
  const [qIndex, setQIndex] = useState(0);
  const [answeredIds, setAnsweredIds] = useState(new Set());
  const [prepLeft, setPrepLeft] = useState(0);
  const [answerLeft, setAnswerLeft] = useState(0);
  const [phaseStep, setPhaseStep] = useState('idle');
  const [voiceRate, setVoiceRate] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [violations, setViolations] = useState(0);
  const [cameraLive, setCameraLive] = useState(false);
  const [precheck, setPrecheck] = useState({
    cameraReady: false,
    fullscreen: false,
    micReady: false,
    error: '',
  });

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const proctorRef = useRef(null);
  const recordStartRef = useRef(null);

  const { speak, stop: stopSpeech, speaking, supported: speechSupported } = useInterviewSpeech({
    rate: voiceRate,
  });

  const questions = session?.questions || [];
  const currentQ = questions[qIndex];
  const totalQ = questions.length;
  const progressPct = session?.progressPercent ?? Math.round((answeredIds.size / Math.max(1, totalQ)) * 100);

  const loadSession = useCallback(async () => {
    try {
      const data = await api.getStudentAiInterviewSession(interviewId);
      setSession(data);
      setEnrollmentId(data.enrollmentId);
      setQIndex(data.currentQuestionIndex || 0);
      setAnsweredIds(new Set(data.questions.filter((q) => q.answered).map((q) => q.id)));
      setPhase(PHASE.PRECHECK);
    } catch (err) {
      toast.error(err.message || 'Failed to load interview');
      navigate('/student?tab=guidedAiInterviews');
    }
  }, [interviewId, navigate, toast]);

  useEffect(() => {
    loadSession();
    return () => {
      proctorRef.current?.stop?.();
      streamRef.current?.getTracks?.().forEach((t) => t.stop());
      stopSpeech();
    };
  }, [loadSession, stopSpeech]);

  const attachStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 640, height: 480 },
      audio: true,
    });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => videoRef.current?.play?.();
    }
    setCameraLive(true);
    return stream;
  };

  const startCameraPrecheck = async () => {
    setPrecheck((p) => ({ ...p, error: '' }));
    try {
      await attachStream();
      setPrecheck((p) => ({ ...p, cameraReady: true, micReady: true }));
    } catch {
      setPrecheck((p) => ({ ...p, error: 'Camera and microphone permission required.', cameraReady: false, micReady: false }));
      setCameraLive(false);
    }
  };

  const enterFullscreenPrecheck = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setPrecheck((p) => ({ ...p, fullscreen: true }));
    } catch {
      setPrecheck((p) => ({ ...p, error: 'Fullscreen is required for this interview.' }));
    }
  };

  useEffect(() => {
    if (phase !== PHASE.PRECHECK) return;
    startCameraPrecheck();
  }, [phase]);

  const startProctoring = useCallback(() => {
    if (!enrollmentId || proctorRef.current) return;
    const cfg = { ...defaultProctoringConfig, ...(session?.proctoringConfig || {}) };
    const engine = new ProctoringEngine({
      getVideoEl: () => videoRef.current,
      getSessionId: () => enrollmentId,
      config: cfg,
      logViolation: async (type, details, meta) => {
        await api.logAiInterviewViolation(enrollmentId, { type, details, meta });
        setViolations((v) => v + 1);
      },
      uploadScreenshot: async (blob, meta) => api.uploadAiInterviewScreenshot(enrollmentId, blob, meta),
      onWarning: (msg) => toast.error(msg),
    });
    proctorRef.current = engine;
    engine.start().then(() => engine.enableMonitoring());
  }, [enrollmentId, session, toast]);

  const startInterview = async () => {
    if (!(precheck.cameraReady && precheck.fullscreen && precheck.micReady)) return;
    setStarting(true);
    try {
      await api.startAiInterviewSession(enrollmentId);
      await attachStream();
      startProctoring();
      setPhase(PHASE.LIVE);
      setPhaseStep('idle');
    } catch (err) {
      toast.error(err.message || 'Could not start');
    } finally {
      setStarting(false);
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const rec = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp8,opus' });
    recorderRef.current = rec;
    recordStartRef.current = Date.now();
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.start(1000);
  };

  const stopRecording = () =>
    new Promise((resolve) => {
      const rec = recorderRef.current;
      if (!rec || rec.state === 'inactive') {
        resolve(null);
        return;
      }
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        resolve({
          blob,
          duration: Math.round((Date.now() - (recordStartRef.current || Date.now())) / 1000),
        });
      };
      rec.stop();
    });

  const runQuestionFlow = useCallback(async () => {
    if (!currentQ || phaseStep !== 'idle') return;
    setPhaseStep('speak');
    await speak(currentQ.questionText);
    setPhaseStep('prep');
    setPrepLeft(currentQ.prepTimeSeconds);
  }, [currentQ, phaseStep, speak]);

  useEffect(() => {
    if (phase !== PHASE.LIVE || !currentQ || phaseStep !== 'idle') return;
    runQuestionFlow();
  }, [phase, qIndex, currentQ?.id, phaseStep, runQuestionFlow]);

  useEffect(() => {
    if (phaseStep !== 'prep' || prepLeft <= 0) return;
    const t = setInterval(() => {
      setPrepLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          setPhaseStep('answer');
          setAnswerLeft(currentQ?.answerTimeSeconds ?? 120);
          startRecording();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phaseStep, prepLeft, currentQ?.answerTimeSeconds]);

  const handleSubmitAnswer = useCallback(async () => {
    if (submitting || !currentQ) return;
    setSubmitting(true);
    setPhaseStep('uploading');
    try {
      const result = await stopRecording();
      if (!result?.blob?.size) {
        toast.error('Recording failed — try again');
        setPhaseStep('answer');
        return;
      }
      await api.submitAiInterviewAnswer(enrollmentId, result.blob, {
        questionId: currentQ.id,
        durationSeconds: result.duration,
      });
      const nextAnswered = new Set(answeredIds);
      nextAnswered.add(currentQ.id);
      setAnsweredIds(nextAnswered);
      const next = qIndex + 1;
      if (next >= totalQ) {
        await api.completeAiInterview(enrollmentId);
        proctorRef.current?.stop?.();
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        setPhase(PHASE.DONE);
      } else {
        setQIndex(next);
        await api.updateAiInterviewProgress(enrollmentId, {
          currentQuestionIndex: next,
          progressPercent: Math.round((nextAnswered.size / totalQ) * 100),
        });
        setPhaseStep('idle');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit');
      setPhaseStep('answer');
    } finally {
      setSubmitting(false);
    }
  }, [submitting, currentQ, enrollmentId, qIndex, totalQ, answeredIds, toast]);

  useEffect(() => {
    if (phaseStep !== 'answer' || answerLeft <= 0) return;
    const t = setInterval(() => {
      setAnswerLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          handleSubmitAnswer();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phaseStep, answerLeft, handleSubmitAnswer]);

  if (phase === PHASE.LOAD) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500">Loading interview…</p>
      </div>
    );
  }

  if (phase === PHASE.DONE) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden">
        <div className="absolute inset-0 bg-slate-100" aria-hidden />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(79,70,229,0.12),_transparent_55%)]"
          aria-hidden
        />
        <div className="relative max-w-md w-full bg-white rounded-lg p-7 border border-slate-200/80 shadow-xl text-center">
          <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <CheckCircle className="w-6 h-6 text-emerald-600" strokeWidth={1.75} />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Interview submitted</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Your responses are saved. Feedback will appear when your institution releases the report.
          </p>
          <button
            type="button"
            onClick={() => navigate('/student?tab=guidedAiInterviews')}
            className="mt-6 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Back to Guided AI
          </button>
        </div>
      </div>
    );
  }

  if (phase === PHASE.PRECHECK) {
    const readyToStart = precheck.cameraReady && precheck.micReady && precheck.fullscreen;

    return (
      <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden">
        <div className="absolute inset-0 bg-slate-100" aria-hidden />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(79,70,229,0.14),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(124,58,237,0.1),_transparent_50%)]"
          aria-hidden
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-precheck-title"
          className="relative w-full max-w-3xl bg-white rounded-lg border border-slate-200/80 shadow-xl shadow-indigo-900/5 overflow-hidden"
        >
          <div className="px-5 sm:px-6 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
            <h1 id="ai-precheck-title" className="text-base font-semibold text-slate-900 truncate min-w-0">
              {session?.title || 'Guided AI interview'}
            </h1>
            <button
              type="button"
              onClick={() => navigate('/student?tab=guidedAiInterviews')}
              className="text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-md hover:bg-slate-50 text-xs font-medium transition-colors shrink-0"
            >
              Back
            </button>
          </div>

          <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div className="relative aspect-video max-h-52 bg-slate-900 rounded-md overflow-hidden border border-slate-800">
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              </div>
              {precheck.error && <p className="text-xs text-rose-600">{precheck.error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={startCameraPrecheck}
                  className="flex-1 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 transition-colors"
                >
                  Enable camera
                </button>
                <button
                  type="button"
                  onClick={enterFullscreenPrecheck}
                  className="flex-1 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 transition-colors"
                >
                  Go fullscreen
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border border-slate-200 p-3 bg-slate-50">
                  <Video className="w-4 h-4 text-indigo-600 mb-1.5" strokeWidth={1.75} />
                  <p className="text-xs font-medium text-slate-900">Camera & mic</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Required to record answers.</p>
                </div>
                <div className="rounded-md border border-slate-200 p-3 bg-slate-50">
                  <Maximize2 className="w-4 h-4 text-indigo-600 mb-1.5" strokeWidth={1.75} />
                  <p className="text-xs font-medium text-slate-900">Fullscreen</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Stay fullscreen during the session.</p>
                </div>
              </div>

              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" strokeWidth={1.75} />
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Questions are read aloud. You cannot edit an answer after submitting.
                  {session?.instructions ? ` ${session.instructions}` : ''}
                </p>
              </div>

              <div className="rounded-md border border-slate-200 p-3 space-y-1.5">
                {[
                  ['Camera enabled', precheck.cameraReady],
                  ['Microphone enabled', precheck.micReady],
                  ['Fullscreen on', precheck.fullscreen],
                ].map(([label, ok]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between px-2.5 py-2 bg-slate-50 rounded-md border border-slate-100"
                  >
                    <span className="text-xs text-slate-700">{label}</span>
                    {ok ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.75} />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-300" strokeWidth={1.75} />
                    )}
                  </div>
                ))}
                <p className="text-[11px] text-slate-400 pt-1">{totalQ} questions</p>
              </div>
            </div>
          </div>

          <div className="px-5 sm:px-6 pb-5">
            <button
              type="button"
              onClick={startInterview}
              disabled={starting || !readyToStart}
              className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                starting || !readyToStart
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/20'
              }`}
            >
              {starting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Starting…
                </>
              ) : (
                <>
                  Start interview <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const phaseStepLabel = {
    prep: 'Preparation',
    answer: 'Recording',
    uploading: 'Uploading',
    speak: 'Listening',
    idle: 'Standby',
  }[phaseStep] || 'Standby';

  const phaseStepDetail = {
    prep: `${prepLeft}s remaining`,
    answer: `${answerLeft}s remaining`,
    uploading: 'Saving your answer…',
    speak: 'Question is being read',
    idle: 'Getting ready…',
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden text-slate-900">
      <header className="h-14 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm shadow-indigo-600/20">
            <Video className="w-4 h-4 text-white" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900 truncate">{session?.title}</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <span className="text-[11px] text-emerald-700 font-medium">In progress</span>
            </div>
          </div>
        </div>

        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border flex-shrink-0 ${
            phaseStep === 'answer'
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-slate-50 border-slate-200 text-slate-900'
          }`}
        >
          <Clock className={`w-3.5 h-3.5 ${phaseStep === 'answer' ? 'animate-pulse' : ''}`} strokeWidth={1.75} />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 leading-none">{phaseStepLabel}</span>
            <span className="text-sm font-semibold tabular-nums leading-tight">
              {phaseStep === 'prep'
                ? `${prepLeft}s`
                : phaseStep === 'answer'
                  ? `${answerLeft}s`
                  : `${progressPct}%`}
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden min-h-0">
        <aside className="w-14 sm:w-16 bg-white border-r border-slate-200/80 flex flex-col items-center py-4 gap-2 overflow-y-auto shrink-0">
          {questions.map((q, i) => {
            const done = answeredIds.has(q.id);
            const current = i === qIndex;
            return (
              <div
                key={q.id}
                className={`w-9 h-9 rounded-md flex items-center justify-center text-xs font-medium ${
                  current
                    ? 'bg-indigo-600 text-white'
                    : done
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-slate-50 text-slate-400 border border-slate-200'
                }`}
                title={q.mandatory ? 'Required' : 'Optional'}
              >
                {i + 1}
              </div>
            );
          })}
        </aside>

        <main className="flex-1 flex overflow-hidden min-h-0">
          <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto min-h-0">
            <div className="max-w-3xl w-full mx-auto space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-xs font-medium border border-indigo-100">
                    Question {qIndex + 1} of {totalQ}
                  </span>
                  {speaking && (
                    <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-md text-xs font-medium border border-violet-100">
                      Reading…
                    </span>
                  )}
                </div>
                <div className="h-1.5 w-24 bg-slate-200 rounded-full overflow-hidden flex-shrink-0">
                  <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progressPct}%` }} />
                </div>
              </div>

              <h3 className="text-base sm:text-lg font-semibold text-slate-900 leading-snug text-balance">
                {currentQ?.questionText}
              </h3>
              {currentQ?.notes && (
                <p className="text-sm text-slate-500 leading-relaxed">{currentQ.notes}</p>
              )}

              <div className="bg-white border border-slate-200/80 rounded-lg flex flex-col items-center justify-center p-6 sm:p-8 gap-4 shadow-sm">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                    phaseStep === 'answer'
                      ? 'bg-rose-500 animate-pulse'
                      : 'bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Mic className={`w-7 h-7 ${phaseStep === 'answer' ? 'text-white' : 'text-slate-400'}`} strokeWidth={1.75} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-900">Video response</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {phaseStepDetail[phaseStep] || phaseStepDetail.idle}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => currentQ && speak(currentQ.questionText)}
                    disabled={speaking || !speechSupported}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 disabled:opacity-40 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Replay
                  </button>
                  <select
                    value={voiceRate}
                    onChange={(e) => setVoiceRate(Number(e.target.value))}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                  >
                    <option value={0.85}>Slow voice</option>
                    <option value={1}>Normal voice</option>
                    <option value={1.15}>Fast voice</option>
                  </select>
                </div>

                {phaseStep === 'answer' && (
                  <button
                    type="button"
                    onClick={handleSubmitAnswer}
                    disabled={submitting}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-4 h-4" /> Submit answer
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>

        <aside className="w-64 sm:w-72 bg-white border-l border-slate-200/80 flex flex-col p-4 gap-3 shrink-0 overflow-y-auto min-h-0">
          <ProctoringConsole videoRef={videoRef} violations={violations} cameraLive={cameraLive} variant="light" />
          <div className="rounded-lg p-4 border border-slate-200 bg-slate-50">
            <p className="text-xs font-medium text-slate-500 mb-2">Progress</p>
            <p className="text-xl font-semibold text-slate-900 tabular-nums">{progressPct}%</p>
            <p className="text-xs text-slate-500 mt-1">
              {answeredIds.size} of {totalQ} answers submitted
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
