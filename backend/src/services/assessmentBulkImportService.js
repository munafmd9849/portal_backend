/**
 * Bulk assessment question import — validate, preview, commit, rollback, history.
 */

import prisma from '../config/database.js';
import { serializeJudgeLimits } from '../coding-engine/judgeLimits.js';

const QUESTION_TYPES = new Set([
  'MCQ',
  'CODING',
  'DESCRIPTIVE',
  'SQL',
  'CASE_STUDY',
  'PROGRAMMING_CHALLENGE',
  'SUBJECTIVE',
]);

function normalizeType(raw) {
  const t = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
  if (t === 'SUBJECTIVE' || t === 'ESSAY') return 'DESCRIPTIVE';
  if (t === 'PROGRAMMING' || t === 'CODE') return 'CODING';
  if (t === 'CASE' || t === 'CASESTUDY') return 'CASE_STUDY';
  return QUESTION_TYPES.has(t) ? t : null;
}

function parseJsonSafe(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function rowFingerprint(row) {
  return [
    normalizeType(row.type),
    String(row.questionText || row.title || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' '),
  ].join('::');
}

/**
 * Validate normalized question rows (already mapped from Excel/CSV).
 * @returns {{ valid: object[], errors: object[], duplicates: object[] }}
 */
export function validateQuestionRows(rows = [], { existingFingerprints = new Set() } = {}) {
  const valid = [];
  const errors = [];
  const duplicates = [];
  const seen = new Set(existingFingerprints);

  rows.forEach((raw, index) => {
    const rowNum = index + 2; // header + 1-based
    const type = normalizeType(raw.type || raw.Type);
    const questionText = String(raw.questionText || raw.title || raw.Question || '').trim();
    const points = Number(raw.points ?? raw.marks ?? raw.Points ?? 1);
    const issues = [];

    if (!type) issues.push('Invalid or missing question type');
    if (!questionText) issues.push('Question title/text is required');
    if (!Number.isFinite(points) || points <= 0) issues.push('Marks/points must be a positive number');

    let options = raw.options;
    if (typeof options === 'string') {
      try {
        options = JSON.parse(options);
      } catch {
        options = null;
      }
    }

    if (type === 'MCQ') {
      const opts =
        Array.isArray(options) && options.length
          ? options
          : [raw.optionA, raw.optionB, raw.optionC, raw.optionD].filter((x) => String(x || '').trim());
      if (opts.length < 2) issues.push('MCQ requires at least 2 options');
      const correct = String(raw.correctAnswer || raw.Correct || '').trim();
      if (!correct) issues.push('MCQ requires a correct answer');
      options = opts;
    }

    if ((type === 'CODING' || type === 'PROGRAMMING_CHALLENGE' || type === 'SQL') && !raw.description && !raw.Description) {
      // soft warning only — still valid
    }

    const fingerprint = rowFingerprint({ type, questionText });
    if (seen.has(fingerprint)) {
      duplicates.push({ row: rowNum, fingerprint, questionText, type });
      issues.push('Duplicate question detected');
    }

    if (issues.length) {
      errors.push({ row: rowNum, issues, questionText, type });
      return;
    }

    seen.add(fingerprint);
    valid.push({
      type: type === 'SUBJECTIVE' ? 'DESCRIPTIVE' : type,
      questionText,
      description: raw.description || raw.Description || null,
      options: type === 'MCQ' ? JSON.stringify(options) : null,
      correctAnswer: raw.correctAnswer || raw.Correct || null,
      points,
      difficulty: String(raw.difficulty || raw.Difficulty || 'MEDIUM').toUpperCase(),
      starterCode: raw.starterCode || null,
      constraints:
        type === 'CODING' || type === 'PROGRAMMING_CHALLENGE'
          ? serializeJudgeLimits({
              constraintsText: raw.constraints || raw.Constraints || '',
              timeLimitSec: raw.timeLimitSec || raw.time,
              memoryLimitMb: raw.memoryLimitMb,
            })
          : raw.constraints || raw.Constraints || null,
      testCases: raw.testCases
        ? typeof raw.testCases === 'string'
          ? raw.testCases
          : JSON.stringify(raw.testCases)
        : null,
      examples: raw.examples
        ? typeof raw.examples === 'string'
          ? raw.examples
          : JSON.stringify(raw.examples)
        : null,
      explanation: raw.explanation || null,
      hints: raw.hints
        ? typeof raw.hints === 'string'
          ? raw.hints
          : JSON.stringify(raw.hints)
        : null,
      tags: raw.tags
        ? typeof raw.tags === 'string'
          ? raw.tags
          : JSON.stringify(raw.tags)
        : null,
      topic: raw.topic || null,
      category: raw.category || raw.assessmentCategory || null,
      timeLimitSec: raw.timeLimitSec || raw.time ? Number(raw.timeLimitSec || raw.time) || null : null,
      language: raw.language || raw.programmingLanguage || null,
      fingerprint,
      sourceRow: rowNum,
    });
  });

  return { valid, errors, duplicates };
}

export async function createImportBatch({
  assessmentId,
  uploadedById,
  fileName,
  fileType,
  rows,
}) {
  let existingFingerprints = new Set();
  if (assessmentId) {
    const existing = await prisma.assessmentQuestion.findMany({
      where: { assessmentId },
      select: { questionText: true, type: true },
    });
    existingFingerprints = new Set(
      existing.map((q) => rowFingerprint({ type: q.type, questionText: q.questionText }))
    );
  }

  const { valid, errors, duplicates } = validateQuestionRows(rows, { existingFingerprints });

  const batch = await prisma.assessmentImportBatch.create({
    data: {
      assessmentId: assessmentId || null,
      uploadedById,
      fileName: fileName || 'upload.xlsx',
      fileType: fileType || 'xlsx',
      status: errors.length && !valid.length ? 'FAILED' : 'PREVIEW',
      totalRows: rows.length,
      successCount: valid.length,
      errorCount: errors.length,
      duplicateCount: duplicates.length,
      previewData: JSON.stringify(valid),
      errorReport: JSON.stringify({ errors, duplicates }),
    },
  });

  return {
    batch: serializeBatch(batch),
    preview: valid,
    errors,
    duplicates,
  };
}

function serializeBatch(batch) {
  if (!batch) return null;
  return {
    ...batch,
    previewData: parseJsonSafe(batch.previewData, []),
    errorReport: parseJsonSafe(batch.errorReport, {}),
    importedIds: parseJsonSafe(batch.importedIds, []),
    summary: parseJsonSafe(batch.summary, null),
  };
}

export async function getImportBatch(id) {
  const batch = await prisma.assessmentImportBatch.findUnique({ where: { id } });
  return serializeBatch(batch);
}

export async function listImportHistory({ assessmentId, uploadedById, limit = 20 } = {}) {
  const where = {};
  if (assessmentId) where.assessmentId = assessmentId;
  if (uploadedById) where.uploadedById = uploadedById;
  const rows = await prisma.assessmentImportBatch.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(Number(limit) || 20, 100),
  });
  return rows.map(serializeBatch);
}

/**
 * Commit previewed rows into an assessment. Supports partial import (skip error rows).
 */
export async function commitImport(batchId, { assessmentId, partial = true, userId } = {}) {
  const batch = await prisma.assessmentImportBatch.findUnique({ where: { id: batchId } });
  if (!batch) {
    const err = new Error('Import batch not found');
    err.status = 404;
    throw err;
  }
  if (!['PREVIEW', 'PARTIAL', 'FAILED'].includes(batch.status) && batch.status !== 'COMPLETED') {
    // allow re-entry from PREVIEW primarily
  }

  const targetAssessmentId = assessmentId || batch.assessmentId;
  if (!targetAssessmentId) {
    const err = new Error('assessmentId is required to commit import');
    err.status = 400;
    throw err;
  }

  const assessment = await prisma.assessment.findUnique({ where: { id: targetAssessmentId } });
  if (!assessment) {
    const err = new Error('Assessment not found');
    err.status = 404;
    throw err;
  }

  const preview = parseJsonSafe(batch.previewData, []);
  if (!preview.length) {
    const err = new Error('No valid rows to import');
    err.status = 400;
    throw err;
  }

  await prisma.assessmentImportBatch.update({
    where: { id: batchId },
    data: { status: 'IMPORTING', assessmentId: targetAssessmentId },
  });

  const maxOrder = await prisma.assessmentQuestion.aggregate({
    where: { assessmentId: targetAssessmentId },
    _max: { order: true },
  });
  let order = (maxOrder._max.order || 0) + 1;

  const createdIds = [];
  const commitErrors = [];

  try {
    for (const row of preview) {
      try {
        const created = await prisma.assessmentQuestion.create({
          data: {
            assessmentId: targetAssessmentId,
            questionText: row.questionText,
            description: row.description,
            type: row.type,
            options: row.options,
            correctAnswer: row.correctAnswer,
            points: row.points || 1,
            order: order++,
            difficulty: row.difficulty || 'MEDIUM',
            starterCode: row.starterCode,
            constraints: row.constraints,
            testCases: row.testCases,
            examples: row.examples,
            explanation: row.explanation,
            hints: row.hints,
            tags: row.tags,
            topic: row.topic,
            category: row.category,
            timeLimitSec: row.timeLimitSec,
            language: row.language,
          },
        });
        createdIds.push(created.id);
      } catch (e) {
        commitErrors.push({ questionText: row.questionText, error: e.message });
        if (!partial) throw e;
      }
    }

    const status =
      commitErrors.length === 0
        ? 'COMPLETED'
        : createdIds.length
          ? 'PARTIAL'
          : 'FAILED';

    const updated = await prisma.assessmentImportBatch.update({
      where: { id: batchId },
      data: {
        status,
        successCount: createdIds.length,
        errorCount: (parseJsonSafe(batch.errorReport, {}).errors?.length || 0) + commitErrors.length,
        importedIds: JSON.stringify(createdIds),
        summary: JSON.stringify({
          imported: createdIds.length,
          commitErrors,
          assessmentId: targetAssessmentId,
          committedBy: userId || null,
        }),
        completedAt: new Date(),
      },
    });

    return serializeBatch(updated);
  } catch (error) {
    // Rollback created questions on hard failure
    if (createdIds.length) {
      await prisma.assessmentQuestion.deleteMany({ where: { id: { in: createdIds } } });
    }
    await prisma.assessmentImportBatch.update({
      where: { id: batchId },
      data: {
        status: 'FAILED',
        errorReport: JSON.stringify({
          ...parseJsonSafe(batch.errorReport, {}),
          fatal: error.message,
        }),
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

export async function rollbackImport(batchId) {
  const batch = await prisma.assessmentImportBatch.findUnique({ where: { id: batchId } });
  if (!batch) {
    const err = new Error('Import batch not found');
    err.status = 404;
    throw err;
  }
  const ids = parseJsonSafe(batch.importedIds, []);
  if (!ids.length) {
    const err = new Error('Nothing to rollback');
    err.status = 400;
    throw err;
  }
  await prisma.assessmentQuestion.deleteMany({ where: { id: { in: ids } } });
  const updated = await prisma.assessmentImportBatch.update({
    where: { id: batchId },
    data: {
      status: 'ROLLED_BACK',
      summary: JSON.stringify({
        ...parseJsonSafe(batch.summary, {}),
        rolledBackAt: new Date().toISOString(),
        rolledBackCount: ids.length,
      }),
    },
  });
  return serializeBatch(updated);
}
