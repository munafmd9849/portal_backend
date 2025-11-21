/**
 * Jobs Controller
 * Replaces Firebase Firestore job service calls
 * Handles job CRUD, posting, targeting, and distribution
 */

import prisma from '../config/database.js';
import { addJobToQueue } from '../workers/queues.js';
import { sendJobPostedNotification, sendBulkJobNotifications } from '../services/emailService.js';
import logger from '../config/logger.js';

/**
 * Get all jobs with filters
 * Replaces: subscribeJobs(), fetchJobs()
 */
export async function getJobs(req, res) {
  try {
    const { status, recruiterId, isPosted, page = 1, limit = 50 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (recruiterId) where.recruiterId = recruiterId;
    if (isPosted !== undefined) where.isPosted = isPosted === 'true';

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          company: true,
          recruiter: {
            include: {
              user: {
                select: {
                  email: true,
                  displayName: true,
                },
              },
            },
          },
        },
      }),
      prisma.job.count({ where }),
    ]);

    res.json({
      jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Failed to get jobs' });
  }
}

/**
 * Get targeted jobs for student
 * Replaces: loadJobsData() with targeting logic
 */
export async function getTargetedJobs(req, res) {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get student profile
    const student = await prisma.student.findUnique({
      where: { userId },
      select: {
        school: true,
        center: true,
        batch: true,
      },
    });

    // If student doesn't have profile yet, return all posted jobs (no targeting)
    if (!student || !student.school || !student.center || !student.batch) {
      const jobs = await prisma.job.findMany({
        where: {
          status: 'POSTED',
          isPosted: true,
        },
        include: {
          company: true,
        },
        orderBy: { postedAt: 'desc' },
        take: 100,
      });
      return res.json(jobs);
    }

    // Get all posted jobs first (targeting is done in memory for SQLite compatibility)
    const allJobs = await prisma.job.findMany({
      where: {
        status: 'POSTED',
        isPosted: true,
      },
      include: {
        company: true,
      },
      orderBy: { postedAt: 'desc' },
      take: 200, // Get more to filter in memory
    });

    // Filter jobs based on targeting (handle JSON strings in SQLite)
    const targetedJobs = allJobs.filter(job => {
      // Parse targeting arrays (stored as JSON strings in SQLite)
      let targetSchools = [];
      let targetCenters = [];
      let targetBatches = [];

      try {
        if (job.targetSchools) {
          targetSchools = typeof job.targetSchools === 'string' 
            ? JSON.parse(job.targetSchools) 
            : job.targetSchools;
        }
        if (job.targetCenters) {
          targetCenters = typeof job.targetCenters === 'string'
            ? JSON.parse(job.targetCenters)
            : job.targetCenters;
        }
        if (job.targetBatches) {
          targetBatches = typeof job.targetBatches === 'string'
            ? JSON.parse(job.targetBatches)
            : job.targetBatches;
        }
      } catch (parseError) {
        console.warn('Failed to parse targeting arrays:', parseError);
        // If parsing fails, treat as empty (show to all)
        return true;
      }

      // Ensure arrays
      if (!Array.isArray(targetSchools)) targetSchools = [];
      if (!Array.isArray(targetCenters)) targetCenters = [];
      if (!Array.isArray(targetBatches)) targetBatches = [];

      // No targeting (empty arrays) - show to all
      if (targetSchools.length === 0 && targetCenters.length === 0 && targetBatches.length === 0) {
        return true;
      }

      // "ALL" in targeting - show to all
      if (targetSchools.includes('ALL') || targetCenters.includes('ALL') || targetBatches.includes('ALL')) {
        return true;
      }

      // Match student's attributes
      const schoolMatch = targetSchools.length === 0 || targetSchools.includes(student.school);
      const centerMatch = targetCenters.length === 0 || targetCenters.includes(student.center);
      const batchMatch = targetBatches.length === 0 || targetBatches.includes(student.batch);

      return schoolMatch && centerMatch && batchMatch;
    });

    // Limit to 100 results
    res.json(targetedJobs.slice(0, 100));
  } catch (error) {
    console.error('Get targeted jobs error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    });
    res.status(500).json({ 
      error: 'Failed to get targeted jobs',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Get single job
 * Replaces: getJob(), getJobDetails()
 */
export async function getJob(req, res) {
  try {
    const { jobId } = req.params;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: true,
        recruiter: {
          include: {
            user: {
              select: {
                email: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Failed to get job' });
  }
}

/**
 * Create job
 * Replaces: createJob(), submitJobForReview()
 */
export async function createJob(req, res) {
  try {
    const userId = req.userId;
    const userRole = req.user.role;
    const jobData = req.body;

    // Get recruiter profile (if recruiter) or use admin
    let recruiterId = null;
    if (userRole === 'RECRUITER') {
      const recruiter = await prisma.recruiter.findUnique({
        where: { userId },
      });

      if (!recruiter) {
        return res.status(403).json({ error: 'Recruiter profile not found' });
      }
      recruiterId = recruiter.id;
    }

    // Find or create company
    let companyId = jobData.companyId;
    if (!companyId && jobData.companyName) {
      const company = await prisma.company.upsert({
        where: { name: jobData.companyName },
        update: {},
        create: {
          name: jobData.companyName,
          location: jobData.companyLocation,
        },
      });
      companyId = company.id;
    }

    // Convert array fields to JSON strings for database storage (SQLite compatibility)
    const processedData = {
      ...jobData,
      requiredSkills: Array.isArray(jobData.requiredSkills) ? JSON.stringify(jobData.requiredSkills) : jobData.requiredSkills,
      requirements: Array.isArray(jobData.requirements) ? JSON.stringify(jobData.requirements) : jobData.requirements,
      targetSchools: Array.isArray(jobData.targetSchools) ? JSON.stringify(jobData.targetSchools) : jobData.targetSchools,
      targetCenters: Array.isArray(jobData.targetCenters) ? JSON.stringify(jobData.targetCenters) : jobData.targetCenters,
      targetBatches: Array.isArray(jobData.targetBatches) ? JSON.stringify(jobData.targetBatches) : jobData.targetBatches,
      driveVenues: Array.isArray(jobData.driveVenues) ? JSON.stringify(jobData.driveVenues) : jobData.driveVenues,
      spocs: Array.isArray(jobData.spocs) ? JSON.stringify(jobData.spocs) : jobData.spocs,
      companyId,
      recruiterId,
      status: userRole === 'ADMIN' ? 'POSTED' : 'IN_REVIEW',
      isPosted: userRole === 'ADMIN',
      submittedAt: userRole !== 'ADMIN' ? new Date() : undefined,
    };

    // Create job
    const job = await prisma.job.create({
      data: processedData,
      include: {
        company: true,
      },
    });

    res.status(201).json(job);
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
}

/**
 * Update job
 * Replaces: updateJob(), updateJobData()
 */
export async function updateJob(req, res) {
  try {
    const { jobId } = req.params;
    const updateData = req.body;

    const job = await prisma.job.update({
      where: { id: jobId },
      data: updateData,
      include: {
        company: true,
      },
    });

    res.json(job);
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
}

/**
 * Post job (admin only)
 * Replaces: postJob() - includes job distribution
 */
export async function postJob(req, res) {
  try {
    const { jobId } = req.params;
    const { selectedSchools, selectedCenters, selectedBatches } = req.body;
    const adminId = req.userId;

    // Update job status
    const job = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'POSTED',
        isPosted: true,
        postedAt: new Date(),
        postedBy: adminId,
        targetSchools: selectedSchools || [],
        targetCenters: selectedCenters || [],
        targetBatches: selectedBatches || [],
      },
      include: {
        company: true,
      },
    });

    // Add job distribution to queue (async background processing)
    await addJobToQueue({
      jobId: job.id,
      jobData: job,
      targeting: {
        targetSchools: selectedSchools || [],
        targetCenters: selectedCenters || [],
        targetBatches: selectedBatches || [],
      },
    });

    // Send email notification to recruiter about job being posted
    try {
      const recruiter = await prisma.recruiter.findUnique({
        where: { id: job.recruiterId },
        include: {
          user: {
            select: {
              email: true,
              displayName: true,
            },
          },
        },
      });

      if (recruiter) {
        await sendJobPostedNotification(job, recruiter);
        logger.info(`Job posted notification sent to recruiter for job ${job.id}`);
      }
    } catch (emailError) {
      // Don't fail the request if email fails - log and continue
      logger.error(`Failed to send job posted notification for job ${job.id}:`, emailError);
    }

    // Send email notifications to matching students about new job
    try {
      // Build query to find matching students based on job targeting
      const where = {
        // Only active students
        user: {
          status: 'ACTIVE',
        },
      };

      // Apply targeting filters if specified
      if (selectedSchools && selectedSchools.length > 0) {
        where.school = { in: selectedSchools };
      }
      if (selectedCenters && selectedCenters.length > 0) {
        where.center = { in: selectedCenters };
      }
      if (selectedBatches && selectedBatches.length > 0) {
        where.batch = { in: selectedBatches };
      }

      // Find matching students
      const matchingStudents = await prisma.student.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              displayName: true,
            },
          },
        },
        take: 500, // Limit to avoid too many emails (adjust as needed)
      });

      if (matchingStudents.length > 0) {
        // Send bulk email notifications to students
        const emailResults = await sendBulkJobNotifications(matchingStudents, job);
        logger.info(
          `New job notifications sent to ${emailResults.successful} students for job ${job.id} (${emailResults.failed} failed)`
        );
      } else {
        logger.info(`No matching students found for job ${job.id} targeting`);
      }
    } catch (emailError) {
      // Don't fail the request if email fails - log and continue
      logger.error(`Failed to send new job notifications to students for job ${job.id}:`, emailError);
    }

    res.json({
      success: true,
      job,
      message: 'Job posted and distribution queued',
    });
  } catch (error) {
    console.error('Post job error:', error);
    res.status(500).json({ error: 'Failed to post job' });
  }
}

/**
 * Approve job (admin)
 * Replaces: approveJob() from jobModeration.js
 */
export async function approveJob(req, res) {
  try {
    const { jobId } = req.params;
    const adminId = req.userId;

    const job = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'ACTIVE',
        isActive: true,
        approvedAt: new Date(),
        approvedBy: adminId,
      },
      include: {
        recruiter: {
          include: {
            user: true,
          },
        },
      },
    });

    // Send notification to recruiter (via queue)
    // TODO: Add notification queue job

    res.json({ success: true, job });
  } catch (error) {
    console.error('Approve job error:', error);
    res.status(500).json({ error: 'Failed to approve job' });
  }
}

/**
 * Reject job (admin)
 * Replaces: rejectJob()
 */
export async function deleteJob(req, res) {
  try {
    const { jobId } = req.params;
    const userId = req.userId;

    // Get user role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // Find job
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        recruiter: {
          include: {
            user: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Only admin or the job's recruiter can delete
    if (user.role !== 'ADMIN' && job.recruiter.user.id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this job' });
    }

    // Delete associated applications first (optional: could archive instead)
    await prisma.application.deleteMany({
      where: { jobId },
    });

    // Delete job
    await prisma.job.delete({
      where: { id: jobId },
    });

    logger.info(`Job ${jobId} deleted by user ${userId}`);

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Delete job error:', error);
    logger.error(`Failed to delete job ${req.params.jobId}:`, error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
}

export async function rejectJob(req, res) {
  try {
    const { jobId } = req.params;
    const { rejectionReason } = req.body;
    const adminId = req.userId;

    const job = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'REJECTED',
        isActive: false,
        isPosted: false,
        rejectedAt: new Date(),
        rejectedBy: adminId,
        rejectionReason: rejectionReason || 'No reason provided',
      },
    });

    // TODO: Send notification to recruiter

    res.json({ success: true, job });
  } catch (error) {
    console.error('Reject job error:', error);
    res.status(500).json({ error: 'Failed to reject job' });
  }
}
