import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Video, Trophy } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import {
  PageShell,
  StatGrid,
  LoadingBlock,
  getAiEnrollmentStatusBadge,
} from './interviewStudentShared';

export default function GuidedAiInterviewsStudent() {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getStudentAiInterviews();
      setInterviews(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load guided AI interviews');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const completed = interviews.filter((iv) => iv.status === 'COMPLETED').length;
    const upcoming = interviews.filter((iv) => iv.status !== 'COMPLETED').length;
    const progressValues = interviews
      .map((iv) => iv.progressPercent)
      .filter((v) => typeof v === 'number');
    const avgProgress = progressValues.length
      ? Math.round(progressValues.reduce((sum, v) => sum + v, 0) / progressValues.length)
      : null;

    return [
      { label: 'Completed', val: completed, color: 'emerald' },
      { label: 'Upcoming', val: upcoming, color: 'indigo' },
      {
        label: 'Avg. Progress',
        val: avgProgress != null ? `${avgProgress}%` : '—',
        color: 'violet',
      },
      { label: 'Assigned', val: interviews.length, color: 'amber' },
    ];
  }, [interviews]);

  return (
    <PageShell>
      <style>{`
        .guided-ai-surface .slot-card {
          transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease, border-color 180ms ease;
        }
        .guided-ai-surface .slot-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(79, 70, 229, 0.08);
        }
        @media (prefers-reduced-motion: reduce) {
          .guided-ai-surface .slot-card:hover { transform: none; }
        }
      `}</style>

      <div className="guided-ai-surface space-y-5 sm:space-y-6">
        <StatGrid stats={stats} loading={loading} />

        {loading ? (
          <LoadingBlock message="Loading sessions…" accent="indigo" />
        ) : interviews.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200/80 p-10 sm:p-12 flex flex-col items-center text-center shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4">
              <Calendar className="w-5 h-5 text-indigo-600" strokeWidth={1.75} />
            </div>
            <p className="text-sm text-slate-600 max-w-sm">
              No guided AI interviews assigned yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {interviews.map((iv) => {
              const sessionDate = iv.startDate ? new Date(iv.startDate) : null;
              const isCompleted = iv.status === 'COMPLETED';
              const hasReport = isCompleted && iv.aiInsightStatus === 'COMPLETED';
              const reportPending = isCompleted && iv.aiInsightStatus === 'PENDING';
              const inProgress = iv.status === 'IN_PROGRESS';

              return (
                <div
                  key={iv.enrollmentId}
                  className={`slot-card bg-white rounded-lg p-4 sm:p-5 border shadow-sm overflow-hidden ${
                    inProgress
                      ? 'border-amber-200 ring-1 ring-amber-100'
                      : 'border-slate-200/80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-700 flex flex-col items-center justify-center text-white flex-shrink-0 shadow-sm">
                        {sessionDate ? (
                          <>
                            <span className="text-[9px] font-medium uppercase tracking-wide opacity-90">
                              {sessionDate.toLocaleString('default', { month: 'short' })}
                            </span>
                            <span className="text-lg font-semibold leading-none tabular-nums">
                              {sessionDate.getDate()}
                            </span>
                          </>
                        ) : (
                          <Video className="w-5 h-5 opacity-90" strokeWidth={1.75} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {getAiEnrollmentStatusBadge(iv.status)}
                        </div>
                        <h3 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                          {iv.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-slate-500">
                          {sessionDate && (
                            <span className="inline-flex items-center gap-1.5 text-xs tabular-nums">
                              <Clock className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} />
                              Opens{' '}
                              {sessionDate.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                          <span className="text-xs text-slate-500">
                            {iv.questionCount} questions · {iv.progressPercent ?? 0}% done
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:shrink-0">
                      {!isCompleted ? (
                        iv.canStart ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/student/interviews/${iv.interviewId}`)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-sm shadow-indigo-600/20"
                          >
                            <Video className="w-4 h-4" strokeWidth={1.75} />
                            {inProgress ? 'Resume' : 'Enter room'}
                          </button>
                        ) : (
                          <span className="px-3 py-2 text-xs font-medium text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                            Opens{' '}
                            {sessionDate
                              ? sessionDate.toLocaleString([], {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })
                              : 'soon'}
                          </span>
                        )
                      ) : hasReport ? (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/student/ai-interview/results/${iv.enrollmentId}`, {
                              state: { from: 'guided' },
                            })
                          }
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium transition-colors border border-indigo-100"
                        >
                          <Trophy className="w-4 h-4" strokeWidth={1.75} />
                          View report
                        </button>
                      ) : reportPending ? (
                        <span className="px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg border border-amber-100">
                          Generating report…
                        </span>
                      ) : (
                        <span className="px-3 py-2 text-xs font-medium text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                          Submitted
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
