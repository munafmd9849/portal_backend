import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Shield, Clock, Calendar, ChevronRight, 
  CheckCircle, AlertCircle, PlayCircle, 
  Camera, Users, FileText, Activity,
  Lock, ArrowRight, Star, Terminal, BookOpen, Layers
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { getAssessmentEntryStatus, formatAssessmentWindow } from '../../../utils/assessmentEntryWindow';
import { au } from '../../assessment/assessmentUi';
import { useToast } from '../../ui/Toast';

const STAT_ICON_BOX = {
  blue: 'bg-indigo-50 border-indigo-100',
  emerald: 'bg-emerald-50 border-emerald-100',
  amber: 'bg-amber-50 border-amber-100',
  slate: 'bg-gray-50 border-gray-200',
};

const STAT_ICON_COLOR = {
  blue: 'text-indigo-600',
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  slate: 'text-gray-600',
};

export default function StudentAssessments() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const toast = useToast();

  const fetchAssessments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getStudentAssessments();
      setAssessments(data);
    } catch (e) {
      toast?.error('Failed to load your assessments');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const stats = useMemo(() => {
    const sessionOf = (a) => a.sessions?.[0];
    const pending = assessments.filter((a) => !sessionOf(a)).length;
    const ongoing = assessments.filter((a) => sessionOf(a)?.status === 'IN_PROGRESS').length;
    const completed = assessments.filter((a) => {
      const status = sessionOf(a)?.status;
      return status === 'COMPLETED' || status === 'PENDING_REVIEW';
    }).length;
    const scoredSessions = assessments
      .map(sessionOf)
      .filter((s) => (s?.status === 'COMPLETED' || s?.status === 'PENDING_REVIEW') && typeof s.score === 'number');
    const avgScore = scoredSessions.length
      ? Math.round(scoredSessions.reduce((sum, s) => sum + s.score, 0) / scoredSessions.length)
      : null;

    return { pending, ongoing, completed, avgScore };
  }, [assessments]);

  const isFinishedSession = (status) => status === 'COMPLETED' || status === 'PENDING_REVIEW';

  const getStatusConfig = (status) => {
    switch (status) {
      case 'COMPLETED':
        return { color: 'text-emerald-700 bg-emerald-50 border-emerald-100', label: 'Completed' };
      case 'IN_PROGRESS':
        return { color: 'text-amber-700 bg-amber-50 border-amber-100', label: 'In Progress' };
      default:
        return { color: 'text-indigo-700 bg-indigo-50 border-indigo-100', label: 'Not Started' };
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'MOCK_TEST': return <FileText className="w-5 h-5" />;
      case 'CODING_TEST': return <Terminal className="w-5 h-5" />;
      case 'DESCRIPTIVE': return <BookOpen className="w-5 h-5" />;
      case 'MIXED': return <Layers className="w-5 h-5" />;
      case 'MOCK_INTERVIEW_AUTO': return <Camera className="w-5 h-5" />;
      case 'MOCK_INTERVIEW_LIVE': return <Users className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className={au.spinner} />
        <p className="text-sm text-gray-500">Loading assessments...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending', val: pendingCount, color: 'blue' },
          { label: 'Completed', val: completedCount, color: 'emerald' },
          { label: 'In Progress', val: ongoingCount, color: 'amber' },
          { label: 'Total', val: assessments.length, color: 'slate' },
        ].map((stat, i) => (
          <div
            key={i}
            className={`${au.statCard} flex items-center justify-between`}
          >
            <div>
              <p className={au.statLabel}>{stat.label}</p>
              <p className={`text-xl ${au.statValue}`}>{stat.val}</p>
            </div>
            <div
              className={`w-8 h-8 rounded-lg border flex items-center justify-center ${STAT_ICON_BOX[stat.color]}`}
            >
              <Activity className={`w-4 h-4 ${STAT_ICON_COLOR[stat.color]}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {assessments.map((item) => {
          const session = item.sessions?.[0];
          const isCompleted = isFinishedSession(session?.status);
          const assignment =
            item.assignments?.find((a) => a.scheduledAt) ||
            item.assignments?.find((a) => a.studentId) ||
            item.assignments?.[0];
          const scheduledAt = assignment?.scheduledAt;
          const status = getStatusConfig(session?.status);
          const entry = getAssessmentEntryStatus(item);
          const canJoin =
            !isCompleted &&
            (entry.status === 'ALLOWED' || entry.status === 'UNSCHEDULED');
          const isEarly = entry.status === 'TOO_EARLY';
          const isLate = entry.status === 'TOO_LATE';

          return (
            <div
              key={item.id}
              className={`${au.panel} p-5 hover:shadow-md transition-shadow flex flex-col h-full`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`p-3 rounded-xl ${status.color} border shadow-sm`}>
                  {getTypeIcon(item.type)}
                </div>
                <div className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border ${status.color}`}>
                  {status.label}
                </div>
              </div>

              <div className="flex-1 space-y-2">
                <h3 className="text-lg font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed font-medium">
                  {item.description || 'Institutional assessment for performance evaluation.'}
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                    <Clock className="w-4 h-4" />
                    <span className="uppercase">{item.duration} Mins</span>
                  </div>
                  {(item.startTime || scheduledAt) && (
                    <div className="flex items-center gap-1.5 text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase">
                        {item.startTime
                          ? formatAssessmentWindow(item.startTime)
                          : new Date(scheduledAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                      </span>
                    </div>
                  )}
                </div>

                {isCompleted ? (
                  <div className="space-y-3">
                     <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Performance Score</span>
                        <span className="text-sm font-bold text-emerald-600">{session.score}%</span>
                     </div>
                     <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${session.score}%` }} />
                     </div>
                     <button 
                       onClick={() => navigate(`/assessment/results/${session.id}`)}
                       className="w-full mt-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
                     >
                       <FileText className="w-4 h-4" /> View Detailed Analytics
                     </button>
                  </div>
                ) : (
                  <button
                    onClick={() => canJoin && navigate(`/assessment/${item.id}`)}
                    disabled={isEarly || isLate}
                    className={`w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 ${
                      isEarly || isLate
                        ? 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed'
                        : 'bg-slate-900 text-white shadow-lg shadow-slate-900/10 hover:bg-indigo-600 hover:shadow-indigo-500/20'
                    }`}
                  >
                    {isEarly ? (
                      <>
                        <Lock className="w-4 h-4" />
                        Opens {formatAssessmentWindow(entry.entryOpensAt)}
                      </>
                    ) : isLate ? (
                      <>
                        <Lock className="w-4 h-4" />
                        Entry closed
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4" />
                        {item.type?.includes('INTERVIEW') ? 'Join Session' : 'Start Mock Test'}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {assessments.length === 0 && (
          <div className="col-span-full py-40 flex flex-col items-center justify-center text-slate-600">
             <Shield className="w-16 h-16 mb-4 opacity-10" />
             <p className="font-bold text-sm">No pending assessments at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
