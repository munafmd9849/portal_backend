/**
 * Configurable placement policy checks (env-driven policy engine).
 */

import prisma from '../config/database.js';

const ACTIVE_PLACEMENT_STATUSES = ['OFFERED', 'ACCEPTED', 'JOINED'];
const DREAM_TIERS = new Set(['DREAM', 'SUPER_DREAM']);

export function getPlacementPolicyConfig() {
  return {
    maxActiveOffers: parseInt(process.env.PLACEMENT_MAX_ACTIVE_OFFERS || '1', 10),
    requireEmailVerified: process.env.REQUIRE_EMAIL_VERIFIED !== 'false',
    blockApplyWhenPlaced: process.env.PLACEMENT_BLOCK_WHEN_JOINED !== 'false',
    blockDualDreamOffers: process.env.PLACEMENT_BLOCK_DUAL_DREAM !== 'false',
    minCompletedMocks: parseInt(process.env.PLACEMENT_MIN_MOCKS || '0', 10),
    minCompletedAssessments: parseInt(process.env.PLACEMENT_MIN_ASSESSMENTS || '0', 10),
    superDreamRequiresMinCgpa: parseFloat(process.env.PLACEMENT_SUPER_DREAM_MIN_CGPA || '8'),
  };
}

function parseStudentCgpa(student) {
  const raw = student?.cgpa ?? student?.currentCgpa ?? student?.profile?.cgpa;
  const n = parseFloat(raw);
  return Number.isNaN(n) ? null : n;
}

export async function validatePlacementPolicyForApply(studentId, userId, job = null) {
  const config = getPlacementPolicyConfig();

  if (config.requireEmailVerified && userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true, lastLoginAt: true },
    });
    if (!user?.emailVerified && !user?.lastLoginAt) {
      return {
        status: 403,
        body: {
          error: 'Email not verified',
          message: 'Verify your email before applying to placement drives.',
        },
      };
    }
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      cgpa: true,
      assessmentSessions: { where: { status: 'COMPLETED' }, select: { id: true } },
      mockInterviewSlots: { where: { status: 'COMPLETED' }, select: { id: true } },
    },
  });

  if (config.minCompletedMocks > 0) {
    const mockCount = student?.mockInterviewSlots?.length || 0;
    if (mockCount < config.minCompletedMocks) {
      return {
        status: 403,
        body: {
          error: 'Mock interviews required',
          message: `Complete at least ${config.minCompletedMocks} mock interview(s) before applying.`,
        },
      };
    }
  }

  if (config.minCompletedAssessments > 0) {
    const assessmentCount = student?.assessmentSessions?.length || 0;
    if (assessmentCount < config.minCompletedAssessments) {
      return {
        status: 403,
        body: {
          error: 'Assessments required',
          message: `Complete at least ${config.minCompletedAssessments} assessment(s) before applying.`,
        },
      };
    }
  }

  const tier = String(job?.companyTier || 'REGULAR').toUpperCase();
  if (tier === 'SUPER_DREAM') {
    const cgpa = parseStudentCgpa(student);
    if (cgpa != null && cgpa < config.superDreamRequiresMinCgpa) {
      return {
        status: 403,
        body: {
          error: 'Super-dream CGPA requirement',
          message: `Super-dream companies require minimum CGPA ${config.superDreamRequiresMinCgpa}.`,
        },
      };
    }
  }

  if (config.blockApplyWhenPlaced) {
    const joined = await prisma.application.count({
      where: { studentId, status: 'JOINED' },
    });
    if (joined > 0) {
      return {
        status: 403,
        body: {
          error: 'Already placed',
          message: 'You have already joined a company and cannot apply to new drives.',
        },
      };
    }
  }

  if (config.maxActiveOffers > 0) {
    const activeOffers = await prisma.application.count({
      where: {
        studentId,
        status: { in: ACTIVE_PLACEMENT_STATUSES },
      },
    });
    if (activeOffers >= config.maxActiveOffers) {
      return {
        status: 403,
        body: {
          error: 'Offer limit reached',
          message: `You already have ${activeOffers} active offer(s). Campus policy allows ${config.maxActiveOffers} at a time.`,
        },
      };
    }
  }

  if (config.blockDualDreamOffers && job && DREAM_TIERS.has(tier)) {
    const existingDream = await prisma.application.count({
      where: {
        studentId,
        status: { in: ['OFFERED', 'ACCEPTED', 'JOINED'] },
        job: { companyTier: { in: ['DREAM', 'SUPER_DREAM'] } },
      },
    });
    if (existingDream > 0) {
      return {
        status: 403,
        body: {
          error: 'Dream company limit',
          message: 'Campus policy allows only one active dream/super-dream offer at a time.',
        },
      };
    }
  }

  return null;
}

export async function validatePlacementPolicyForOffer(studentId, jobId, applicationId = null) {
  const config = getPlacementPolicyConfig();
  if (!config.blockDualDreamOffers) return null;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { companyTier: true },
  });
  const tier = String(job?.companyTier || 'REGULAR').toUpperCase();
  if (!DREAM_TIERS.has(tier)) return null;

  const where = {
    studentId,
    status: { in: ['OFFERED', 'ACCEPTED', 'JOINED'] },
    job: { companyTier: { in: ['DREAM', 'SUPER_DREAM'] }, id: { not: jobId } },
  };
  if (applicationId) where.id = { not: applicationId };

  const conflict = await prisma.application.findFirst({ where });

  if (conflict) {
    return {
      status: 409,
      body: {
        error: 'Dream offer conflict',
        message: 'Student already has an active dream-tier offer on another drive.',
      },
    };
  }

  return null;
}
