/**
 * Assessment session scores: store/display as 0–100 percent.
 * Legacy rows may have raw points earned — only treat as points when the value
 * cannot be a percent (greater than 100).
 */

function parseSessionResponses(raw) {
  if (raw == null || raw === '') return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

export function totalQuestionPoints(questions = []) {
  return questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);
}

export function pointsToPercent(pointsEarned, questions = []) {
  const max = totalQuestionPoints(questions);
  if (max <= 0) return 0;
  const earned = Number(pointsEarned) || 0;
  return Math.round((earned / max) * 100);
}

/**
 * @param {number|null} stored - DB score (percent 0–100, or legacy points)
 * @param {Array} questions
 * @param {string|object|null} responsesRaw - session.responses JSON
 */
export function normalizeStoredScore(stored, questions = [], responsesRaw = null) {
  const parsed = parseSessionResponses(responsesRaw);
  const maxFromQuestions = totalQuestionPoints(questions);
  const maxFromResponses = Number(parsed.maxPoints) || 0;
  const max = maxFromQuestions || maxFromResponses;
  const earned = parsed.pointsEarned;

  if (earned != null && Number.isFinite(Number(earned)) && max > 0) {
    return Math.round((Number(earned) / max) * 100);
  }

  const raw = Number(stored);
  if (!Number.isFinite(raw)) return 0;

  // Current contract: score is 0–100 percent.
  // Legacy: raw point totals that cannot be a percent (> 100).
  if (raw > 100 && max > 0) {
    return Math.min(100, Math.round((raw / max) * 100));
  }
  return Math.min(100, Math.max(0, Math.round(raw)));
}

export function withNormalizedScore(session) {
  if (!session) return session;
  const questions = session.assessment?.questions || [];
  const parsed = parseSessionResponses(session.responses);
  const maxPoints = totalQuestionPoints(questions) || Number(parsed.maxPoints) || 0;
  const percent = normalizeStoredScore(session.score, questions, session.responses);
  const pointsEarned =
    parsed.pointsEarned != null && Number.isFinite(Number(parsed.pointsEarned))
      ? Number(parsed.pointsEarned)
      : maxPoints
        ? Math.round((percent / 100) * maxPoints)
        : null;
  return {
    ...session,
    score: percent,
    scorePercent: percent,
    pointsEarned,
    maxPoints,
  };
}
