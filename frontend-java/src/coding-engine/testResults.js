import { VERDICT_LABEL } from './judgeLimits';

export function normalizeTestCaseResult(raw, index = 0) {
  if (!raw || typeof raw !== 'object') {
    return {
      label: `Test ${index + 1}`,
      input: '',
      expectedOutput: '',
      actualOutput: '',
      passed: false,
      verdict: null,
      error: null,
      executionTime: null,
      memoryKb: null,
      hidden: false,
      weight: 1,
    };
  }
  return {
    label: raw.label || `Test ${index + 1}`,
    input: raw.input ?? '',
    expectedOutput: raw.expectedOutput ?? raw.expected ?? '',
    actualOutput: raw.actualOutput ?? raw.actual ?? '',
    passed: Boolean(raw.passed),
    verdict: raw.verdict || (raw.passed ? 'AC' : null),
    error: raw.error || null,
    executionTime: raw.executionTime ?? raw.executionTime ?? null,
    memoryKb: raw.memoryKb ?? null,
    hidden: Boolean(raw.hidden),
    weight: raw.weight ?? 1,
  };
}

export function collectTestCaseResults(evaluation) {
  if (!evaluation) return [];
  const list = evaluation.results || evaluation.logs || [];
  return (Array.isArray(list) ? list : []).map(normalizeTestCaseResult);
}

export function failReason(result) {
  if (!result || result.passed) return null;
  const verdict = result.verdict;
  const label = VERDICT_LABEL[verdict] || verdict;
  const ioHidden =
    result.hidden && result.expectedOutput === '' && result.actualOutput === '' && !result.input;

  if (verdict === 'TLE') {
    return 'Time Limit Exceeded — the program did not finish within the allowed time.';
  }
  if (verdict === 'MLE') {
    return 'Memory Limit Exceeded — the program used more memory than allowed.';
  }
  if (verdict === 'CE') {
    return result.error || 'Compilation Error — the program did not compile.';
  }
  if (verdict === 'RE') {
    return result.error || 'Runtime Error — the program crashed while running.';
  }
  if (ioHidden) {
    return `${label || 'Wrong Answer'} on a hidden test.`;
  }
  if (result.error && verdict !== 'WA') {
    return result.error;
  }
  return 'Wrong Answer — output did not match the expected output.';
}

export function verdictTone(result) {
  if (result?.passed || result?.verdict === 'AC') return 'pass';
  return 'fail';
}
