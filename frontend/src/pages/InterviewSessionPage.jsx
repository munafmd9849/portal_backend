import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';

/**
 * Legacy interview session UI (Interview model) is deprecated.
 * All drives should use Interview Scheduling (InterviewSession model).
 */
export default function InterviewSessionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const base = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(`${base}?tab=interviewScheduling`, { replace: true });
    }, 4000);
    return () => clearTimeout(timer);
  }, [base, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-amber-200 shadow-lg p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Legacy interview session retired</h1>
        <p className="text-sm text-slate-600 mt-3 leading-relaxed">
          This page used the old interview system. Use <strong>Interview Scheduling</strong> in the admin
          dashboard for all live drives — it supports multi-round panels, interviewer tokens, and exports.
        </p>
        <button
          type="button"
          onClick={() => navigate(`${base}?tab=interviewScheduling`, { replace: true })}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
        >
          Open Interview Scheduling
          <ArrowRight className="w-4 h-4" />
        </button>
        <p className="text-xs text-slate-400 mt-4">Redirecting automatically…</p>
      </div>
    </div>
  );
}
