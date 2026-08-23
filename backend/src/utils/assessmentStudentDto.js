import prisma from '../config/database.js';
import { resolveStudentAssignmentScope } from './studentAssignmentScope.js';
import {
  parseTestCasesRaw,
  splitPublicAndHidden,
  serializeTestCasesForStorage,
} from '../coding-engine/testCaseStorage.js';
import { parseExamplesRaw, serializeExamplesForStorage } from '../coding-engine/testCaseStorage.js';
import { parseStarterCodesByLang } from '../coding-engine/starterCodeStorage.js';
import { parseJudgeLimits } from '../coding-engine/judgeLimits.js';
import { sanitizeResultsForStudent } from '../coding-engine/studentResults.js';

const STUDENT_QUESTION_OMIT = new Set([
  'correctAnswer',
  'explanation',
]);

/**
 * Verify the student has an assignment row matching their scope.
 */
export async function studentIsAssignedToAssessment(student, assessmentId) {
  if (!student?.id || !assessmentId) return false;
  const { assignmentMatch } = await resolveStudentAssignmentScope(student);
  const row = await prisma.assessmentAssignment.findFirst({
    where: {
      assessmentId,
      OR: assignmentMatch,
    },
    select: { id: true },
  });
  return Boolean(row);
}

function publicTestCasesOnly(raw) {
  const { publicCases } = splitPublicAndHidden(raw);
  return serializeTestCasesForStorage(publicCases);
}

function sanitizeQuestionForStudent(question, { revealAnswers = false } = {}) {
  if (!question) return question;
  const out = { ...question };
  if (!revealAnswers) {
    for (const key of STUDENT_QUESTION_OMIT) {
      delete out[key];
    }
  }
  if (out.testCases != null) {
    out.testCases = publicTestCasesOnly(out.testCases);
  }
  if (out.examples != null) {
    out.examples = serializeExamplesForStorage(parseExamplesRaw(out.examples));
  }
  if (out.type === 'CODING') {
    const judge = parseJudgeLimits(out);
    out.constraints = judge.constraintsText;
    out.timeLimitSec = judge.timeLimitSec;
    out.memoryLimitMb = judge.memoryLimitMb;
    if (out.starterCode != null && !out.starterCodes) {
      out.starterCodes = out.starterCode;
    }
  }
  return out;
}

export function sanitizeAssessmentForStudent(assessment, { revealAnswers = false } = {}) {
  if (!assessment) return assessment;
  const { questions, ...rest } = assessment;
  return {
    ...rest,
    questions: Array.isArray(questions)
      ? questions.map((q) => sanitizeQuestionForStudent(q, { revealAnswers }))
      : questions,
  };
}

/** Redact hidden test details from coding evaluation results for student-facing storage/API. */
export function redactHiddenEvaluationResults(results = []) {
  const sanitized = sanitizeResultsForStudent(results);
  const hiddenTotal = sanitized.filter((r) => r.hidden).length;
  const hiddenPassed = sanitized.filter((r) => r.hidden && r.passed).length;
  return {
    results: sanitized,
    hiddenTestsPassed: hiddenPassed,
    hiddenTestsTotal: hiddenTotal,
  };
}

function sanitizeExecutionLog(log) {
  if (!log || typeof log !== 'object') return log;
  const list = log.logs || log.results || [];
  const { results, hiddenTestsPassed, hiddenTestsTotal } = redactHiddenEvaluationResults(list);
  return {
    ...log,
    logs: results,
    results,
    hiddenTestsPassed: log.hiddenTestsPassed ?? hiddenTestsPassed,
    hiddenTestsTotal: log.hiddenTestsTotal ?? hiddenTestsTotal,
  };
}

function sanitizeStoredCodingAnswer(answer) {
  if (answer == null) return answer;
  const wasString = typeof answer === 'string';
  let obj = answer;
  if (wasString) {
    try {
      obj = JSON.parse(answer);
    } catch {
      return answer;
    }
  }
  if (!obj || typeof obj !== 'object') return answer;
  const list = obj.evaluation?.results || obj.evaluation?.logs;
  if (!Array.isArray(list)) return answer;
  const sanitized = sanitizeResultsForStudent(list);
  const next = {
    ...obj,
    evaluation: {
      ...obj.evaluation,
      results: sanitized,
      logs: sanitized,
    },
  };
  return wasString ? JSON.stringify(next) : next;
}

/** Strip hidden I/O from stored exam responses before they reach a student client. */
export function sanitizeSessionResponsesForStudent(raw) {
  if (raw == null || raw === '') return raw;
  const wasString = typeof raw === 'string';
  let parsed = raw;
  if (wasString) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return raw;

  const executionLogs =
    parsed.executionLogs && typeof parsed.executionLogs === 'object'
      ? Object.fromEntries(
          Object.entries(parsed.executionLogs).map(([id, log]) => [id, sanitizeExecutionLog(log)]),
        )
      : parsed.executionLogs;

  const rawAnswers =
    parsed.rawAnswers && typeof parsed.rawAnswers === 'object'
      ? Object.fromEntries(
          Object.entries(parsed.rawAnswers).map(([id, answer]) => [
            id,
            sanitizeStoredCodingAnswer(answer),
          ]),
        )
      : parsed.rawAnswers;

  const next = { ...parsed, executionLogs, rawAnswers };
  return wasString ? JSON.stringify(next) : next;
}

export { sanitizeQuestionForStudent };
