/** Question types for custom apply questions. */
export const CUSTOM_QUESTION_TYPES = {
  YES_NO: 'yes_no',
  MCQ: 'mcq',
  DESCRIPTIVE: 'descriptive',
};

export const CUSTOM_QUESTION_TYPE_LABELS = {
  [CUSTOM_QUESTION_TYPES.YES_NO]: 'Yes / No',
  [CUSTOM_QUESTION_TYPES.MCQ]: 'Multiple choice',
  [CUSTOM_QUESTION_TYPES.DESCRIPTIVE]: 'Short answer',
};

export function createEmptyCustomQuestion(type = CUSTOM_QUESTION_TYPES.YES_NO) {
  return {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    text: '',
    type,
    options: type === CUSTOM_QUESTION_TYPES.MCQ ? ['', ''] : [],
  };
}

function coerceQuestion(raw) {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const text = raw.trim();
    if (!text) return null;
    return {
      id: `legacy_${text.slice(0, 12)}`,
      text,
      type: CUSTOM_QUESTION_TYPES.DESCRIPTIVE,
      options: [],
    };
  }
  if (typeof raw === 'object') {
    const text = String(raw.text || raw.question || '').trim();
    if (!text) return null;
    const type = [CUSTOM_QUESTION_TYPES.YES_NO, CUSTOM_QUESTION_TYPES.MCQ, CUSTOM_QUESTION_TYPES.DESCRIPTIVE].includes(raw.type)
      ? raw.type
      : CUSTOM_QUESTION_TYPES.DESCRIPTIVE;
    const options = Array.isArray(raw.options)
      ? raw.options.map((o) => String(o ?? '').trim()).filter(Boolean)
      : [];
    return {
      id: raw.id || `q_${Math.random().toString(36).slice(2, 10)}`,
      text,
      type,
      options: type === CUSTOM_QUESTION_TYPES.MCQ ? (options.length ? options : ['Option 1', 'Option 2']) : [],
    };
  }
  return null;
}

/** Parse custom apply questions stored as JSON on jobs (strings or structured objects). */
export function parseJobCustomQuestions(job) {
  if (!job?.customQuestions) return [];
  let raw = job.customQuestions;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw || '[]');
    } catch {
      return raw.trim() ? [coerceQuestion(raw)].filter(Boolean) : [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw.map(coerceQuestion).filter(Boolean);
}

/** Plain text labels for legacy display helpers. */
export function getCustomQuestionTexts(job) {
  return parseJobCustomQuestions(job).map((q) => q.text);
}

/** Clean questions for API payload. */
export function serializeCustomQuestions(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((q) => {
      if (typeof q === 'string') {
        const text = q.trim();
        return text ? { text, type: CUSTOM_QUESTION_TYPES.DESCRIPTIVE, options: [] } : null;
      }
      const text = String(q?.text || '').trim();
      if (!text) return null;
      const type = [CUSTOM_QUESTION_TYPES.YES_NO, CUSTOM_QUESTION_TYPES.MCQ, CUSTOM_QUESTION_TYPES.DESCRIPTIVE].includes(q.type)
        ? q.type
        : CUSTOM_QUESTION_TYPES.DESCRIPTIVE;
      const options =
        type === CUSTOM_QUESTION_TYPES.MCQ
          ? (Array.isArray(q.options) ? q.options.map((o) => String(o ?? '').trim()).filter(Boolean) : [])
          : type === CUSTOM_QUESTION_TYPES.YES_NO
            ? ['Yes', 'No']
            : [];
      if (type === CUSTOM_QUESTION_TYPES.MCQ && options.length < 2) return null;
      return {
        id: q.id || undefined,
        text,
        type,
        options,
      };
    })
    .filter(Boolean);
}

/** Human-readable job creator label for admin/student views. */
export function getJobCreatorLabel(job) {
  const creator = job?.creator;
  if (creator) {
    return creator.displayName?.trim() || creator.email || null;
  }
  if (job?.createdByName) return job.createdByName;
  return null;
}
