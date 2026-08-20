/**
 * Authentication Routes
 * Replaces Firebase Auth SDK calls
 * Handles registration, login, password reset, email verification
 */

import express from 'express';
import { getSuperAdminEmail } from '../config/secrets.js';
import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import {
  authenticate,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../middleware/auth.js';
import { establishStudentSession, persistRefreshToken, invalidateUserSession } from '../utils/sessionManager.js';
import { requireRole } from '../middleware/roles.js';
import jwt from 'jsonwebtoken';
import { validateUUID } from '../middleware/validation.js';
import { body, validationResult } from 'express-validator';
import { sendOTP, sendPasswordResetOTP } from '../services/emailService.js';
import logger from '../config/logger.js';
import { getGoogleLoginUrl, handleGoogleLoginCallback } from '../controllers/googleLogin.js';
import { logAction } from '../utils/auditLogger.js';
import { recordStudentActivity } from '../services/studentDirectoryMetricsService.js';

const router = express.Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register new user
 *     description: Creates a new STUDENT or RECRUITER account. Optional verificationToken from /api/auth/verify-otp can enforce email verification before registration.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, role]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               role:
 *                 type: string
 *                 enum: [STUDENT, RECRUITER]
 *               verificationToken:
 *                 type: string
 *                 description: JWT from verify-otp endpoint (optional)
 *               profile:
 *                 type: object
 *                 properties:
 *                   fullName:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   enrollmentId:
 *                     type: string
 *                   school:
 *                     type: string
 *                   center:
 *                     type: string
 *                   batch:
 *                     type: string
 *                   companyName:
 *                     type: string
 *                   location:
 *                     type: string
 *     responses:
 *       200:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     status:
 *                       type: string
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').custom((value) => {
    if (!value) return false;
    const upper = value.toUpperCase();
    return ['STUDENT', 'RECRUITER'].includes(upper);
  }).withMessage('Role must be STUDENT or RECRUITER'),
  body('verificationToken').optional().isString(), // Optional: verification token from OTP
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, role: roleFromBody, profile = {}, verificationToken } = req.body;
    // Normalize role to uppercase
    const role = roleFromBody ? roleFromBody.toUpperCase() : undefined;

    // Track if email was verified via OTP
    let emailVerified = false;
    let emailVerifiedAt = null;

    // Optional: Verify OTP verification token if provided (enforce OTP verification)
    // Frontend should send verificationToken from verify-otp endpoint
    if (verificationToken) {
      try {
        const decoded = jwt.verify(verificationToken, process.env.JWT_SECRET);

        // Verify token email matches registration email
        // Token payload has 'email' field, not 'userId'
        if (decoded.email !== email || decoded.type !== 'verification') {
          return res.status(400).json({ error: 'Email verification failed' });
        }

        // Check if OTP was actually verified (exists and is used)
        const otpVerified = await prisma.oTP.findFirst({
          where: {
            email,
            purpose: 'VERIFY_EMAIL',
            isUsed: true,
            expiresAt: { gt: new Date(Date.now() - 10 * 60 * 1000) }, // Verified within last 10 minutes
          },
          orderBy: { createdAt: 'desc' }, // Use createdAt since OTP model doesn't have updatedAt
        });

        if (!otpVerified) {
          return res.status(400).json({ error: 'Email verification required. Please verify OTP first.' });
        }

        // OTP was verified - mark email as verified
        emailVerified = true;
        emailVerifiedAt = new Date();
      } catch (tokenError) {
        return res.status(400).json({ error: 'Invalid verification token. Please verify OTP first.' });
      }
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Validate email domain based on role
    // COMMENTED OUT: Email domain restriction for students
    // if (role === 'STUDENT') {
    //   const emailLower = email.toLowerCase();
    //   const allowedDomains = ['@pwioi.com', '@student.pwioi.com'];
    //   // Allow @gmail.com for testing (remove in production)
    //   if (!allowedDomains.some(d => emailLower.endsWith(d)) && !emailLower.endsWith('@gmail.com')) {
    //     return res.status(400).json({ error: 'Students must use @pwioi.com email' });
    //   }
    // }

    // Use transaction to ensure User and Student/Recruiter/Admin are created atomically
    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const userData = {
        email,
        passwordHash,
        role,
        status: role === 'RECRUITER' ? 'PENDING' : 'ACTIVE',
        emailVerified: emailVerified, // Set based on OTP verification
        emailVerifiedAt: emailVerifiedAt, // Set timestamp if verified
        recruiterVerified: role === 'RECRUITER' ? false : undefined,
      };

      const createdUser = await tx.user.create({
        data: userData,
      });

      // Create role-specific profile
      if (role === 'STUDENT') {
        // enrollmentId should be provided by user during profile setup
        // Allow it to be empty during registration - user will fill it later
        // Using null to avoid unique constraint issues with empty strings
        const enrollmentId = profile.enrollmentId?.trim() || null;

        await tx.student.create({
          data: {
            userId: createdUser.id,
            fullName: (profile.fullName && profile.fullName.trim()) || '', // Name filled in First-time setup, not email
            email: createdUser.email,
            phone: profile.phone || '',
            enrollmentId: enrollmentId, // Can be null initially, user will set it later
            school: profile.school || '',
            center: profile.center || '',
            batch: profile.batch || '',
          },
        });
      } else if (role === 'RECRUITER') {
        await tx.recruiter.create({
          data: {
            userId: createdUser.id,
            companyName: profile.companyName,
            location: profile.location,
          },
        });

        // Emit Socket.IO event to notify admins of new recruiter registration
        const { getIO } = await import('../config/socket.js');
        const io = getIO();
        if (io) {
          io.to('admins').emit('recruiter:new', {
            id: createdUser.id,
            email: createdUser.email,
            companyName: profile.companyName,
            location: profile.location,
            status: 'PENDING',
            createdAt: new Date(),
          });
        }
      } else if (role === 'ADMIN') {
        await tx.admin.create({
          data: {
            userId: createdUser.id,
            name: profile.name || createdUser.email,
          },
        });
      }

      return createdUser;
    });

    // Generate tokens
    let sessionUser = user;
    if (user.role === 'STUDENT') {
      sessionUser = await establishStudentSession(user.id);
    }
    const accessToken = generateAccessToken(sessionUser);
    const refreshToken = generateRefreshToken(user.id);

    await persistRefreshToken(user.id, refreshToken);

    // TODO: Send email verification

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login user
 *     description: Authenticates with email and password. Optional role or selectedRole must match the account role (except Super Admin).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [STUDENT, RECRUITER, ADMIN, SUPER_ADMIN]
 *               selectedRole:
 *                 type: string
 *                 enum: [STUDENT, RECRUITER, ADMIN, SUPER_ADMIN]
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     status:
 *                       type: string
 *                     emailVerified:
 *                       type: boolean
 *                     profileCompleted:
 *                       type: boolean
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  body('role').optional().custom((value) => {
    if (!value) return true;
    const upper = value.toUpperCase();
    return ['STUDENT', 'RECRUITER', 'ADMIN', 'SUPER_ADMIN'].includes(upper);
  }).withMessage('Role must be STUDENT, RECRUITER, ADMIN, or SUPER_ADMIN'),
  body('selectedRole').optional().custom((value) => {
    if (!value) return true;
    const upper = value.toUpperCase();
    return ['STUDENT', 'RECRUITER', 'ADMIN', 'SUPER_ADMIN'].includes(upper);
  }).withMessage('SelectedRole must be STUDENT, RECRUITER, ADMIN, or SUPER_ADMIN'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, role: roleFromBody, selectedRole } = req.body;
    // Normalize role to uppercase (accept both 'role' and 'selectedRole')
    const role = (selectedRole || roleFromBody) ? (selectedRole || roleFromBody).toUpperCase() : undefined;

    // Super Admin: specific email + password → always log in as Super Admin (no role selector on login).
    // Note: express-validator's normalizeEmail() removes dots from Gmail addresses
    // So we need to normalize the super admin email for comparison
    const superAdminEmailRaw = getSuperAdminEmail();
    // Normalize the super admin email the same way express-validator does (remove dots for Gmail)
    const superAdminEmailNormalized = superAdminEmailRaw.replace(/\.(?=.*@gmail\.com)/g, '');
    const isSuperAdminLogin = email.toLowerCase() === superAdminEmailNormalized || email.toLowerCase() === superAdminEmailRaw;

    let user = null;
    if (isSuperAdminLogin) {
      // Try both normalized and original email formats for database lookup
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: email },
            { email: superAdminEmailRaw },
            { email: superAdminEmailNormalized }
          ]
        },
        include: { student: true, recruiter: true, admin: true },
      });
      if (user && user.role !== 'SUPER_ADMIN') {
        // Email matches Super Admin email but user has different role
        return res.status(403).json({ error: 'Invalid credentials for Super Admin' });
      }
      if (!user) {
        // Super Admin email but user doesn't exist
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      // User exists and has SUPER_ADMIN role, verify password
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      // Password valid, authenticate as Super Admin
      if (user.status === 'BLOCKED') {
        return res.status(403).json({ error: 'Account is blocked' });
      }
      const sessionUser = await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
        include: { student: true, recruiter: true, admin: true },
      });
      const accessToken = generateAccessToken(sessionUser);
      const refreshToken = generateRefreshToken(user.id);
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await persistRefreshToken(user.id, refreshToken);
      await logAction(req, {
        actionType: 'Login',
        targetType: 'Auth',
        details: 'Super Admin Login',
      });
      return res.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          emailVerified: user.emailVerified,
        },
        accessToken,
        refreshToken,
      });
    }

    // Normal login
    user = await prisma.user.findUnique({
      where: { email },
      include: {
        student: true,
        recruiter: true,
        admin: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Skip role check for Super Admin (they can login with any role selector)
    if (role && user.role.toUpperCase() !== role.toUpperCase() && user.role.toUpperCase() !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Invalid role for this account' });
    }

    // Check status
    if (user.status === 'BLOCKED') {
      return res.status(403).json({ error: 'Account is blocked' });
    }

    // Update last login; students who can log in are email-verified (OTP at registration)
    const loginAt = new Date();
    let sessionUser = user;
    if (user.role === 'STUDENT') {
      sessionUser = await establishStudentSession(user.id);
      if (!sessionUser.emailVerified) {
        sessionUser = await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: true, emailVerifiedAt: loginAt },
          include: { student: true, recruiter: true, admin: true },
        });
      }
      user.emailVerified = sessionUser.emailVerified;
    } else {
      sessionUser = await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: loginAt },
        include: { student: true, recruiter: true, admin: true },
      });
    }
    if (user.student?.id) {
      recordStudentActivity(user.student.id, 'LOGIN', null, { source: 'password_login' }).catch(() => {});
    }

    // Notify Super Admins when a PENDING admin tries to enter (login) — for Admit/Reject workflow
    if (user.role === 'ADMIN' && user.status === 'PENDING') {
      try {
        const superAdmins = await prisma.user.findMany({
          where: { role: 'SUPER_ADMIN', status: 'ACTIVE' },
          select: { id: true },
        });
        const adminName = user.displayName || user.email;
        const loginAt = new Date().toLocaleString();
        for (const sa of superAdmins) {
          await createNotification({
            userId: sa.id,
            title: `Admin requesting access: ${adminName}`,
            body: `${adminName} (${user.email}) tried to log in at ${loginAt}. Admit or Reject in Notifications.`,
            data: {
              type: 'admin_login',
              adminUserId: user.id,
              adminEmail: user.email,
              adminName,
              loggedInAt: new Date().toISOString(),
            },
          });
        }
        if (superAdmins.length > 0) {
          logger.info(`Admin login (PENDING) notifications sent to ${superAdmins.length} Super Admin(s) for ${user.email}`);
        }
      } catch (notifErr) {
        logger.error('Failed to notify Super Admins of admin login:', notifErr);
      }
    }

    // Generate tokens
    const tokenUser = user.role === 'STUDENT' ? sessionUser : user;
    const accessToken = generateAccessToken(tokenUser);
    const refreshToken = generateRefreshToken(user.id);

    // Save refresh token
    await persistRefreshToken(user.id, refreshToken);

    // For students: treat as completed if DB flag is true OR all required profile fields are filled
    const profileCompleted =
      user.role === 'STUDENT'
        ? (() => {
          const s = user.student;
          if (!s) return false;
          if (s.profileCompleted === true) return true;
          const email = (user.email || '').trim();
          const fullName = (s.fullName || '').trim();
          const phone = (s.phone || '').trim();
          const enrollmentId = (s.enrollmentId || '').trim();
          const school = (s.school || '').trim();
          const center = (s.center || '').trim();
          const batch = (s.batch || '').trim();
          return !!(email && fullName && phone && enrollmentId && school && center && batch);
        })()
        : true;

    await logAction(req, {
      actionType: 'Login',
      targetType: 'Auth',
      details: `Login as ${user.role}`,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        profileCompleted,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error('Login error:', error);
    logger.error('Login error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
      meta: error.meta,
    });
    // Never leak ORM / stack internals to the client
    res.status(500).json({
      error: 'Login failed. Please try again.',
    });
  }
});

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     description: Exchanges a valid refresh token for a new access token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New access token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/refresh', verifyRefreshToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { student: true, recruiter: true, admin: true },
    });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    const newAccessToken = generateAccessToken(user);

    res.json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout user
 *     description: Invalidates the provided refresh token. Google Calendar tokens are not cleared on logout.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const refreshToken = req.body.refreshToken;

    // Delete refresh token if provided
    // NOTE: We explicitly do NOT delete GoogleCalendarToken records here.
    // Calendar connection should persist across logout/login cycles.
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    await invalidateUserSession(req.userId);

    await logAction(req, {
      actionType: 'Logout',
      targetType: 'Auth',
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user
 *     description: Returns the authenticated user profile including role-specific data and profile completion status.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                 profileCompleted:
 *                   type: boolean
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        student: true,
        recruiter: {
          include: { company: true },
        },
        admin: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // For students: treat as completed if DB flag is true OR all required profile fields are filled (avoids modal for already-filled profiles)
    const profileCompleted =
      user.role === 'STUDENT'
        ? (() => {
          const s = user.student;
          if (!s) return false;
          if (s.profileCompleted === true) return true;
          const email = (user.email || '').trim();
          const fullName = (s.fullName || '').trim();
          const phone = (s.phone || '').trim();
          const enrollmentId = (s.enrollmentId || '').trim();
          const school = (s.school || '').trim();
          const center = (s.center || '').trim();
          const batch = (s.batch || '').trim();
          return !!(email && fullName && phone && enrollmentId && school && center && batch);
        })()
        : true;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        profilePhoto: user.profilePhoto,
        student: user.student,
        recruiter: user.recruiter,
        admin: user.admin,
      },
      profileCompleted,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * @openapi
 * /api/auth/profile:
 *   put:
 *     tags: [Auth]
 *     summary: Update user profile
 *     description: Updates displayName and/or profilePhoto for the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               profilePhoto:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                 message:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/profile', authenticate, [
  body('displayName').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('profilePhoto').optional().custom((value) => {
    // Allow null, undefined, or string
    return value === null || value === undefined || typeof value === 'string';
  }).withMessage('profilePhoto must be a string, null, or undefined'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { displayName, profilePhoto } = req.body;
    const updateData = {};

    if (displayName !== undefined) {
      updateData.displayName = displayName && typeof displayName === 'string' ? displayName.trim() : null;
    }

    if (profilePhoto !== undefined) {
      // Handle null, empty string, or string values
      if (profilePhoto === null) {
        updateData.profilePhoto = null;
      } else if (typeof profilePhoto === 'string') {
        updateData.profilePhoto = profilePhoto.trim() || null;
      } else {
        updateData.profilePhoto = null;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Get user to check role
    const currentUser = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        admin: true,
        recruiter: true,
      },
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update User model
    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        displayName: true,
        profilePhoto: true,
        emailVerified: true,
      },
    });

    // If admin and displayName is being updated, also update Admin.name
    if (currentUser.role === 'ADMIN' && updateData.displayName !== undefined && currentUser.admin) {
      await prisma.admin.update({
        where: { userId: req.userId },
        data: {
          name: updateData.displayName,
        },
      });
    }

    // If recruiter and displayName is being updated, update could be added here if needed
    // (Recruiter model doesn't have a name field, uses companyName instead)

    res.json({
      user: updatedUser,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * @openapi
 * /api/auth/company-details:
 *   put:
 *     tags: [Auth]
 *     summary: Update recruiter company details
 *     description: Updates or creates company information linked to the authenticated recruiter account.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *               website:
 *                 type: string
 *               address:
 *                 type: string
 *                 maxLength: 500
 *               registrationNumber:
 *                 type: string
 *                 maxLength: 100
 *               phone:
 *                 type: string
 *                 maxLength: 20
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Company details updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 company:
 *                   type: object
 *                 message:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/company-details', authenticate, requireRole(['RECRUITER']), [
  body('companyName').optional().isString().trim().isLength({ min: 1, max: 200 }),
  body('website').optional().custom((value) => {
    if (!value || value.trim() === '') return true;
    // Basic URL validation - allow http://, https://, or URLs without protocol
    try {
      new URL(value.startsWith('http') ? value : `https://${value}`);
      return true;
    } catch {
      throw new Error('Website must be a valid URL');
    }
  }),
  body('address').optional().isString().trim().isLength({ max: 500 }),
  body('registrationNumber').optional().isString().trim().isLength({ max: 100 }),
  body('phone').optional().isString().trim().isLength({ max: 20 }),
  body('email').optional().isEmail().normalizeEmail(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { companyName, website, address, registrationNumber, phone, email } = req.body;
    const userId = req.userId;

    // Get recruiter with company
    const recruiter = await prisma.recruiter.findUnique({
      where: { userId },
      include: { company: true },
    });

    if (!recruiter) {
      return res.status(404).json({ error: 'Recruiter profile not found' });
    }

    let companyId = recruiter.companyId;
    let updatedCompany = null;

    // Update or create company
    if (companyName) {
      if (companyId && recruiter.company) {
        // Update existing company
        const companyUpdateData = {};
        if (website !== undefined) companyUpdateData.website = website?.trim() || null;
        if (address !== undefined) companyUpdateData.location = address?.trim() || null;

        // Store additional info in description as JSON
        const additionalInfo = {};
        if (registrationNumber) additionalInfo.registrationNumber = registrationNumber.trim();
        if (phone) additionalInfo.phone = phone.trim();
        if (email) additionalInfo.email = email.trim();

        if (Object.keys(additionalInfo).length > 0) {
          companyUpdateData.description = JSON.stringify(additionalInfo);
        }

        if (Object.keys(companyUpdateData).length > 0) {
          updatedCompany = await prisma.company.update({
            where: { id: companyId },
            data: companyUpdateData,
          });
        } else {
          updatedCompany = recruiter.company;
        }
      } else {
        // Create new company or find existing by name
        const existingCompany = await prisma.company.findFirst({
          where: { name: companyName.trim() },
        });

        if (existingCompany) {
          companyId = existingCompany.id;
          // Update existing company
          const companyUpdateData = {};
          if (website !== undefined) companyUpdateData.website = website?.trim() || null;
          if (address !== undefined) companyUpdateData.location = address?.trim() || null;

          const additionalInfo = {};
          if (registrationNumber) additionalInfo.registrationNumber = registrationNumber.trim();
          if (phone) additionalInfo.phone = phone.trim();
          if (email) additionalInfo.email = email.trim();

          if (Object.keys(additionalInfo).length > 0) {
            companyUpdateData.description = JSON.stringify(additionalInfo);
          }

          if (Object.keys(companyUpdateData).length > 0) {
            updatedCompany = await prisma.company.update({
              where: { id: companyId },
              data: companyUpdateData,
            });
          } else {
            updatedCompany = existingCompany;
          }
        } else {
          // Create new company
          const additionalInfo = {};
          if (registrationNumber) additionalInfo.registrationNumber = registrationNumber.trim();
          if (phone) additionalInfo.phone = phone.trim();
          if (email) additionalInfo.email = email.trim();

          updatedCompany = await prisma.company.create({
            data: {
              name: companyName.trim(),
              website: website?.trim() || null,
              location: address?.trim() || null,
              description: Object.keys(additionalInfo).length > 0 ? JSON.stringify(additionalInfo) : null,
            },
          });
          companyId = updatedCompany.id;
        }

        // Link recruiter to company
        await prisma.recruiter.update({
          where: { userId },
          data: { companyId },
        });
      }
    }

    res.json({
      company: updatedCompany || recruiter.company,
      message: 'Company details updated successfully',
    });
  } catch (error) {
    console.error('Update company details error:', error);
    res.status(500).json({ error: 'Failed to update company details' });
  }
});

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset
 *     description: Sends a password reset OTP to the provided email if the account exists. Response is consistent regardless of whether the email is registered.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset OTP initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 otpStatus:
 *                   type: string
 *                 otpExpiresAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/reset-password', [
  body('email').isEmail().normalizeEmail(),
], async (req, res) => {
  try {
    logger.info(`=== Password Reset Request Received ===`);
    logger.info(`Request body:`, JSON.stringify(req.body, null, 2));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.error(`Validation errors:`, errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Email should be normalized by express-validator's normalizeEmail()
    // But let's ensure it's lowercase for database lookup (case-sensitive matching)
    const normalizedEmail = email ? email.toLowerCase().trim() : '';

    logger.info(`Email from request body: ${email}`);
    logger.info(`Normalized email: ${normalizedEmail}`);

    if (!email || !normalizedEmail) {
      logger.error(`Email is missing or empty in request body!`);
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists (try both normalized and original email)
    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      // Try original email in case normalization didn't work
      user = await prisma.user.findUnique({ where: { email } });
    }

    if (!user) {
      // Don't reveal if email exists - security best practice
      // But return consistent format for frontend (don't create OTP if user doesn't exist)
      logger.info(`Password reset requested for non-existent email: ${normalizedEmail} (original: ${email})`);

      // Return consistent format but don't create OTP (security: don't reveal if email exists)
      // Frontend will show UI, but OTP verification will fail (which is fine for security)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      return res.json({
        success: true,
        message: 'If email exists, password reset OTP sent',
        otpStatus: 'PENDING_VERIFICATION',
        otpExpiresAt: expiresAt.toISOString(),
      });
    }

    // Use the email from the database (source of truth)
    const dbEmail = user.email;
    logger.info(`Password reset requested for existing user: ${dbEmail} (ID: ${user.id}, requested: ${normalizedEmail})`);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in database with 10-minute expiration
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate any existing password reset OTPs for this email (use DB email)
    await prisma.oTP.updateMany({
      where: {
        email: dbEmail,
        purpose: 'RESET_PASSWORD',
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      data: { isUsed: true },
    });

    // Create new password reset OTP (use DB email - source of truth)
    const otpRecord = await prisma.oTP.create({
      data: {
        email: dbEmail,
        otp,
        purpose: 'RESET_PASSWORD',
        expiresAt,
      },
    });

    logger.info(`Password reset OTP created in database: ${otpRecord.id} for ${email}`);

    // Send password reset OTP via email
    logger.info(`Attempting to send password reset OTP to ${dbEmail}`);
    try {
      // Await email sending to ensure it completes before function terminates on Vercel
      await sendPasswordResetOTP(dbEmail, otp);
      logger.info(`Password reset OTP email sent successfully to ${dbEmail}`);

      // Respond with success
      res.json({
        success: true,
        message: 'If email exists, password reset OTP sent',
        otpStatus: 'PENDING_VERIFICATION',
        otpExpiresAt: expiresAt.toISOString(),
      });
    } catch (emailError) {
      logger.error(`Failed to send password reset OTP email to ${dbEmail}:`, emailError);
      
      // Still respond with success since OTP is in DB and user can retry
      res.json({
        success: true,
        message: 'If email exists, password reset OTP sent',
        otpStatus: 'PENDING_VERIFICATION',
        otpExpiresAt: expiresAt.toISOString(),
      });
    }
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

/**
 * @openapi
 * /api/auth/send-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Send email verification OTP
 *     description: Sends a 6-digit OTP for email verification before registration. Fails if email is already registered.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: OTP sent or created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 expiresIn:
 *                   type: integer
 *                 otpStatus:
 *                   type: string
 *                 otpExpiresAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/send-otp', [
  body('email').isEmail().normalizeEmail(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in database with 5-minute expiration
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Invalidate any existing OTPs for this email
    await prisma.oTP.updateMany({
      where: {
        email,
        purpose: 'VERIFY_EMAIL',
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      data: { isUsed: true },
    });

    // Create new OTP
    await prisma.oTP.create({
      data: {
        email,
        otp,
        purpose: 'VERIFY_EMAIL',
        expiresAt,
      },
    });

    // Send OTP via email (with timeout to prevent hanging)
    // NOTE: Send email asynchronously - don't block the response
    // OTP is already stored in DB, so we can respond immediately
    try {
      logger.info(`Attempting to send OTP to ${email}`);

      // Await email sending to ensure it completes before function terminates on Vercel
      await sendOTP(email, otp);

      logger.info(`OTP email sent successfully for ${email}`);
      res.json({
        success: true,
        message: 'OTP sent to your email. Please check your inbox.',
        expiresIn: 300, // 5 minutes in seconds
        otpStatus: 'PENDING_VERIFICATION',
        otpExpiresAt: expiresAt.toISOString(), // ISO timestamp
      });
    } catch (emailError) {
      logger.error(`Failed to initiate OTP email to ${email}:`, emailError);

      // Still respond with success since OTP is in DB
      // User can try requesting OTP again if email fails
      res.json({
        success: true,
        message: 'OTP created. If you don\'t receive an email, please try again.',
        expiresIn: 300,
        otpStatus: 'PENDING_VERIFICATION',
        otpExpiresAt: expiresAt.toISOString(), // ISO timestamp
      });
    }
  } catch (error) {
    logger.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

/**
 * @openapi
 * /api/auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify email OTP
 *     description: Verifies the registration OTP and returns a short-lived verificationToken for use during registration.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *                 pattern: '^\\d{6}$'
 *     responses:
 *       200:
 *         description: OTP verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 verified:
 *                   type: boolean
 *                 email:
 *                   type: string
 *                 verificationToken:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/verify-otp', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).matches(/^\d+$/),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp } = req.body;

    // Find valid OTP
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        email,
        otp,
        purpose: 'VERIFY_EMAIL',
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Mark OTP as used
    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });

    // Return verification token (or just success - frontend will use this for registration)
    res.json({
      success: true,
      message: 'OTP verified successfully',
      verified: true,
      email,
      // Store email in token payload as 'email' field, not 'userId'
      verificationToken: jwt.sign({ email, type: 'verification' }, process.env.JWT_SECRET, { expiresIn: '10m' }),
    });
  } catch (error) {
    logger.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

/**
 * @openapi
 * /api/auth/verify-reset-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify password reset OTP
 *     description: Verifies the password reset OTP and returns a resetToken for updating the password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *                 pattern: '^\\d{6}$'
 *     responses:
 *       200:
 *         description: Reset OTP verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 verified:
 *                   type: boolean
 *                 email:
 *                   type: string
 *                 resetToken:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/verify-reset-otp', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).matches(/^\d+$/),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    // Find valid password reset OTP
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        email,
        otp,
        purpose: 'RESET_PASSWORD',
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    // Mark OTP as used
    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });

    // Return reset token for password update
    res.json({
      success: true,
      message: 'Reset code verified successfully',
      verified: true,
      email,
      resetToken: jwt.sign({ email, userId: user.id, type: 'password_reset' }, process.env.JWT_SECRET, { expiresIn: '15m' }),
    });
  } catch (error) {
    logger.error('Verify reset OTP error:', error);
    res.status(500).json({ error: 'Failed to verify reset code' });
  }
});

/**
 * @openapi
 * /api/auth/update-password:
 *   post:
 *     tags: [Auth]
 *     summary: Update password after reset
 *     description: Sets a new password using the resetToken from verify-reset-otp. Requires a recently verified reset OTP.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resetToken, password]
 *             properties:
 *               resetToken:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/update-password', [
  body('resetToken').notEmpty(),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { resetToken, password } = req.body;

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
      if (decoded.type !== 'password_reset') {
        return res.status(400).json({ error: 'Invalid reset token' });
      }
    } catch (tokenError) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: decoded.email },
    });

    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Verify that a password reset OTP was verified recently (within last 15 minutes)
    const otpVerified = await prisma.oTP.findFirst({
      where: {
        email: decoded.email,
        purpose: 'RESET_PASSWORD',
        isUsed: true,
        expiresAt: { gt: new Date(Date.now() - 15 * 60 * 1000) }, // Verified within last 15 minutes
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpVerified) {
      return res.status(400).json({ error: 'Reset code verification required. Please verify OTP first.' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    logger.info(`Password updated successfully for user ${user.email}`);

    res.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    logger.error('Update password error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

/**
 * @openapi
 * /api/auth/google-login/url:
 *   get:
 *     tags: [Auth]
 *     summary: Get Google OAuth login URL
 *     description: Returns the Google OAuth authorization URL for login or registration. Optional role query parameter defaults to STUDENT.
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [STUDENT, RECRUITER, ADMIN]
 *           default: STUDENT
 *         description: Intended user role for Google login
 *     responses:
 *       200:
 *         description: Google OAuth URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 authUrl:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/google-login/url', getGoogleLoginUrl);

/**
 * @openapi
 * /api/auth/google-login/callback:
 *   get:
 *     tags: [Auth]
 *     summary: Google OAuth login callback
 *     description: Handles Google OAuth redirect after user authorization. Exchanges code for tokens, creates or logs in the user, and redirects to the frontend callback URL.
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code from Google
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: OAuth state parameter containing role metadata
 *     responses:
 *       200:
 *         description: OAuth callback processed (redirect to frontend)
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/google-login/callback', handleGoogleLoginCallback);

export default router;
