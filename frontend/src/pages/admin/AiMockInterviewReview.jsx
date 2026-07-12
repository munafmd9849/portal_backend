import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Search, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';

function statusBadge(status) {
  switch (status) {
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case 'IN_PROGRESS':
      return 'bg-amber-50 text-amber-700 border-amber-100';
    default:
      return 'bg-gray-50 text-gray-500 border-gray-200';
  }
}

function AiMockInterviewReviewComponent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [reviewForm, setReviewForm] = useState({
    overallRating: 7,
    comments: '',
    strengths: '',
    improvements: '',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getAiInterviewReview(id);
      setData(res);
    } catch (err) {
      toast.error(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openStudent = async (enrollmentId) => {
    setSelectedId(enrollmentId);
    setDetailLoading(true);
    try {
      const d = await api.getAiEnrollmentDetail(enrollmentId);
      setDetail(d);
      if (d.review) {
        setReviewForm({
          overallRating: d.review.overallRating ?? 7,
          comments: d.review.comments || '',
          strengths: d.review.strengths || '',
          improvements: d.review.improvements || '',
        });
      } else {
        setReviewForm({ overallRating: 7, comments: '', strengths: '', improvements: '' });
      }
    } catch {
      toast.error('Failed to load student detail');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeReport = () => {
    setSelectedId(null);
    setDetail(null);
  };

  const saveReview = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await api.saveAiEnrollmentReview(selectedId, reviewForm);
      toast.success('Review saved');
      load();
      openStudent(selectedId);
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const regenerateAi = async () => {
    if (!selectedId) return;
    try {
      await api.regenerateAiInsights(selectedId);
      toast.success('AI insights regenerated');
      openStudent(selectedId);
    } catch (err) {
      toast.error(err.message || 'AI generation failed');
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-sky-600" />
        <p className="text-sm text-gray-500">Loading results…</p>
      </div>
    );
  }

  const { interview, analytics, students } = data || {};
  const completed = analytics?.completed ?? 0;
  const assigned = analytics?.assigned ?? 0;
  const completionRate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;

  const filtered = (students || []).filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.student?.fullName?.toLowerCase().includes(q) ||
      s.student?.enrollmentId?.toLowerCase().includes(q)
    );
  });

  if (selectedId) {
    const student = detail?.enrollment?.student;
    return (
      <div className="space-y-4 pb-8">
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2.5">
          <button
            type="button"
            onClick={closeReport}
            className="p-2 text-gray-500 hover:text-gray-900 bg-gray-50 rounded-md border border-gray-200 shrink-0"
            aria-label="Back to list"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 truncate">
              {student?.fullName || 'Candidate'}
            </h1>
            <p className="text-xs text-gray-500 truncate">
              {student?.enrollmentId || 'Review'}
            </p>
          </div>
        </div>

        {detailLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-7 h-7 text-sky-600 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {detail?.aiInsight && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-700">AI-assisted insights</p>
                  <button
                    type="button"
                    onClick={regenerateAi}
                    className="text-xs font-medium text-sky-700 hover:text-sky-800"
                  >
                    Regenerate
                  </button>
                </div>
                <div className="bg-gray-50 rounded-md border border-gray-100 px-3 py-3">
                  <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
                    {[
                      ['Communication', detail.aiInsight.communicationScore],
                      ['Confidence', detail.aiInsight.confidenceScore],
                      ['Clarity', detail.aiInsight.clarityScore],
                      ['Technical', detail.aiInsight.technicalUnderstanding],
                      ['Overall', detail.aiInsight.overallPerformance],
                    ].map(([label, val]) => (
                      <div key={label} className="px-3 py-2 sm:py-0 first:pt-0 last:pb-0 sm:first:pl-0 sm:last:pr-0">
                        <p className="text-xs font-medium text-gray-500">{label}</p>
                        <p className="text-lg font-semibold text-gray-900 tabular-nums mt-0.5">
                          {val ?? '—'}%
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                {detail.aiInsight.strengths && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">Strengths:</span>{' '}
                    {detail.aiInsight.strengths}
                  </p>
                )}
                {detail.aiInsight.improvements && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">Improve:</span>{' '}
                    {detail.aiInsight.improvements}
                  </p>
                )}
              </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-medium text-gray-700">Question recordings</h3>
              </div>
              <div className="p-4 space-y-4 divide-y divide-gray-100">
                {detail?.answers?.map((a, i) => (
                  <div key={a.id} className={i > 0 ? 'pt-4' : ''}>
                    <p className="text-sm font-medium text-gray-900 mb-2">
                      Q{i + 1}: {a.questionText}
                    </p>
                    {a.videoUrl ? (
                      <video
                        src={a.videoUrl}
                        controls
                        className="w-full rounded-md max-h-64 bg-black border border-gray-200"
                      />
                    ) : (
                      <p className="text-xs text-gray-400">No recording uploaded</p>
                    )}
                  </div>
                ))}
                {!detail?.answers?.length && (
                  <p className="text-sm text-gray-500 text-center py-6">No answers recorded yet.</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Human review</h3>
              <label className="block text-xs font-medium text-gray-600">
                Overall rating (1–10):{' '}
                <span className="text-sky-700 tabular-nums">{reviewForm.overallRating}</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={reviewForm.overallRating}
                  onChange={(e) => setReviewForm({ ...reviewForm, overallRating: +e.target.value })}
                  className="w-full mt-2"
                />
              </label>
              <textarea
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-md text-sm resize-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400 focus:bg-white outline-none"
                placeholder="Comments"
                rows={3}
                value={reviewForm.comments}
                onChange={(e) => setReviewForm({ ...reviewForm, comments: e.target.value })}
              />
              <textarea
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-md text-sm resize-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400 focus:bg-white outline-none"
                placeholder="Strengths"
                rows={2}
                value={reviewForm.strengths}
                onChange={(e) => setReviewForm({ ...reviewForm, strengths: e.target.value })}
              />
              <textarea
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-md text-sm resize-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400 focus:bg-white outline-none"
                placeholder="Areas for improvement"
                rows={2}
                value={reviewForm.improvements}
                onChange={(e) => setReviewForm({ ...reviewForm, improvements: e.target.value })}
              />
              <button
                type="button"
                disabled={saving}
                onClick={saveReview}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-60"
              >
                Save review
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-8">
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2.5">
        <button
          type="button"
          onClick={() => navigate('/admin?tab=aiInterviews')}
          className="p-2 text-gray-500 hover:text-gray-900 bg-gray-50 rounded-md border border-gray-200 shrink-0"
          aria-label="Back"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-gray-900 truncate">
            {interview?.title || 'AI interview results'}
          </h1>
          <p className="text-xs text-gray-500">AI video interview</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3.5">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          <div className="px-3 py-2 md:py-0">
            <p className="text-xs font-medium text-gray-500">Completion</p>
            <p className="text-2xl font-semibold text-sky-700 tabular-nums mt-0.5">{completionRate}%</p>
          </div>
          <div className="px-3 py-2 md:py-0">
            <p className="text-xs font-medium text-gray-500">Assigned</p>
            <p className="text-2xl font-semibold text-gray-900 tabular-nums mt-0.5">{assigned}</p>
          </div>
          <div className="px-3 py-2 md:py-0">
            <p className="text-xs font-medium text-gray-500">Completed</p>
            <p className="text-2xl font-semibold text-gray-900 tabular-nums mt-0.5">{completed}</p>
          </div>
          <div className="px-3 py-2 md:py-0">
            <p className="text-xs font-medium text-gray-500">High-risk flags</p>
            <p className="text-2xl font-semibold text-gray-900 tabular-nums mt-0.5">
              {analytics?.highRiskViolations ?? 0}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900 tabular-nums">{filtered.length}</span> candidates
          </p>
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400 focus:bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500">#</th>
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Candidate</th>
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-center">Progress</th>
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-center">Status</th>
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-center">Violations</th>
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-right"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((s, idx) => (
                <tr key={s.enrollmentId} className="hover:bg-sky-50/40 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-400 tabular-nums">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{s.student?.fullName || '—'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.student?.enrollmentId}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-semibold text-sky-700 tabular-nums">
                      {s.progressPercent ?? 0}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-md border ${statusBadge(s.status)}`}
                    >
                      {s.status?.replace(/_/g, ' ') || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600 tabular-nums">
                    {s.violationsCount ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openStudent(s.enrollmentId)}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md"
                    >
                      View report
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-sm text-gray-500">
                    No candidates match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AiMockInterviewReview() {
  return (
    <ErrorBoundary>
      <AiMockInterviewReviewComponent />
    </ErrorBoundary>
  );
}
