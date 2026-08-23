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
  if (explicit === 'rapidapi' || explicit === 'selfhosted') return explicit;
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

function fromB64(value) {
  if (value == null || value === '') return '';
  const raw = String(value).trim();
  // Already plain text (local runners / some error paths)
  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(raw) || raw.length < 8) return raw;
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    // Heuristic: if decode looks like binary garbage, keep original
    if (decoded.includes('\u0000')) return raw;
    return decoded;
  } catch {
    return raw;
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

  return {
    output: stdout,
    error,
    executionTime,
    judge0: {
      status: result?.status?.description,
      statusId: result?.status?.id,
      memory: result?.memory,
      token: result?.token,
    },
  };
}

export function isJudge0Enabled() {
  if (!envBool('JUDGE0_ENABLED', false)) return false;
  return Boolean(getConfig());
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
  const cpuTimeLimit = Number(process.env.JUDGE0_CPU_TIME_LIMIT || options.cpuTimeLimit || 2);
  const memoryLimit = Number(process.env.JUDGE0_MEMORY_LIMIT || options.memoryLimit || 128000);
  const wallTimeLimit = Number(process.env.JUDGE0_WALL_TIME_LIMIT || options.wallTimeLimit || 5);

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
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: config.headers,
      body: JSON.stringify(body),
    });
  } catch (err) {
    return {
      output: '',
      error: `Judge0 request failed: ${err.message}`,
      executionTime: Date.now() - start,
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
