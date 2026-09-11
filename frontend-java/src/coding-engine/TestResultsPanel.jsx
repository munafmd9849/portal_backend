import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { VERDICT_LABEL } from './judgeLimits';
import {
  collectTestCaseResults,
  failReason,
  normalizeTestCaseResult,
} from './testResults';

function IoBlock({ label, value, dark, tone = 'neutral' }) {
  const tones = dark
    ? {
        ok: 'text-emerald-200 bg-black/40 border-white/10',
        fail: 'text-rose-200 bg-black/40 border-white/10',
        neutral: 'text-slate-200 bg-black/40 border-white/10',
      }
    : {
        ok: 'text-emerald-900 bg-emerald-50 border-emerald-100',
        fail: 'text-rose-900 bg-rose-50 border-rose-100',
        neutral: 'text-slate-800 bg-slate-50 border-slate-200',
      };
  return (
    <div className="min-w-0">
      <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
        {label}
      </p>
      <pre className={`m-0 p-2 rounded-md border font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words ${tones[tone]}`}>
        {value === '' || value == null ? '(empty)' : String(value)}
      </pre>
    </div>
  );
}

/**
 * Public cases show input / expected / actual. Hidden cases show verdict only.
 */
export default function TestResultsPanel({
  evaluation,
  results,
  theme = 'dark',
  emptyHint,
  className = '',
}) {
  const cases = results?.length
    ? results.map(normalizeTestCaseResult)
    : collectTestCaseResults(evaluation);
  const passed = evaluation?.passed ?? cases.filter((c) => c.passed).length;
  const total = evaluation?.total ?? cases.length;
  const score = evaluation?.score;
  const error = evaluation?.error;
  const dark = theme === 'dark';
  const verdict = evaluation?.verdict;
  const mode = evaluation?.mode;
  const hiddenTotal =
    evaluation?.hiddenTestsTotal ??
    evaluation?.hiddenTestsTotal ??
    cases.filter((c) => c.hidden).length;
  const hiddenPassed =
    evaluation?.hiddenTestsPassed ??
    evaluation?.hiddenTestsPassed ??
    cases.filter((c) => c.hidden && c.passed).length;

  if (!error && total === 0 && cases.length === 0) {
    return emptyHint ? (
      <p className={`text-xs ${dark ? 'text-slate-500' : 'text-slate-500'} ${className}`}>{emptyHint}</p>
    ) : null;
  }

  const allPassed = total > 0 && passed === total;
  const verdictText = VERDICT_LABEL[verdict] || (allPassed ? 'Accepted' : null);

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {allPassed ? (
          <CheckCircle2 className={`w-4 h-4 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`} />
        ) : (
          <AlertCircle className={`w-4 h-4 ${dark ? 'text-amber-400' : 'text-amber-600'}`} />
        )}
        <p className={`text-[11px] font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>
          {passed}/{total} test{total === 1 ? '' : 's'} passed
          {verdictText ? (
            <span className={dark ? 'text-slate-400' : 'text-slate-500'}> · {verdictText}</span>
          ) : null}
          {score != null ? <span className={dark ? 'text-slate-500' : 'text-slate-400'}> · {score}%</span> : null}
        </p>
        {mode === 'run_tests' && (
          <span className={`text-[10px] uppercase tracking-wide ${dark ? 'text-indigo-300' : 'text-indigo-600'}`}>
            Public tests
          </span>
        )}
        {mode === 'submit' && hiddenTotal > 0 && (
          <span className={`text-[10px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
            Hidden {hiddenPassed}/{hiddenTotal}
          </span>
        )}
      </div>

      {error ? (
        <p className={`text-[11px] mb-2 ${dark ? 'text-rose-400' : 'text-rose-700'}`}>{error}</p>
      ) : null}

      <ol className="space-y-2">
        {cases.map((r, i) => {
          const reason = failReason(r);
          const label = VERDICT_LABEL[r.verdict] || r.verdict || (r.passed ? 'Accepted' : 'Failed');
          const name = r.label || `Test ${r.index || i + 1}`;
          const showIo = !r.hidden;
          return (
            <li
              key={`${name}-${i}`}
              className={`rounded-lg border px-2.5 py-2 ${
                dark
                  ? r.passed
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : 'border-rose-500/20 bg-rose-500/5'
                  : r.passed
                    ? 'border-emerald-100 bg-emerald-50/60'
                    : 'border-rose-100 bg-rose-50/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wide ${r.passed ? (dark ? 'text-emerald-400' : 'text-emerald-700') : dark ? 'text-rose-400' : 'text-rose-700'}`}>
                  {r.passed ? 'Passed' : 'Failed'}
                </span>
                <span className={`text-[11px] font-medium truncate ${dark ? 'text-slate-200' : 'text-slate-800'}`}>
                  {name}
                </span>
                {r.hidden ? (
                  <span className={`text-[9px] uppercase tracking-wider ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Hidden
                  </span>
                ) : (
                  <span className={`text-[9px] uppercase tracking-wider ${dark ? 'text-indigo-400/80' : 'text-indigo-600'}`}>
                    Public
                  </span>
                )}
                <span className={`ml-auto shrink-0 text-[10px] ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
                  {label}
                  {r.executionTime != null ? ` · ${r.executionTime}ms` : ''}
                </span>
              </div>
              {!r.passed && reason ? (
                <p className={`text-[11px] mt-1 ${dark ? 'text-rose-300' : 'text-rose-800'}`}>{reason}</p>
              ) : null}
              {showIo ? (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <IoBlock label="Input" value={r.input} dark={dark} tone="neutral" />
                  <IoBlock label="Expected" value={r.expectedOutput} dark={dark} tone="ok" />
                  <IoBlock
                    label="Your output"
                    value={r.error && !r.actualOutput ? r.error : r.actualOutput}
                    dark={dark}
                    tone={r.passed ? 'ok' : 'fail'}
                  />
                </div>
              ) : (
                <p className={`text-[10px] mt-1 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Hidden test details are not shown.
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
