/** Extract display text from a stored custom question entry. */
export function customQuestionText(entry) {
  if (entry == null) return '';
  if (typeof entry === 'string') return entry.trim();
  if (typeof entry === 'object') {
    return String(entry.question || entry.label || entry.text || '').trim();
  }
  const text = String(entry).trim();
  return text === '[object Object]' ? '' : text;
}

/** Parse custom apply questions from a job record into question strings. */
export function parseJobCustomQuestions(job) {
  const raw = job?.customQuestions;
  if (!raw) return [];

  let list = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      list = Array.isArray(parsed) ? parsed : [trimmed];
    } catch {
      list = [trimmed];
    }
  }

  return list.map(customQuestionText).filter(Boolean);
}

/** Normalize custom questions for database storage (string array JSON). */
export function normalizeCustomQuestions(value) {
  if (!value) return '[]';

  let list = [];
  if (Array.isArray(value)) {
    list = value;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '[]';
    try {
      const parsed = JSON.parse(trimmed);
      list = Array.isArray(parsed) ? parsed : [trimmed];
    } catch {
      list = [trimmed];
    }
  }

  const cleaned = list.map(customQuestionText).filter(Boolean);
  return JSON.stringify(cleaned);
}
