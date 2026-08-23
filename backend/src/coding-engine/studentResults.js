import { VERDICT } from './verdicts.js';

export const JUDGE_MODE = {
  RUN_TESTS: 'run_tests',
  SUBMIT: 'submit',
};

export function normalizeJudgeMode(raw) {
  return String(raw || '').toLowerCase() === JUDGE_MODE.SUBMIT
    ? JUDGE_MODE.SUBMIT
    : JUDGE_MODE.RUN_TESTS;
}

/** First failing verdict, or Accepted when every case passed. */
export function overallVerdict(results = []) {
  if (!results.length) return VERDICT.WA;
  const fail = results.find((r) => !r.passed);
  if (!fail) return VERDICT.AC;
  return fail.verdict || VERDICT.WA;
}

function safeHiddenError(result) {
  if (result.verdict === VERDICT.CE || result.verdict === VERDICT.RE) {
    return result.error || null;
  }
  return null;
}

/**
 * Student-facing payload. Hidden cases never include input / expected / actual.
 */
export function sanitizeResultsForStudent(results = []) {
  let publicIndex = 0;
  let hiddenIndex = 0;
  return (results || []).map((r) => {
    if (r.hidden) {
      hiddenIndex += 1;
      return {
        index: hiddenIndex,
        label: `Hidden Test ${hiddenIndex}`,
        passed: Boolean(r.passed),
        verdict: r.verdict,
        error: safeHiddenError(r),
        executionTime: r.executionTime ?? null,
        memoryKb: r.memoryKb ?? null,
        hidden: true,
        weight: r.weight ?? 1,
      };
    }
    publicIndex += 1;
    return {
      index: publicIndex,
      label: r.label || `Test ${publicIndex}`,
      input: r.input ?? '',
      expectedOutput: r.expectedOutput ?? '',
      actualOutput: r.actualOutput ?? '',
      passed: Boolean(r.passed),
      verdict: r.verdict,
      error: r.error || null,
      executionTime: r.executionTime ?? null,
      memoryKb: r.memoryKb ?? null,
      hidden: false,
      weight: r.weight ?? 1,
    };
  });
}
