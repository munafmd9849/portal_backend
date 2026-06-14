/**
 * Admin Student Directory — computed metrics, never stored on Student
 */

import {
  getStudentDirectory,
  getStudentDirectoryExport,
} from '../services/studentDirectoryMetricsService.js';
import { getStudentPanelExtras } from '../services/studentDirectoryPanelService.js';
import prisma from '../config/database.js';
import jwt from 'jsonwebtoken';
import { getAdminScopeFilter, mergeScopeIntoStudentWhere } from '../utils/adminScope.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
import { getGoogleSheetsSpreadsheetId } from '../services/googleSheetsConfig.js';
import {
  DIRECTORY_EXPORT_HEADERS,
  mapStudentToExportRow,
  buildExportTabName,
} from '../services/studentDirectoryExportFormat.js';
import {
  appendSnapshotToNewTab,
  isGoogleSheetsCredentialsConfigured,
} from '../utils/googleSheetsExport.js';

export async function getDirectory(req, res) {
  try {
    const adminScope = getAdminScopeFilter(req.user.admin, req.user.role);
    const data = await getStudentDirectory(req.query, adminScope);
    res.json(data);
  } catch (error) {
    console.error('getDirectory error:', error);
    res.status(500).json({ error: 'Failed to fetch student directory' });
  }
}

export async function exportDirectory(req, res) {
  try {
    const adminScope = getAdminScopeFilter(req.user.admin, req.user.role);
    const data = await getStudentDirectoryExport(req.query, adminScope);
    res.json(data);
  } catch (error) {
    console.error('exportDirectory error:', error);
    res.status(500).json({ error: 'Failed to export student directory' });
  }
}

export async function exportDirectoryToGoogleSheets(req, res) {
  try {
    const spreadsheetId = getGoogleSheetsSpreadsheetId();
    if (!spreadsheetId) {
      return res.status(503).json({
        error: 'Google Sheets not configured',
        message: 'Set GOOGLE_SHEETS_SPREADSHEET_ID or configure the master workbook URL in Super Admin settings.',
      });
    }

    if (!isGoogleSheetsCredentialsConfigured()) {
      return res.status(503).json({
        error: 'Google Sheets credentials not configured',
        message: 'Set GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON or GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY_PATH on the server.',
      });
    }

    const data = await getStudentDirectoryExport(req.query, getAdminScopeFilter(req.user.admin, req.user.role));
    const students = data.students || [];
    if (students.length === 0) {
      return res.status(400).json({ error: 'No students match the current filters' });
    }

    const result = await appendSnapshotToNewTab({
      spreadsheetId,
      tabName: buildExportTabName(req.query),
      headers: DIRECTORY_EXPORT_HEADERS,
      rows: students.map(mapStudentToExportRow),
    });

    res.json({
      success: true,
      ...result,
      filters: req.query,
    });
  } catch (error) {
    console.error('exportDirectoryToGoogleSheets error:', error);
    res.status(500).json({
      error: 'Failed to export to Google Sheets',
      message: error.message || 'Unknown error',
    });
  }
}

export async function getStudentPanelData(req, res) {
  try {
    const { studentId } = req.params;
    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }

    const adminScope = getAdminScopeFilter(req.user.admin, req.user.role);
    const scopedWhere = mergeScopeIntoStudentWhere({ id: studentId }, adminScope);
    if (scopedWhere.id === '__BLOCKED__') {
      return res.status(403).json({ error: 'Not authorized to view this student' });
    }

    const allowed = await prisma.student.findFirst({
      where: scopedWhere,
      select: { id: true },
    });
    if (!allowed) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const data = await getStudentPanelExtras(studentId);
    if (!data) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(data);
  } catch (error) {
    console.error('getStudentPanelData error:', error);
    res.status(500).json({ error: 'Failed to load student panel data' });
  }
}

/**
 * Short-lived inline view URL for a student's resume (admin / super admin).
 * GET /api/admin/student-directory/:studentId/resumes/:resumeId/view-url
 */
export async function getStudentResumeViewUrl(req, res) {
  try {
    const { studentId, resumeId } = req.params;
    if (!studentId || !resumeId) {
      return res.status(400).json({ error: 'studentId and resumeId are required' });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { userId: true, resumeUrl: true, resumeFileName: true, school: true, center: true, batch: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const adminScope = getAdminScopeFilter(req.user.admin, req.user.role);
    const scopedWhere = mergeScopeIntoStudentWhere({ id: studentId }, adminScope);
    if (scopedWhere.id === '__BLOCKED__') {
      return res.status(403).json({ error: 'Not authorized to view this student resume' });
    }
    const allowed = await prisma.student.findFirst({ where: scopedWhere, select: { id: true } });
    if (!allowed) {
      return res.status(403).json({ error: 'Not authorized to view this student resume' });
    }

    if (resumeId === 'legacy') {
      if (!student.resumeUrl?.trim()) {
        return res.status(404).json({ error: 'Resume not found' });
      }
      return res.json({ url: student.resumeUrl, direct: true });
    }

    const resumeFile = await prisma.studentResumeFile.findFirst({
      where: { id: resumeId, studentId },
      select: { id: true, userId: true },
    });

    if (!resumeFile) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const token = jwt.sign(
      { type: 'student_resume', resumeId, userId: student.userId },
      JWT_SECRET,
      { expiresIn: '5m' },
    );

    res.json({ url: `/api/resume/view?t=${token}` });
  } catch (error) {
    console.error('getStudentResumeViewUrl error:', error);
    res.status(500).json({ error: 'Failed to get resume view URL' });
  }
}
