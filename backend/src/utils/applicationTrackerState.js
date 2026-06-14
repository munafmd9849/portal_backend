/**
 * Student Application Tracker — single source of truth for primary status + timeline.
 * Primary status: exactly ONE active workflow position.
 * Timeline: historical milestones only (no conflicting current states).
 */

function normalizeScreeningStatus(value) {
  return (value || 'APPLIED').toUpperCase();
}

function normalizeInterviewStatus(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed.toUpperCase() : null;
}

function getFinalStatus({ status, screeningStatus, interviewStatus }) {
  const interview = normalizeInterviewStatus(interviewStatus);
  const screening = normalizeScreeningStatus(screeningStatus);
  const normalizedStatus = status ? String(status).toUpperCase() : null;

  if (normalizedStatus === 'JOINED' || interview === 'JOINED') return 'JOINED';
  if (normalizedStatus === 'ACCEPTED' || interview === 'ACCEPTED') return 'ACCEPTED';
  if (normalizedStatus === 'OFFER_DECLINED' || interview === 'OFFER_DECLINED') return 'OFFER_DECLINED';
  if (normalizedStatus === 'OFFERED' || interview === 'OFFERED') return 'OFFERED';

  if (interview === 'SELECTED') return 'SELECTED';
  if (interview && interview.startsWith('REJECTED_IN_ROUND_')) return 'REJECTED';

  if (['RESUME_REJECTED', 'SCREENING_REJECTED', 'TEST_REJECTED'].includes(screening)) {
    return 'REJECTED';
  }

  if (normalizedStatus === 'WITHDRAWN') return 'WITHDRAWN';
  if (normalizedStatus === 'REVOKED_BY_ADMIN') return 'REVOKED';
  if (normalizedStatus === 'SELECTED') return 'SELECTED';
  if (normalizedStatus === 'REJECTED') return 'REJECTED';

  return 'ONGOING';
}

const REJECTED_SCREENING_STATUSES = ['RESUME_REJECTED', 'SCREENING_REJECTED', 'TEST_REJECTED'];

export function jobRequiresPreInterviewGate(job = {}) {
  return Boolean(job.requiresScreening) || Boolean(job.requiresTest);
}

/** Initial screeningStatus when a student applies. */
export function getInitialScreeningStatusForJob(job = {}) {
  return jobRequiresPreInterviewGate(job) ? 'APPLIED' : 'INTERVIEW_ELIGIBLE';
}

/** Prisma where fragment for applications eligible for interview round 1. */
export function buildInterviewEligibleApplicationWhere(jobId, job = {}) {
  const where = { jobId };
  if (jobRequiresPreInterviewGate(job)) {
    where.screeningStatus = { in: ['INTERVIEW_ELIGIBLE', 'TEST_SELECTED'] };
  } else {
    where.status = { not: 'WITHDRAWN' };
    where.NOT = {
      OR: [
        { screeningStatus: { in: REJECTED_SCREENING_STATUSES } },
        { status: { in: ['REJECTED', 'REVOKED_BY_ADMIN'] } },
      ],
    };
  }
  return where;
}

function screeningPhaseComplete(screening, requiresScreening = true, requiresTest = false) {
  if (!requiresScreening && !requiresTest) {
    const normalized = normalizeScreeningStatus(screening);
    return !REJECTED_SCREENING_STATUSES.includes(normalized);
  }
  return ['RESUME_SELECTED', 'SCREENING_SELECTED', 'TEST_SELECTED', 'INTERVIEW_ELIGIBLE'].includes(screening);
}

function interviewEligible(screening, requiresScreening = true, requiresTest = false) {
  const normalized = normalizeScreeningStatus(screening);
  if (!requiresScreening && !requiresTest) {
    return !REJECTED_SCREENING_STATUSES.includes(normalized);
  }
  return normalized === 'TEST_SELECTED' || normalized === 'INTERVIEW_ELIGIBLE';
}

function variantForPrimary(code) {
  if (code === 'SELECTED' || code === 'JOINED' || code === 'ACCEPTED') return 'success';
  if (code === 'REJECTED' || String(code).startsWith('REJECTED_') || code === 'OFFER_DECLINED') return 'danger';
  if (code === 'OFFERED') return 'info';
  if (String(code).includes('QUALIFIED') || code === 'SCREENING_COMPLETED' || code === 'INTERVIEW_SCHEDULED') {
    return 'info';
  }
  if (code === 'UNDER_REVIEW') return 'warning';
  return 'neutral';
}

/**
 * @param {object} input
 * @returns {{ primaryStatus: object, timeline: array, details: object }}
 */
export function buildApplicationTrackerState(input = {}) {
  const {
    status,
    screeningStatus,
    interviewStatus,
    lastRoundReached = 0,
    appliedDate,
    updatedAt,
    interviewDate,
    screeningRemarks,
    screeningCompletedAt,
    requiresScreening = false,
    requiresTest = false,
    session = null,
    evaluations = [],
  } = input;

  const screening = normalizeScreeningStatus(screeningStatus);
  const interview = normalizeInterviewStatus(interviewStatus);
  const noPreInterviewGate = !requiresScreening && !requiresTest;
  const finalStatus = getFinalStatus({ status, screeningStatus: screening, interviewStatus: interview });
  const sessionRounds = Array.isArray(session?.rounds) ? [...session.rounds].sort((a, b) => a.roundNumber - b.roundNumber) : [];

  const evaluationByRound = new Map();
  (evaluations || []).forEach((ev) => {
    const num = ev.round?.roundNumber ?? ev.roundNumber;
    if (num != null) evaluationByRound.set(num, ev);
  });

  let highestQualifiedRound = 0;
  let rejectedRoundNumber = null;

  if (interview && interview.startsWith('REJECTED_IN_ROUND_')) {
    const n = parseInt(interview.replace('REJECTED_IN_ROUND_', ''), 10);
    if (!Number.isNaN(n)) rejectedRoundNumber = n;
  }

  sessionRounds.forEach((round) => {
    const ev = evaluationByRound.get(round.roundNumber);
    if (ev?.status === 'SELECTED') {
      highestQualifiedRound = Math.max(highestQualifiedRound, round.roundNumber);
    }
    if (ev?.status === 'REJECTED' && rejectedRoundNumber == null) {
      rejectedRoundNumber = round.roundNumber;
    }
  });

  if (rejectedRoundNumber == null && typeof lastRoundReached === 'number' && finalStatus === 'REJECTED') {
    // fallback when interviewStatus string missing but rejection recorded
    if (interview && interview.startsWith('REJECTED_IN_ROUND_')) {
      rejectedRoundNumber = parseInt(interview.replace('REJECTED_IN_ROUND_', ''), 10);
    }
  }

  const activeRound = sessionRounds.find((r) => r.status === 'ACTIVE');
  const hasSession = Boolean(session);
  const interviewStarted = sessionRounds.some((r) => r.status === 'ACTIVE' || r.status === 'ENDED')
    || highestQualifiedRound > 0
    || rejectedRoundNumber != null
    || (lastRoundReached || 0) > 0;

  const timeline = [];

  const addStep = (id, label, stepStatus, detail = null, date = null) => {
    timeline.push({ id, label, status: stepStatus, detail, date });
  };

  // --- Build timeline (history + at most one "current") ---
  addStep('applied', 'Applied', 'completed', null, appliedDate);

  const screeningRejected = ['RESUME_REJECTED', 'SCREENING_REJECTED', 'TEST_REJECTED'].includes(screening);
  const pastApplied = screening !== 'APPLIED' || screeningRejected || finalStatus !== 'ONGOING';

  if (pastApplied || finalStatus !== 'ONGOING') {
    addStep('under_review', 'Under Review', screening === 'APPLIED' && !screeningRejected ? 'current' : 'completed');
  }

  if (noPreInterviewGate) {
    if (!screeningRejected && (screening === 'APPLIED' || screening === 'INTERVIEW_ELIGIBLE')) {
      addStep('interview_ready', 'Ready for Interview', interviewEligible(screening, requiresScreening, requiresTest) ? 'completed' : 'current');
    }
  } else if (screening === 'RESUME_REJECTED') {
    addStep('resume_screening', 'Resume Screening Rejected', 'rejected', screeningRemarks || null);
  } else if (screening !== 'APPLIED') {
    addStep('resume_screening', 'Resume Screening Passed', 'completed');
  } else if (!screeningRejected) {
    addStep('resume_screening', 'Resume Screening', 'pending');
  }

  if (requiresScreening) {
    if (screening === 'SCREENING_REJECTED') {
      addStep('recruiter_screening', 'Recruiter Screening Rejected', 'rejected', screeningRemarks || null);
    } else if (['SCREENING_SELECTED', 'TEST_SELECTED', 'INTERVIEW_ELIGIBLE', 'TEST_REJECTED'].includes(screening)) {
      addStep('recruiter_screening', 'Recruiter Screening Passed', 'completed');
    } else if (!screeningRejected && screening !== 'APPLIED') {
      addStep('recruiter_screening', 'Recruiter Screening Passed', 'completed');
    } else if (!screeningRejected) {
      addStep('recruiter_screening', 'Recruiter Screening', 'pending');
    }
  }

  if (requiresTest) {
    if (screening === 'TEST_REJECTED') {
      addStep('qa_test', 'QA Test Rejected', 'rejected', screeningRemarks || null);
    } else if (interviewEligible(screening, requiresScreening, requiresTest)) {
      addStep('qa_test', 'QA Test Passed', 'completed');
    } else if (!screeningRejected && ['SCREENING_SELECTED', 'RESUME_SELECTED'].includes(screening)) {
      addStep('qa_test', 'QA Test', 'current');
    } else if (!screeningRejected) {
      addStep('qa_test', 'QA Test', 'pending');
    }
  }

  if (screeningPhaseComplete(screening, requiresScreening, requiresTest) && !screeningRejected) {
    addStep('screening_completed', noPreInterviewGate ? 'Application Verified' : 'Screening Completed', 'completed', null, screeningCompletedAt);
  }

  const showInterviewSteps = interviewEligible(screening, requiresScreening, requiresTest) && !screeningRejected
    && (finalStatus === 'ONGOING' || finalStatus === 'SELECTED' || rejectedRoundNumber != null);

  const isTerminal = ['SELECTED', 'REJECTED', 'WITHDRAWN', 'REVOKED', 'JOINED', 'OFFER_DECLINED'].includes(finalStatus);

  if (showInterviewSteps && hasSession) {
    if (interviewStarted || interviewDate) {
      addStep(
        'interview_scheduled',
        'Interview Scheduled',
        'completed',
        null,
        interviewDate || session?.startedAt || null,
      );
    }

    let roundFlowStopped = false;
    sessionRounds.forEach((round) => {
      if (roundFlowStopped) return;

      const ev = evaluationByRound.get(round.roundNumber);
      const roundQualifiedLabel = `Round ${round.roundNumber} Qualified`;
      const roundRejectedLabel = `Round ${round.roundNumber} Rejected`;

      if (ev?.status === 'SELECTED') {
        addStep(
          `round_${round.roundNumber}_qualified`,
          roundQualifiedLabel,
          'completed',
          ev.remarks || null,
          ev.createdAt || ev.evaluatedAt,
        );
        return;
      }
      if (ev?.status === 'REJECTED') {
        addStep(
          `round_${round.roundNumber}_rejected`,
          roundRejectedLabel,
          'rejected',
          ev.remarks || screeningRemarks || null,
          ev.createdAt || ev.evaluatedAt,
        );
        roundFlowStopped = true;
        return;
      }
      if (round.status === 'ACTIVE' && finalStatus === 'ONGOING') {
        addStep(`round_${round.roundNumber}_progress`, `Round ${round.roundNumber} In Progress`, 'current');
        return;
      }
      if (round.roundNumber <= highestQualifiedRound) {
        addStep(`round_${round.roundNumber}_qualified`, roundQualifiedLabel, 'completed');
        return;
      }
      if (!isTerminal) {
        addStep(`round_${round.roundNumber}_pending`, `Round ${round.roundNumber}`, 'pending');
      }
    });
  }

  if (finalStatus === 'SELECTED') {
    addStep('selected', 'Selected', 'completed');
  }

  if (['OFFERED', 'ACCEPTED', 'JOINED'].includes(finalStatus)) {
    addStep('offer_extended', 'Offer Extended', finalStatus === 'OFFERED' ? 'current' : 'completed');
  }
  if (['ACCEPTED', 'JOINED'].includes(finalStatus)) {
    addStep('offer_accepted', 'Offer Accepted', finalStatus === 'ACCEPTED' ? 'current' : 'completed');
  }
  if (finalStatus === 'JOINED') {
    addStep('joined', 'Joined Company', 'completed');
  }
  if (finalStatus === 'OFFER_DECLINED') {
    addStep('offer_declined', 'Offer Declined', 'rejected');
  }

  // Terminal outcomes: timeline is history-only — no current/pending/future steps
  if (isTerminal) {
    let trimmed = timeline.filter((step) => step.status !== 'pending' && step.status !== 'current');

    if (finalStatus === 'REJECTED') {
      let lastRejectedIdx = -1;
      trimmed.forEach((step, idx) => {
        if (step.status === 'rejected') lastRejectedIdx = idx;
      });
      if (lastRejectedIdx >= 0) {
        trimmed = trimmed.slice(0, lastRejectedIdx + 1);
      }
    }

    if (finalStatus === 'SELECTED') {
      const selectedIdx = trimmed.findIndex((step) => step.id === 'selected');
      if (selectedIdx >= 0) {
        trimmed = trimmed.slice(0, selectedIdx + 1);
      }
    }

    timeline.length = 0;
    trimmed.forEach((step) => timeline.push(step));
  } else {
    // Ensure at most one "current" step — keep the last current marker
    const currentIndices = timeline
      .map((step, idx) => (step.status === 'current' ? idx : -1))
      .filter((idx) => idx >= 0);
    if (currentIndices.length > 1) {
      const keep = currentIndices[currentIndices.length - 1];
      timeline.forEach((step, idx) => {
        if (step.status === 'current' && idx !== keep) step.status = 'completed';
      });
    }
  }

  // --- Primary status (exactly one) ---
  let primaryLabel = 'Applied';
  let primaryCode = 'APPLIED';

  if (finalStatus === 'SELECTED') {
    primaryLabel = 'Selected';
    primaryCode = 'SELECTED';
  } else if (finalStatus === 'OFFERED') {
    primaryLabel = 'Offer Extended';
    primaryCode = 'OFFERED';
  } else if (finalStatus === 'ACCEPTED') {
    primaryLabel = 'Offer Accepted';
    primaryCode = 'ACCEPTED';
  } else if (finalStatus === 'JOINED') {
    primaryLabel = 'Joined';
    primaryCode = 'JOINED';
  } else if (finalStatus === 'OFFER_DECLINED') {
    primaryLabel = 'Offer Declined';
    primaryCode = 'OFFER_DECLINED';
  } else if (finalStatus === 'REJECTED') {
    primaryLabel = 'Rejected';
    primaryCode = 'REJECTED';
  } else if (finalStatus === 'WITHDRAWN') {
    primaryLabel = 'Withdrawn';
    primaryCode = 'WITHDRAWN';
  } else if (finalStatus === 'REVOKED') {
    primaryLabel = 'Revoked by Admin';
    primaryCode = 'REVOKED_BY_ADMIN';
  } else if (highestQualifiedRound > 0) {
    primaryLabel = `Round ${highestQualifiedRound} Qualified`;
    primaryCode = `ROUND_${highestQualifiedRound}_QUALIFIED`;
  } else if (interviewEligible(screening, requiresScreening, requiresTest) && hasSession && (interviewStarted || interviewDate)) {
    primaryLabel = 'Interview Scheduled';
    primaryCode = 'INTERVIEW_SCHEDULED';
  } else if (noPreInterviewGate && interviewEligible(screening, requiresScreening, requiresTest)) {
    primaryLabel = 'Ready for Interview';
    primaryCode = 'INTERVIEW_READY';
  } else if (screeningPhaseComplete(screening, requiresScreening, requiresTest)) {
    primaryLabel = 'Screening Completed';
    primaryCode = 'SCREENING_COMPLETED';
  } else if (screening === 'APPLIED') {
    primaryLabel = 'Under Review';
    primaryCode = 'UNDER_REVIEW';
  } else if (['RESUME_SELECTED', 'SCREENING_SELECTED'].includes(screening)) {
    primaryLabel = 'Screening Completed';
    primaryCode = 'SCREENING_COMPLETED';
  }

  const details = {
    appliedDate: appliedDate || null,
    updatedAt: updatedAt || null,
    interviewDate: interviewDate || null,
    finalStatus,
    rejectedIn: finalStatus === 'REJECTED'
      ? (rejectedRoundNumber != null ? `Round ${rejectedRoundNumber}` : (screening === 'TEST_REJECTED' ? 'Test' : 'Screening'))
      : null,
    rejectionReason: screeningRemarks || null,
    resumeScreening: screening === 'RESUME_REJECTED'
      ? 'Rejected'
      : screening !== 'APPLIED'
        ? 'Passed'
        : 'Pending',
    recruiterScreening: !requiresScreening
      ? 'Not Required'
      : screening === 'SCREENING_REJECTED'
        ? 'Rejected'
        : ['SCREENING_SELECTED', 'TEST_SELECTED', 'INTERVIEW_ELIGIBLE'].includes(screening)
          ? 'Passed'
          : 'Pending',
    qaTest: !requiresTest
      ? 'Not Required'
      : screening === 'TEST_REJECTED'
        ? 'Rejected'
        : interviewEligible(screening, requiresScreening, requiresTest)
          ? 'Passed'
          : 'Pending',
    interviewEligible: isTerminal ? false : interviewEligible(screening, requiresScreening, requiresTest),
    activeRound: !isTerminal && activeRound
      ? { roundNumber: activeRound.roundNumber, name: activeRound.name, status: activeRound.status }
      : null,
    highestQualifiedRound: !isTerminal && highestQualifiedRound ? highestQualifiedRound : null,
    finalOutcome: isTerminal ? primaryLabel : null,
    placementStatus: finalStatus === 'JOINED'
      ? 'Joined'
      : finalStatus === 'SELECTED' || finalStatus === 'ACCEPTED' || finalStatus === 'OFFERED'
        ? 'Selected'
        : finalStatus === 'REJECTED' || finalStatus === 'OFFER_DECLINED'
          ? 'Not Selected'
          : 'In Process',
  };

  return {
    primaryStatus: {
      label: primaryLabel,
      code: primaryCode,
      variant: variantForPrimary(primaryCode),
      final: isTerminal,
    },
    timeline,
    details,
    // Backward-compatible alias used elsewhere in admin/student views
    currentStage: primaryLabel,
  };
}

export { getFinalStatus, normalizeScreeningStatus, normalizeInterviewStatus };
