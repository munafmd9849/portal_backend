import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import api from '../../services/api';
import { mcqAnswersMatch, resolveMcqOptionLabel } from '../../utils/mcqAnswers';
import { useToast } from '../../components/ui/Toast';
import { LoadingPage } from '../../components/ui/loading';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function parseCodingAnswer(raw) {
  if (raw == null) return { code: '', language: null };
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && (parsed.code != null || parsed.language)) {
        return { code: parsed.code || '', language: parsed.language || null };
      }
    } catch {
      /* plain string */
    }
    return { code: raw, language: null };
  }
  if (typeof raw === 'object') {
    return { code: raw.code || '', language: raw.language || null };
  }
  return { code: String(raw), language: null };
}

function AssessmentResultStudentComponent() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getStudentSessionResults(sessionId);
      setSession(data);
    } catch (error) {
      setErrorMsg(error.message || 'Failed to load results');
      toast?.error('Could not retrieve assessment feedback');
    } finally {
      setLoading(false);
    }
  }, [sessionId, toast]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  if (loading) {
    return <LoadingPage title="Loading results…" />;
  }

  if (errorMsg || !session) {
    return (
      <div className="h-screen bg-[#f7f8fa] flex flex-col items-center justify-center p-8">
        <AlertTriangle className="w-6 h-6 text-rose-500 mb-3" strokeWidth={1.75} />
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Results unavailable</h2>
        <p className="text-slate-500 text-sm mb-6 text-center max-w-md">
          {errorMsg || 'Something went wrong.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/student?tab=assessments')}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Back to assessments
        </button>
      </div>
    );
  }

  const { assessment, score, duration, responses, status, violations, pointsEarned, maxPoints } = session;
  const questions = assessment?.questions || [];

  let parsedResponses = { rawAnswers: {}, executionLogs: {} };
  if (responses && typeof responses === 'object') {
    parsedResponses = responses;
  } else {
    try {
      parsedResponses = JSON.parse(responses || '{}');
    } catch {
      /* ignore */
    }
  }

  const rawAnswers = parsedResponses.rawAnswers || {};
  const executionLogs = parsedResponses.executionLogs || {};
  const earned =
    Number.isFinite(Number(pointsEarned))
      ? Number(pointsEarned)
      : Number.isFinite(Number(parsedResponses.pointsEarned))
        ? Number(parsedResponses.pointsEarned)
        : null;
  const max =
    Number.isFinite(Number(maxPoints)) && Number(maxPoints) > 0
      ? Number(maxPoints)
      : Number.isFinite(Number(parsedResponses.maxPoints)) && Number(parsedResponses.maxPoints) > 0
        ? Number(parsedResponses.maxPoints)
        : null;
  const scoreVal =
    earned != null && max
      ? Math.round((earned / max) * 100)
      : typeof score === 'number'
        ? score
        : 0;
  const hasViolations = Array.isArray(violations) && violations.length > 0;

  return (
    <div className="min-h-screen bg-[#f7f8fa] pb-20">
      <header className="sticky top-0 z-40 bg-[#f7f8fa]/90 backdrop-blur-md border-b border-slate-200/70">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/student?tab=assessments')}
            className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors shrink-0"
            aria-label="Back to assessments"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{assessment?.title}</p>
            <p className="text-[11px] text-slate-500">Results</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 space-y-10">
        {/* Score */}
        <section className="space-y-5">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Score</p>
            <div className="flex items-end gap-3 flex-wrap">
              <p className="text-5xl sm:text-6xl font-semibold tracking-tight text-slate-900 tabular-nums leading-none">
                {scoreVal}
                <span className="text-2xl sm:text-3xl text-slate-400 font-medium">%</span>
              </p>
              <div className="pb-1 flex items-center gap-3 text-sm text-slate-500">
                {earned != null && max != null && (
                  <>
                    <span className="tabular-nums">
                      {earned}/{max} pts
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                  </>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />
                  {formatDuration(duration)}
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="capitalize">{(status || 'completed').toLowerCase().replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>

          <div className="h-1.5 w-full max-w-xs bg-slate-200/80 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-600 transition-[width] duration-500 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, scoreVal))}%` }}
            />
          </div>

          <p className="flex items-center gap-2 text-xs text-slate-500">
            {hasViolations ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" strokeWidth={1.75} />
                <span>
                  {violations.length} proctoring note{violations.length === 1 ? '' : 's'} on this attempt
                </span>
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={1.75} />
                <span>No proctoring flags</span>
              </>
            )}
          </p>
        </section>

        {/* Questions */}
        <section>
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Questions</h2>
            <span className="text-xs text-slate-400 tabular-nums">{questions.length}</span>
          </div>

          {questions.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No question details available.</p>
          ) : (
            <ol className="divide-y divide-slate-200/80 border-y border-slate-200/80 bg-white rounded-lg overflow-hidden">
              {questions.map((q, i) => {
                const studentAnswer = rawAnswers[q.id];
                const isMcq = q.type === 'MCQ';
                const isCoding = q.type === 'CODING';
                const isDescriptive = q.type === 'DESCRIPTIVE';
                const hasKey = isMcq && q.correctAnswer != null && String(q.correctAnswer) !== '';
                const isCorrect = hasKey
                  ? mcqAnswersMatch(studentAnswer, q.correctAnswer, q.options)
                  : null;
                const isWrongMCQ = hasKey && isCorrect === false;
                const studentAnswerLabel = isMcq
                  ? resolveMcqOptionLabel(q.options, studentAnswer)
                  : studentAnswer;
                const correctAnswerLabel = isMcq
                  ? resolveMcqOptionLabel(q.options, q.correctAnswer)
                  : q.correctAnswer;
                const logData = executionLogs[q.id];
                const coding = isCoding ? parseCodingAnswer(studentAnswer) : null;

                return (
                  <li key={q.id} className="px-4 sm:px-5 py-5 sm:py-6">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <span className="text-xs font-medium text-slate-400 tabular-nums w-5 shrink-0 pt-0.5">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-medium text-slate-500">
                                {q.type === 'MCQ'
                                  ? 'Multiple choice'
                                  : q.type === 'CODING'
                                    ? 'Coding'
                                    : q.type === 'DESCRIPTIVE'
                                      ? 'Written'
                                      : q.type || 'Question'}
                              </span>
                              {q.points != null && (
                                <span className="text-[11px] text-slate-400">{q.points} pts</span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-slate-900 leading-snug text-pretty">
                              {q.questionText}
                            </p>
                          </div>
                          {hasKey && (
                            <span
                              className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                                isCorrect
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  : 'bg-rose-50 text-rose-700 border-rose-100'
                              }`}
                            >
                              {isCorrect ? (
                                <CheckCircle className="w-3 h-3" strokeWidth={2} />
                              ) : (
                                <XCircle className="w-3 h-3" strokeWidth={2} />
                              )}
                              {isCorrect ? 'Correct' : 'Incorrect'}
                            </span>
                          )}
                        </div>

                        {isMcq && (
                          <div className="space-y-2 text-sm">
                            <div className="flex gap-2">
                              <span className="text-xs text-slate-400 w-14 shrink-0 pt-0.5">Yours</span>
                              <p
                                className={`leading-relaxed ${
                                  isCorrect ? 'text-emerald-800' : isWrongMCQ ? 'text-rose-800' : 'text-slate-700'
                                }`}
                              >
                                {studentAnswerLabel || 'No answer'}
                              </p>
                            </div>
                            {isWrongMCQ && (
                              <div className="flex gap-2">
                                <span className="text-xs text-slate-400 w-14 shrink-0 pt-0.5">Answer</span>
                                <p className="text-slate-800 leading-relaxed">
                                  {correctAnswerLabel ?? '—'}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {isCoding && (
                          <div className="space-y-3">
                            {coding?.language && (
                              <p className="text-[11px] text-slate-400 font-medium">{coding.language}</p>
                            )}
                            <pre className="text-[12px] leading-relaxed font-mono text-slate-700 bg-slate-50 border border-slate-200/80 rounded-md p-3.5 overflow-x-auto whitespace-pre-wrap break-words">
                              {coding?.code || studentAnswer || '// No solution submitted'}
                            </pre>
                            {logData?.total > 0 && (
                              <p className="text-xs text-slate-500 tabular-nums">
                                Tests{' '}
                                <span className="font-medium text-slate-800">
                                  {logData.passed}/{logData.total}
                                </span>
                              </p>
                            )}
                          </div>
                        )}

                        {isDescriptive && (
                          <div className="space-y-2">
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {studentAnswer || 'No response recorded.'}
                            </p>
                            <p className="text-[11px] text-slate-400">Pending faculty review</p>
                          </div>
                        )}

                        {!isMcq && !isCoding && !isDescriptive && studentAnswer != null && (
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {typeof studentAnswer === 'string'
                              ? studentAnswer
                              : JSON.stringify(studentAnswer)}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </main>
    </div>
  );
}

export default function AssessmentResultStudent() {
  return (
    <ErrorBoundary>
      <AssessmentResultStudentComponent />
    </ErrorBoundary>
  );
}
