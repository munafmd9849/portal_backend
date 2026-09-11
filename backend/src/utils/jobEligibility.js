/**
 * Shared job eligibility checks for listing and apply flows.
 */

export function parseJobYopYears(yop) {
  if (yop == null || yop === '') return [];
  const values = Array.isArray(yop) ? yop : String(yop).split(/[,;/|&]+|\band\b/i);
  const years = [];
  const seen = new Set();
  for (const raw of values) {
    const n = parseInt(String(raw).trim(), 10);
    if (Number.isNaN(n)) continue;
    const year = n < 100 ? 2000 + n : n;
    if (year < 1990 || year > 2100 || seen.has(year)) continue;
    seen.add(year);
    years.push(year);
  }
  return years.sort((a, b) => a - b);
}

export function serializeJobYopYears(years) {
  const parsed = parseJobYopYears(years);
  return parsed.length ? parsed.join(',') : null;
}

export function normalizeJobYop(yop) {
  if (yop == null || String(yop).trim() === '') return null;
  return serializeJobYopYears(yop);
}

export function formatJobYopDisplay(yop) {
  const years = parseJobYopYears(yop);
  return years.length ? years.join(', ') : '';
}

export function formatJobYopRequirement(yop) {
  const years = parseJobYopYears(yop);
  if (years.length === 0) return '';
  if (years.length === 1) return `up to ${years[0]}`;
  if (years.length === 2) return `${years[0]} or ${years[1]}`;
  return `${years.slice(0, -1).join(', ')}, or ${years[years.length - 1]}`;
}

function studentMeetsYopYears(jobYop, studentYop) {
  const years = parseJobYopYears(jobYop);
  if (years.length === 0 || studentYop == null) return true;
  // Legacy single year stays a cutoff so existing jobs do not change who can apply.
  if (years.length === 1) return studentYop <= years[0];
  return years.includes(studentYop);
}

function parseRequiredCgpa(minCgpa) {
  if (minCgpa == null || minCgpa === '') return null;
  const requirementStr = String(minCgpa).trim();
  if (requirementStr.endsWith('%')) {
    const percentage = parseFloat(requirementStr.slice(0, -1));
    return Number.isNaN(percentage) ? null : percentage / 10;
  }
  const parsed = parseFloat(requirementStr);
  return Number.isNaN(parsed) ? null : parsed;
}

function deriveStudentYop(batch) {
  if (!batch) return null;
  const parts = String(batch).split('-').map((part) => part.trim()).filter(Boolean);
  const endPart = parts.length > 1 ? parts[1] : parts[0];
  const endNum = endPart ? parseInt(endPart, 10) : NaN;
  if (Number.isNaN(endNum)) return null;
  return endNum < 100 ? 2000 + endNum : endNum;
}

function studentMeetsBacklogsRequirement(studentBacklogs, jobBacklogsRequirement) {
  if (jobBacklogsRequirement == null || jobBacklogsRequirement === '') return true;
  const requirementStr = String(jobBacklogsRequirement).trim().toLowerCase();
  const studentBacklogsNum = parseInt(studentBacklogs, 10) || 0;

  if (requirementStr === 'no' || requirementStr === '0' || requirementStr === 'none') {
    return studentBacklogsNum === 0;
  }
  if (requirementStr.includes('-')) {
    const [minStr, maxStr] = requirementStr.split('-').map((value) => value.trim());
    const minBacklogs = parseInt(minStr, 10) || 0;
    const maxBacklogs = parseInt(maxStr, 10) || 0;
    return studentBacklogsNum >= minBacklogs && studentBacklogsNum <= maxBacklogs;
  }
  const maxAllowed = parseInt(requirementStr, 10) || 0;
  return studentBacklogsNum <= maxAllowed;
}

export function studentHasCompleteProfile(student = {}) {
  return Boolean(
    student.school && student.center && student.batch
    && student.fullName && student.email,
  );
}

export function studentMeetsJobEligibility(student = {}, job = {}) {
  if (!studentHasCompleteProfile(student)) return false;

  if (job.yop) {
    const studentYop = deriveStudentYop(student.batch);
    if (!studentMeetsYopYears(job.yop, studentYop)) {
      return false;
    }
  }

  if (job.minCgpa) {
    const requiredCgpa = parseRequiredCgpa(job.minCgpa);
    const studentCgpa = student.cgpa != null ? parseFloat(String(student.cgpa)) : null;
    if (studentCgpa == null || Number.isNaN(studentCgpa)) return false;
    if (requiredCgpa != null && studentCgpa < requiredCgpa) return false;
  }

  if (job.backlogs != null && job.backlogs !== '') {
    const studentBacklogs = student.backlogs != null ? String(student.backlogs).trim() : '';
    if (!studentBacklogs) return false;
    if (!studentMeetsBacklogsRequirement(student.backlogs, job.backlogs)) return false;
  }

  return true;
}

/**
 * Authoritative apply-time validation. Returns null if eligible, or an HTTP-ready error payload.
 */
export function validateStudentEligibilityForApply(student = {}, job = {}) {
  if (!studentHasCompleteProfile(student)) {
    return {
      status: 403,
      body: {
        error: 'Profile incomplete',
        message: 'Complete your profile (name, email, school, center, batch) before applying.',
      },
    };
  }

  if (job.yop) {
    const years = parseJobYopYears(job.yop);
    const studentYop = deriveStudentYop(student.batch);
    if (years.length > 0 && !studentMeetsYopYears(job.yop, studentYop)) {
      const requirementLabel = formatJobYopRequirement(job.yop);
      return {
        status: 400,
        body: {
          error: 'YOP requirement not met',
          message: years.length === 1
            ? `This job is open for students passing out in ${years[0]} or earlier.`
            : `This job is open for students passing out in ${requirementLabel}.`,
          requirement: years.length === 1 ? years[0] : years,
          yourYearOfPassing: studentYop,
        },
      };
    }
  }

  if (job.minCgpa) {
    const requirementStr = String(job.minCgpa).trim();
    const requiredCgpa = parseRequiredCgpa(job.minCgpa);
    const studentCgpa = student.cgpa != null ? parseFloat(String(student.cgpa)) : null;

    if (studentCgpa == null || Number.isNaN(studentCgpa)) {
      return {
        status: 400,
        body: {
          error: 'CGPA requirement check failed',
          message: 'Your CGPA is not set in your profile. Please update your profile with your current CGPA to apply for this job.',
          requirement: `This job requires a minimum CGPA of ${job.minCgpa}`,
        },
      };
    }

    if (requiredCgpa != null && studentCgpa < requiredCgpa) {
      const requirementDisplay = requirementStr.endsWith('%')
        ? `${requirementStr} (${requiredCgpa.toFixed(2)} CGPA)`
        : requiredCgpa.toFixed(2);
      return {
        status: 400,
        body: {
          error: 'CGPA requirement not met',
          message: `Your current CGPA (${studentCgpa.toFixed(2)}) does not meet the minimum requirement for this job.`,
          requirement: `This job requires a minimum CGPA of ${requirementDisplay}`,
          yourCgpa: studentCgpa.toFixed(2),
          requiredCgpa: requirementDisplay,
        },
      };
    }
  }

  if (job.backlogs) {
    const jobBacklogsRequirement = String(job.backlogs).trim().toLowerCase();
    const studentBacklogs = student.backlogs != null ? String(student.backlogs).trim() : '';

    if (!studentBacklogs) {
      return {
        status: 400,
        body: {
          error: 'Backlogs requirement check failed',
          message: 'Your backlogs count is not set in your profile. Please update your profile with your current backlogs count to apply for this job.',
          requirement: `This job allows: ${jobBacklogsRequirement}`,
        },
      };
    }

    if (!studentMeetsBacklogsRequirement(student.backlogs, job.backlogs)) {
      return {
        status: 400,
        body: {
          error: 'Backlogs requirement not met',
          message: `Your current backlogs count (${studentBacklogs}) does not meet the requirement for this job.`,
          requirement: `This job allows: ${jobBacklogsRequirement}`,
          yourBacklogs: studentBacklogs,
          allowedBacklogs: jobBacklogsRequirement,
        },
      };
    }
  }

  return null;
}

export { parseRequiredCgpa, deriveStudentYop, studentMeetsBacklogsRequirement };
