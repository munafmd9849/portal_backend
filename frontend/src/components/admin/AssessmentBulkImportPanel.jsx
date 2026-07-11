/**
 * Server-side assessment question bulk import panel.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Loader2,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  History,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
} from 'lucide-react';
import {
  downloadTemplate,
  previewImport,
  commitImport,
  rollbackImport,
  listImportHistory,
} from '../../services/assessmentBulkImport';

export default function AssessmentBulkImportPanel({ assessmentId }) {
  const [expanded, setExpanded] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState([]);
  const [batch, setBatch] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [partial, setPartial] = useState(true);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await listImportHistory({
        assessmentId: assessmentId || undefined,
        limit: 15,
      });
      setHistory(data?.items || []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    if (expanded) loadHistory();
  }, [expanded, loadHistory]);

  const handleDownload = async () => {
    setError('');
    try {
      await downloadTemplate();
      setMessage('Template downloaded');
    } catch (e) {
      setError(e?.message || 'Download failed');
    }
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setPreview(null);
    setErrors([]);
    setBatch(null);
    setMessage('');
    setError('');
  };

  const handlePreview = async () => {
    if (!file) {
      setError('Choose an Excel or CSV file first');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const data = await previewImport(file, { assessmentId });
      setPreview(data?.preview || []);
      setErrors(data?.errors || []);
      setBatch(data?.batch || null);
      setMessage(
        `Preview ready: ${data?.preview?.length ?? 0} valid row(s), ${data?.errors?.length ?? 0} error(s)`,
      );
    } catch (e) {
      setError(e?.message || 'Preview failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!batch?.id) {
      setError('Run preview first');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await commitImport(batch.id, { assessmentId, partial });
      setBatch(data?.batch || data);
      setMessage(`Import committed (${data?.batch?.successCount ?? data?.successCount ?? 0} rows)`);
      await loadHistory();
    } catch (e) {
      setError(e?.message || 'Commit failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (batchId) => {
    if (!window.confirm('Rollback this import? Imported questions will be removed if possible.')) return;
    setLoading(true);
    setError('');
    try {
      await rollbackImport(batchId);
      setMessage('Import rolled back');
      if (batch?.id === batchId) setBatch(null);
      await loadHistory();
    } catch (e) {
      setError(e?.message || 'Rollback failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
          Server bulk import
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            Download the template, upload a filled file for validation, then commit (optionally partial) or rollback.
            {assessmentId ? ` Linked assessment: ${assessmentId}` : ' No assessment linked yet — commit can attach later.'}
          </p>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}
          {message && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              {message}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Download className="w-4 h-4" />
              Download template
            </button>
            <label className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100">
              <Upload className="w-4 h-4 text-indigo-600" />
              {file ? file.name : 'Choose file'}
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
            </label>
            <button
              type="button"
              onClick={handlePreview}
              disabled={loading || !file}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Validate preview
            </button>
          </div>

          {preview && preview.length > 0 && (
            <div className="rounded-lg border border-slate-200 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-left text-slate-500 uppercase tracking-wide">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Question</th>
                    <th className="px-3 py-2">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.slice(0, 50).map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                      <td className="px-3 py-2">{row.type || '—'}</td>
                      <td className="px-3 py-2 max-w-xs truncate">{row.questionText || row.question || '—'}</td>
                      <td className="px-3 py-2">{row.points ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 50 && (
                <p className="px-3 py-2 text-xs text-slate-500 border-t border-slate-100">
                  Showing first 50 of {preview.length} valid rows
                </p>
              )}
            </div>
          )}

          {errors.length > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3 max-h-40 overflow-y-auto">
              <p className="text-xs font-semibold text-rose-800 mb-2">Error report ({errors.length})</p>
              <ul className="space-y-1 text-xs text-rose-700">
                {errors.map((err, i) => (
                  <li key={i}>
                    Row {err.row ?? err.rowIndex ?? '?'}: {err.message || err.error || JSON.stringify(err)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {batch?.id && (
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={partial}
                  onChange={(e) => setPartial(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                Partial import (skip invalid rows)
              </label>
              <button
                type="button"
                onClick={handleCommit}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Commit import
              </button>
              <button
                type="button"
                onClick={() => handleRollback(batch.id)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-white disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                Rollback
              </button>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mb-2">
              <History className="w-4 h-4 text-indigo-600" />
              Import history
            </h4>
            {historyLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : history.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">No import batches yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {history.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-xs">
                    <div>
                      <p className="font-medium text-slate-800">{item.fileName || item.id}</p>
                      <p className="text-slate-500">
                        {item.status} · {item.successCount ?? 0}/{item.totalRows ?? 0} ·{' '}
                        {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
                      </p>
                    </div>
                    {(item.status === 'COMMITTED' || item.status === 'PARTIAL') && (
                      <button
                        type="button"
                        onClick={() => handleRollback(item.id)}
                        className="px-2 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        Rollback
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
