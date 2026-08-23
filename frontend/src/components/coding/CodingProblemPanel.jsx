import React from 'react';

function IoPre({ children, tone = 'neutral' }) {
  const tones = {
    ok: 'bg-emerald-50/50 border-emerald-100 text-slate-800',
    expected: 'bg-indigo-50/50 border-indigo-100 text-slate-800',
    neutral: 'bg-slate-50 border-slate-200 text-slate-800',
  };
  return (
    <pre className={`m-0 whitespace-pre-wrap rounded-lg p-2 border font-mono text-[13px] ${tones[tone]}`}>
      {children || ' '}
    </pre>
  );
}

/**
 * Problem statement on the left of the exam split view.
 * Public tests are docked in their own scroll area so many cases never stretch the page.
 */
export default function CodingProblemPanel({
  title,
  problem,
  constraints,
  examples = [],
  publicTests = [],
  difficulty,
  points,
  timeLimitSec,
  memoryLimitMb,
  hideHeaderMeta = false,
  className = '',
}) {
  const visiblePublic = (publicTests || []).filter((tc) => !tc.hidden);

  return (
    <div className={`flex flex-col h-full min-h-0 overflow-hidden bg-[#f8f9fb] text-slate-900 ${className}`}>
      <div className="px-5 py-4 border-b border-slate-200 bg-white shrink-0">
        {!hideHeaderMeta && (difficulty || points != null) && (
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {difficulty && (
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                {difficulty}
              </span>
            )}
            {points != null && (
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
                {points} pts
              </span>
            )}
            {timeLimitSec != null && (
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100">
                {timeLimitSec}s
              </span>
            )}
            {memoryLimitMb != null && (
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-100">
                {memoryLimitMb} MB
              </span>
            )}
          </div>
        )}
        <h2 className="text-lg font-bold text-slate-900 leading-snug select-none text-wrap-balance">
          {title || 'Coding problem'}
        </h2>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-6 text-sm leading-relaxed">
        {problem ? (
          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Problem</h3>
            <div className="text-slate-700 whitespace-pre-wrap font-medium select-none text-pretty">{problem}</div>
          </section>
        ) : (
          <p className="text-slate-400 italic">No problem statement provided.</p>
        )}

        {constraints ? (
          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Constraints</h3>
            <div className="text-slate-600 whitespace-pre-wrap text-[13px] bg-white border border-slate-200 rounded-xl p-4 font-mono">
              {constraints}
            </div>
          </section>
        ) : null}

        {examples.length > 0 && (
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Examples</h3>
            {examples.map((ex, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {ex.label || `Example ${i + 1}`}
                </div>
                <div className="px-4 py-3 space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">Input</span>
                    <IoPre tone="ok">{ex.input}</IoPre>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-indigo-700 uppercase block mb-1">Output</span>
                    <IoPre tone="expected">{ex.output}</IoPre>
                  </div>
                  {ex.explanation ? (
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Explanation</span>
                      <p className="text-slate-600 font-sans text-xs m-0 whitespace-pre-wrap">{ex.explanation}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </section>
        )}

        <section className="pb-2">
          <p className="text-[11px] text-slate-500 bg-white border border-slate-200 rounded-lg p-3">
            Implement <code className="text-indigo-600 font-bold">solution(input)</code> (JS/Python) or{' '}
            <code className="text-indigo-600 font-bold">public static Object solution(Object input)</code> (Java).
            Use <span className="font-semibold text-slate-700">Run Tests</span> on public cases, then{' '}
            <span className="font-semibold text-slate-700">Submit</span> for the full judge (including hidden tests).
          </p>
        </section>
      </div>

      {visiblePublic.length > 0 && (
        <section className="shrink-0 border-t border-indigo-100 bg-indigo-50/40 flex flex-col max-h-[min(42%,280px)]">
          <div className="px-5 py-2.5 flex items-center justify-between gap-2 shrink-0">
            <div>
              <h3 className="text-xs font-bold text-indigo-800 uppercase tracking-widest">Public test cases</h3>
              <p className="text-[10px] text-indigo-700/80 mt-0.5">
                Visible samples for Run Tests. Hidden tests are never shown here.
              </p>
            </div>
            <span className="text-[10px] font-semibold text-indigo-600 shrink-0">
              {visiblePublic.length} public
            </span>
          </div>
          <div className="overflow-y-auto px-5 pb-4 space-y-2 min-h-0">
            {visiblePublic.map((tc, i) => (
              <div key={i} className="bg-white border border-indigo-100 rounded-xl overflow-hidden">
                <div className="px-3 py-1.5 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-widest">
                    {tc.label || `TC${i + 1}`}
                  </span>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-indigo-500">Public</span>
                </div>
                <div className="px-3 py-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">Input</span>
                    <IoPre tone="ok">{tc.input}</IoPre>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-indigo-700 uppercase block mb-1">Expected</span>
                    <IoPre tone="expected">{tc.expectedOutput || tc.output}</IoPre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
