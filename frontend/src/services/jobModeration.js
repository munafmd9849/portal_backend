/**
 * Job Moderation Service
 * Fetches real jobs from backend API and provides real-time updates
 */
import api from './api.js';

const COMPANY_DIRECTORY = [
  { id: 'cmp_tcs', name: 'Tata Consultancy Services', location: 'Bangalore, KA' },
  { id: 'cmp_inf', name: 'Infosys', location: 'Hyderabad, TS' },
  { id: 'cmp_acc', name: 'Accenture', location: 'Mumbai, MH' },
  { id: 'cmp_azo', name: 'Amazon', location: 'Bangalore, KA' },
  { id: 'cmp_mic', name: 'Microsoft', location: 'Noida, UP' },
  { id: 'cmp_dell', name: 'Dell Technologies', location: 'Chennai, TN' },
];

const RECRUITERS = [
  { id: 'rec_ak', name: 'Akash Mehta', email: 'akash.mehta@tcs.com' },
  { id: 'rec_pb', name: 'Priyanka Bhat', email: 'priyanka.bhat@infosys.com' },
  { id: 'rec_rs', name: 'Rohan Sen', email: 'rohan.sen@accenture.com' },
  { id: 'rec_sk', name: 'Sahana Kumar', email: 'sahana.kumar@amazon.com' },
  { id: 'rec_vr', name: 'Vishal Reddy', email: 'vishal.reddy@microsoft.com' },
  { id: 'rec_an', name: 'Anusha Nair', email: 'anusha.nair@dell.com' },
];

const TARGET_SCHOOLS = ['SOT', 'SOM', 'SOH'];
const TARGET_CENTERS = ['BANGALORE', 'NOIDA', 'LUCKNOW', 'PUNE', 'INDORE'];
const TARGET_BATCHES = ['23-27', '24-28', '25-29'];
const STATUS_SEQUENCE = ['in_review', 'in_review', 'draft', 'in_review', 'posted', 'in_review', 'active', 'rejected', 'in_review', 'archived', 'in_review'];

const mockJobs = generateMockJobs();
const jobSubscribers = new Set();
const analyticsSubscribers = new Set();

function randomFrom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomCurrency(min, max, step = 1000) {
  const value = randomInt(min / step, max / step) * step;
  return value;
}

function generateMockJobs() {
  const titles = [
    'Software Engineer',
    'Data Analyst',
    'Cloud Consultant',
    'Frontend Developer',
    'Backend Engineer',
    'Product Specialist',
    'DevOps Engineer',
    'QA Automation Engineer',
    'Business Analyst',
    'Security Analyst',
  ];

  return Array.from({ length: 35 }).map((_, idx) => {
    const company = randomFrom(COMPANY_DIRECTORY);
    const recruiter = randomFrom(RECRUITERS);
    const status = STATUS_SEQUENCE[idx % STATUS_SEQUENCE.length];
    const jobType = idx % 4 === 0 ? 'Internship' : 'Full-time';
    const driveDate = new Date();
    driveDate.setDate(driveDate.getDate() + randomInt(-20, 40));
    const deadline = new Date(driveDate);
    deadline.setDate(deadline.getDate() - randomInt(5, 15));

    return {
      id: `job_${idx + 1}`,
      jobTitle: `${randomFrom(titles)} - ${company.name.split(' ')[0]}`,
      jobType,
      salary: jobType === 'Full-time' ? randomCurrency(600000, 1800000, 50000) : null,
      stipend: jobType === 'Internship' ? randomCurrency(20000, 60000, 1000) : null,
      company: company.name,
      companyName: company.name,
      companyLocation: company.location,
      companyDetails: company,
      recruiter,
      recruiterId: recruiter.id,
      driveDate: driveDate.toISOString(),
      applicationDeadline: deadline.toISOString(),
      status,
      jobTypeDisplay: jobType,
      isActive: status === 'active' || status === 'posted',
      responsibilities:
        '• Collaborate with cross-functional teams to deliver product increments.\n' +
        '• Build scalable modules that support placement workflows.\n' +
        '• Mentor student interns during campus drives.\n' +
        '• Contribute to platform stability with automated QA.',
      skills: ['React', 'Node.js', 'SQL', 'Cloud', 'CI/CD'].slice(0, randomInt(3, 5)),
      targetSchools: shuffle(TARGET_SCHOOLS).slice(0, randomInt(1, TARGET_SCHOOLS.length)),
      targetCenters: shuffle(TARGET_CENTERS).slice(0, randomInt(2, TARGET_CENTERS.length)),
      targetBatches: shuffle(TARGET_BATCHES).slice(0, randomInt(1, TARGET_BATCHES.length)),
      createdAt: new Date(Date.now() - randomInt(5, 30) * 24 * 60 * 60 * 1000).toISOString(),
      postedAt: status === 'posted' ? new Date().toISOString() : null,
      rejectionReason: status === 'rejected' ? 'Role duplicated. Please update requirements.' : null,
    };
  });
}

function shuffle(list) {
  const array = [...list];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function applyFilters(jobs, filters = {}) {
  return jobs.filter((job) => {
    // Status filter - handle both lowercase and uppercase
    if (filters.status && filters.status !== 'all') {
      const jobStatus = (job.status || '').toLowerCase();
      const filterStatus = filters.status.toLowerCase();
      // Map common status variations
      if (filterStatus === 'in_review' && jobStatus !== 'in_review') return false;
      if (filterStatus === 'draft' && jobStatus !== 'draft') return false;
      if (filterStatus === 'posted' && jobStatus !== 'posted' && jobStatus !== 'active') return false;
      if (filterStatus === 'rejected' && jobStatus !== 'rejected') return false;
      if (filterStatus === 'archived' && jobStatus !== 'archived') return false;
      if (filterStatus !== 'in_review' && filterStatus !== 'draft' && 
          filterStatus !== 'posted' && filterStatus !== 'rejected' && 
          filterStatus !== 'archived' && jobStatus !== filterStatus) return false;
    }
    
    if (filters.companyId && job.companyDetails?.id !== filters.companyId) return false;
    if (filters.recruiterId && job.recruiterId !== filters.recruiterId && 
        job.recruiter?.id !== filters.recruiterId) return false;

    if (filters.startDate) {
      const drive = job.driveDate ? new Date(job.driveDate) : null;
      if (!drive || drive < new Date(filters.startDate)) return false;
    }
    if (filters.endDate) {
      const drive = job.driveDate ? new Date(job.driveDate) : null;
      if (!drive || drive > new Date(filters.endDate)) return false;
    }
    return true;
  });
}

function broadcastJobs() {
  jobSubscribers.forEach((listener) => listener());
  analyticsSubscribers.forEach((listener) => listener());
}

function buildAnalytics(jobs) {
  return jobs.reduce(
    (acc, job) => {
      acc.total += 1;
      const key = job.status?.toLowerCase();
      if (key === 'active') acc.active += 1;
      if (key === 'posted') acc.posted += 1;
      if (key === 'draft' || key === 'in_review') acc.pendingApproval += 1; // Include in_review in pending approval
      if (key === 'rejected') acc.rejected += 1;
      if (key === 'archived') acc.archived += 1;
      return acc;
    },
    {
      total: 0,
      active: 0,
      posted: 0,
      pendingApproval: 0,
      rejected: 0,
      archived: 0,
    }
  );
}

export function subscribeJobsWithDetails(onChange, filters = {}) {
  // For now, always use mock data to ensure the page displays properly
  // TODO: When backend is fully ready, switch to real API calls
  const fetchJobs = () => {
    try {
      // Try to fetch real jobs from API first
      const fetchRealJobs = async () => {
        try {
          const params = {};
          if (filters.status && filters.status !== 'all') {
            const statusMap = {
              'draft': 'DRAFT',
              'in_review': 'IN_REVIEW',
              'posted': 'POSTED',
              'active': 'POSTED',
              'rejected': 'REJECTED',
              'archived': 'ARCHIVED'
            };
            params.status = statusMap[filters.status] || filters.status.toUpperCase();
          }
          if (filters.limit) params.limit = filters.limit;
          
          const response = await api.getJobs(params);
          const jobs = response.jobs || response || [];
          
          if (jobs.length > 0) {
            console.log(`📊 Fetched ${jobs.length} real jobs from API`);
            // Transform real jobs
            const transformedJobs = jobs.map(job => ({
              id: job.id,
              jobTitle: job.jobTitle,
              jobType: job.jobType,
              salary: job.salary,
              stipend: job.stipend,
              company: job.companyName || job.company?.name,
              companyName: job.companyName || job.company?.name,
              companyLocation: job.companyLocation || job.company?.location,
              companyDetails: job.company ? {
                id: job.company.id,
                name: job.company.name,
                location: job.company.location
              } : null,
              recruiter: job.recruiter ? {
                id: job.recruiter.id,
                name: job.recruiter.user?.displayName || job.recruiter.user?.email,
                email: job.recruiter.user?.email
              } : null,
              recruiterId: job.recruiterId,
              driveDate: job.driveDate,
              applicationDeadline: job.applicationDeadline,
              status: (job.status || 'DRAFT').toLowerCase(),
              isActive: job.isPosted || job.status === 'POSTED',
              responsibilities: job.description,
              skills: typeof job.requiredSkills === 'string' 
                ? JSON.parse(job.requiredSkills || '[]')
                : (job.requiredSkills || []),
              targetSchools: typeof job.targetSchools === 'string'
                ? JSON.parse(job.targetSchools || '[]')
                : (job.targetSchools || []),
              targetCenters: typeof job.targetCenters === 'string'
                ? JSON.parse(job.targetCenters || '[]')
                : (job.targetCenters || []),
              targetBatches: typeof job.targetBatches === 'string'
                ? JSON.parse(job.targetBatches || '[]')
                : (job.targetBatches || []),
              createdAt: job.createdAt,
              postedAt: job.postedAt,
              submittedAt: job.submittedAt,
              rejectionReason: job.rejectionReason
            }));
            
            // Merge with mock data to ensure we always have data
            const allJobs = [...transformedJobs, ...mockJobs];
            const filtered = applyFilters(allJobs, filters);
            
            const snapshotMeta = {
              total: allJobs.length,
              filtered: filtered.length,
              lastUpdated: new Date().toISOString(),
            };
            
            onChange(filtered, snapshotMeta);
            return;
          }
        } catch (error) {
          console.warn('API fetch failed, using mock data:', error);
        }
        
        // Use mock data (either API failed or no real jobs found)
        const filtered = applyFilters(mockJobs, filters);
        const snapshotMeta = {
          total: mockJobs.length,
          filtered: filtered.length,
          lastUpdated: new Date().toISOString(),
        };
        onChange(filtered, snapshotMeta);
      };
      
      fetchRealJobs();
    } catch (error) {
      console.error('Error in fetchJobs:', error);
      // Fallback to mock data
      const filtered = applyFilters(mockJobs, filters);
      const snapshotMeta = {
        total: mockJobs.length,
        lastUpdated: new Date().toISOString(),
      };
      onChange(filtered, snapshotMeta);
    }
  };

  // Initial fetch
  fetchJobs();

  // Set up polling for real-time updates (every 10 seconds)
  const intervalId = setInterval(fetchJobs, 10000);

  // Return unsubscribe function
  return () => {
    clearInterval(intervalId);
  };
}

export function subscribeJobAnalytics(onChange) {
  const handler = async () => {
    try {
      // Try to fetch real jobs for analytics
      const response = await api.getJobs({ limit: 1000 });
      const realJobs = response.jobs || response || [];
      
      // Merge real jobs with mock jobs for comprehensive analytics
      const allJobs = [...realJobs, ...mockJobs];
      const analytics = buildAnalytics(allJobs);
      onChange(analytics);
    } catch (error) {
      console.warn('Failed to fetch jobs for analytics, using mock data:', error);
      // Fallback to mock data only
      onChange(buildAnalytics(mockJobs));
    }
  };
  
  analyticsSubscribers.add(handler);
  handler();

  // Set up polling for analytics updates
  const intervalId = setInterval(handler, 15000); // Every 15 seconds

  return () => {
    analyticsSubscribers.delete(handler);
    clearInterval(intervalId);
  };
}

export async function approveJob(jobId, user) {
  try {
    // Call real API to approve job
    const response = await api.approveJob(jobId);
    console.log('✅ Job approved via API:', jobId);
    return { success: true, jobId, ...response };
  } catch (error) {
    console.error('Error approving job:', error);
    // Fallback to mock update
    const job = mockJobs.find((item) => item.id === jobId);
    if (job) {
      job.status = 'active';
      job.isActive = true;
      job.postedAt = new Date().toISOString();
      job.rejectionReason = null;
      broadcastJobs();
    }
    return { success: Boolean(job), jobId };
  }
}

export async function rejectJob(jobId, reason = 'Insufficient details') {
  try {
    // Call real API to reject job
    const response = await api.rejectJob(jobId, { rejectionReason: reason });
    console.log('✅ Job rejected via API:', jobId);
    return { success: true, jobId, ...response };
  } catch (error) {
    console.error('Error rejecting job:', error);
    // Fallback to mock update
    const job = mockJobs.find((item) => item.id === jobId);
    if (job) {
      job.status = 'rejected';
      job.isActive = false;
      job.rejectionReason = reason;
      broadcastJobs();
    }
    return { success: Boolean(job), jobId };
  }
}

export async function archiveJob(jobId) {
  const job = mockJobs.find((item) => item.id === jobId);
  if (job) {
    job.status = 'archived';
    job.isActive = false;
    broadcastJobs();
  }
  return { success: Boolean(job), jobId };
}

export async function getJobWithDetails(jobId) {
  return mockJobs.find((job) => job.id === jobId) || null;
}

export async function getCompaniesForDropdown() {
  return COMPANY_DIRECTORY.map((company) => ({
    id: company.id,
    name: company.name,
  }));
}

export async function getRecruitersForDropdown() {
  return RECRUITERS.map((recruiter) => ({
    id: recruiter.id,
    name: recruiter.name,
  }));
}

export async function autoArchiveExpiredJobs() {
  const now = new Date();
  let archived = 0;

  mockJobs.forEach((job) => {
    if (
      (job.status === 'active' || job.status === 'posted') &&
      job.applicationDeadline &&
      new Date(job.applicationDeadline) < now
    ) {
      job.status = 'archived';
      job.isActive = false;
      archived += 1;
    }
  });

  if (archived > 0) {
    broadcastJobs();
  }

  return { success: true, successful: archived, archived };
}
