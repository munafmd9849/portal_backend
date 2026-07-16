import React from 'react';
import { Activity } from 'lucide-react';

export const STAT_ICON_BOX = {
  indigo: 'bg-indigo-50 border-indigo-100',
  emerald: 'bg-emerald-50 border-emerald-100',
  amber: 'bg-amber-50 border-amber-100',
  purple: 'bg-purple-50 border-purple-100',
  violet: 'bg-violet-50 border-violet-100',
  teal: 'bg-teal-50 border-teal-100',
  cyan: 'bg-cyan-50 border-cyan-100',
};

export const STAT_ICON_COLOR = {
  indigo: 'text-indigo-600',
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  purple: 'text-purple-600',
  violet: 'text-violet-600',
  teal: 'text-teal-600',
  cyan: 'text-cyan-700',
};

const FEEDBACK_RATING_FIELDS = [
  'communication',
  'confidence',
  'technicalSkills',
  'problemSolving',
  'bodyLanguage',
  'resumeKnowledge',
  'overallPerformance',
];

export function feedbackScorePercent(feedback) {
  if (!feedback) return null;
  const values = FEEDBACK_RATING_FIELDS.map((key) => feedback[key]).filter(
    (v) => typeof v === 'number' && v > 0
  );
  if (!values.length) return null;
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.round(avg * 20);
}

export function aiInterviewStatusMeta(status) {
  const isCompleted = status === 'COMPLETED';
  if (isCompleted) {
    return { label: 'Completed', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
  }
  if (status === 'IN_PROGRESS') {
    return { label: 'In Progress', color: 'text-amber-600 bg-amber-50 border-amber-100' };
  }
  return { label: 'Not Started', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' };
}

export function getAiEnrollmentStatusBadge(status) {
  switch (status) {
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
          Completed
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-100">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          In progress
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-800 border border-indigo-100">
          Not started
        </span>
      );
  }
}

export function StatGrid({ stats, loading }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-[11px] font-medium text-slate-500">{stat.label}</p>
            <p className="text-lg font-semibold text-slate-900 mt-0.5 tabular-nums">
              {loading ? '—' : stat.val}
            </p>
          </div>
          <div
            className={`w-8 h-8 rounded-lg border flex items-center justify-center ${STAT_ICON_BOX[stat.color]}`}
          >
            <Activity className={`w-3.5 h-3.5 ${STAT_ICON_COLOR[stat.color]}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LoadingBlock({ message = 'Loading…', accent = 'teal' }) {
  const ring =
    accent === 'indigo' ? 'border-t-indigo-600' : accent === 'sky' ? 'border-t-sky-600' : 'border-t-teal-600';
  return (
    <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white rounded-lg border border-slate-200/80 shadow-sm">
      <div className={`w-10 h-10 border-[3px] border-slate-100 ${ring} rounded-full animate-spin`} />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

export function PageHeader({ title, subtitle }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
        <p className="text-slate-500 text-sm mt-1 font-medium">{subtitle}</p>
      </div>
    </div>
  );
}

export function PageShell({ children }) {
  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      {children}
    </div>
  );
}
