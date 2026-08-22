/**
 * Student Routes
 * Replaces Firebase Firestore student service calls
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import * as studentController from '../controllers/students.js';
import * as resumeController from '../controllers/resume.js';
import * as publicProfileController from '../controllers/publicProfile.js';
import { uploadProfileImage, uploadResume } from '../middleware/upload.js';
import prisma from '../config/database.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

/**
 * @openapi
 * /api/students/profile:
 *   get:
 *     tags: [Students]
 *     summary: Get own student profile
 *     description: Returns the authenticated student's profile with education, experience, projects, and achievements.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/profile', studentController.getStudentProfile);

/**
 * @openapi
 * /api/students/profile:
 *   put:
 *     tags: [Students]
 *     summary: Update own student profile
 *     description: Update profile fields for the authenticated student.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/profile', studentController.updateStudentProfile);

// Enforce mandatory profile completion for student routes
// Allow access to /profile even when incomplete
// Use same derived logic as auth: complete if DB flag is true OR all required fields are filled
router.use(async (req, res, next) => {
  try {
    const role = req.user?.role;
    if (role !== 'STUDENT') {
      return next();
    }

    // Allow profile GET/PUT and skills endpoint without completion
    if (req.path === '/profile' || req.path === '/skills') {
      return next();
    }

    const student = req.user?.student ?? await prisma.student.findUnique({
      where: { userId: req.userId },
    });

    if (!student) {
      return res.status(403).json({ error: 'PROFILE_INCOMPLETE' });
    }

    const isComplete =
      student.profileCompleted === true ||
      (() => {
        const email = (req.user?.email || '').trim();
        const fullName = (student.fullName || '').trim();
        const phone = (student.phone || '').trim();
        const enrollmentId = (student.enrollmentId || '').trim();
        const school = (student.school || '').trim();
        const center = (student.center || '').trim();
        const batch = (student.batch || '').trim();
        return !!(email && fullName && phone && enrollmentId && school && center && batch);
      })();

    if (!isComplete) {
      return res.status(403).json({ error: 'PROFILE_INCOMPLETE' });
    }

    return next();
  } catch (error) {
    console.error('Profile completion guard error:', error);
    return res.status(500).json({ error: 'Failed to verify profile completion' });
  }
});

/**
 * @openapi
 * /api/students/skills:
 *   get:
 *     tags: [Students]
 *     summary: Get student skills
 *     description: Returns skills for the authenticated student.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student skills
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/skills', studentController.getStudentSkills);

/**
 * @openapi
 * /api/students/skills:
 *   post:
 *     tags: [Students]
 *     summary: Add or update a skill
 *     description: Create or update a skill entry for the authenticated student.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               level: { type: string }
 *               id: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Skill saved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/skills', studentController.addOrUpdateSkill);

/**
 * @openapi
 * /api/students/skills/{skillId}:
 *   delete:
 *     tags: [Students]
 *     summary: Delete a skill
 *     description: Remove a skill from the authenticated student's profile.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: skillId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Skill deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/skills/:skillId', studentController.deleteSkill);

/**
 * @openapi
 * /api/students/education:
 *   post:
 *     tags: [Students]
 *     summary: Add education entry
 *     description: Add an education record to the authenticated student's profile.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Education added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/education', studentController.addEducation);

/**
 * @openapi
 * /api/students/education/{educationId}:
 *   put:
 *     tags: [Students]
 *     summary: Update education entry
 *     description: Update an education record on the authenticated student's profile.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: educationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Education updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/education/:educationId', studentController.updateEducation);

/**
 * @openapi
 * /api/students/education/{educationId}:
 *   delete:
 *     tags: [Students]
 *     summary: Delete education entry
 *     description: Remove an education record from the authenticated student's profile.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: educationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Education deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/education/:educationId', studentController.deleteEducation);

/**
 * @openapi
 * /api/students/experience:
 *   post:
 *     tags: [Students]
 *     summary: Add experience entry
 *     description: Add a work experience record to the authenticated student's profile.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Experience added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/experience', studentController.addExperience);

/**
 * @openapi
 * /api/students/experience/{experienceId}:
 *   put:
 *     tags: [Students]
 *     summary: Update experience entry
 *     description: Update a work experience record on the authenticated student's profile.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: experienceId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Experience updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/experience/:experienceId', studentController.updateExperience);

/**
 * @openapi
 * /api/students/experience/{experienceId}:
 *   delete:
 *     tags: [Students]
 *     summary: Delete experience entry
 *     description: Remove a work experience record from the authenticated student's profile.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: experienceId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Experience deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/experience/:experienceId', studentController.deleteExperience);

/**
 * @openapi
 * /api/students/projects:
 *   post:
 *     tags: [Students]
 *     summary: Add project entry
 *     description: Add a project to the authenticated student's profile.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Project added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/projects', studentController.addProject);

/**
 * @openapi
 * /api/students/projects/{projectId}:
 *   put:
 *     tags: [Students]
 *     summary: Update project entry
 *     description: Update a project on the authenticated student's profile.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Project updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/projects/:projectId', studentController.updateProject);

/**
 * @openapi
 * /api/students/projects/{projectId}:
 *   delete:
 *     tags: [Students]
 *     summary: Delete project entry
 *     description: Remove a project from the authenticated student's profile.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Project deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/projects/:projectId', studentController.deleteProject);

/**
 * @openapi
 * /api/students/generate-project-content:
 *   post:
 *     tags: [Students]
 *     summary: Generate project content with AI
 *     description: AI-assisted generation of project description content for the student profile.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               technologies: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: Generated project content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/generate-project-content', studentController.generateProjectContentEndpoint);

/**
 * @openapi
 * /api/students/generate-resume-pdf:
 *   post:
 *     tags: [Students]
 *     summary: Generate resume PDF
 *     description: Export the student's profile as a PDF resume.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resumeId: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Resume PDF generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/generate-resume-pdf', resumeController.generateResumePDF);

/**
 * @openapi
 * /api/students/achievements:
 *   post:
 *     tags: [Students]
 *     summary: Add achievement entry
 *     description: Add an achievement to the authenticated student's profile.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Achievement added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/achievements', studentController.addAchievement);

/**
 * @openapi
 * /api/students/achievements/{achievementId}:
 *   put:
 *     tags: [Students]
 *     summary: Update achievement entry
 *     description: Update an achievement on the authenticated student's profile.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: achievementId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Achievement updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/achievements/:achievementId', studentController.updateAchievement);

/**
 * @openapi
 * /api/students/achievements/{achievementId}:
 *   delete:
 *     tags: [Students]
 *     summary: Delete achievement entry
 *     description: Remove an achievement from the authenticated student's profile.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: achievementId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Achievement deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/achievements/:achievementId', studentController.deleteAchievement);

/**
 * @openapi
 * /api/students/profile-image:
 *   post:
 *     tags: [Students]
 *     summary: Upload profile image
 *     description: Student only — upload a profile image to Cloudinary.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile image uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/profile-image', 
  requireRole(['STUDENT']), // Students only
  uploadProfileImage, // Multer middleware for Cloudinary
  studentController.uploadProfileImage
);

/**
 * @openapi
 * /api/students/profile-image:
 *   delete:
 *     tags: [Students]
 *     summary: Delete profile image
 *     description: Student only — remove the profile image from Cloudinary.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile image deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/profile-image', 
  requireRole(['STUDENT']), // Students only
  studentController.deleteProfileImage
);

/**
 * @openapi
 * /api/students/resume:
 *   post:
 *     tags: [Students]
 *     summary: Upload resume
 *     description: Student only — upload a resume PDF to Cloudinary. Optional title in body.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *     responses:
 *       201:
 *         description: Resume uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/resume', 
  requireRole(['STUDENT']), // Students only
  uploadResume, // Multer middleware for Cloudinary
  studentController.uploadResumeCloudinary
);

/**
 * @openapi
 * /api/students/resumes:
 *   get:
 *     tags: [Students]
 *     summary: List resumes
 *     description: Student only — list all uploaded resumes for the authenticated student.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resume list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/resumes', 
  requireRole(['STUDENT']),
  studentController.getResumes
);

/**
 * @openapi
 * /api/students/resume/{resumeId}/view-url:
 *   get:
 *     tags: [Students]
 *     summary: Get resume view URL
 *     description: Student only — get a short-lived URL to view a resume inline in a new tab.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resumeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Resume view URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url: { type: string }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/resume/:resumeId/view-url',
  requireRole(['STUDENT']),
  studentController.getStudentResumeViewUrl
);

/**
 * @openapi
 * /api/students/resume/{resumeId}/default:
 *   patch:
 *     tags: [Students]
 *     summary: Set default resume
 *     description: Student only — mark a resume as the default for applications.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resumeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Default resume set
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/resume/:resumeId/default',
  requireRole(['STUDENT']),
  studentController.setDefaultResume
);

/**
 * @openapi
 * /api/students/resume/{resumeId}:
 *   delete:
 *     tags: [Students]
 *     summary: Delete resume
 *     description: Student only — delete an uploaded resume from Cloudinary.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resumeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Resume deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/resume/:resumeId',
  requireRole(['STUDENT']),
  studentController.deleteResume
);

/**
 * @openapi
 * /api/students/resume/extract-text:
 *   post:
 *     tags: [Students]
 *     summary: Extract resume text
 *     description: Student only — backend proxy to extract text from a resume PDF (avoids CORS).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resumeUrl]
 *             properties:
 *               resumeUrl: { type: string }
 *               resumeId: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Extracted resume text
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 text: { type: string }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/resume/extract-text',
  requireRole(['STUDENT']),
  studentController.extractResumeText
);

/**
 * @openapi
 * /api/students/resume/ats-analysis:
 *   post:
 *     tags: [Students]
 *     summary: ATS resume analysis
 *     description: Student only — generic or job-matched ATS analysis of resume text.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resumeText]
 *             properties:
 *               resumeText: { type: string }
 *               resumeId: { type: string, format: uuid }
 *               jobId: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: ATS analysis result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/resume/ats-analysis',
  requireRole(['STUDENT']),
  studentController.analyzeATSResume
);

/**
 * @openapi
 * /api/students/resume/optimize:
 *   post:
 *     tags: [Students]
 *     summary: AI resume optimizer
 *     description: Student only — optimize resume content for a specific job posting.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [jobId]
 *             properties:
 *               jobId: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Optimized resume suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/resume/optimize',
  requireRole(['STUDENT']),
  studentController.optimizeResumeForJob
);

/**
 * @openapi
 * /api/students/public-profile/generate:
 *   post:
 *     tags: [Students]
 *     summary: Generate public profile ID
 *     description: Student only — generate a public profile share link ID.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Public profile ID generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/public-profile/generate', requireRole(['STUDENT']), publicProfileController.generatePublicProfileId);

/**
 * @openapi
 * /api/students/public-profile/regenerate:
 *   post:
 *     tags: [Students]
 *     summary: Regenerate public profile ID
 *     description: Student only — invalidate and regenerate the public profile share link.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Public profile ID regenerated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/public-profile/regenerate', requireRole(['STUDENT']), publicProfileController.regeneratePublicProfileId);

/**
 * @openapi
 * /api/students/public-profile/settings:
 *   get:
 *     tags: [Students]
 *     summary: Get public profile settings
 *     description: Student only — retrieve visibility and sharing settings for the public profile.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Public profile settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/public-profile/settings', requireRole(['STUDENT']), publicProfileController.getPublicProfileSettings);

/**
 * @openapi
 * /api/students/public-profile/settings:
 *   patch:
 *     tags: [Students]
 *     summary: Update public profile settings
 *     description: Student only — update visibility and sharing settings for the public profile.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Public profile settings updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/public-profile/settings', requireRole(['STUDENT']), publicProfileController.updatePublicProfileSettings);

/**
 * @openapi
 * /api/students/{studentId}/block:
 *   patch:
 *     tags: [Students]
 *     summary: Block or unblock a student
 *     description: Admin or Super Admin only — toggle student account block status.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               blocked: { type: boolean }
 *     responses:
 *       200:
 *         description: Student block status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/:studentId/block', requireRole(['ADMIN', 'SUPER_ADMIN']), studentController.blockUnblockStudent);

/**
 * @openapi
 * /api/students:
 *   get:
 *     tags: [Students]
 *     summary: Get all students
 *     description: Admin or Super Admin only — list all students with filters and pagination.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Student list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', requireRole(['ADMIN', 'SUPER_ADMIN']), studentController.getAllStudents);

export default router;
