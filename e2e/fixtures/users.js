export const E2E_PASSWORD = process.env.E2E_PASSWORD || 'E2ePass#143';

export const USERS = {
  superAdmin: {
    id: 'U-SA',
    email: 'e2e.super@pwioi.test',
    role: 'SUPER_ADMIN',
    name: 'E2E Super Admin',
  },
  adminA: {
    id: 'U-AA',
    email: 'e2e.admin.sot@pwioi.test',
    role: 'ADMIN',
    name: 'E2E Admin SOT',
  },
  adminB: {
    id: 'U-AB',
    email: 'e2e.admin.som@pwioi.test',
    role: 'ADMIN',
    name: 'E2E Admin SOM',
  },
  adminEmpty: {
    id: 'U-AE',
    email: 'e2e.admin.empty@pwioi.test',
    role: 'ADMIN',
    name: 'E2E Admin Empty Scope',
  },
  recruiter: {
    id: 'U-RC',
    email: 'e2e.recruiter@pwioi.test',
    role: 'RECRUITER',
    name: 'E2E Recruiter',
  },
  recruiterPending: {
    id: 'U-RP',
    email: 'e2e.recruiter.pending@pwioi.test',
    role: 'RECRUITER',
    name: 'E2E Recruiter Pending',
  },
  studentA: {
    id: 'U-ST-A',
    email: 'e2e.student.a@pwioi.test',
    role: 'STUDENT',
    name: 'E2E Student A',
  },
  studentB: {
    id: 'U-ST-B',
    email: 'e2e.student.b@pwioi.test',
    role: 'STUDENT',
    name: 'E2E Student B',
  },
  studentIncomplete: {
    id: 'U-ST-I',
    email: 'e2e.student.incomplete@pwioi.test',
    role: 'STUDENT',
    name: 'E2E Student Incomplete',
  },
  studentBlocked: {
    id: 'U-ST-X',
    email: 'e2e.student.blocked@pwioi.test',
    role: 'STUDENT',
    name: 'E2E Student Blocked',
  },
  studentReset: {
    id: 'U-ST-R',
    email: 'e2e.student.reset@pwioi.test',
    role: 'STUDENT',
    name: 'E2E Student Reset',
  },
};

export const ACADEMIC = {
  sot: { name: 'School of Technology', code: 'SOT' },
  som: { name: 'School of Management', code: 'SOM' },
  bangalore: { name: 'BANGALORE', location: 'Bangalore' },
  hyderabad: { name: 'HYDERABAD', location: 'Hyderabad' },
  batch2428: { year: '24-28', label: '2024–2028' },
  batch2327: { year: '23-27', label: '2023–2027' },
};
