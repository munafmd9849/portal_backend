/**
 * Email Service
 * Reusable email service for SMTP-based email functionality
 * Uses nodemailer with configuration from .env
 */

import { sendEmail } from '../config/email.js';
import logger from '../config/logger.js';

/**
 * Send OTP email
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit OTP
 * @returns {Promise<Object>} Result
 */
export async function sendOTP(email, otp) {
  try {
    const subject = 'Your PWIOI Portal Verification Code';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Email Verification</h2>
        <p>Hello,</p>
        <p>Your verification code for PWIOI Placement Portal is:</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
          <h1 style="color: #0066cc; margin: 0; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">This is an automated email from PWIOI Placement Portal.</p>
      </div>
    `;
    const text = `Your verification code is: ${otp}. This code will expire in 5 minutes.`;

    const result = await sendEmail({ to: email, subject, html, text });
    
    logger.info(`OTP email sent to ${email}`);
    return { success: true, ...result };
  } catch (error) {
    logger.error(`Failed to send OTP email to ${email}:`, error);
    throw error;
  }
}

/**
 * Send job posted notification to recruiter
 * @param {Object} job - Job object
 * @param {Object} recruiter - Recruiter object with user info
 * @returns {Promise<Object>} Result
 */
export async function sendJobPostedNotification(job, recruiter) {
  try {
    const recruiterEmail = recruiter.user?.email || recruiter.email;
    if (!recruiterEmail) {
      throw new Error('Recruiter email not found');
    }

    const subject = `Job Posted: ${job.jobTitle} at ${job.company?.name || 'Company'}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Job Successfully Posted!</h2>
        <p>Hello,</p>
        <p>Your job posting has been approved and posted to the portal.</p>
        <div style="background: #f4f4f4; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin-top: 0; color: #0066cc;">${job.jobTitle}</h3>
          <p><strong>Company:</strong> ${job.company?.name || 'N/A'}</p>
          <p><strong>Location:</strong> ${job.location || 'N/A'}</p>
          <p><strong>Posted Date:</strong> ${new Date(job.postedAt).toLocaleDateString()}</p>
        </div>
        <p>Students matching your job criteria will be notified automatically.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">This is an automated email from PWIOI Placement Portal.</p>
      </div>
    `;
    const text = `Your job posting "${job.jobTitle}" has been approved and posted. Students matching your criteria will be notified.`;

    const result = await sendEmail({ to: recruiterEmail, subject, html, text });
    
    logger.info(`Job posted notification sent to ${recruiterEmail} for job ${job.id}`);
    return { success: true, ...result };
  } catch (error) {
    logger.error(`Failed to send job posted notification:`, error);
    throw error;
  }
}

/**
 * Send application notification
 * Sends to both recruiter (new application) and applicant (confirmation)
 * @param {Object} applicant - Student/applicant object
 * @param {Object} job - Job object
 * @param {Object} recruiter - Recruiter object
 * @returns {Promise<Object>} Result
 */
export async function sendApplicationNotification(applicant, job, recruiter) {
  try {
    const results = [];

    // Email to recruiter - new application
    const recruiterEmail = recruiter?.user?.email || recruiter?.email;
    if (recruiterEmail) {
      const recruiterSubject = `New Application: ${applicant.fullName || applicant.email} applied for ${job.jobTitle}`;
      const recruiterHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Job Application</h2>
          <p>Hello,</p>
          <p>You have received a new application for your job posting.</p>
          <div style="background: #f4f4f4; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3 style="margin-top: 0; color: #0066cc;">${job.jobTitle}</h3>
            <p><strong>Applicant:</strong> ${applicant.fullName || applicant.email}</p>
            <p><strong>Company:</strong> ${job.company?.name || 'N/A'}</p>
            <p><strong>Applied Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <p>Please review the application in your dashboard.</p>
        </div>
      `;
      const recruiterText = `New application from ${applicant.fullName || applicant.email} for ${job.jobTitle}.`;

      const recruiterResult = await sendEmail({ 
        to: recruiterEmail, 
        subject: recruiterSubject, 
        html: recruiterHtml, 
        text: recruiterText 
      });
      results.push({ type: 'recruiter', ...recruiterResult });
      logger.info(`Application notification sent to recruiter ${recruiterEmail}`);
    }

    // Email to applicant - confirmation
    const applicantEmail = applicant.email;
    if (applicantEmail) {
      const applicantSubject = `Application Confirmation: ${job.jobTitle}`;
      const applicantHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Application Received</h2>
          <p>Hello ${applicant.fullName || 'Student'},</p>
          <p>Your application has been successfully submitted!</p>
          <div style="background: #f4f4f4; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3 style="margin-top: 0; color: #0066cc;">${job.jobTitle}</h3>
            <p><strong>Company:</strong> ${job.company?.name || 'N/A'}</p>
            <p><strong>Location:</strong> ${job.location || 'N/A'}</p>
            <p><strong>Applied Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <p>The recruiter will review your application and contact you if you're shortlisted.</p>
          <p>You can track your application status in your dashboard.</p>
        </div>
      `;
      const applicantText = `Your application for ${job.jobTitle} at ${job.company?.name || 'Company'} has been received.`;

      const applicantResult = await sendEmail({ 
        to: applicantEmail, 
        subject: applicantSubject, 
        html: applicantHtml, 
        text: applicantText 
      });
      results.push({ type: 'applicant', ...applicantResult });
      logger.info(`Application confirmation sent to applicant ${applicantEmail}`);
    }

    return { success: true, results };
  } catch (error) {
    logger.error(`Failed to send application notification:`, error);
    throw error;
  }
}

/**
 * Send new job notification to student
 * @param {Object} student - Student object with email
 * @param {Object} job - Job object
 * @returns {Promise<Object>} Result
 */
export async function sendNewJobNotification(student, job) {
  try {
    const studentEmail = student.email || student.user?.email;
    if (!studentEmail) {
      throw new Error('Student email not found');
    }

    const subject = `New Job Opportunity: ${job.jobTitle} at ${job.company?.name || 'Company'}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Job Posted! 🎯</h2>
        <p>Hello ${student.fullName || 'Student'},</p>
        <p>A new job opportunity matching your profile has been posted!</p>
        <div style="background: #f4f4f4; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin-top: 0; color: #0066cc;">${job.jobTitle}</h3>
          <p><strong>Company:</strong> ${job.company?.name || 'N/A'}</p>
          <p><strong>Location:</strong> ${job.location || 'N/A'}</p>
          ${job.salary ? `<p><strong>Salary:</strong> ${job.salary}</p>` : ''}
          ${job.type ? `<p><strong>Type:</strong> ${job.type}</p>` : ''}
          ${job.description ? `<p><strong>Description:</strong> ${job.description.substring(0, 200)}${job.description.length > 200 ? '...' : ''}</p>` : ''}
          <p><strong>Posted Date:</strong> ${new Date(job.postedAt).toLocaleDateString()}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/jobs/${job.id}" 
             style="background: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Job Details
          </a>
        </div>
        <p>Don't miss this opportunity! Apply now through your dashboard.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">This is an automated email from PWIOI Placement Portal.</p>
      </div>
    `;
    const text = `New job posted: ${job.jobTitle} at ${job.company?.name || 'Company'}. Location: ${job.location || 'N/A'}. Apply now through your dashboard.`;

    const result = await sendEmail({ to: studentEmail, subject, html, text });
    
    logger.info(`New job notification sent to student ${studentEmail} for job ${job.id}`);
    return { success: true, ...result };
  } catch (error) {
    logger.error(`Failed to send new job notification to student:`, error);
    throw error;
  }
}

/**
 * Send new job notifications to multiple students
 * @param {Object[]} students - Array of student objects
 * @param {Object} job - Job object
 * @returns {Promise<Object>} Results summary
 */
export async function sendBulkJobNotifications(students, job) {
  try {
    const results = await Promise.allSettled(
      students.map(student => sendNewJobNotification(student, job))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    logger.info(`Bulk job notifications sent: ${successful} successful, ${failed} failed for job ${job.id}`);

    return {
      success: true,
      total: students.length,
      successful,
      failed,
    };
  } catch (error) {
    logger.error(`Failed to send bulk job notifications:`, error);
    throw error;
  }
}

/**
 * Send application status update notification to student
 * @param {Object} student - Student object with email
 * @param {Object} job - Job object
 * @param {Object} application - Application object with status
 * @returns {Promise<Object>} Result
 */
export async function sendApplicationStatusUpdateNotification(student, job, application) {
  try {
    const studentEmail = student.email || student.user?.email;
    if (!studentEmail) {
      throw new Error('Student email not found');
    }

    const statusMessages = {
      'SHORTLISTED': {
        title: 'Congratulations! You\'ve been shortlisted! 🎉',
        message: 'Great news! Your application has been shortlisted. The recruiter will contact you soon for the next steps.',
        color: '#28a745',
      },
      'INTERVIEWED': {
        title: 'Interview Scheduled',
        message: 'Your interview has been scheduled. Please check your dashboard for details.',
        color: '#17a2b8',
      },
      'OFFERED': {
        title: 'Congratulations! You\'ve received an offer! 🎊',
        message: 'Congratulations! You have received an offer for this position. Please check your dashboard for details.',
        color: '#28a745',
      },
      'SELECTED': {
        title: 'Congratulations! You\'ve been selected! 🎊',
        message: 'Congratulations! You have been selected for this position. The recruiter will contact you with next steps.',
        color: '#28a745',
      },
      'REJECTED': {
        title: 'Application Update',
        message: 'Thank you for your interest. Unfortunately, your application has not been selected for this position. Keep applying to other opportunities!',
        color: '#dc3545',
      },
      'JOB_REMOVED': {
        title: 'Job Position Removed',
        message: 'The job position you applied for has been removed by the company.',
        color: '#ffc107',
      },
    };

    const statusInfo = statusMessages[application.status] || {
      title: 'Application Status Updated',
      message: `Your application status has been updated to ${application.status}.`,
      color: '#0066cc',
    };

    const subject = `${statusInfo.title} - ${job.jobTitle} at ${job.company?.name || 'Company'}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${statusInfo.title}</h2>
        <p>Hello ${student.fullName || 'Student'},</p>
        <p>${statusInfo.message}</p>
        <div style="background: #f4f4f4; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid ${statusInfo.color};">
          <h3 style="margin-top: 0; color: #0066cc;">${job.jobTitle}</h3>
          <p><strong>Company:</strong> ${job.company?.name || 'N/A'}</p>
          <p><strong>Location:</strong> ${job.location || 'N/A'}</p>
          <p><strong>Status:</strong> <span style="color: ${statusInfo.color}; font-weight: bold;">${application.status}</span></p>
          ${application.interviewDate ? `<p><strong>Interview Date:</strong> ${new Date(application.interviewDate).toLocaleDateString()}</p>` : ''}
          ${application.appliedDate ? `<p><strong>Applied Date:</strong> ${new Date(application.appliedDate).toLocaleDateString()}</p>` : ''}
          ${application.notes ? `<p><strong>Notes:</strong> ${application.notes}</p>` : ''}
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/student" 
             style="background: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Application Status
          </a>
        </div>
        <p>You can track your application status and view more details in your dashboard.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">This is an automated email from PWIOI Placement Portal.</p>
      </div>
    `;
    const text = `${statusInfo.title}\n\nHello ${student.fullName || 'Student'},\n\n${statusInfo.message}\n\nJob: ${job.jobTitle}\nCompany: ${job.company?.name || 'N/A'}\nStatus: ${application.status}${application.interviewDate ? `\nInterview Date: ${new Date(application.interviewDate).toLocaleDateString()}` : ''}\n\nView your application status in your dashboard.`;

    const result = await sendEmail({ to: studentEmail, subject, html, text });
    
    logger.info(`Application status update notification sent to ${studentEmail} for application ${application.id}`);
    return { success: true, ...result };
  } catch (error) {
    logger.error(`Failed to send application status update notification:`, error);
    throw error;
  }
}

/**
 * Send password reset OTP email
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit OTP
 * @returns {Promise<Object>} Result
 */
export async function sendPasswordResetOTP(email, otp) {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetPasswordUrl = `${frontendUrl}/reset-password?email=${encodeURIComponent(email)}`;
    
    const subject = 'Password Reset - PWIOI Portal';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hello,</p>
        <p>You requested to reset your password for PWIOI Placement Portal.</p>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetPasswordUrl}" 
             style="background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p>Or use this code to reset your password:</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
          <h1 style="color: #dc3545; margin: 0; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">This is an automated email from PWIOI Placement Portal.</p>
      </div>
    `;
    const text = `You requested to reset your password. Click here to reset: ${resetPasswordUrl}\n\nOr use this code: ${otp}. This code will expire in 10 minutes. If you didn't request a password reset, please ignore this email.`;

    const result = await sendEmail({ to: email, subject, html, text });
    
    logger.info(`Password reset OTP email sent to ${email}`);
    return { success: true, ...result };
  } catch (error) {
    logger.error(`Failed to send password reset OTP email to ${email}:`, error);
    throw error;
  }
}

/**
 * Send generic notification email
 * @param {string} email - Recipient email
 * @param {string} subject - Email subject
 * @param {string} message - Email message (HTML or plain text)
 * @returns {Promise<Object>} Result
 */
export async function sendGenericNotification(email, subject, message) {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f4f4f4; padding: 20px; margin: 20px 0; border-radius: 5px;">
          ${message}
        </div>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">This is an automated email from PWIOI Placement Portal.</p>
      </div>
    `;

    const result = await sendEmail({ to: email, subject, html, text: message });
    
    logger.info(`Generic notification sent to ${email}`);
    return { success: true, ...result };
  } catch (error) {
    logger.error(`Failed to send generic notification to ${email}:`, error);
    throw error;
  }
}

