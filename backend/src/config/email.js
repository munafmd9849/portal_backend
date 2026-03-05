/**
 * Email Configuration (Nodemailer)
 * Replaces Firebase Functions for email sending
 * Used with BullMQ for async email processing
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from the backend root directory (parent of src/)
dotenv.config({ path: join(__dirname, '../../.env') });

// Validate email credentials
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn('⚠️ Email credentials not configured. Email features will not work.');
  console.warn('Please set EMAIL_USER and EMAIL_PASS in your .env file');
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false // Allow self-signed certificates (for development)
  }
});

/**
 * Verify email transporter and return status for startup logging
 * Includes timeout - SMTP verify can hang on cloud (Gmail often blocks cloud IPs)
 * @returns {Promise<{ready: boolean, message: string}>}
 */
export async function verifyEmailTransport() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return { ready: false, message: 'Not configured (add EMAIL_USER, EMAIL_PASS to Render env)' };
  }
  const timeoutMs = 8000; // SMTP verify can hang; fail fast for startup log
  try {
    await Promise.race([
      transporter.verify(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SMTP verify timeout (Gmail may block cloud IPs)')), timeoutMs)
      ),
    ]);
    return { ready: true, message: 'Ready' };
  } catch (error) {
    const msg = error?.message || String(error);
    const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const isGmail = host.includes('gmail');
    if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
      const hint = isGmail && process.env.NODE_ENV === 'production'
        ? 'Gmail blocks cloud IPs. Add SendGrid to Render env: EMAIL_HOST=smtp.sendgrid.net, EMAIL_USER=apikey, EMAIL_PASS=<key>'
        : 'Timeout - Gmail often blocks cloud IPs; try Resend/SendGrid';
      return { ready: false, message: hint };
    }
    if (msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')) {
      return { ready: false, message: 'Cannot reach SMTP server (network/DNS)' };
    }
    if (msg.includes('Invalid login') || msg.includes('Authentication') || msg.includes('535')) {
      return { ready: false, message: 'Auth failed - use Gmail App Password' };
    }
    return { ready: false, message: msg.substring(0, 60) };
  }
}

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string|string[]} options.to - Recipient(s)
 * @param {string} options.subject - Subject
 * @param {string} options.html - HTML body
 * @param {string} options.text - Plain text body
 * @param {Array} options.attachments - Optional [{ filename, href } or { filename, content }]
 * @returns {Promise<Object>} Email result
 */
export async function sendEmail({ to, subject, html, text, cc, bcc, attachments }) {
  try {
    // Validate email configuration
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email configuration missing: EMAIL_USER and EMAIL_PASS must be set');
    }

    console.log(`Sending email to: ${to} via ${process.env.EMAIL_HOST}`);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'PWIOI Portal <noreply@pwioi.com>',
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text,
      cc,
      bcc,
    };
    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments;
    }
    
    const result = await transporter.sendMail(mailOptions);

    console.log(`Email sent successfully. MessageId: ${result.messageId}`);
    
    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error('Email send error:', error);
    console.error('Error details:', {
      code: error.code,
      command: error.command,
      response: error.response,
      message: error.message
    });
    throw error;
  }
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Send email to multiple recipients (sequential with delay to avoid Gmail/SMTP rate limits)
 * @param {string[]} recipients - Email addresses
 * @param {string} subject - Subject
 * @param {string} html - HTML body
 * @param {string} text - Plain text body
 * @param {number} delayMs - Delay between emails (Gmail needs ~1.5s to avoid 421; SendGrid ~500ms)
 * @returns {Promise<Object>} Results
 */
export async function sendBulkEmail(recipients, subject, html, text, delayMs) {
  const isGmail = (process.env.EMAIL_HOST || '').includes('gmail');
  const gap = delayMs ?? (isGmail ? 1800 : 600);
  let successful = 0;
  let failed = 0;

  for (const email of recipients) {
    try {
      await sendEmail({ to: email, subject, html, text });
      successful++;
    } catch (err) {
      failed++;
      console.error(`Email to ${email} failed:`, err?.message || err);
    }
    if (recipients.indexOf(email) < recipients.length - 1) {
      await delay(gap);
    }
  }

  return { total: recipients.length, successful, failed };
}

export default transporter;
