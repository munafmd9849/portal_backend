import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Camera, Mic, Wifi, CheckCircle2,
  AlertCircle,   ArrowRight, Clock, ArrowLeft,
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { LoadingPage, Spinner } from '../../components/ui/loading';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

export default function MockInterviewPreCheck() {
  const { slotId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { role: userRole } = useAuth();

  const [checks, setChecks] = useState({
    camera: 'pending',
    mic: 'pending',
    network: 'pending',
  });
  const [loading, setLoading] = useState(true);
  const [slot, setSlot] = useState(null);
  const [isEarly, setIsEarly] = useState(false);
  const [timeUntilStart, setTimeUntilStart] = useState('');
  const [isTooLate, setIsTooLate] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    initPreCheck();
    runDiagnostics();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const initPreCheck = async () => {
    try {
      setLoading(true);
      const slotData = await api.getMockInterviewSlot(slotId);
      setSlot(slotData);

      const isAdmin = userRole?.toUpperCase() === 'ADMIN' || userRole?.toUpperCase() === 'SUPER_ADMIN';
      const startTime = new Date(slotData.startTime);
      const endTime = new Date(slotData.endTime);
      const tenMinsBefore = new Date(startTime.getTime() - 10 * 60000);
      const oneHourAfter = new Date(endTime.getTime() + 60 * 60000);
      const now = new Date();

      if (!isAdmin) {
        if (now < tenMinsBefore) {
          setIsEarly(true);
          startCountdown(startTime);
        } else if (now > oneHourAfter) {
          const driveDate = new Date(slotData.drive?.date || slotData.startTime);
          driveDate.setHours(23, 59, 59, 999);
          if (now > driveDate) {
            setIsTooLate(true);
          }
        }
      }
    } catch (err) {
      toast.error('Failed to load session details');
    } finally {
      setLoading(false);
    }
  };

  const startCountdown = (startTime) => {
    const update = () => {
      const now = new Date();
      const diff = startTime.getTime() - now.getTime();
      const tenMinsInMs = 10 * 60000;

      if (diff <= tenMinsInMs) {
        setIsEarly(false);
        return;
      }

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeUntilStart(`${mins}:${secs.toString().padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  };

  const runDiagnostics = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setChecks((prev) => ({ ...prev, camera: 'success', mic: 'success' }));
    } catch (err) {
      setChecks((prev) => ({ ...prev, camera: 'failed', mic: 'failed' }));
      toast.error('Camera or microphone access was denied');
    }

    const start = Date.now();
    try {
      await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors' });
      const latency = Date.now() - start;
      setChecks((prev) => ({ ...prev, network: latency < 500 ? 'success' : 'failed' }));
    } catch (err) {
      setChecks((prev) => ({ ...prev, network: 'failed' }));
    }
  };

  const handleJoin = () => {
    if (Object.values(checks).some((c) => c !== 'success')) {
      toast.error('Please fix the device checks before joining');
      return;
    }
    if (isEarly) {
      toast.error('The room opens 10 minutes before your scheduled time');
      return;
    }
    if (isTooLate) {
      toast.error('This session is no longer available');
      return;
    }
    navigate(`/mock-interview-room/${slotId}?role=student`);
  };

  const sessionTitle = slot?.drive?.title || 'Mock Interview';
  const allChecksPassed = Object.values(checks).every((c) => c === 'success');
  const canEnter = allChecksPassed && !isEarly && !isTooLate;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <LoadingPage title="Loading session…" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div className="absolute inset-0 bg-slate-100" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(13,148,136,0.14),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(8,145,178,0.1),_transparent_50%)]" aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="precheck-title"
        className="relative w-full max-w-3xl bg-white rounded-lg border border-slate-200/80 shadow-xl shadow-teal-900/5 overflow-hidden"
      >
        <div className="px-5 sm:px-6 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
          <h1 id="precheck-title" className="text-base font-semibold text-slate-900 truncate min-w-0">
            {sessionTitle}
          </h1>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-slate-500 hover:text-slate-800 p-2 rounded-md hover:bg-slate-50 transition-colors shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-4">
            <div className="relative aspect-video max-h-52 bg-slate-900 rounded-md overflow-hidden border border-slate-800">
              {checks.camera === 'success' ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Camera className="w-8 h-8" />
                  <p className="text-xs">Camera not detected</p>
                </div>
              )}
              {checks.camera === 'success' && (
                <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-white/95 rounded text-[10px] font-medium text-slate-700 flex items-center gap-1.5 border border-white">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Preview
                </div>
              )}
            </div>

            <div className="rounded-md border border-slate-200/80 p-3.5 space-y-2">
              {[
                { id: 'camera', label: 'Camera', icon: Camera },
                { id: 'mic', label: 'Microphone', icon: Mic },
                { id: 'network', label: 'Internet', icon: Wifi },
              ].map((item) => {
                const Icon = item.icon;
                const status = checks[item.id];
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-md bg-slate-50 border border-slate-100"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-3.5 h-3.5 ${
                          status === 'success'
                            ? 'text-teal-600'
                            : status === 'failed'
                              ? 'text-rose-500'
                              : 'text-slate-400'
                        }`}
                      />
                      <span className="text-sm font-medium text-slate-800">{item.label}</span>
                    </div>
                    {status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : status === 'failed' ? (
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    ) : (
                      <Spinner size="sm" tone="muted" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4">
            <div
              className={`p-4 rounded-md border ${
                isEarly || isTooLate
                  ? 'bg-rose-50 border-rose-100'
                  : 'bg-teal-50 border-teal-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 ${
                    isEarly || isTooLate
                      ? 'bg-rose-100 text-rose-600'
                      : 'bg-teal-100 text-teal-700'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p
                    className={`text-xs font-medium ${
                      isEarly || isTooLate ? 'text-rose-700' : 'text-teal-800'
                    }`}
                  >
                    {isEarly ? 'Not open yet' : isTooLate ? 'Session closed' : 'Room is open'}
                  </p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5 tabular-nums">
                    {isEarly
                      ? `Opens in ${timeUntilStart}`
                      : isTooLate
                        ? 'This session has ended'
                        : 'Ready to enter'}
                  </p>
                  {(isEarly || isTooLate) && (
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      {isEarly
                        ? 'Join opens 10 minutes before start.'
                        : 'Contact placement if you missed this slot.'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleJoin}
              disabled={!canEnter}
              className="w-full min-h-[44px] py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              {isTooLate ? 'Session closed' : 'Enter interview room'}
              {!isTooLate && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
