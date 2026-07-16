/** Extract display text from a stored custom question entry. */
export function customQuestionText(entry) {
  if (entry == null) return '';
  if (typeof entry === 'string') return entry.trim();
  if (typeof entry === 'object') {
    return String(entry.text || entry.question || entry.label || '').trim();
  }
  const text = String(entry).trim();
  return text === '[object Object]' ? '' : text;
}

function getStructuredJobQuestions(job) {
  const list = parseCustomQuestionsList(job?.customQuestions);
  return list
    .map((entry) => {
      if (typeof entry === 'string') {
        const text = entry.trim();
        return text ? { id: null, text } : null;
      }
      if (entry && typeof entry === 'object') {
        const text = customQuestionText(entry);
        return text ? { id: entry.id || null, text } : null;
      }
      return null;
    })
    .filter(Boolean);
}

function parseCustomQuestionsList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [trimmed];
    } catch {
      return [trimmed];
    }
  }
  return [];
}

/** Parse custom apply questions from a job record into question strings. */
export function parseJobCustomQuestions(job) {
  return getStructuredJobQuestions(job).map((q) => q.text);
}

/** Normalize custom questions for database storage (structured JSON array). */
export function normalizeCustomQuestions(value) {
  if (!value) return '[]';

  const list = parseCustomQuestionsList(value);

  const cleaned = list
    .map((q) => {
      if (q == null) return null;
      if (typeof q === 'string') {
        const text = q.trim();
        return text ? { text, type: 'descriptive', options: [] } : null;
      }
      if (typeof q === 'object') {
        const text = String(q.text || q.question || '').trim();
        if (!text) return null;
        const allowed = ['yes_no', 'mcq', 'descriptive'];
        const type = allowed.includes(q.type) ? q.type : 'descriptive';
        const options = Array.isArray(q.options)
          ? q.options.map((o) => String(o ?? '').trim()).filter(Boolean)
          : [];
        if (type === 'mcq' && options.length < 2) return null;
        return {
          id: q.id || undefined,
          text,
          type,
          options: type === 'yes_no' ? ['Yes', 'No'] : type === 'mcq' ? options : [],
        };
      }
      return null;
    })
    .filter(Boolean);

  return JSON.stringify(cleaned);
}
