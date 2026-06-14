import React from 'react';
import { X, HelpCircle } from 'lucide-react';
import { parseJobCustomQuestions } from '../../../utils/jobHelpers';

/**
 * Display-only custom questions shown before a student proceeds to apply.
 */
export default function JobApplyQuestionsModal({ job, onContinue, onCancel }) {
  const questions = parseJobCustomQuestions(job);

  if (!questions.length) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 flex justify-between items-start gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Before you apply</h2>
            <p className="text-sm text-gray-600 mt-1">
              Please read the following for{' '}
              <span className="font-semibold">{job?.jobTitle || 'this role'}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3 max-h-[50vh] overflow-y-auto">
          {questions.map((question, index) => (
            <div
              key={`${index}-${question.slice(0, 24)}`}
              className="flex gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50"
            >
              <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <p className="text-sm text-gray-800 leading-relaxed">{question}</p>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="px-5 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Continue to apply
          </button>
        </div>
      </div>
    </div>
  );
}
