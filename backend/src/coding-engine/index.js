import { sanitizeCode } from './sanitize.js';
import { runJavaScript } from './runners/javascript.js';
import { runPython } from './runners/python.js';
import { runJava, runJavaSuite } from './runners/java.js';
import { runCpp, runCppSuite } from './runners/cpp.js';
import {
  shouldAttemptJudge0,
  runViaJudge0,
  runManyViaJudge0,
  noteJudge0InfrastructureFailure,
  noteJudge0Success,
} from '../services/judge0.js';
import {
  parseTestCasesRaw,
  outputsMatch,
} from './testCaseStorage.js';
import { judgeRunOptions } from './judgeLimits.js';
import { classifyVerdict } from './verdicts.js';
import { overallVerdict, sanitizeResultsForStudent } from './studentResults.js';

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

  if (shouldAttemptJudge0()) {
    const viaJudge0 = await runViaJudge0({ language: lang, code: safeCode, input }, {
      ...options,
      cpuTimeLimit: options.cpuTimeLimit || timeoutMs / 1000,
      memoryLimit: options.memoryLimit,
      wallTimeLimit: options.wallTimeLimit,
    });
    if (!viaJudge0?.infrastructureFailure) {
      noteJudge0Success();
      return {
        ...viaJudge0,
        verdict: classifyVerdict({
          passed: !viaJudge0.error,
          error: viaJudge0.error,
          judge0: viaJudge0.judge0,
          executionTime: viaJudge0.executionTime,
          timeoutMs,
          memoryKb: viaJudge0.memoryKb,
          memoryLimitKb: options.memoryLimit,
        }),
      };
    }
    noteJudge0InfrastructureFailure();
    console.warn(
      `[coding-engine] Judge0 infrastructure failure for ${lang}; falling back to local runner for this request and skipping Judge0 until cooldown. ${viaJudge0.error || ''}`
    );
  }

  const runner = RUNNERS[lang];
  const local = await runner(safeCode, input, timeoutMs);
  return {
    ...local,
    verdict: classifyVerdict({
      passed: !local.error,
      error: local.error,
      executionTime: local.executionTime,
      timeoutMs,
    }),
  };
}

export function normalizeTestCases(raw) {
  return parseTestCasesRaw(raw);
}

async function runLocalSuite(language, code, inputs, timeoutMs) {
  if (language === 'cpp') return runCppSuite(code, inputs, timeoutMs);
  if (language === 'java') return runJavaSuite(code, inputs, timeoutMs);
  const runner = RUNNERS[language];
  const runs = [];
  for (const input of inputs) {
    runs.push(await runner(code, input, timeoutMs));
  }
  return runs;
}

export async function evaluateTestCases({ language, code, testCases }, options = {}) {
  let cases = normalizeTestCases(testCases);
  if (options.scope === 'public') {
    cases = cases.filter((tc) => !tc.hidden);
  }
  if (cases.length === 0) {
    return {
      passed: 0,
      total: 0,
      score: 0,
      results: [],
      verdict: null,
      hiddenTestsPassed: 0,
      hiddenTestsTotal: 0,
      error:
        options.scope === 'public'
          ? 'No public test cases configured. Submit to run the full judge.'
          : 'No test cases configured',
    };
  }

  const lang = normalizeLanguage(language);
  const safeCode = sanitizeCode(code);
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const inputs = cases.map((tc) => tc.input);

  let runs;
  if (shouldAttemptJudge0()) {
    const batch = await runManyViaJudge0(
      inputs.map((input) => ({ language: lang, code: safeCode, input })),
      {
        ...options,
        cpuTimeLimit: options.cpuTimeLimit || timeoutMs / 1000,
        memoryLimit: options.memoryLimit,
        wallTimeLimit: options.wallTimeLimit,
        pollTimeoutMs: Math.min(60_000, Math.max(25_000, cases.length * 4_000 + 15_000)),
      },
    );
    if (!batch.infrastructureFailure) {
      noteJudge0Success();
      runs = batch.results;
    } else {
      noteJudge0InfrastructureFailure();
      console.warn(
        `[coding-engine] Judge0 suite failed for ${lang}; compiling once locally for ${cases.length} test(s). ${batch.error || ''}`
      );
      runs = await runLocalSuite(lang, safeCode, inputs, timeoutMs);
    }
  } else {
    runs = await runLocalSuite(lang, safeCode, inputs, timeoutMs);
  }

  const results = [];
  let passed = 0;
  let weightPassed = 0;
  let weightTotal = 0;

  cases.forEach((tc, i) => {
    const weight = Math.max(1, Number(tc.weight) || 1);
    weightTotal += weight;
    const run = runs[i] || { output: '', error: 'No result', executionTime: 0 };
    const actual = run.error ? '' : run.output;
    const ok = !run.error && outputsMatch(actual, tc.expectedOutput);
    const verdict = classifyVerdict({
      passed: ok,
      error: run.error,
      judge0: run.judge0,
      executionTime: run.executionTime,
      timeoutMs: options.timeoutMs || DEFAULT_TIMEOUT_MS,
      memoryKb: run.memoryKb,
      memoryLimitKb: options.memoryLimit,
    });
    if (ok) {
      passed += 1;
      weightPassed += weight;
    }
    results.push({
      label: tc.label,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      actualOutput: actual,
      passed: ok,
      verdict,
      error: run.error,
      executionTime: run.executionTime,
      memoryKb: run.memoryKb ?? null,
      hidden: tc.hidden,
      weight,
    });
  });

  const hiddenTotal = results.filter((r) => r.hidden).length;
  const hiddenPassed = results.filter((r) => r.hidden && r.passed).length;
  const score = weightTotal ? Math.round((weightPassed / weightTotal) * 100) : 0;
  const safeResults = options.redactHidden ? sanitizeResultsForStudent(results) : results;

  return {
    passed,
    total: cases.length,
    score,
    verdict: overallVerdict(results),
    results: safeResults,
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

export async function gradeCodingAnswer(question, studentAnswer, extra = {}) {
  const { code, language } = extractCodeFromAnswer(studentAnswer);
  if (!code.trim()) {
    return { pointsEarned: 0, passed: 0, total: 0, score: 0, results: [], logs: [] };
  }
  const evaluation = await evaluateTestCases(
    {
      language,
      code,
      testCases: question.testCases,
    },
    {
      ...judgeRunOptions(question),
      scope: 'all',
      redactHidden: extra.redactHidden !== false,
    },
  );
  const pointsEarned =
    evaluation.total > 0
      ? Math.floor((evaluation.score / 100) * (question.points || 1))
      : 0;
  return {
    pointsEarned,
    passed: evaluation.passed,
    total: evaluation.total,
    score: evaluation.score,
    results: evaluation.results,
    logs: evaluation.results,
    language,
    hiddenTestsPassed: evaluation.hiddenTestsPassed,
    hiddenTestsTotal: evaluation.hiddenTestsTotal,
  };
}
