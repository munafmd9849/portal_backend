/**
 * Request Validation Middleware
 * Replaces Firebase security rules validation
 * Uses express-validator for field-level validation
 */

import { body, param, query, validationResult } from 'express-validator';

/**
 * Handle validation errors
 */
export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      errors: errors.array(),
    });
  }
  
  next();
}

/**
 * Student profile validation rules
 */
export const validateStudentProfile = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('enrollmentId').trim().notEmpty().withMessage('Enrollment ID is required'),
  body('school').isIn(['SOT', 'SOM', 'SOH']).withMessage('Valid school is required'),
  body('center').isIn(['BANGALORE', 'NOIDA', 'LUCKNOW', 'PUNE', 'PATNA', 'INDORE'])
    .withMessage('Valid center is required'),
  body('batch').matches(/^\d{2}-\d{2}$/).withMessage('Batch must be in format YY-YY (e.g., 25-29)'),
  body('cgpa').optional().isFloat({ min: 0, max: 10 }).withMessage('CGPA must be between 0 and 10'),
  handleValidationErrors,
];

/**
 * Job creation validation rules
 */
export const validateJob = [
  body('jobTitle').trim().notEmpty().withMessage('Job title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('companyName').trim().notEmpty().withMessage('Company name is required'),
  body('requiredSkills').optional().isArray().withMessage('Required skills must be an array'),
  body('targetSchools').optional().isArray().withMessage('Target schools must be an array'),
  body('targetCenters').optional().isArray().withMessage('Target centers must be an array'),
  body('targetBatches').optional().isArray().withMessage('Target batches must be an array'),
  handleValidationErrors,
];

/**
 * Application validation rules
 */
export const validateApplication = [
  param('jobId').isUUID().withMessage('Invalid job ID'),
  handleValidationErrors,
];

/**
 * UUID parameter validation
 */
export const validateUUID = (paramName = 'id') => [
  param(paramName).isUUID().withMessage(`Invalid ${paramName}`),
  handleValidationErrors,
];
