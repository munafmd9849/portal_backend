function customQuestionText(entry) {
  if (entry == null) return '';
  if (typeof entry === 'string') return entry.trim();
  if (typeof entry === 'object') {
    return String(entry.question || entry.label || entry.text || '').trim();
  }
  const text = String(entry).trim();
  return text === '[object Object]' ? '' : text;
}

/** Parse custom apply questions stored as JSON array on jobs. */
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

/** Human-readable job creator label for admin/student views. */
export function getJobCreatorLabel(job) {
  const creator = job?.creator;
  if (creator) {
    return creator.displayName?.trim() || creator.email || null;
  }
  if (job?.createdByName) return job.createdByName;
  return null;
}
