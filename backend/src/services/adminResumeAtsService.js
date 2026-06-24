import prisma from '../config/database.js';
import { getAdminScopeFilter } from '../utils/adminScope.js';
import { analyzeATSResume } from './aiService.js';
import { extractResumeTextFromUrl, resolvePrimaryResume } from './resumeTextExtractor.js';

const BATCH_CONCURRENCY = 2;
const MAX_BATCH_SIZE = 20;
const isSqliteDb = () => (process.env.DATABASE_URL || '').toLowerCase().startsWith('file:');
const containsCI = (value) => (isSqliteDb() ? { contains: value } : { contains: value, mode: 'insensitive' });

function parseAnalysis(json) {
  if (!json) return null;
  try {
    return typeof json === 'string' ? JSON.parse(json) : json;
  } catch {
    return null;
  }
}

function buildStudentWhere(query = {}, user = null) {
  const where = {};
  if (query.school) where.school = containsCI(query.school);
  if (query.center) where.center = containsCI(query.center);
  if (query.batch) where.batch = containsCI(query.batch);
  if (query.search) {
    const s = query.search.trim();
    where.OR = [
      { fullName: containsCI(s) },
      { email: containsCI(s) },
      { enrollmentId: containsCI(s) },
    ];
  }

  if (user?.admin || user?.role) {
    const scope = getAdminScopeFilter(user.admin, user.role);
    if (scope.id === 'BLOCK_ALL') return { blocked: true, where: {} };
    Object.assign(where, scope);
  }

  return { blocked: false, where };
}

function mapRow(student) {
  const primary = resolvePrimaryResume(student);
  return {
    studentId: student.id,
    fullName: student.fullName,
    email: student.email,
    school: student.school,
    center: student.center,
    batch: student.batch,
    enrollmentId: student.enrollmentId,
    hasResume: Boolean(primary),
    resume: primary
      ? {
          resumeId: primary.resumeId,
          fileName: primary.fileName,
          fileUrl: primary.fileUrl,
          type: primary.type,
        }
      : null,
    atsScore: primary?.atsScore ?? null,
    atsScoredAt: primary?.atsScoredAt ?? null,
    analysis: parseAnalysis(primary?.atsAnalysisJson),
  };
}

async function persistAtsResult(studentId, primary, analysis) {
  const payload = {
    atsScore: analysis.atsScore,
    atsScoredAt: new Date(),
    atsAnalysisJson: JSON.stringify(analysis),
  };

  if (primary.type === 'file' && primary.resumeId) {
    await prisma.studentResumeFile.update({
      where: { id: primary.resumeId },
      data: payload,
    });
    return;
  }

  await prisma.student.update({
    where: { id: studentId },
    data: {
      primaryResumeAtsScore: payload.atsScore,
      primaryResumeAtsScoredAt: payload.atsScoredAt,
      primaryResumeAtsAnalysis: payload.atsAnalysisJson,
    },
  });
}

export async function scorePrimaryResumeForStudent(studentId, user = null) {
  const scope = buildStudentWhere({}, user);
  if (scope.blocked) return { blocked: true };

  const student = await prisma.student.findFirst({
    where: { id: studentId, ...scope.where },
    select: {
      id: true,
      resumeUrl: true,
      resumeFileName: true,
      primaryResumeAtsScore: true,
      primaryResumeAtsScoredAt: true,
      primaryResumeAtsAnalysis: true,
      resumeFiles: {
        orderBy: [{ isDefault: 'desc' }, { uploadedAt: 'desc' }],
        take: 5,
        select: {
          id: true,
          fileName: true,
          fileUrl: true,
          title: true,
          isDefault: true,
          atsScore: true,
          atsScoredAt: true,
          atsAnalysisJson: true,
        },
      },
    },
  });

  if (!student) return { error: 'Student not found or access denied' };

  const primary = resolvePrimaryResume(student);
  if (!primary?.fileUrl) return { error: 'No primary resume found for this student' };

  const resumeText = await extractResumeTextFromUrl(primary.fileUrl);
  const analysis = await analyzeATSResume(resumeText);
  const normalized = {
    atsScore: analysis.atsScore,
    missingKeywords: analysis.missingKeywords || [],
    missingSkills: analysis.missingSkills || [],
    grammarIssues: analysis.grammarIssues || [],
    formattingIssues: analysis.formattingIssues || [],
    clarityIssues: analysis.clarityIssues || [],
    improvementSuggestions: analysis.improvementSuggestions || [],
    strengths: analysis.strengths || [],
    overallFeedback: analysis.overallFeedback || '',
    isAI: analysis.isAI !== false,
  };

  await persistAtsResult(student.id, primary, normalized);

  return {
    studentId: student.id,
    atsScore: normalized.atsScore,
    atsScoredAt: new Date().toISOString(),
    analysis: normalized,
  };
}

export async function listStudentResumeAts(query = {}, user = null) {
  const { blocked, where } = buildStudentWhere(query, user);
  if (blocked) return { blocked: true };

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 25));
  const skip = (page - 1) * limit;

  const scoreFilter = (query.scoreFilter || '').toLowerCase();
  const hasResumeOnly = query.hasResume === 'true' || query.hasResume === true;

  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        school: true,
        center: true,
        batch: true,
        enrollmentId: true,
        resumeUrl: true,
        resumeFileName: true,
        primaryResumeAtsScore: true,
        primaryResumeAtsScoredAt: true,
        primaryResumeAtsAnalysis: true,
        resumeFiles: {
          orderBy: [{ isDefault: 'desc' }, { uploadedAt: 'desc' }],
          take: 3,
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            title: true,
            isDefault: true,
            atsScore: true,
            atsScoredAt: true,
            atsAnalysisJson: true,
          },
        },
      },
      orderBy: { fullName: 'asc' },
      skip,
      take: limit,
    }),
  ]);

  let rows = students.map(mapRow);

  if (hasResumeOnly) {
    rows = rows.filter((r) => r.hasResume);
  }
  if (scoreFilter === 'scored') {
    rows = rows.filter((r) => r.atsScore != null);
  } else if (scoreFilter === 'unscored') {
    rows = rows.filter((r) => r.hasResume && r.atsScore == null);
  } else if (scoreFilter === 'no_resume') {
    rows = rows.filter((r) => !r.hasResume);
  }
  if (query.minScore != null && query.minScore !== '') {
    const min = parseInt(query.minScore, 10);
    rows = rows.filter((r) => r.atsScore != null && r.atsScore >= min);
  }
  if (query.maxScore != null && query.maxScore !== '') {
    const max = parseInt(query.maxScore, 10);
    rows = rows.filter((r) => r.atsScore != null && r.atsScore <= max);
  }

  const withResume = rows.filter((r) => r.hasResume);
  const scored = rows.filter((r) => r.atsScore != null);
  const scores = scored.map((r) => r.atsScore);
  const avgScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;

  return {
    rows,
    pagination: { page, limit, total },
    summary: {
      totalStudents: total,
      withPrimaryResume: withResume.length,
      scored: scored.length,
      unscored: withResume.length - scored.length,
      noResume: rows.length - withResume.length,
      avgScore,
    },
  };
}

async function runPool(items, worker) {
  const results = [];
  let index = 0;

  async function next() {
    while (index < items.length) {
      const i = index++;
      try {
        results[i] = { ok: true, ...(await worker(items[i])) };
      } catch (err) {
        results[i] = { ok: false, studentId: items[i], error: err.message };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(BATCH_CONCURRENCY, items.length) }, () => next()),
  );
  return results;
}

export async function batchScorePrimaryResumes(body = {}, user = null) {
  const { blocked, where } = buildStudentWhere(body, user);
  if (blocked) return { blocked: true };

  const studentIds = Array.isArray(body.studentIds) ? body.studentIds : [];
  const limit = Math.min(MAX_BATCH_SIZE, parseInt(body.limit, 10) || MAX_BATCH_SIZE);

  let targets;
  if (studentIds.length) {
    targets = await prisma.student.findMany({
      where: { id: { in: studentIds.slice(0, limit) }, ...where },
      select: { id: true },
    });
  } else {
    const students = await prisma.student.findMany({
      where,
      select: {
        id: true,
        resumeUrl: true,
        resumeFileName: true,
        primaryResumeAtsScore: true,
        primaryResumeAtsScoredAt: true,
        primaryResumeAtsAnalysis: true,
        resumeFiles: {
          orderBy: [{ isDefault: 'desc' }, { uploadedAt: 'desc' }],
          take: 1,
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            title: true,
            isDefault: true,
            atsScore: true,
            atsScoredAt: true,
            atsAnalysisJson: true,
          },
        },
      },
      take: limit * 3,
    });

    targets = students
      .filter((s) => {
        const primary = resolvePrimaryResume(s);
        if (!primary?.fileUrl) return false;
        if (body.rescore !== true && body.rescore !== 'true' && primary.atsScore != null) return false;
        return true;
      })
      .slice(0, limit)
      .map((s) => ({ id: s.id }));
  }

  const results = await runPool(
    targets.map((t) => t.id),
    (id) => scorePrimaryResumeForStudent(id, user),
  );

  const succeeded = results.filter((r) => r.ok && !r.error && !r.blocked);
  const failed = results.filter((r) => !r.ok || r.error);

  return {
    processed: results.length,
    succeeded: succeeded.length,
    failed: failed.length,
    results,
  };
}
