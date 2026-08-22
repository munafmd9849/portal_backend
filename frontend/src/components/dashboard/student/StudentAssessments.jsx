import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock,
  PlayCircle,
  FileText,
  Lock,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { SkeletonStatsGrid, SkeletonList } from '../../ui/loading';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { getAssessmentEntryStatus, formatAssessmentWindow } from '../../../utils/assessmentEntryWindow';
import { useToast } from '../../ui/Toast';

const STAT_STYLES = {
  pending: {
    box: 'bg-indigo-50 border-indigo-100',
    icon: 'text-indigo-600',
    value: 'text-indigo-700',
  },
  ongoing: {
    box: 'bg-amber-50 border-amber-100',
    icon: 'text-amber-600',
    value: 'text-amber-700',
  },
  completed: {
    box: 'bg-emerald-50 border-emerald-100',
    icon: 'text-emerald-600',
    value: 'text-emerald-700',
  },
  total: {
    box: 'bg-slate-50 border-slate-200',
    icon: 'text-slate-600',
    value: 'text-slate-900',
  },
};

function statusMeta(status) {
  switch (status) {
    case 'COMPLETED':
      return {
        label: 'Completed',
        chip: 'bg-emerald-50 text-emerald-800 border-emerald-100',
      };
    case 'IN_PROGRESS':
      return {
        label: 'In progress',
        chip: 'bg-amber-50 text-amber-800 border-amber-100',
      };
    default:
      return {
        label: 'Not started',
        chip: 'bg-slate-100 text-slate-600 border-slate-200',
      };
  }
}

function typeLabel(type) {
  switch (type) {
    case 'MOCK_TEST':
      return 'Test';
    case 'MOCK_INTERVIEW_AUTO':
      return 'AI interview';
    case 'MOCK_INTERVIEW_LIVE':
      return 'Live interview';
    default:
      return 'Assessment';
  }
}

export default function StudentAssessments() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const toast = useToast();

  const fetchAssessments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getStudentAssessments();
      setAssessments(Array.isArray(data) ? data : []);
    } catch {
      toast?.error('Failed to load your assessments');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const stats = useMemo(() => {
    const pending = assessments.filter((a) => !a.sessions?.length).length;
    const completed = assessments.filter((a) => {
      const status = a.sessions?.[0]?.status;
      return status === 'COMPLETED' || status === 'PENDING_REVIEW';
    }).length;
    const ongoing = assessments.filter((a) => a.sessions?.[0]?.status === 'IN_PROGRESS').length;
    return [
      { key: 'pending', label: 'Pending', val: pending },
      { key: 'ongoing', label: 'In progress', val: ongoing },
      { key: 'completed', label: 'Completed', val: completed },
      { key: 'total', label: 'Total', val: assessments.length },
    ];
  }, [assessments]);

  if (loading) {
    return (
      <div className="max-w-[1100px] mx-auto space-y-5">
        <SkeletonStatsGrid count={4} columns="grid-cols-2 md:grid-cols-4" />
        <SkeletonList rows={5} className="rounded-xl border border-slate-200/80 overflow-hidden" />
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto">
      <style>{`
        .assess-surface .assess-row {
          transition: border-color 160ms ease, box-shadow 160ms cubic-bezier(0.22, 1, 0.36, 1), transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .assess-surface .assess-row:hover {
          border-color: rgb(199 210 254);
          box-shadow: 0 10px 28px rgba(79, 70, 229, 0.06);
          transform: translateY(-1px);
        }
        @media (prefers-reduced-motion: reduce) {
          .assess-surface .assess-row:hover { transform: none; }
        }
      `}</style>

      <div className="assess-surface space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s) => {
            const style = STAT_STYLES[s.key];
            return (
              <div
                key={s.key}
                className="bg-white rounded-lg border border-slate-200/80 shadow-sm px-3.5 py-3.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-500">{s.label}</p>
                  <p className={`text-2xl font-semibold tabular-nums mt-0.5 leading-none ${style.value}`}>
                    {s.val}
                  </p>
                </div>
                <div
                  className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${style.box}`}
                >
                  <Activity className={`w-4 h-4 ${style.icon}`} strokeWidth={1.75} />
                </div>
              </div>
            );
          })}
        </div>

        {assessments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white/60 py-16 px-6 text-center">
            <FileText className="w-5 h-5 text-slate-400 mx-auto mb-3" strokeWidth={1.75} />
            <p className="text-sm text-slate-600">No assessments assigned yet.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {assessments.map((item) => {
              const session = item.sessions?.[0];
              const sessionStatus = session?.status;
              const isCompleted = ['COMPLETED', 'PENDING_REVIEW', 'AUTO_SUBMITTED', 'TERMINATED'].includes(
                sessionStatus
              );
              const isInProgress = sessionStatus === 'IN_PROGRESS';
              const assignment =
                item.assignments?.find((a) => a.scheduledAt) ||
                item.assignments?.find((a) => a.studentId) ||
                item.assignments?.[0];
              const scheduledAt = assignment?.scheduledAt;
              const status = statusMeta(isInProgress ? 'IN_PROGRESS' : isCompleted ? 'COMPLETED' : sessionStatus);
              const entry = getAssessmentEntryStatus(item);
              const canJoin =
                !isCompleted &&
                (isInProgress || entry.status === 'ALLOWED' || entry.status === 'UNSCHEDULED');
              const isEarly = !isInProgress && entry.status === 'TOO_EARLY';
              const isLate = !isInProgress && entry.status === 'TOO_LATE';
              const when =
                item.startTime
                  ? formatAssessmentWindow(item.startTime)
                  : scheduledAt
                    ? new Date(scheduledAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : null;

              return (
                <article
                  key={item.id}
                  className="assess-row bg-white rounded-lg border border-slate-200/80 px-4 py-4 sm:px-5 sm:py-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${status.chip}`}>
                          {status.label}
                        </span>
                        <span className="text-[11px] text-slate-400">{typeLabel(item.type)}</span>
                      </div>
                      <h3 className="text-[15px] font-semibold text-slate-900 leading-snug text-balance">
                        {item.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} />
                          {item.duration} min
                        </span>
                        {when && <span className="tabular-nums">{when}</span>}
                        {isCompleted && typeof session.score === 'number' && (
                          <span className="text-emerald-700 font-medium tabular-nums">
                            {session.score}%
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="sm:shrink-0">
                      {isCompleted ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/assessment/results/${session.id}`)}
                          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-colors"
                        >
                          View results
                          <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => canJoin && navigate(`/assessment/${item.id}`)}
                          disabled={isEarly || isLate}
                          className={`inline-flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            isEarly || isLate
                              ? 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed'
                              : 'bg-indigo-600 text-white hover:bg-indigo-500'
                          }`}
                        >
                          {isEarly ? (
                            <>
                              <Lock className="w-4 h-4" strokeWidth={1.75} />
                              Opens {formatAssessmentWindow(entry.entryOpensAt)}
                            </>
                          ) : isLate ? (
                            <>
                              <Lock className="w-4 h-4" strokeWidth={1.75} />
                              Entry closed
                            </>
                          ) : (
                            <>
                              <PlayCircle className="w-4 h-4" strokeWidth={1.75} />
                              {isInProgress
                                ? 'Continue'
                                : item.type?.includes('INTERVIEW')
                                  ? 'Join'
                                  : 'Start'}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
