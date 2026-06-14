/** Parse custom apply questions stored as JSON array on jobs. */
export function parseJobCustomQuestions(job) {
  if (!job?.customQuestions) return [];
  if (Array.isArray(job.customQuestions)) {
    return job.customQuestions.map((q) => String(q).trim()).filter(Boolean);
  }
  if (typeof job.customQuestions === 'string') {
    try {
      const parsed = JSON.parse(job.customQuestions);
      return Array.isArray(parsed) ? parsed.map((q) => String(q).trim()).filter(Boolean) : [];
    } catch {
      return job.customQuestions.trim() ? [job.customQuestions.trim()] : [];
    }
  }
  return [];
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
