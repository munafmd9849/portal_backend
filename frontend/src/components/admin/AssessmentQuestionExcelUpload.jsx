import React, { useRef, useState } from 'react';
import { Upload, Download, FileSpreadsheet, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { au } from '../assessment/assessmentUi';
import {
  downloadAssessmentQuestionTemplate,
  parseAssessmentQuestionsFile,
} from '../../utils/assessmentQuestionExcel';

const ACCEPT = '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';

export default function AssessmentQuestionExcelUpload({ onImport, disabled = false }) {
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  const reset = () => {
    setPreview(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFile = async (file) => {
    if (!file) return;
    setLoading(true);
    setError('');
    setPreview(null);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['xlsx', 'xls'].includes(ext)) {
        setError('Please upload an Excel file (.xlsx or .xls).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('File must be 5 MB or smaller.');
        return;
      }
      const result = await parseAssessmentQuestionsFile(file);
      if (!result.questions.length && result.errors.length) {
        setError(result.errors.join(' '));
        return;
      }
      setPreview(result);
    } catch (e) {
      setError(e?.message || 'Could not read Excel file.');
    } finally {
      setLoading(false);
    }
  };

  const confirmImport = () => {
    if (!preview?.questions?.length) return;
    onImport?.(preview.questions, { warnings: preview.warnings || [] });
    setOpen(false);
    reset();
  };

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`${au.btnSecondary} text-xs`}
      >
        <FileSpreadsheet className="w-4 h-4" />
        Upload from Excel
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Bulk upload questions</h4>
          <p className="text-xs text-slate-600 mt-0.5">
            Import MCQ, descriptive, and coding rows from Excel. Questions are appended to your list.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            reset();
          }}
          className={au.closeBtn}
          aria-label="Close upload panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={downloadAssessmentQuestionTemplate} className={au.btnSecondary}>
          <Download className="w-4 h-4" />
          Download template
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading || disabled}
          className={au.btnPrimary}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          Select Excel file
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      <div className="text-xs text-slate-500 space-y-1">
        <p>Required column: <span className="font-medium text-slate-700">Question</span></p>
        <p>MCQ: Option A–D and Correct (A/B/C/D). Coding: Description and optional Test 1/2 Input & Output.</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {preview && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <span className="font-semibold tabular-nums">{preview.questions.length}</span> question
              {preview.questions.length === 1 ? '' : 's'} ready to import
            </span>
          </div>
          {preview.errors?.length > 0 && (
            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2 space-y-1">
              <p className="font-medium">Skipped rows</p>
              <ul className="list-disc pl-4">
                {preview.errors.slice(0, 5).map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
                {preview.errors.length > 5 && (
                  <li>…and {preview.errors.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
          {preview.warnings?.length > 0 && (
            <div className="text-xs text-slate-600 space-y-1">
              {preview.warnings.slice(0, 3).map((w) => (
                <p key={w}>{w}</p>
              ))}
            </div>
          )}
          <div className="max-h-32 overflow-y-auto border border-slate-100 rounded-md divide-y divide-slate-100">
            {preview.questions.slice(0, 8).map((q, i) => (
              <div key={`${q.text}-${i}`} className="px-3 py-2 text-xs">
                <span className="font-medium text-indigo-700">{q.type}</span>
                <span className="text-slate-400 mx-1">·</span>
                <span className="text-slate-700 line-clamp-1">{q.text}</span>
              </div>
            ))}
            {preview.questions.length > 8 && (
              <p className="px-3 py-2 text-xs text-slate-400">
                +{preview.questions.length - 8} more
              </p>
            )}
          </div>
          <button type="button" onClick={confirmImport} className={`${au.btnPrimary} w-full sm:w-auto`}>
            Import {preview.questions.length} question{preview.questions.length === 1 ? '' : 's'}
          </button>
        </div>
      )}
    </div>
  );
}
