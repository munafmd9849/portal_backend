import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { Spinner } from '../ui/loading';

/**
 * Shown before ending an interview session — lets the recruiter choose whether
 * students can see round results and interviewer notes in Past Applications.
 */
export default function ShareResultsWithStudentModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  title = 'End interview session?',
  description = 'This will complete the drive. You can still download the spreadsheet afterward.',
  confirmLabel = 'End session',
}) {
  const [shareWithStudents, setShareWithStudents] = useState(false);

  useEffect(() => {
    if (isOpen) setShareWithStudents(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(shareWithStudents);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white w-full sm:max-w-md rounded-xl shadow-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-slate-600">{description}</p>

          <button
            type="button"
            onClick={() => setShareWithStudents((v) => !v)}
            disabled={loading}
            className={`w-full flex items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors disabled:opacity-50 ${
              shareWithStudents
                ? 'border-indigo-300 bg-indigo-50'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <span
              className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                shareWithStudents
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-300 bg-white text-transparent'
              }`}
            >
              {shareWithStudents ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-900">
                Let students see results &amp; notes
              </span>
              <span className="block text-xs text-slate-500 mt-0.5">
                Round outcomes and your remarks will appear in their Past Applications section.
              </span>
            </span>
          </button>
        </div>

        <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {loading && <Spinner size="sm" />}
            {loading ? 'Ending…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
