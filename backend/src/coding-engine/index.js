import { sanitizeCode } from './sanitize.js';
import { runJavaScript } from './runners/javascript.js';
import { runPython } from './runners/python.js';
import { runJava } from './runners/java.js';
import { runCpp } from './runners/cpp.js';
import { isJudge0Enabled, runViaJudge0 } from '../services/judge0.js';
import {
  parseTestCasesRaw,
  outputsMatch,
} from './testCaseStorage.js';

export { parseTestCasesRaw, outputsMatch, splitPublicAndHidden } from './testCaseStorage.js';

const DEFAULT_TIMEOUT_MS = 3000;
const SUPPORTED = new Set(['javascript', 'python', 'java', 'cpp']);

const RUNNERS = {
  javascript: runJavaScript,
  python: runPython,
  java: runJava,
  cpp: runCpp,
};

export function normalizeLanguage(lang) {
  const l = String(lang || 'javascript').toLowerCase();
  if (l === 'js' || l === 'node') return 'javascript';
  if (l === 'c++') return 'cpp';
  return l;
}

export async function runCode({ language, code, input = '' }, options = {}) {
  const lang = normalizeLanguage(language);
  if (!SUPPORTED.has(lang)) {
    return { output: '', error: `Unsupported language: ${language}`, executionTime: 0 };
  }
  const safeCode = sanitizeCode(code);
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  if (isJudge0Enabled()) {
    return runViaJudge0({ language: lang, code: safeCode, input }, options);
  }

  const runner = RUNNERS[lang];
  return runner(safeCode, input, timeoutMs);
}

export function normalizeTestCases(raw) {
  return parseTestCasesRaw(raw);
}

export async function evaluateTestCases({ language, code, testCases }, options = {}) {
  const cases = normalizeTestCases(testCases);
  if (cases.length === 0) {
    return {
      passed: 0,
      total: 0,
      score: 0,
      results: [],
      hiddenTestsPassed: 0,
      hiddenTestsTotal: 0,
      error: 'No test cases configured',
    };
  }

  const results = [];
  let passed = 0;

  for (const tc of cases) {
    const run = await runCode({ language, code, input: tc.input }, options);
    const actual = run.error ? '' : run.output;
    const ok = !run.error && outputsMatch(actual, tc.expectedOutput);
    if (ok) passed += 1;
    results.push({
      label: tc.label,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      actualOutput: actual,
      passed: ok,
      error: run.error,
      executionTime: run.executionTime,
      hidden: tc.hidden,
    });
  }

  const hiddenTotal = results.filter((r) => r.hidden).length;
  const hiddenPassed = results.filter((r) => r.hidden && r.passed).length;
  const score = cases.length ? Math.round((passed / cases.length) * 100) : 0;

  if (options.redactHidden) {
    const publicResults = results
      .filter((r) => !r.hidden)
      .map(({ label, input, expectedOutput, actualOutput, passed: p, error, executionTime }) => ({
        label,
        input,
        expectedOutput,
        actualOutput,
        passed: p,
        error,
        executionTime,
        hidden: false,
      }));
    const hiddenSummary = results
      .filter((r) => r.hidden)
      .map(({ label, passed: p, error, executionTime }) => ({
        label,
        passed: p,
        error,
        executionTime,
        hidden: true,
      }));

    return {
      passed,
      total: cases.length,
      score,
      results: [...publicResults, ...hiddenSummary],
      hiddenTestsPassed: hiddenPassed,
      hiddenTestsTotal: hiddenTotal,
      error: null,
    };
  }

  return {
    passed,
    total: cases.length,
    score,
    results,
    hiddenTestsPassed: hiddenPassed,
    hiddenTestsTotal: hiddenTotal,
    error: null,
  };
}

/** Extract code string from assessment answer (plain string or JSON blob). */
export function extractCodeFromAnswer(answer) {
  if (!answer) return { code: '', language: 'javascript' };
  if (typeof answer === 'string') {
    try {
      const parsed = JSON.parse(answer);
      if (parsed && typeof parsed === 'object' && parsed.code != null) {
        return {
          code: String(parsed.code),
          language: normalizeLanguage(parsed.language),
        };
      }
    } catch {
      return { code: answer, language: 'javascript' };
    }
    return { code: answer, language: 'javascript' };
  }
  if (typeof answer === 'object') {
    return {
      code: String(answer.code || ''),
      language: normalizeLanguage(answer.language),
    };
  }
  return { code: '', language: 'javascript' };
}

export async function gradeCodingAnswer(question, studentAnswer) {
  const { code, language } = extractCodeFromAnswer(studentAnswer);
  if (!code.trim()) {
    return { pointsEarned: 0, passed: 0, total: 0, results: [], logs: [] };
  }
  const evaluation = await evaluateTestCases({
    language,
    code,
    testCases: question.testCases,
  }, { redactHidden: true });
  const pointsEarned =
    evaluation.total > 0
      ? Math.floor((evaluation.passed / evaluation.total) * (question.points || 1))
      : 0;
  return {
    pointsEarned,
    passed: evaluation.passed,
    total: evaluation.total,
    results: evaluation.results,
    logs: evaluation.results,
    language,
  };
}
