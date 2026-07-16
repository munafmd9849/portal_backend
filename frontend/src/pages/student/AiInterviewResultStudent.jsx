import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, AlertTriangle, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import AiInterviewResultBody from '../../components/mockInterview/AiInterviewResultBody';

const CONTENT_WIDTH = 'w-full lg:w-[75%] max-w-full mx-auto px-4 sm:px-6';

function AiInterviewResultStudentComponent() {
  const { enrollmentId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const backPath = '/student?tab=guidedAiInterviews';

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await api.getStudentAiInterviewResults(enrollmentId);
      setResult(data);
    } catch (error) {
      setErrorMsg(error.message || 'Failed to load report');
      toast?.error('Could not retrieve AI interview report');
    } finally {
      setLoading(false);
    }
  }, [enrollmentId, toast]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  useEffect(() => {
    if (result?.aiInsight?.status !== 'PENDING') return undefined;
    const timer = setInterval(fetchResults, 8000);
    return () => clearInterval(timer);
  }, [result?.aiInsight?.status, fetchResults]);

  if (loading && !result) {
    return (
      <div className="h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Loading report…</p>
      </div>
    );
  }

  if (errorMsg && !result) {
    return (
      <div className="h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
        <AlertTriangle className="w-7 h-7 text-rose-500 mb-3" strokeWidth={1.75} />
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Report unavailable</h2>
        <p className="text-slate-500 text-sm mb-6 text-center max-w-md">{errorMsg}</p>
        <button
          type="button"
          onClick={() => navigate('/student?tab=guidedAiInterviews')}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Back to Guided AI
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="bg-white border-b border-slate-200/80 sticky top-0 z-50">
        <div className={`${CONTENT_WIDTH} h-14 flex items-center justify-between`}>
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate(backPath)}
              className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-900 bg-slate-50 rounded-lg border border-slate-200 shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-semibold text-slate-900 truncate">
              {result?.interview?.title}
            </h1>
          </div>
          {result?.aiInsight?.status === 'PENDING' && (
            <button
              type="button"
              onClick={fetchResults}
              className="flex items-center gap-2 text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          )}
        </div>
      </div>

      <div className={`${CONTENT_WIDTH} mt-8`}>
        <AiInterviewResultBody
          aiInsight={result?.aiInsight}
          durationSeconds={result?.enrollment?.totalDurationSeconds}
          sessionMode={result?.interview?.sessionMode}
          title={result?.interview?.title}
          completedAt={result?.enrollment?.completedAt}
        />

        {result?.humanReview?.comments && (
          <div className="mt-8 bg-white rounded-lg border border-slate-200/80 p-5 sm:p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Placement team review
            </h3>
            {result.humanReview.overallRating != null && (
              <p className="text-sm font-bold text-indigo-600 mb-2">
                Rating: {result.humanReview.overallRating}/10
              </p>
            )}
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {result.humanReview.comments}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AiInterviewResultStudent() {
  return (
    <ErrorBoundary>
      <AiInterviewResultStudentComponent />
    </ErrorBoundary>
  );
}
