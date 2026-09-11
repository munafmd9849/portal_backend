import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Send, Terminal, FlaskConical, Play, Maximize2, Minimize2, PanelBottom } from 'lucide-react';
import { Spinner } from '../components/ui/loading';
import { CODING_LANGUAGES, RUN_DEBOUNCE_MS } from './constants';
import { runCode, evaluateCode } from './api';
import { parseTestCases } from './testCaseUtils';
import TestResultsPanel from './TestResultsPanel';

/**
 * Exam workspace: Run Tests (public cases + I/O) and Submit (full judge, hidden I/O never shown).
 * Optional custom stdin via `showCustomIo` for mock interviews.
 */
export default function CodingWorkspace({
  code,
  language,
  onCodeChange,
  onLanguageChange,
  customInput = '',
  onCustomInputChange,
  readOnly = false,
  showSubmit = false,
  onSubmit,
  testCases = [],
  allowedLanguages = null,
  showProblemHeader = true,
  questionTitle = '',
  questionDescription = '',
  lastRun = null,
  evaluation = null,
  onRunComplete,
  onEvaluateComplete,
  onTestsEmpty,
  onError,
  compact = false,
  className = '',
  blockPaste = false,
  onPasteBlocked,
  sessionId = null,
  questionId = null,
  showCustomIo = false,
  editorExpanded = false,
  onToggleEditorExpand,
}) {
  const [running, setRunning] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState(lastRun);
  const [evalResult, setEvalResult] = useState(evaluation);
  const [busyMode, setBusyMode] = useState(null);
  const runLockRef = useRef(false);
  const lastRunAtRef = useRef(0);
  const editorRef = useRef(null);
  const [consoleCollapsed, setConsoleCollapsed] = useState(false);

  useEffect(() => {
    setRunResult(lastRun);
    setEvalResult(evaluation);
  }, [questionId, lastRun, evaluation]);

  useEffect(() => {
    if (readOnly || !questionId || !code) return;
    try {
      sessionStorage.setItem(
        `coding-local-draft:${sessionId || 'na'}:${questionId}:${language}`,
        code
      );
    } catch {
      /* ignore quota */
    }
  }, [code, language, questionId, readOnly, sessionId]);

  const handleEditorMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      if (!blockPaste) return;
      const block = () => onPasteBlocked?.();
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, block);
      editor.addCommand(monaco.KeyMod.WinCtrl | monaco.KeyCode.KeyV, block);
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, block);
      editor.addCommand(monaco.KeyMod.WinCtrl | monaco.KeyCode.KeyC, block);
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, block);
      editor.addCommand(monaco.KeyMod.WinCtrl | monaco.KeyCode.KeyX, block);
      editor.onDidPaste(() => {
        editor.trigger('keyboard', 'undo', null);
        onPasteBlocked?.();
      });
    },
    [blockPaste, onPasteBlocked]
  );

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      editorRef.current?.layout?.();
    });
    return () => window.cancelAnimationFrame(id);
  }, [editorExpanded, consoleCollapsed]);

  const monacoLang = useMemo(
    () => CODING_LANGUAGES.find((l) => l.id === language)?.monaco || 'javascript',
    [language]
  );

  const parsedCases = useMemo(() => parseTestCases(testCases), [testCases]);
  const publicCount = useMemo(() => parsedCases.filter((c) => !c.hidden).length, [parsedCases]);

  const languageOptions = useMemo(() => {
    if (!allowedLanguages?.length) return CODING_LANGUAGES;
    return CODING_LANGUAGES.filter((l) => allowedLanguages.includes(l.id));
  }, [allowedLanguages]);

  const displayOutput = useMemo(() => {
    if (runResult?.error) return { type: 'error', text: runResult.error };
    if (runResult?.output != null && runResult.output !== '') return { type: 'ok', text: runResult.output };
    return { type: 'muted', text: 'Output will appear here after you run custom input.' };
  }, [runResult]);

  const showIoPanel = showCustomIo || typeof onToggleEditorExpand === 'function';

  const runJudge = useCallback(
    async (mode) => {
      if (!questionId && parsedCases.length === 0) {
        onTestsEmpty?.();
        return null;
      }
      setEvaluating(true);
      setBusyMode(mode);
      try {
        const result = await evaluateCode({
          language,
          code,
          testCases: parsedCases,
          sessionId,
          questionId,
          mode,
        });
        setEvalResult(result);
        onEvaluateComplete?.(result);
        if (result.error) onError?.(result.error);
        return result;
      } catch (err) {
        const fail = { passed: 0, total: 0, score: 0, results: [], error: err.message, mode };
        setEvalResult(fail);
        onEvaluateComplete?.(fail);
        onError?.(err.message || 'Evaluation failed');
        return fail;
      } finally {
        setEvaluating(false);
        setBusyMode(null);
      }
    },
    [language, code, parsedCases, sessionId, questionId, onEvaluateComplete, onTestsEmpty, onError]
  );

  const handleRunTests = useCallback(() => runJudge('run_tests'), [runJudge]);

  const handleCustomRun = useCallback(async () => {
    const now = Date.now();
    if (runLockRef.current || now - lastRunAtRef.current < RUN_DEBOUNCE_MS) return;
    lastRunAtRef.current = now;
    runLockRef.current = true;
    setRunning(true);
    try {
      const result = await runCode({ language, code, input: customInput, sessionId, questionId });
      setRunResult(result);
      onRunComplete?.(result);
      if (result.error) onError?.(result.error);
    } catch (err) {
      const fail = { output: '', error: err.message || 'Run failed', executionTime: 0 };
      setRunResult(fail);
      onRunComplete?.(fail);
      onError?.(err.message);
    } finally {
      setRunning(false);
      runLockRef.current = false;
    }
  }, [language, code, customInput, sessionId, questionId, onRunComplete, onError]);

  const handleSubmitClick = useCallback(async () => {
    setSubmitting(true);
    let latestEval = evalResult;
    try {
      latestEval = await runJudge('submit');
    } finally {
      setSubmitting(false);
    }
    onSubmit?.({
      code,
      language,
      customInput,
      lastRun: runResult,
      evaluation: latestEval,
      submittedAt: new Date().toISOString(),
    });
  }, [runJudge, onSubmit, code, language, customInput, runResult, evalResult]);

  const handleLanguageSwitch = (lang) => {
    if (readOnly) return;
    if (!languageOptions.some((l) => l.id === lang)) return;
    onLanguageChange?.(lang);
  };

  const busy = evaluating || submitting;

  return (
    <div data-coding-editor className={`flex flex-col h-full min-h-0 overflow-hidden bg-[#0d1117] ${className}`}>
      {showProblemHeader && (questionTitle || questionDescription) && (
        <div className="px-4 py-3 border-b border-white/10 bg-[#161b22] shrink-0">
          {questionTitle ? <p className="text-xs font-bold text-white">{questionTitle}</p> : null}
          {questionDescription ? (
            <p className="text-[11px] text-slate-400 mt-1 whitespace-pre-wrap line-clamp-4">
              {questionDescription}
            </p>
          ) : null}
        </div>
      )}

      {!readOnly && (
        <p className="px-3 py-1.5 text-[10px] text-slate-400 bg-[#161b22] border-b border-white/5 shrink-0">
          Implement <code className="text-indigo-300">solution(input)</code>. Use{' '}
          <span className="text-slate-200 font-semibold">Run Tests</span> on public cases, then{' '}
          <span className="text-slate-200 font-semibold">Submit</span> to grade hidden tests too.
        </p>
      )}

      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between gap-2 bg-[#161b22] shrink-0 flex-wrap">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {readOnly ? 'Candidate code' : 'Editor'}
          </span>
          <select
            value={language}
            disabled={readOnly}
            onChange={(e) => handleLanguageSwitch(e.target.value)}
            className="bg-[#0d1117] border border-white/10 rounded-md px-2 py-1 text-[10px] font-bold text-indigo-300 uppercase"
          >
            {languageOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {typeof onToggleEditorExpand === 'function' && (
            <button
              type="button"
              onClick={onToggleEditorExpand}
              className="h-8 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold uppercase rounded-lg flex items-center gap-1.5 border border-white/10"
              title={editorExpanded ? 'Show problem statement' : 'Expand editor'}
            >
              {editorExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              {editorExpanded ? 'Show problem' : 'Expand'}
            </button>
          )}
          {showIoPanel && (
            <button
              type="button"
              onClick={() => setConsoleCollapsed((v) => !v)}
              className="h-8 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold uppercase rounded-lg flex items-center gap-1.5 border border-white/10"
              title={consoleCollapsed ? 'Show tests and output' : 'Hide tests and output'}
            >
              <PanelBottom className="w-3.5 h-3.5" />
              {consoleCollapsed ? 'Show tests' : 'Hide tests'}
            </button>
          )}
          {showIoPanel && (
            <button
              type="button"
              onClick={handleCustomRun}
              disabled={running || !code || busy}
              className="h-8 px-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-[10px] font-bold uppercase rounded-lg flex items-center gap-1.5"
            >
              {running ? <Spinner size="sm" tone="white" /> : <Play className="w-3.5 h-3.5" />}
              Run
            </button>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={handleRunTests}
              disabled={busy || !code}
              className="h-8 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[10px] font-bold uppercase rounded-lg flex items-center gap-1.5"
            >
              {busyMode === 'run_tests' ? (
                <Spinner size="sm" tone="white" />
              ) : (
                <FlaskConical className="w-3.5 h-3.5" />
              )}
              Run Tests
            </button>
          )}
          {showSubmit && !readOnly && (
            <button
              type="button"
              onClick={handleSubmitClick}
              disabled={busy || !code}
              className="h-8 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[10px] font-bold uppercase rounded-lg flex items-center gap-1.5"
            >
              {busyMode === 'submit' ? <Spinner size="sm" tone="white" /> : <Send className="w-3.5 h-3.5" />}
              Submit
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <Editor
          theme="vs-dark"
          language={monacoLang}
          value={code}
          onMount={handleEditorMount}
          onChange={(v) => !readOnly && onCodeChange?.(v ?? '')}
          options={{
            readOnly,
            contextmenu: !blockPaste,
            minimap: { enabled: false },
            fontSize: compact ? 12 : 14,
            lineNumbers: 'on',
            padding: { top: 12 },
            fontFamily: 'JetBrains Mono, Fira Code, monospace',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            quickSuggestions: !readOnly,
            domReadOnly: readOnly,
          }}
        />
      </div>

      {showIoPanel && (
        <div
          className={`shrink-0 min-h-0 overflow-y-auto overscroll-contain border-t border-white/10 ${
            consoleCollapsed ? 'hidden' : 'max-h-[46%]'
          }`}
        >
          <div className={`grid grid-cols-1 ${compact ? '' : 'md:grid-cols-2'} min-h-[120px]`}>
            <div className="border-b md:border-b-0 md:border-r border-white/10 flex flex-col">
              <div className="px-3 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-[#161b22] sticky top-0 z-10">
                Custom input
              </div>
              <textarea
                value={customInput}
                onChange={(e) => !readOnly && onCustomInputChange?.(e.target.value)}
                readOnly={readOnly}
                placeholder="stdin / function argument (JSON supported)"
                className="flex-1 min-h-[72px] p-3 bg-[#0d1117] text-emerald-400/90 font-mono text-xs resize-none outline-none border-0"
              />
            </div>
            <div className="flex flex-col min-h-[88px]">
              <div className="px-3 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-[#161b22] flex justify-between sticky top-0 z-10">
                <span>Output</span>
                {runResult?.executionTime != null && (
                  <span className="text-slate-600 tabular-nums">{runResult.executionTime}ms</span>
                )}
              </div>
              <pre
                className={`flex-1 p-3 m-0 overflow-auto font-mono text-xs whitespace-pre-wrap ${
                  displayOutput.type === 'error'
                    ? 'text-rose-400'
                    : displayOutput.type === 'ok'
                      ? 'text-emerald-300'
                      : 'text-slate-500'
                }`}
              >
                {displayOutput.text}
              </pre>
            </div>
          </div>

          <div className="border-t border-white/10 shrink-0 bg-[#161b22] flex flex-col">
            <div className="px-3 py-1.5 flex items-center justify-between gap-2 sticky top-0 bg-[#161b22] z-10">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Test results</p>
              {publicCount > 0 && (
                <span className="text-[10px] text-slate-500">{publicCount} public</span>
              )}
            </div>
            <div className="overflow-y-auto px-3 pb-3 min-h-[140px]">
              <TestResultsPanel
                theme="dark"
                evaluation={evalResult}
                emptyHint="Run Tests to debug public cases (input, expected, your output). Submit grades public and hidden tests; hidden details stay hidden."
              />
            </div>
          </div>
        </div>
      )}

      {!showIoPanel && (
        <div className="border-t border-white/10 shrink-0 bg-[#161b22] flex flex-col max-h-[min(42vh,380px)]">
          <div className="px-3 py-1.5 flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Test results</p>
            {publicCount > 0 && (
              <span className="text-[10px] text-slate-500">{publicCount} public</span>
            )}
          </div>
          <div className="overflow-y-auto px-3 pb-3 min-h-[140px]">
            <TestResultsPanel
              theme="dark"
              evaluation={evalResult}
              emptyHint="Run Tests to debug public cases (input, expected, your output). Submit grades public and hidden tests; hidden details stay hidden."
            />
          </div>
        </div>
      )}
    </div>
  );
}
