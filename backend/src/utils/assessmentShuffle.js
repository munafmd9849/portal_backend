/**
 * Per-student question/option shuffle for assessments.
 * Stored on session.secureModeMeta so resume keeps the same order.
 */

function seededRandom(seed) {
  let s = 0;
  const str = String(seed || '');
  for (let i = 0; i < str.length; i += 1) s = (s * 31 + str.charCodeAt(i)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function shuffleInPlace(arr, rand) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function parseAssessmentConfig(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

/**
 * Build shuffle plan for a new session.
 * @returns {{ questionOrder?: string[], optionOrders?: Record<string, number[]> } | null}
 */
export function buildShufflePlan({ assessmentConfig, questions, sessionId, studentId }) {
  const cfg = parseAssessmentConfig(assessmentConfig);
  const shuffleQuestions = cfg.shuffleQuestions === true || cfg.randomizeQuestions === true;
  const shuffleOptions = cfg.shuffleOptions === true || cfg.randomizeOptions === true;
  if (!shuffleQuestions && !shuffleOptions) return null;

  const rand = seededRandom(`${sessionId || ''}:${studentId || ''}:${Date.now()}`);
  const plan = {};

  const list = Array.isArray(questions) ? questions : [];
  if (shuffleQuestions && list.length > 1) {
    plan.questionOrder = shuffleInPlace(list.map((q) => q.id), rand);
  }

  if (shuffleOptions) {
    const optionOrders = {};
    for (const q of list) {
      if (q.type !== 'MCQ') continue;
      let opts = q.options;
      if (typeof opts === 'string') {
        try {
          opts = JSON.parse(opts);
        } catch {
          opts = [];
        }
      }
      if (!Array.isArray(opts) || opts.length < 2) continue;
      const indices = opts.map((_, i) => i);
      optionOrders[q.id] = shuffleInPlace(indices, rand);
    }
    if (Object.keys(optionOrders).length) plan.optionOrders = optionOrders;
  }

  return Object.keys(plan).length ? plan : null;
}

export function applyQuestionOrder(questions, questionOrder) {
  if (!Array.isArray(questions) || !Array.isArray(questionOrder) || !questionOrder.length) {
    return questions;
  }
  const byId = new Map(questions.map((q) => [q.id, q]));
  const ordered = [];
  for (const id of questionOrder) {
    if (byId.has(id)) {
      ordered.push(byId.get(id));
      byId.delete(id);
    }
  }
  for (const q of byId.values()) ordered.push(q);
  return ordered;
}
