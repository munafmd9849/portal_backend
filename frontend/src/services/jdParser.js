/**
 * Job Description Parser Service
 * Extracts structured data from job description files (PDF, DOC, TXT)
 */

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Set up PDF.js worker
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

/**
 * Parse job description from various file formats
 * @param {File} file - The job description file
 * @returns {Promise<Object>} Parsed job data
 */
export async function parseJobDescription(file) {
  try {
    console.log('🔄 Parsing job description file:', file.name);
    
    const fileType = file.type;
    let text = '';
    
    if (fileType === 'application/pdf') {
      text = await parsePDF(file);
    } else if (fileType === 'text/plain') {
      text = await parseText(file);
    } else if (fileType.includes('document') || fileType.includes('word')) {
      text = await parseDocument(file);
    } else {
      throw new Error('Unsupported file format. Please use PDF, DOC, or TXT files.');
    }
    
    // Extract structured data from text
    const parsedData = extractJobData(text);
    
    console.log('✅ Job description parsed successfully');
    return {
      success: true,
      data: parsedData,
      originalText: text
    };
    
  } catch (error) {
    console.error('❌ Error parsing job description:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Parse PDF file
 */
async function parsePDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    text += pageText + '\n';
  }
  
  return text;
}

/**
 * Parse text file
 */
async function parseText(file) {
  return await file.text();
}

/**
 * Parse document file (basic text extraction)
 */
async function parseDocument(file) {
  // For now, treat as text file
  // In production, you might want to use a library like mammoth.js for proper DOC parsing
  return await file.text();
}

/**
 * Extract structured job data from text
 */
function extractJobData(text) {
  const data = {
    title: '',
    company: '',
    location: '',
    salary: '',
    experience: '',
    skills: [],
    description: text,
    requirements: [],
    benefits: []
  };
  
  // Extract job title (look for common patterns)
  const titlePatterns = [
    /job title[:\s]+([^\n]+)/i,
    /position[:\s]+([^\n]+)/i,
    /role[:\s]+([^\n]+)/i,
    /^([^\n]+(?:developer|engineer|manager|analyst|specialist|coordinator))/i
  ];
  
  for (const pattern of titlePatterns) {
    const match = text.match(pattern);
    if (match) {
      data.title = match[1].trim();
      break;
    }
  }
  
  // Extract company name
  const companyPatterns = [
    /company[:\s]+([^\n]+)/i,
    /organization[:\s]+([^\n]+)/i,
    /employer[:\s]+([^\n]+)/i
  ];
  
  for (const pattern of companyPatterns) {
    const match = text.match(pattern);
    if (match) {
      data.company = match[1].trim();
      break;
    }
  }
  
  // Extract location
  const locationPatterns = [
    /location[:\s]+([^\n]+)/i,
    /based in[:\s]+([^\n]+)/i,
    /office[:\s]+([^\n]+)/i
  ];
  
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) {
      data.location = match[1].trim();
      break;
    }
  }
  
  // Extract salary
  const salaryPatterns = [
    /salary[:\s]+([^\n]+)/i,
    /compensation[:\s]+([^\n]+)/i,
    /pay[:\s]+([^\n]+)/i,
    /(\$[\d,]+(?:\s*-\s*\$[\d,]+)?)/i,
    /(₹[\d,]+(?:\s*-\s*₹[\d,]+)?)/i
  ];
  
  for (const pattern of salaryPatterns) {
    const match = text.match(pattern);
    if (match) {
      data.salary = match[1].trim();
      break;
    }
  }
  
  // Extract experience
  const experiencePatterns = [
    /experience[:\s]+([^\n]+)/i,
    /(\d+\+?\s*years?\s*(?:of\s*)?experience)/i,
    /minimum\s+(\d+\s*years?)/i
  ];
  
  for (const pattern of experiencePatterns) {
    const match = text.match(pattern);
    if (match) {
      data.experience = match[1].trim();
      break;
    }
  }
  
  // Extract skills (look for common tech skills)
  const skillKeywords = [
    'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'Angular', 'Vue.js',
    'HTML', 'CSS', 'SQL', 'MongoDB', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes',
    'Git', 'REST API', 'GraphQL', 'TypeScript', 'PHP', 'C++', 'C#', '.NET',
    'Spring Boot', 'Django', 'Flask', 'Express.js', 'Firebase', 'Azure'
  ];
  
  const foundSkills = [];
  for (const skill of skillKeywords) {
    if (text.toLowerCase().includes(skill.toLowerCase())) {
      foundSkills.push(skill);
    }
  }
  data.skills = foundSkills;
  
  // Extract requirements (look for bullet points or numbered lists)
  const requirementMatches = text.match(/(?:requirements?|qualifications?)[:\s]*\n((?:[-•*]\s*[^\n]+\n?)+)/i);
  if (requirementMatches) {
    data.requirements = requirementMatches[1]
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^[-•*]\s*/, '').trim());
  }
  
  // Extract benefits
  const benefitMatches = text.match(/(?:benefits?|perks?)[:\s]*\n((?:[-•*]\s*[^\n]+\n?)+)/i);
  if (benefitMatches) {
    data.benefits = benefitMatches[1]
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^[-•*]\s*/, '').trim());
  }
  
  return data;
}

/**
 * Validate parsed job data
 */
export function validateJobData(data) {
  const errors = [];
  
  if (!data.title || data.title.length < 3) {
    errors.push('Job title is required and must be at least 3 characters');
  }
  
  if (!data.company || data.company.length < 2) {
    errors.push('Company name is required and must be at least 2 characters');
  }
  
  if (!data.description || data.description.length < 50) {
    errors.push('Job description must be at least 50 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Format parsed data for job posting
 */
export function formatForJobPosting(parsedData) {
  return {
    title: parsedData.title || '',
    companyName: parsedData.company || '',
    location: parsedData.location || '',
    salaryRange: parsedData.salary || '',
    experienceRequired: parsedData.experience || '',
    skillsRequired: parsedData.skills || [],
    description: parsedData.description || '',
    requirements: parsedData.requirements || [],
    benefits: parsedData.benefits || [],
    jobType: 'Full-time', // Default
    workMode: 'Hybrid', // Default
    applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
  };
}
