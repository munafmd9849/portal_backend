/**
 * Swagger / OpenAPI configuration
 * Serves interactive API docs at /api-docs
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routesDir = join(__dirname, '../routes');
const serverFile = join(__dirname, '../server.js');

const port = process.env.PORT || 3000;
const serverUrl =
  process.env.API_BASE_URL ||
  process.env.BACKEND_URL ||
  `http://localhost:${port}`;

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'PWIOI Placement Portal API',
    version: '1.0.0',
    description:
      'REST API for the PWIOI Placement Portal — authentication, student profiles, job postings, applications, assessments, interviews, and admin tooling.',
    contact: {
      name: 'Placement Portal Team',
    },
  },
  servers: [
    {
      url: serverUrl,
      description: process.env.NODE_ENV === 'production' ? 'Production' : 'Development',
    },
  ],
  tags: [
    { name: 'Health', description: 'Server health and root endpoints' },
    { name: 'Auth', description: 'Authentication and account management' },
    { name: 'Public', description: 'Unauthenticated public endpoints' },
    { name: 'Academic', description: 'Academic structure (schools, centers, batches)' },
    { name: 'Students', description: 'Student profiles, resumes, and skills' },
    { name: 'Jobs', description: 'Job postings and recruiter job management' },
    { name: 'Applications', description: 'Job applications and screening' },
    { name: 'Notifications', description: 'User notifications' },
    { name: 'Queries', description: 'Support queries' },
    { name: 'Admin Requests', description: 'Admin admission requests' },
    { name: 'Recruiters', description: 'Recruiter directory and MOU documents' },
    { name: 'Contact', description: 'Contact form submissions' },
    { name: 'Interviews', description: 'Admin interview management' },
    { name: 'Interview Scheduling', description: 'Interview session scheduling' },
    { name: 'Interviewer', description: 'Token-based interviewer session routes' },
    { name: 'Interview Token', description: 'Legacy token-based interview routes' },
    { name: 'Google Calendar', description: 'Google Calendar OAuth and events' },
    { name: 'Calendar', description: 'Unified calendar integration' },
    { name: 'Calendar Role Based', description: 'Role-based calendar events' },
    { name: 'Custom Calendar', description: 'Custom calendar events' },
    { name: 'Endorsements', description: 'Skill endorsements' },
    { name: 'Placement', description: 'Placement tracking' },
    { name: 'Question Bank', description: 'Placement question bank' },
    { name: 'Interview Prep', description: 'Interview preparation sessions' },
    { name: 'Recruiter Screening', description: 'Token-based recruiter screening' },
    { name: 'Resume', description: 'Resume viewing by token' },
    { name: 'Admin Screening', description: 'Admin screening email triggers' },
    { name: 'Admin Jobs', description: 'Admin job applicant tracking' },
    { name: 'Admin Dashboard', description: 'Admin dashboard statistics' },
    { name: 'Admin Readiness', description: 'Placement readiness metrics' },
    { name: 'Job Opportunities', description: 'Job opportunities pipeline dashboard' },
    { name: 'Control Tower', description: 'Control tower analytics' },
    { name: 'Admin Resume ATS', description: 'Bulk ATS resume scoring' },
    { name: 'Admin Student Directory', description: 'Student directory with computed metrics' },
    { name: 'Announcements', description: 'System announcements' },
    { name: 'Super Admin', description: 'Super admin management and analytics' },
    { name: 'Assessments', description: 'Assessment engine, tests, and proctoring' },
    { name: 'Code', description: 'Coding engine run and evaluate' },
    { name: 'Admin Placements', description: 'Admin placement records' },
    { name: 'Admin Placement Calendar', description: 'Placement calendar management' },
    { name: 'Audit Logs', description: 'Audit log access (Super Admin)' },
    { name: 'Mock Interviews', description: 'Mock interview drives and slots' },
    { name: 'AI Mock Interviews', description: 'Guided AI video mock interviews' },
    { name: 'WebRTC', description: 'WebRTC TURN/ICE server config' },
    { name: 'CMS', description: 'Content management' },
    { name: 'Success Stories', description: 'Placement success stories' },
    { name: 'Search', description: 'Global search' },
    { name: 'Assessment Imports', description: 'Bulk assessment question imports' },
    { name: 'OAuth Callbacks', description: 'Google OAuth callback handlers' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token from /api/auth/login or /api/auth/register',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Something went wrong' },
        },
      },
      ValidationErrors: {
        type: 'object',
        properties: {
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                msg: { type: 'string' },
                param: { type: 'string' },
                location: { type: 'string' },
              },
            },
          },
        },
      },
      MessageResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'Bad request — validation failed or invalid input',
        content: {
          'application/json': {
            schema: {
              oneOf: [
                { $ref: '#/components/schemas/Error' },
                { $ref: '#/components/schemas/ValidationErrors' },
              ],
            },
          },
        },
      },
      Unauthorized: {
        description: 'Unauthorized — missing or invalid JWT',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      Forbidden: {
        description: 'Forbidden — insufficient role or permissions',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      InternalServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
    },
  },
};

const swaggerOptions = {
  definition: swaggerDefinition,
  apis: [join(routesDir, '*.js'), serverFile],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Mount Swagger UI and raw OpenAPI JSON on the Express app.
 * @param {import('express').Express} app
 */
export function setupSwagger(app) {
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'PWIOI Placement Portal API',
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
    }),
  );
}

export default { swaggerSpec, setupSwagger };
