/**
 * Per-question CPU time / memory limits (HackerRank-style).
 * Stored as timeLimitSec on the question plus optional JSON in constraints:
 *   { "text": "1 <= n <= 1e5", "timeLimitSec": 2, "memoryLimitMb": 256 }
 * Plain-text constraints remain valid (display-only bounds like 1 <= n).
 */

export const DEFAULT_TIME_LIMIT_SEC = 2;
export const DEFAULT_MEMORY_LIMIT_MB = 256;

function clamp(n, min, max, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

export function parseJudgeConfig(question = {}) {
  let text = question.constraints ?? '';
  let timeLimitSec = question.timeLimitSec;
  let memoryLimitMb = question.memoryLimitMb;

  if (typeof text === 'string' && text.trim().startsWith('{')) {
    try {
      const obj = JSON.parse(text);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        text = obj.text ?? obj.constraints ?? '';
        // JSON is the source of truth (column is Int and may be rounded).
        if (obj.timeLimitSec != null) timeLimitSec = obj.timeLimitSec;
        if (obj.memoryLimitMb != null) memoryLimitMb = obj.memoryLimitMb;
      }
    } catch {
      /* keep as display text */
    }
  } else if (text && typeof text === 'object') {
    timeLimitSec = timeLimitSec ?? text.timeLimitSec;
    memoryLimitMb = memoryLimitMb ?? text.memoryLimitMb;
    text = text.text ?? '';
  }

  timeLimitSec = clamp(timeLimitSec, 0.5, 30, DEFAULT_TIME_LIMIT_SEC);
  memoryLimitMb = clamp(memoryLimitMb, 16, 1024, DEFAULT_MEMORY_LIMIT_MB);

  return {
    constraintsText: String(text || ''),
    timeLimitSec,
    memoryLimitMb,
    timeoutMs: Math.round(timeLimitSec * 1000),
    memoryLimitKb: Math.round(memoryLimitMb * 1024),
    wallTimeLimitSec: Math.min(60, Math.max(2, timeLimitSec * 2 + 1)),
  };
}

export function serializeJudgeConfig(input = {}) {
  const text = input.constraintsText ?? input.constraintsText ?? '';
  return JSON.stringify({
    text,
    timeLimitSec: clamp(input.timeLimitSec, 0.5, 30, DEFAULT_TIME_LIMIT_SEC),
    memoryLimitMb: clamp(input.memoryLimitMb, 16, 1024, DEFAULT_MEMORY_LIMIT_MB),
  });
}

export function judgeRunOptions(question, extra = {}) {
  const cfg = parseJudgeConfig(question);
  return {
    timeoutMs: extra.timeoutMs || cfg.timeoutMs,
    cpuTimeLimit: extra.cpuTimeLimit || cfg.timeLimitSec,
    memoryLimit: extra.memoryLimit || cfg.memoryLimitKb,
    wallTimeLimit: extra.wallTimeLimit || cfg.wallTimeLimitSec,
  };
}

/** Aliases used by assessment create/grade and code execution. */
export const parseJudgeLimits = parseJudgeConfig;
export const serializeJudgeLimits = serializeJudgeConfig;
