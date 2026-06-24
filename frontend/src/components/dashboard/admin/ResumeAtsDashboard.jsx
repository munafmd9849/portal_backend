import React, { useCallback, useEffect, useState } from 'react';
import {
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  fetchResumeAtsList,
  scoreStudentResumeAts,
  batchScoreResumeAts,
} from '../../../services/adminResumeAts';
import CustomDropdown from '../../common/CustomDropdown';

function scoreColor(score) {
  if (score == null) return 'bg-gray-100 text-gray-600';
  if (score >= 80) return 'bg-emerald-100 text-emerald-800';
  if (score >= 60) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return '—';
  }
}

export default function ResumeAtsDashboard() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scoringId, setScoringId] = useState(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [selected, setSelected] = useState(null);

  const [search, setSearch] = useState('');
  const [scoreFilter, setScoreFilter] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchResumeAtsList({
        page,
        limit: 25,
        search: search.trim() || undefined,
        scoreFilter: scoreFilter || undefined,
        hasResume: scoreFilter === 'unscored' ? 'true' : undefined,
      });
      setRows(data.rows || []);
      setSummary(data.summary || null);
      setPagination(data.pagination || { page: 1, limit: 25, total: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load ATS data');
    } finally {
      setLoading(false);
    }
  }, [page, search, scoreFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleScoreOne = async (studentId) => {
    setScoringId(studentId);
    try {
      await scoreStudentResumeAts(studentId);
      await load();
    } catch (err) {
      setError(err.message || 'Scoring failed');
    } finally {
      setScoringId(null);
    }
  };

  const handleBatchScore = async () => {
    setBatchRunning(true);
    setError(null);
    try {
      const result = await batchScoreResumeAts({ limit: 15 });
      if (result.failed > 0) {
        setError(`Batch complete: ${result.succeeded} scored, ${result.failed} failed (AI or PDF issues).`);
      }
      await load();
    } catch (err) {
      setError(err.message || 'Batch scoring failed');
    } finally {
      setBatchRunning(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / (pagination.limit || 25)));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-indigo-600" />
            Resume ATS Scores
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Check ATS compatibility for each student&apos;s primary resume (default upload).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading || batchRunning}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleBatchScore}
            disabled={batchRunning || loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {batchRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Score unscored (up to 15)
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Students', value: summary.totalStudents },
            { label: 'With resume', value: summary.withPrimaryResume },
            { label: 'Scored', value: summary.scored },
            { label: 'Unscored', value: summary.unscored },
            { label: 'Avg ATS', value: summary.avgScore != null ? `${summary.avgScore}%` : '—' },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{c.label}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, email, enrollment ID…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <div className="w-full sm:w-48">
          <CustomDropdown
            value={scoreFilter}
            onChange={(v) => { setScoreFilter(v); setPage(1); }}
            options={[
              { value: '', label: 'All students' },
              { value: 'scored', label: 'Scored only' },
              { value: 'unscored', label: 'Unscored (has resume)' },
              { value: 'no_resume', label: 'No resume' },
            ]}
            placeholder="Filter"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Batch / Center</th>
                  <th className="px-4 py-3">Primary resume</th>
                  <th className="px-4 py-3 text-center">ATS score</th>
                  <th className="px-4 py-3">Last scored</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                      No students match your filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.studentId} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{row.fullName}</p>
                        <p className="text-xs text-gray-500">{row.email}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <p>{row.batch}</p>
                        <p className="text-xs text-gray-400">{row.center}</p>
                      </td>
                      <td className="px-4 py-3">
                        {row.resume ? (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-700 truncate max-w-[160px]" title={row.resume.fileName}>
                              {row.resume.fileName}
                            </span>
                            <a
                              href={row.resume.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-gray-400">No resume</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${scoreColor(row.atsScore)}`}>
                          {row.atsScore != null ? `${row.atsScore}%` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {formatDate(row.atsScoredAt)}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        {row.analysis && (
                          <button
                            type="button"
                            onClick={() => setSelected(row)}
                            className="text-indigo-600 hover:underline text-xs font-medium"
                          >
                            Details
                          </button>
                        )}
                        {row.hasResume && (
                          <button
                            type="button"
                            onClick={() => handleScoreOne(row.studentId)}
                            disabled={scoringId === row.studentId || batchRunning}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-indigo-200 text-indigo-700 text-xs font-medium hover:bg-indigo-50 disabled:opacity-50"
                          >
                            {scoringId === row.studentId ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Sparkles className="w-3 h-3" />
                            )}
                            {row.atsScore != null ? 'Re-score' : 'Score'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded border border-gray-200 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-2 rounded border border-gray-200 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {selected?.analysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setSelected(null)}>
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900">{selected.fullName}</h2>
            <p className="text-sm text-gray-500 mb-4">ATS score: {selected.atsScore}%</p>
            {selected.analysis.overallFeedback && (
              <p className="text-sm text-gray-700 mb-4">{selected.analysis.overallFeedback}</p>
            )}
            {selected.analysis.strengths?.length > 0 && (
              <div className="mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Strengths</h3>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
                  {selected.analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {selected.analysis.improvementSuggestions?.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Suggestions</h3>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
                  {selected.analysis.improvementSuggestions.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="w-full py-2 rounded-lg bg-gray-100 text-gray-800 font-medium text-sm hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
