/**
 * Judge0 code execution client.
 *
 * Providers:
 * - rapidapi  → https://judge0-ce.p.rapidapi.com (free Basic plan on RapidAPI)
 * - selfhosted → your own Judge0 CE instance (e.g. http://localhost:2358)
 */

import { resolveWrappedSubmission } from '../coding-engine/judge0Wrapper.js';

const DEFAULT_LANGUAGE_IDS = {
  javascript: 63, // Node.js 12.14.0
  python: 71,     // Python 3.8.1
  java: 62,       // OpenJDK 13.0.1
  cpp: 54,        // GCC 9.2.0
};

const STATUS_ACCEPTED = 3;
const STATUS_WRONG_ANSWER = 4;
const STATUS_TLE = 5;
const STATUS_COMPILATION_ERROR = 6;
const STATUS_RUNTIME_ERROR = 11;

function envBool(name, fallback = false) {
  const v = (process.env[name] || '').trim().toLowerCase();
  if (!v) return fallback;
  return v === '1' || v === 'true' || v === 'yes';
}

function getProvider() {
  const explicit = (process.env.JUDGE0_PROVIDER || '').trim().toLowerCase();
  if (explicit === 'rapidapi' || explicit === 'selfhosted' || explicit === 'self-hosted') return explicit === 'rapidapi' ? 'rapidapi' : 'selfhosted';
  if (process.env.JUDGE0_RAPIDAPI_KEY) return 'rapidapi';
  if (process.env.JUDGE0_API_URL) return 'selfhosted';
  return null;
}

function getLanguageId(language) {
  const lang = String(language || 'javascript').toLowerCase();
  const envKey = `JUDGE0_LANG_${lang.toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
  const fromEnv = process.env[envKey];
  if (fromEnv) return Number(fromEnv);
  return DEFAULT_LANGUAGE_IDS[lang] ?? null;
}

function getConfig() {
  const provider = getProvider();
  if (!provider) return null;

  if (provider === 'rapidapi') {
    const apiKey = (process.env.JUDGE0_RAPIDAPI_KEY || '').trim();
    if (!apiKey) return null;
    return {
      provider,
      baseUrl: (process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com').replace(/\/$/, ''),
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': (process.env.JUDGE0_RAPIDAPI_HOST || 'judge0-ce.p.rapidapi.com').trim(),
      },
    };
  }

  const baseUrl = (process.env.JUDGE0_API_URL || 'http://localhost:2358').replace(/\/$/, '');
  const headers = { 'Content-Type': 'application/json' };
  const token = (process.env.JUDGE0_AUTH_TOKEN || '').trim();
  if (token) headers['X-Auth-Token'] = token;

  return { provider, baseUrl, headers };
}

function b64(value) {
  return Buffer.from(String(value ?? ''), 'utf8').toString('base64');
}

/**
 * Judge0 is always called with base64_encoded=true, so stdout like "7" arrives as "Nw==".
 * Do not skip short strings: 1–3 byte outputs are valid 4-char base64 (padding included).
 */
export function fromB64(value) {
  if (value == null || value === '') return '';
  const original = String(value);
  const compact = original.replace(/\s+/g, '');
  if (!compact) return '';
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(compact) || compact.length % 4 !== 0) {
    return original.trim();
  }
  try {
    const buf = Buffer.from(compact, 'base64');
    const decoded = buf.toString('utf8');
    if (decoded.includes('\u0000')) return original.trim();
    const reencoded = buf.toString('base64');
    if (reencoded.replace(/=+$/, '') !== compact.replace(/=+$/, '')) {
      return original.trim();
    }
    return decoded;
  } catch {
    return original.trim();
  }
}

function buildErrorMessage(result) {
  const statusId = result?.status?.id;
  const statusDesc = result?.status?.description || 'Execution failed';
  const compile = fromB64(result?.compile_output || '').trim();
  const stderr = fromB64(result?.stderr || '').trim();
  const message = fromB64(result?.message || '').trim();

  if (statusId === STATUS_COMPILATION_ERROR) {
    return compile || stderr || message || statusDesc;
  }
  if (statusId === STATUS_RUNTIME_ERROR || statusId === STATUS_TLE) {
    return stderr || message || statusDesc;
  }
  if (statusId === STATUS_WRONG_ANSWER) {
    return null;
  }
  if (statusId === STATUS_ACCEPTED) {
    return null;
  }
  // Internal Error (13) etc.
  return message || stderr || compile || statusDesc;
}

const STATUS_INTERNAL_ERROR = 13;

function isJudge0InfrastructureFailure(result) {
  const statusId = result?.status?.id;
  if (statusId === STATUS_INTERNAL_ERROR) return true;
  const msg = fromB64(result?.message || '').toLowerCase();
  return (
    msg.includes('rb_sysopen') ||
    msg.includes('/box/') ||
    msg.includes('control group') ||
    msg.includes('cgroup')
  );
}

function mapJudge0Result(result) {
  const stdout = fromB64(result?.stdout || '').trimEnd();
  const error = buildErrorMessage(result);
  const executionTime = Math.round(Number(result?.time || 0) * 1000);
  const memoryKb = result?.memory != null ? Number(result.memory) : null;

  return {
    output: stdout,
    error,
    executionTime,
    memoryKb,
    judge0: {
      status: result?.status?.description,
      statusId: result?.status?.id,
      memory: result?.memory,
      token: result?.token,
    },
  };
}

/** After a hang/timeout, skip Judge0 for a cooldown so each test case does not wait again. */
let judge0SkipUntil = 0;
const JUDGE0_COOLDOWN_MS = Math.max(
  15_000,
  Number(process.env.JUDGE0_COOLDOWN_MS) || 120_000,
);

export function isJudge0Enabled() {
  if (!envBool('JUDGE0_ENABLED', envBool('JUDGE0_ENABLED', false))) return false;
  return Boolean(getConfig());
}

export function shouldAttemptJudge0() {
  return isJudge0Enabled() && Date.now() >= judge0SkipUntil;
}

export function noteJudge0InfrastructureFailure() {
  judge0SkipUntil = Date.now() + JUDGE0_COOLDOWN_MS;
}

export function noteJudge0Success() {
  judge0SkipUntil = 0;
}

export function getJudge0Status() {
  const config = getConfig();
  return {
    enabled: isJudge0Enabled(),
    configured: Boolean(config),
    provider: config?.provider || null,
    baseUrl: config?.baseUrl || null,
  };
}

export async function runViaJudge0({ language, code, input = '' }, options = {}) {
  const config = getConfig();
  if (!config) {
    throw new Error('Judge0 is not configured. Set JUDGE0_ENABLED=true and RapidAPI or self-hosted credentials.');
  }

  const languageId = getLanguageId(language);
  if (!languageId) {
    return { output: '', error: `Unsupported language for Judge0: ${language}`, executionTime: 0 };
  }

  const { sourceCode, stdin } = resolveWrappedSubmission(language, code, input);
  const cpuTimeLimit = Number(options.cpuTimeLimit || process.env.JUDGE0_CPU_TIME_LIMIT || 2);
  const memoryLimit = Number(options.memoryLimit || process.env.JUDGE0_MEMORY_LIMIT || 256000);
  const wallTimeLimit = Number(options.wallTimeLimit || process.env.JUDGE0_WALL_TIME_LIMIT || 5);

  const url = `${config.baseUrl}/submissions?base64_encoded=true&wait=true`;
  const body = {
    language_id: languageId,
    source_code: b64(sourceCode),
    stdin: b64(stdin),
    cpu_time_limit: cpuTimeLimit,
    memory_limit: memoryLimit,
    wall_time_limit: wallTimeLimit,
  };

  const start = Date.now();
  // wait=true includes isolate compile. Cold g++ often takes 8–20s, which is
  // longer than cpu_time_limit. Aborting that is not a Judge0 outage.
  const fetchTimeoutMs =
    Number(process.env.JUDGE0_FETCH_TIMEOUT_MS) ||
    Math.min(60_000, Math.max(25_000, (Number(wallTimeLimit) + Number(cpuTimeLimit) + 15) * 1000));
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: config.headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(fetchTimeoutMs),
    });
  } catch (err) {
    return {
      output: '',
      error: `Judge0 request failed: ${err.message}`,
      executionTime: Date.now() - start,
      infrastructureFailure: true,
    };
  }

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    return {
      output: '',
      error: `Judge0 returned invalid JSON (${response.status}): ${text.slice(0, 200)}`,
      executionTime: Date.now() - start,
    };
  }

  if (!response.ok) {
    const detail = data?.error || data?.message || text.slice(0, 300);
    return {
      output: '',
      error: `Judge0 error ${response.status}: ${detail}`,
      executionTime: Date.now() - start,
      infrastructureFailure: true,
    };
  }

  const mapped = mapJudge0Result(data);
  if (isJudge0InfrastructureFailure(data)) {
    return {
      ...mapped,
      error:
        mapped.error ||
        'Judge0 sandbox failed (isolate/cgroup). On macOS Docker Desktop this is common — use a Linux host or local runners.',
      infrastructureFailure: true,
      judge0: mapped.judge0,
    };
  }
  return mapped;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postJudge0Token(config, { language, code, input }, options) {
  const languageId = getLanguageId(language);
  if (!languageId) {
    return { error: `Unsupported language for Judge0: ${language}` };
  }
  const { sourceCode, stdin } = resolveWrappedSubmission(language, code, input);
  const cpuTimeLimit = Number(options.cpuTimeLimit || process.env.JUDGE0_CPU_TIME_LIMIT || 2);
  const memoryLimit = Number(options.memoryLimit || process.env.JUDGE0_MEMORY_LIMIT || 256000);
  const wallTimeLimit = Number(options.wallTimeLimit || process.env.JUDGE0_WALL_TIME_LIMIT || 5);
  const url = `${config.baseUrl}/submissions?base64_encoded=true&wait=false`;
  const response = await fetch(url, {
    method: 'POST',
    headers: config.headers,
    body: JSON.stringify({
      language_id: languageId,
      source_code: b64(sourceCode),
      stdin: b64(stdin),
      cpu_time_limit: cpuTimeLimit,
      memory_limit: memoryLimit,
      wall_time_limit: wallTimeLimit,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    return { error: `Judge0 returned invalid JSON (${response.status})`, infrastructureFailure: true };
  }
  if (!response.ok || !data.token) {
    const detail = data?.error || data?.message || text.slice(0, 200);
    return { error: `Judge0 error ${response.status}: ${detail}`, infrastructureFailure: true };
  }
  return { token: data.token };
}

async function fetchJudge0ByToken(config, token) {
  const url = `${config.baseUrl}/submissions/${encodeURIComponent(token)}?base64_encoded=true`;
  const response = await fetch(url, {
    headers: config.headers,
    signal: AbortSignal.timeout(10_000),
  });
  const data = await response.json();
  return data;
}

/**
 * Submit every test case with wait=false, then poll.
 * Submit was doing 10 sequential wait=true C++ compiles and aborting the HTTP wait.
 */
export async function runManyViaJudge0(jobs, options = {}) {
  const config = getConfig();
  if (!config) {
    return { infrastructureFailure: true, results: [], error: 'Judge0 is not configured' };
  }

  const posted = [];
  for (const job of jobs) {
    try {
      posted.push(await postJudge0Token(config, job, options));
    } catch (err) {
      posted.push({
        error: `Judge0 request failed: ${err.message}`,
        infrastructureFailure: true,
      });
    }
  }

  if (posted.every((p) => p.infrastructureFailure || !p.token)) {
    return {
      infrastructureFailure: true,
      results: posted.map((p) => ({
        output: '',
        error: p.error || 'Judge0 submit failed',
        executionTime: 0,
        infrastructureFailure: true,
      })),
      error: posted[0]?.error || 'Judge0 submit failed',
    };
  }

  const tokens = posted.map((p) => p.token).filter(Boolean);
  const done = new Map();
  const pollUntil = Date.now() + (Number(options.pollTimeoutMs) || 45_000);

  while (Date.now() < pollUntil && done.size < tokens.length) {
    for (const token of tokens) {
      if (done.has(token)) continue;
      try {
        const data = await fetchJudge0ByToken(config, token);
        if (data?.status?.id > 2) {
          const mapped = mapJudge0Result(data);
          if (isJudge0InfrastructureFailure(data)) {
            done.set(token, {
              ...mapped,
              error:
                mapped.error ||
                'Judge0 sandbox failed (isolate/cgroup). On macOS Docker Desktop this is common — use a Linux host or local runners.',
              infrastructureFailure: true,
            });
          } else {
            done.set(token, mapped);
          }
        }
      } catch {
        /* retry on next poll */
      }
    }
    if (done.size < tokens.length) await sleep(300);
  }

  const results = posted.map((p) => {
    if (!p.token) {
      return {
        output: '',
        error: p.error || 'Judge0 submit failed',
        executionTime: 0,
        infrastructureFailure: true,
      };
    }
    return (
      done.get(p.token) || {
        output: '',
        error: 'Judge0 poll timed out',
        executionTime: 0,
        infrastructureFailure: true,
      }
    );
  });

  return {
    infrastructureFailure: results.every((r) => r.infrastructureFailure),
    results,
  };
}
