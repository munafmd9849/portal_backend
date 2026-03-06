/**
 * Email Configuration
 * Uses SendGrid HTTP API when configured (works on Render free tier - SMTP ports are blocked)
 * Falls back to Nodemailer SMTP for local/dev
 */

import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from the backend root directory (parent of src/)
dotenv.config({ path: join(__dirname, '../../.env') });

// Use SendGrid API when: EMAIL_HOST includes sendgrid OR SENDGRID_API_KEY set
// Render free tier blocks SMTP ports 25/465/587 - HTTP API works via port 443
const useSendGridApi = () => {
  const apiKey = process.env.SENDGRID_API_KEY || (process.env.EMAIL_HOST?.includes('sendgrid') ? process.env.EMAIL_PASS : null);
  return !!apiKey;
};

const getSendGridApiKey = () => process.env.SENDGRID_API_KEY || process.env.EMAIL_PASS;

if (!process.env.EMAIL_USER && !process.env.EMAIL_PASS && !process.env.SENDGRID_API_KEY) {
  console.warn('⚠️ Email credentials not configured. Email features will not work.');
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
});

/**
 * Verify email transporter and return status for startup logging
 */
export async function verifyEmailTransport() {
  if (useSendGridApi()) {
    sgMail.setApiKey(getSendGridApiKey());
    const fromAddr = process.env.EMAIL_FROM || 'PWIOI Portal <noreply@pwioi.com>';
    console.log('[EMAIL] SendGrid API mode. FROM:', fromAddr, '(verify this sender in SendGrid dashboard)');
    try {
      // Quick validation - SendGrid API works over HTTPS (port 443), not blocked on Render
      return { ready: true, message: 'Ready (SendGrid API)' };
    } catch (e) {
      return { ready: false, message: e?.message || 'SendGrid API error' };
    }
  }
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return { ready: false, message: 'Not configured (add EMAIL_* or SENDGRID_API_KEY to Render env)' };
  }
  const timeoutMs = 8000;
  try {
    await Promise.race([
      transporter.verify(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SMTP verify timeout')), timeoutMs)
      ),
    ]);
    return { ready: true, message: 'Ready (SMTP)' };
  } catch (error) {
    const msg = error?.message || String(error);
    const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
    if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
      const hint = host.includes('sendgrid')
        ? 'Render free tier blocks SMTP. Set SENDGRID_API_KEY to use SendGrid HTTP API.'
        : 'SMTP timeout. For Render free tier: use SendGrid (EMAIL_HOST=smtp.sendgrid.net + EMAIL_PASS=api_key)';
      return { ready: false, message: hint };
    }
    if (msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')) {
      return { ready: false, message: 'Cannot reach SMTP server (network/DNS)' };
    }
    if (msg.includes('Invalid login') || msg.includes('Authentication') || msg.includes('535')) {
      return { ready: false, message: 'Auth failed - use Gmail App Password or SendGrid API key' };
    }
    return { ready: false, message: msg.substring(0, 80) };
  }
}

/**
 * Send email (uses SendGrid API when configured, otherwise SMTP)
 * @param {Object} options - Email options
 * @param {string|string[]} options.to - Recipient(s)
 * @param {string} options.subject - Subject
 * @param {string} options.html - HTML body
 * @param {string} options.text - Plain text body
 * @param {Array} options.attachments - Optional (SendGrid API supports attachments)
 * @returns {Promise<Object>} Email result
 */
export async function sendEmail({ to, subject, html, text, cc, bcc, attachments }) {
  const fromAddr = process.env.EMAIL_FROM || 'PWIOI Portal <noreply@pwioi.com>';
  const toArr = Array.isArray(to) ? to : [to];

  if (useSendGridApi()) {
    sgMail.setApiKey(getSendGridApiKey());
    try {
      console.log(`Sending email to: ${to} via SendGrid API`);
      const msg = {
        to: toArr,
        from: fromAddr,
        subject,
        html: html || text,
        text: text || undefined,
      };
      if (attachments?.length) {
        msg.attachments = attachments.map(a => ({
          content: a.content ? (Buffer.isBuffer(a.content) ? a.content.toString('base64') : a.content) : undefined,
          filename: a.filename,
        })).filter(a => a.content && a.filename);
      }
      const [res] = await sgMail.send(msg);
      console.log(`Email sent successfully. MessageId: ${res?.headers?.['x-message-id'] || 'ok'}`);
      return { success: true, messageId: res?.headers?.['x-message-id'] || 'sent' };
    } catch (error) {
      console.error('Email send error:', error);
      console.error('Error details:', { message: error.message, code: error.code });
      throw error;
    }
  }

  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email configuration missing: EMAIL_USER and EMAIL_PASS must be set');
    }
    console.log(`Sending email to: ${to} via ${process.env.EMAIL_HOST}`);
    const mailOptions = {
      from: fromAddr,
      to: toArr.join(', '),
      subject,
      html,
      text,
      cc,
      bcc,
    };
    if (attachments?.length) mailOptions.attachments = attachments;
    const result = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully. MessageId: ${result.messageId}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    console.error('Error details:', { code: error.code, message: error.message });
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
