import prisma from '../config/database.js';
import { runCode, evaluateTestCases } from '../coding-engine/index.js';
import { sanitizeCode, sanitizeInput } from '../coding-engine/sanitize.js';
import { splitPublicAndHidden } from '../coding-engine/testCaseStorage.js';
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
    checkHeartbeat: true,
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

    const { language, code, input } = req.body || {};
    if (!code) return res.status(400).json({ error: 'code is required' });

    sanitizeCode(code);
    sanitizeInput(input);

    const result = await runCode({ language, code, input });
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

    const { language, code, testCases, questionId } = req.body || {};
    if (!code) return res.status(400).json({ error: 'code is required' });

    sanitizeCode(code);

    let casesToRun = testCases;
    if (questionId && !resolved.skip) {
      const question = await prisma.assessmentQuestion.findFirst({
        where: {
          id: String(questionId),
          assessmentId: resolved.assessment.id,
        },
        select: { testCases: true },
      });
      if (!question) {
        return res.status(404).json({ error: 'Question not found for this assessment' });
      }
      const { publicCases } = splitPublicAndHidden(question.testCases);
      casesToRun = publicCases;
    }

    const evaluation = await evaluateTestCases(
      { language, code, testCases: casesToRun },
      { redactHidden: true },
    );
    res.json(evaluation);
  } catch (err) {
    res.status(400).json({
      passed: 0,
      total: 0,
      results: [],
      error: err.message || 'Evaluation failed',
    });
  }
}
