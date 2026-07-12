import React, { useMemo, useState } from 'react';
import { X, HelpCircle } from 'lucide-react';
import {
  parseJobCustomQuestions,
  CUSTOM_QUESTION_TYPES,
  CUSTOM_QUESTION_TYPE_LABELS,
} from '../../../utils/jobHelpers';

/**
 * Students answer custom apply questions before continuing to resume selection.
 */
export default function JobApplyQuestionsModal({ job, onContinue, onCancel }) {
  const questions = useMemo(() => parseJobCustomQuestions(job), [job]);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');

  if (!questions.length) {
    return null;
  }

  const setAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setError('');
  };

  const handleContinue = () => {
    const missing = questions.find((q) => {
      const val = String(answers[q.id] ?? '').trim();
      return !val;
    });
    if (missing) {
      setError('Please answer all questions before continuing.');
      return;
    }

    const customAnswers = questions.map((q) => ({
      questionId: q.id,
      question: q.text,
      type: q.type,
      answer: String(answers[q.id] ?? '').trim(),
    }));

    onContinue(customAnswers);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[120] p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-start gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Application questions</h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Answer these for <span className="font-medium">{job?.jobTitle || 'this role'}</span> before applying.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[55vh] overflow-y-auto">
          {questions.map((question, index) => (
            <div
              key={question.id || `q-${index}`}
              className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 space-y-2.5"
            >
              <div className="flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 leading-snug">{question.text}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {CUSTOM_QUESTION_TYPE_LABELS[question.type] || 'Question'}
                  </p>
                </div>
              </div>

              {question.type === CUSTOM_QUESTION_TYPES.YES_NO && (
                <div className="flex gap-2 pl-6">
                  {['Yes', 'No'].map((opt) => (
                    <label
                      key={opt}
                      className={`flex-1 cursor-pointer rounded-md border px-3 py-2 text-center text-sm font-medium transition-colors ${
                        answers[question.id] === opt
                          ? 'border-blue-500 bg-blue-50 text-blue-800'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${question.id}`}
                        className="sr-only"
                        checked={answers[question.id] === opt}
                        onChange={() => setAnswer(question.id, opt)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}

              {question.type === CUSTOM_QUESTION_TYPES.MCQ && (
                <div className="space-y-1.5 pl-6">
                  {(question.options || []).map((opt) => (
                    <label
                      key={opt}
                      className={`flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 text-sm transition-colors ${
                        answers[question.id] === opt
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${question.id}`}
                        className="text-blue-600 focus:ring-blue-500"
                        checked={answers[question.id] === opt}
                        onChange={() => setAnswer(question.id, opt)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}

              {question.type === CUSTOM_QUESTION_TYPES.DESCRIPTIVE && (
                <div className="pl-6">
                  <textarea
                    rows={3}
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-y"
                    placeholder="Type your answer…"
                    value={answers[question.id] || ''}
                    onChange={(e) => setAnswer(question.id, e.target.value)}
                  />
                </div>
              )}
            </div>
          ))}

          {error && (
            <p className="text-sm text-red-600" role="alert">{error}</p>
          )}
        </div>

        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Continue to apply
          </button>
        </div>
      </div>
    </div>
  );
}
