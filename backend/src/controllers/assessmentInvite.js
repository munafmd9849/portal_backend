/**
 * Shareable assessment invite links with email allowlist (no OTP).
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import { generateAccessToken, generateRefreshToken } from '../middleware/auth.js';
import { adminCanAccessAssessmentById } from '../utils/adminResourceScope.js';
import { getAssessmentEntryStatus } from '../utils/assessmentEntryWindow.js';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseEmailsInput(raw) {
  if (Array.isArray(raw)) {
    return raw.map((e) => normalizeEmail(e)).filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw
      .split(/[\n,;]+/)
      .map((e) => normalizeEmail(e))
      .filter(Boolean);
  }
  return [];
}

function newInviteToken() {
  return crypto.randomBytes(24).toString('hex');
}

async function loadAssessmentByInviteToken(token) {
  if (!token) return null;
  return prisma.assessment.findFirst({
    where: { inviteToken: String(token), inviteEnabled: true },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      duration: true,
      startTime: true,
      endTime: true,
      instructions: true,
      status: true,
      config: true,
      inviteEnabled: true,
      inviteToken: true,
    },
  });
}

/**
 * Ensure a Student exists for invite email (reuse portal student if email matches).
 */
async function ensureInviteStudent({ email, fullName }) {
  const existingStudent = await prisma.student.findUnique({
    where: { email },
    include: { user: true },
  });
  if (existingStudent) {
    if (existingStudent.user?.status === 'BLOCKED') {
      const err = new Error('This account is blocked');
      err.status = 403;
      err.code = 'BLOCKED';
      throw err;
    }
    if (fullName && fullName.trim() && existingStudent.fullName?.startsWith('Invite Candidate')) {
      await prisma.student.update({
        where: { id: existingStudent.id },
        data: { fullName: fullName.trim().slice(0, 120) },
      });
    }
    return existingStudent;
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { student: true },
  });
  if (existingUser?.student) return existingUser.student;
  if (existingUser && existingUser.role !== 'STUDENT') {
    const err = new Error('This email belongs to a non-student account');
    err.status = 403;
    err.code = 'NOT_STUDENT_EMAIL';
    throw err;
  }

  if (existingUser && !existingUser.student) {
    return prisma.student.create({
      data: {
        userId: existingUser.id,
        fullName: ((fullName && fullName.trim()) || email.split('@')[0] || 'Candidate').slice(0, 120),
        email,
        phone: '0000000000',
        batch: 'INVITE',
        center: 'EXTERNAL',
        school: 'EXTERNAL',
        profileCompleted: false,
      },
    });
  }

  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
  const name = (fullName && fullName.trim()) || email.split('@')[0] || 'Candidate';

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'STUDENT',
      status: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      displayName: name.slice(0, 120),
      student: {
        create: {
          fullName: name.slice(0, 120),
          email,
          phone: '0000000000',
          batch: 'INVITE',
          center: 'EXTERNAL',
          school: 'EXTERNAL',
          profileCompleted: false,
        },
      },
    },
    include: { student: true },
  });

  return user.student;
}

async function ensureInviteAssignment(assessmentId, studentId) {
  const existing = await prisma.assessmentAssignment.findFirst({
    where: { assessmentId, studentId },
  });
  if (existing) return existing;
  return prisma.assessmentAssignment.create({
    data: { assessmentId, studentId },
  });
}

/** Public: assessment meta for invite landing page (no questions). */
export async function getInviteAssessment(req, res) {
  try {
    const { token } = req.params;
    const assessment = await loadAssessmentByInviteToken(token);
    if (!assessment) {
      return res.status(404).json({ error: 'Invite link is invalid or disabled' });
    }
    if (assessment.status === 'DRAFT') {
      return res.status(403).json({ error: 'This assessment is not published yet', code: 'DRAFT' });
    }

    const entry = getAssessmentEntryStatus(assessment);
    res.json({
      title: assessment.title,
      description: assessment.description,
      type: assessment.type,
      duration: assessment.duration,
      instructions: assessment.instructions,
      startTime: assessment.startTime,
      endTime: assessment.endTime,
      entryStatus: entry.status,
      entryOpensAt: entry.entryOpensAt,
      entryClosesAt: entry.entryClosesAt,
      requiresEmailAllowlist: true,
    });
  } catch (error) {
    console.error('getInviteAssessment error:', error);
    res.status(500).json({ error: 'Failed to load invite' });
  }
}

/** Public: allowlisted email → issue student JWT for this assessment (no OTP). */
export async function claimInviteAccess(req, res) {
  try {
    const { token } = req.params;
    const email = normalizeEmail(req.body?.email);
    const fullName = req.body?.fullName ? String(req.body.fullName).trim().slice(0, 120) : null;

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const assessment = await loadAssessmentByInviteToken(token);
    if (!assessment) {
      return res.status(404).json({ error: 'Invite link is invalid or disabled' });
    }
    if (assessment.status === 'DRAFT') {
      return res.status(403).json({ error: 'This assessment is not published yet', code: 'DRAFT' });
    }

    const entry = getAssessmentEntryStatus(assessment);
    if (entry.status === 'TOO_EARLY') {
      return res.status(403).json({
        error: 'Assessment entry has not opened yet',
        code: 'TOO_EARLY',
        entryOpensAt: entry.entryOpensAt,
      });
    }
    if (entry.status === 'TOO_LATE') {
      return res.status(403).json({
        error: 'Assessment entry window has closed',
        code: 'TOO_LATE',
      });
    }

    const inviteRow = await prisma.assessmentInviteEmail.findUnique({
      where: {
        assessmentId_email: { assessmentId: assessment.id, email },
      },
    });
    if (!inviteRow) {
      return res.status(403).json({
        error: 'This email is not invited to this assessment',
        code: 'EMAIL_NOT_ALLOWED',
      });
    }

    const student = await ensureInviteStudent({
      email,
      fullName: fullName || inviteRow.fullName,
    });
    await ensureInviteAssignment(assessment.id, student.id);

    await prisma.assessmentInviteEmail.update({
      where: { id: inviteRow.id },
      data: {
        studentId: student.id,
        status: inviteRow.status === 'COMPLETED' ? 'COMPLETED' : 'STARTED',
        fullName: fullName || inviteRow.fullName,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: student.userId },
      include: { student: true },
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user.id);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt },
    });

    res.json({
      success: true,
      assessmentId: assessment.id,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName || student.fullName,
      },
    });
  } catch (error) {
    console.error('claimInviteAccess error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Failed to claim invite', code: error.code });
  }
}

/** Admin: get invite settings + allowlist. */
export async function getAssessmentInvite(req, res) {
  try {
    const { id } = req.params;
    const role = req.user?.role;
    if (role === 'ADMIN') {
      const allowed = await adminCanAccessAssessmentById(id, req.user.admin, role);
      if (!allowed) return res.status(403).json({ error: 'Assessment not in your scope' });
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        inviteEnabled: true,
        inviteToken: true,
        status: true,
        inviteEmails: {
          orderBy: { email: 'asc' },
          select: {
            id: true,
            email: true,
            fullName: true,
            status: true,
            studentId: true,
            createdAt: true,
          },
        },
      },
    });
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    res.json({
      ...assessment,
      invitePath: assessment.inviteToken ? `/invite/${assessment.inviteToken}` : null,
      inviteEmailCount: assessment.inviteEmails.length,
    });
  } catch (error) {
    console.error('getAssessmentInvite error:', error);
    res.status(500).json({ error: 'Failed to load invite settings' });
  }
}

/** Admin: enable/disable invite + replace allowlist emails. */
export async function updateAssessmentInvite(req, res) {
  try {
    const { id } = req.params;
    const role = req.user?.role;
    if (role === 'ADMIN') {
      const allowed = await adminCanAccessAssessmentById(id, req.user.admin, role);
      if (!allowed) return res.status(403).json({ error: 'Assessment not in your scope' });
    }

    const assessment = await prisma.assessment.findUnique({ where: { id } });
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    const enabled =
      req.body?.enabled === undefined ? assessment.inviteEnabled : Boolean(req.body.enabled);
    const regenerateToken = req.body?.regenerateToken === true;
    const emailsProvided = req.body?.emails !== undefined;
    const emails = emailsProvided ? [...new Set(parseEmailsInput(req.body.emails))] : null;

    if (emails) {
      const invalid = emails.filter((e) => !isValidEmail(e));
      if (invalid.length) {
        return res.status(400).json({ error: `Invalid emails: ${invalid.slice(0, 5).join(', ')}` });
      }
      if (emails.length > 2000) {
        return res.status(400).json({ error: 'Maximum 2000 invite emails' });
      }
    }

    let inviteToken = assessment.inviteToken;
    if (enabled && (!inviteToken || regenerateToken)) {
      inviteToken = newInviteToken();
    }
    if (!enabled && regenerateToken) {
      inviteToken = newInviteToken();
    }

    await prisma.$transaction(async (tx) => {
      await tx.assessment.update({
        where: { id },
        data: {
          inviteEnabled: enabled,
          inviteToken: enabled || inviteToken ? inviteToken : assessment.inviteToken,
        },
      });

      if (emails) {
        const existing = await tx.assessmentInviteEmail.findMany({
          where: { assessmentId: id },
          select: { email: true, status: true, studentId: true, fullName: true },
        });
        const existingMap = new Map(existing.map((r) => [r.email, r]));
        const keep = new Set(emails);

        await tx.assessmentInviteEmail.deleteMany({
          where: {
            assessmentId: id,
            email: { notIn: emails },
            status: { not: 'COMPLETED' },
          },
        });

        for (const email of emails) {
          if (existingMap.has(email)) continue;
          await tx.assessmentInviteEmail.create({
            data: { assessmentId: id, email, status: 'PENDING' },
          });
        }

        // Re-add emails that were incorrectly filtered — already handled by create skip
        void keep;
      }
    });

    const updated = await prisma.assessment.findUnique({
      where: { id },
      select: {
        id: true,
        inviteEnabled: true,
        inviteToken: true,
        inviteEmails: {
          orderBy: { email: 'asc' },
          select: {
            id: true,
            email: true,
            fullName: true,
            status: true,
            studentId: true,
            createdAt: true,
          },
        },
      },
    });

    res.json({
      ...updated,
      invitePath: updated.inviteToken ? `/invite/${updated.inviteToken}` : null,
      inviteEmailCount: updated.inviteEmails.length,
    });
  } catch (error) {
    console.error('updateAssessmentInvite error:', error);
    res.status(500).json({ error: 'Failed to update invite settings' });
  }
}
