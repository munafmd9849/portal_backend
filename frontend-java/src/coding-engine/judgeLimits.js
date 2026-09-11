export const DEFAULT_TIME_LIMIT_SEC = 2;
export const DEFAULT_MEMORY_LIMIT_MB = 256;

export function parseJudgeLimits(question = {}) {
  let text = question.constraints ?? '';
  let timeLimitSec = question.timeLimitSec;
  let memoryLimitMb = question.memoryLimitMb;
  if (typeof text === 'string' && text.trim().startsWith('{')) {
    try {
      const obj = JSON.parse(text);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        text = obj.text ?? obj.constraints ?? '';
        if (obj.timeLimitSec != null) timeLimitSec = obj.timeLimitSec;
        if (obj.memoryLimitMb != null) memoryLimitMb = obj.memoryLimitMb;
      }
    } catch {
      /* plaintext */
    }
  }
  const t = Number(timeLimitSec);
  const m = Number(memoryLimitMb);
  return {
    constraintsText: String(text || ''),
    timeLimitSec: Number.isFinite(t) ? t : DEFAULT_TIME_LIMIT_SEC,
    memoryLimitMb: Number.isFinite(m) ? m : DEFAULT_MEMORY_LIMIT_MB,
  };
}

export const VERDICT_LABEL = {
  AC: 'Accepted',
  WA: 'Wrong Answer',
  TLE: 'Time Limit Exceeded',
  MLE: 'Memory Limit Exceeded',
  CE: 'Compilation Error',
  RE: 'Runtime Error',
};
