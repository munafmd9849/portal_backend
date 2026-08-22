import prisma from '../config/database.js';
import { resolveStudentAssignmentScope } from './studentAssignmentScope.js';
import {
  parseTestCasesRaw,
  splitPublicAndHidden,
  serializeTestCasesForStorage,
} from '../coding-engine/testCaseStorage.js';
import { parseExamplesRaw, serializeExamplesForStorage } from '../coding-engine/testCaseStorage.js';
import { parseStarterCodesByLang } from '../coding-engine/starterCodeStorage.js';

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
  if (out.type === 'CODING' && out.starterCode != null && !out.starterCodes) {
    out.starterCodes = out.starterCode;
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
  const hiddenTotal = results.filter((r) => r.hidden).length;
  const hiddenPassed = results.filter((r) => r.hidden && r.passed).length;
  const publicResults = results
    .filter((r) => !r.hidden)
    .map(({ label, input, expectedOutput, actualOutput, passed, error, executionTime }) => ({
      label,
      input,
      expectedOutput,
      actualOutput,
      passed,
      error,
      executionTime,
      hidden: false,
    }));
  const hiddenSummary = results
    .filter((r) => r.hidden)
    .map(({ label, passed, error, executionTime }) => ({
      label,
      passed,
      error,
      executionTime,
      hidden: true,
    }));

  return {
    results: [...publicResults, ...hiddenSummary],
    hiddenTestsPassed: hiddenPassed,
    hiddenTestsTotal: hiddenTotal,
  };
}

export { sanitizeQuestionForStudent };
