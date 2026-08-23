import prisma from '../config/database.js';
import { runCode, evaluateTestCases } from '../coding-engine/index.js';
import { sanitizeCode, sanitizeInput } from '../coding-engine/sanitize.js';
import { parseJudgeLimits } from '../coding-engine/judgeLimits.js';
import { splitPublicAndHidden } from '../coding-engine/testCaseStorage.js';
import {
  JUDGE_MODE,
  normalizeJudgeMode,
  overallVerdict,
  sanitizeResultsForStudent,
} from '../coding-engine/studentResults.js';
import {
  resolveActiveExamSession,
  getClientDeviceIdFromRequest,
} from '../utils/assertActiveExamSession.js';

const runBuckets = new Map();

function rateLimitKey(userId) {
  const now = Date.now();
  const windowMs = 10_000;
  const maxRuns = 8;
  let bucket = runBuckets.get(userId);
  if (!bucket || now - bucket.start > windowMs) {
    bucket = { start: now, count: 0 };
    runBuckets.set(userId, bucket);
  }
  bucket.count += 1;
  if (bucket.count > maxRuns) {
    return false;
  }
  return true;
}

async function loadQuestionJudgeLimits(questionId) {
  if (!questionId) return {};
  const question = await prisma.assessmentQuestion.findFirst({
    where: { id: String(questionId) },
    select: { timeLimitSec: true, constraints: true },
  });
  if (!question) return {};
  const cfg = parseJudgeLimits(question);
  return {
    timeoutMs: cfg.timeoutMs,
    cpuTimeLimit: cfg.timeLimitSec,
    memoryLimit: cfg.memoryLimitKb,
    wallTimeLimit: cfg.wallTimeLimitSec,
  };
}

async function assertExamCodeSession(req) {
  const { sessionId } = req.body || {};
  const role = req.user?.role;
  if (!sessionId) {
    if (role === 'STUDENT') {
      return { ok: false, status: 400, body: { error: 'sessionId is required for exam code execution' } };
    }
    return { ok: true, skip: true };
  }
  return resolveActiveExamSession(prisma, {
    sessionId,
    userId: req.userId || req.user?.id,
    clientDeviceId: getClientDeviceIdFromRequest(req),
    requireUnpaused: true,
    requireNotExpired: true,
    checkHeartbeat: false,
    bindDevice: true,
  });
}

export async function runCodeHandler(req, res) {
  try {
    if (!rateLimitKey(req.user?.id || req.ip)) {
      return res.status(429).json({ error: 'Too many run requests. Please wait.' });
    }

    const resolved = await assertExamCodeSession(req);
    if (!resolved.ok) {
      return res.status(resolved.status).json(resolved.body);
    }

    const { language, code, input, questionId } = req.body || {};
    if (!code) return res.status(400).json({ error: 'code is required' });

    sanitizeCode(code);
    sanitizeInput(input);

    const limits = await loadQuestionJudgeLimits(questionId);
    const result = await runCode({ language, code, input }, limits);
    res.json(result);
  } catch (err) {
    res.status(400).json({ output: '', error: err.message || 'Execution failed', executionTime: 0 });
  }
}

export async function evaluateCodeHandler(req, res) {
  try {
    if (!rateLimitKey(req.user?.id || req.ip)) {
      return res.status(429).json({ error: 'Too many evaluation requests. Please wait.' });
    }

    const resolved = await assertExamCodeSession(req);
    if (!resolved.ok) {
      return res.status(resolved.status).json(resolved.body);
    }

    const { language, code, testCases, questionId, mode: rawMode } = req.body || {};
    if (!code) return res.status(400).json({ error: 'code is required' });

    sanitizeCode(code);

    const mode = normalizeJudgeMode(rawMode);
    const isSubmit = mode === JUDGE_MODE.SUBMIT;

    if (!resolved.skip && !questionId) {
      return res.status(400).json({ error: 'questionId is required for exam evaluation' });
    }

    let casesToRun = testCases;
    let judgeQuestion = null;
    if (questionId) {
      judgeQuestion = await prisma.assessmentQuestion.findFirst({
        where: resolved.skip
          ? { id: String(questionId) }
          : { id: String(questionId), assessmentId: resolved.assessment.id },
        select: { testCases: true, timeLimitSec: true, constraints: true },
      });
      if (!resolved.skip) {
        if (!judgeQuestion) {
          return res.status(404).json({ error: 'Question not found for this assessment' });
        }
        const { all, publicCases } = splitPublicAndHidden(judgeQuestion.testCases);
        // Run Tests never executes hidden cases. Submit runs the full suite.
        casesToRun = isSubmit ? all : publicCases;
      } else if (judgeQuestion && (!Array.isArray(testCases) || testCases.length === 0)) {
        const { all, publicCases } = splitPublicAndHidden(judgeQuestion.testCases);
        casesToRun = isSubmit ? all : publicCases;
      }
    }

    const limits = parseJudgeLimits(judgeQuestion || {});
    const evaluation = await evaluateTestCases(
      { language, code, testCases: casesToRun },
      {
        scope: isSubmit ? 'all' : 'public',
        redactHidden: isSubmit,
        timeoutMs: limits.timeoutMs,
        cpuTimeLimit: limits.timeLimitSec,
        memoryLimit: limits.memoryLimitKb,
        wallTimeLimit: limits.wallTimeLimitSec,
      },
    );

    const results = resolved.skip
      ? evaluation.results || []
      : sanitizeResultsForStudent(evaluation.results || []);

    const publicResults = results.filter((r) => !r.hidden);
    const hiddenResults = results.filter((r) => r.hidden);

    res.json({
      ...evaluation,
      mode,
      verdict: overallVerdict(results),
      results,
      publicPassed: publicResults.filter((r) => r.passed).length,
      publicTotal: publicResults.length,
      hiddenTestsPassed: hiddenResults.filter((r) => r.passed).length,
      hiddenTestsTotal: hiddenResults.length,
    });
  } catch (err) {
    res.status(400).json({
      passed: 0,
      total: 0,
      results: [],
      error: err.message || 'Evaluation failed',
    });
  }
}
