/** Judge verdicts aligned with HackerRank / Judge0. */
export const VERDICT = {
  AC: 'AC',
  WA: 'WA',
  TLE: 'TLE',
  MLE: 'MLE',
  CE: 'CE',
  RE: 'RE',
};

export const VERDICT_LABEL = {
  AC: 'Accepted',
  WA: 'Wrong Answer',
  TLE: 'Time Limit Exceeded',
  MLE: 'Memory Limit Exceeded',
  CE: 'Compilation Error',
  RE: 'Runtime Error',
};

export function classifyVerdict({
  passed,
  error,
  judge0,
  executionTime = 0,
  timeoutMs = 0,
  memoryKb,
  memoryLimitKb,
} = {}) {
  const msg = String(error || '').toLowerCase();
  const statusId = judge0?.statusId;
  const status = String(judge0?.status || '').toLowerCase();

  if (
    statusId === 5 ||
    status.includes('time limit') ||
    msg.includes('time limit') ||
    msg.includes('timed out')
  ) {
    return VERDICT.TLE;
  }
  if (timeoutMs > 0 && executionTime >= timeoutMs - 15 && error) {
    return VERDICT.TLE;
  }
  if (
    statusId === 17 ||
    status.includes('memory') ||
    msg.includes('memory limit') ||
    msg.includes('heap out of memory') ||
    (memoryLimitKb > 0 && Number(memoryKb) > memoryLimitKb)
  ) {
    return VERDICT.MLE;
  }
  if (statusId === 6 || status.includes('compilation') || msg.includes('compilation failed')) {
    return VERDICT.CE;
  }
  if (!error && passed) return VERDICT.AC;
  if (error) return VERDICT.RE;
  return VERDICT.WA;
}
