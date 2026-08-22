import { USERS } from '../fixtures/users.js';

export function jobCreatePayload(title) {
  const deadline = new Date(Date.now() + 14 * 86400000).toISOString();
  const drive = new Date(Date.now() + 21 * 86400000).toISOString();
  return {
    jobTitle: title,
    description: 'E2E created job',
    requirements: 'JavaScript, DSA',
    requiredSkills: ['JavaScript'],
    location: 'Bangalore',
    ctc: '10 LPA',
    salary: '10 LPA',
    applicationDeadline: deadline,
    driveDate: drive,
    jobType: 'FULL_TIME',
    workMode: 'HYBRID',
    experienceLevel: 'FRESHER',
    qualification: 'B.Tech',
    yop: '2028',
    minCgpa: '7.0',
    backlogs: '0',
    recruiterEmails: [{ email: USERS.recruiter.email, name: USERS.recruiter.name }],
    recruiterEmail: USERS.recruiter.email,
    companyName: 'E2E TechCorp',
    targetSchools: ['SOT'],
    targetCenters: ['BANGALORE'],
    targetBatches: ['24-28'],
  };
}
