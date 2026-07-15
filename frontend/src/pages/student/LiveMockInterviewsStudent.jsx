import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Video, Trophy } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import {
  PageShell,
  StatGrid,
  LoadingBlock,
  feedbackScorePercent,
} from './interviewStudentShared';

function getStatusBadge(status) {
  switch (status) {
    case 'SCHEDULED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-teal-50 text-teal-800 border border-teal-100">
          Scheduled
        </span>
      );
    case 'WAITING':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-100">
          Waiting
        </span>
      );
    case 'LIVE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-100">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
          Completed
        </span>
      );
    case 'MISSED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-100">
          Missed
        </span>
      );
    default:
      return null;
  }
}

export default function LiveMockInterviewsStudent() {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getStudentMockInterviews();
      setSlots(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load live mock interviews');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const completed = slots.filter((s) => s.status === 'COMPLETED').length;
    const upcoming = slots.filter((s) =>
      ['SCHEDULED', 'WAITING', 'LIVE'].includes(s.status)
    ).length;
    const feedbackScores = slots
      .map((s) => feedbackScorePercent(s.feedback))
      .filter((score) => score != null);
    const avgFeedbackScore = feedbackScores.length
      ? Math.round(feedbackScores.reduce((sum, s) => sum + s, 0) / feedbackScores.length)
      : null;

    return [
      { label: 'Completed', val: completed, color: 'emerald' },
      { label: 'Upcoming', val: upcoming, color: 'teal' },
      {
        label: 'Avg. Score',
        val: avgFeedbackScore != null ? `${avgFeedbackScore}%` : '—',
        color: 'cyan',
      },
      { label: 'Assigned', val: slots.length, color: 'amber' },
    ];
  }, [slots]);

  return (
    <PageShell>
      <style>{`
        .live-mock-surface .slot-card {
          transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease, border-color 180ms ease;
        }
        .live-mock-surface .slot-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(13, 148, 136, 0.08);
        }
        @media (prefers-reduced-motion: reduce) {
          .live-mock-surface .slot-card:hover { transform: none; }
        }
      `}</style>

      <div className="live-mock-surface space-y-5 sm:space-y-6">
        <StatGrid stats={stats} loading={loading} />

        {loading ? (
          <LoadingBlock message="Loading sessions…" />
        ) : slots.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200/80 p-10 sm:p-12 flex flex-col items-center text-center shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center mb-4">
              <Calendar className="w-5 h-5 text-teal-600" strokeWidth={1.75} />
            </div>
            <p className="text-sm text-slate-600 max-w-sm">
              No live sessions assigned yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {slots.map((slot) => {
              const driveDate = new Date(slot.startTime);
              const isCompleted = slot.status === 'COMPLETED';
              const hasFeedback = Boolean(slot.feedback);
              const isLive = slot.status === 'LIVE';

              return (
                <div
                  key={slot.id}
                  className={`slot-card bg-white rounded-lg p-4 sm:p-5 border shadow-sm overflow-hidden ${
                    isLive ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-slate-200/80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-600 to-cyan-700 flex flex-col items-center justify-center text-white flex-shrink-0 shadow-sm">
                        <span className="text-[9px] font-medium uppercase tracking-wide opacity-90">
                          {driveDate.toLocaleString('default', { month: 'short' })}
                        </span>
                        <span className="text-lg font-semibold leading-none tabular-nums">{driveDate.getDate()}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {slot.drive?.category && (
                            <span className="px-2 py-0.5 bg-cyan-50 text-cyan-800 text-[10px] font-medium rounded-md border border-cyan-100">
                              {slot.drive.category}
                            </span>
                          )}
                          {getStatusBadge(slot.status)}
                        </div>
                        <h3 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                          {slot.drive?.title}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 tabular-nums">
                          <Clock className="w-3.5 h-3.5 text-teal-600/70" />
                          {driveDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:shrink-0">
                      {!isCompleted ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/mock-interview-precheck/${slot.id}`)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 ${
                            isLive
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                              : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
                          }`}
                        >
                          <Video className="w-4 h-4" />
                          Enter room
                        </button>
                      ) : hasFeedback ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/mock-interview/results/${slot.id}`)}
                          className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-100 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
                        >
                          <Trophy className="w-4 h-4" />
                          Report
                        </button>
                      ) : (
                        <span className="px-3 py-2 text-xs font-medium text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                          Awaiting feedback
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
