/**
 * Question bank — curated list + AI suggestions from resume + JD
 */

import prisma from '../config/database.js';
import { AI_CONFIG } from '../config/ai.config.js';
import { generateContent as generateGoogleContent } from './ai/google.provider.js';
import {
  SEED_QUESTIONS,
  QUESTION_CATEGORIES,
  QUESTION_COMPANIES,
} from '../data/questionBankSeed.js';

const VALID_CATEGORIES = new Set(QUESTION_CATEGORIES.map((c) => c.id));
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

function normalizeCategory(value) {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'behavioral') return 'behavioural';
  return v;
}

function buildStudentResumeText(student) {
  const parts = [
    student.fullName,
    student.headline || student.bio || student.summary,
    student.school,
    student.batch,
    student.center,
    student.cgpa != null ? `CGPA: ${student.cgpa}` : '',
    ...(student.skills || []).map((s) => s.skillName || s).filter(Boolean),
    ...(student.experiences || []).map((e) =>
      [e.title, e.company, e.description].filter(Boolean).join(' — '),
    ),
    ...(student.projects || []).map((p) =>
      [p.title, p.technologies, p.description].filter(Boolean).join(' — '),
    ),
    ...(student.education || []).map((e) =>
      [e.degree, e.institution, e.description].filter(Boolean).join(' — '),
    ),
  ];
  return parts.filter(Boolean).join('\n').slice(0, 8000);
}

export function getQuestionBankMeta() {
  return {
    categories: QUESTION_CATEGORIES,
    companies: QUESTION_COMPANIES,
    difficulties: ['easy', 'medium', 'hard'],
    totalCurated: SEED_QUESTIONS.length,
  };
}

export function listQuestions(query = {}) {
  const {
    category,
    company,
    difficulty,
    status,
    search,
    attemptedIds = [],
  } = query;

  const attemptedSet = new Set(
    (Array.isArray(attemptedIds) ? attemptedIds : String(attemptedIds || '').split(','))
      .map((id) => id.trim())
      .filter(Boolean),
  );

  let rows = [...SEED_QUESTIONS];

  if (category && category !== 'all') {
    const cat = normalizeCategory(category);
    rows = rows.filter((r) => r.category === cat);
  }

  if (company && company !== 'all') {
    const c = String(company).trim();
    rows = rows.filter((r) => r.companies.some((co) => co.toLowerCase() === c.toLowerCase()));
  }

  if (difficulty && difficulty !== 'all') {
    const d = String(difficulty).trim().toLowerCase();
    rows = rows.filter((r) => r.difficulty === d);
  }

  if (search?.trim()) {
    const term = search.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.title.toLowerCase().includes(term) ||
        r.topic.toLowerCase().includes(term) ||
        r.companies.some((co) => co.toLowerCase().includes(term)),
    );
  }

  if (status === 'attempted') {
    rows = rows.filter((r) => attemptedSet.has(r.id));
  } else if (status === 'unattempted') {
    rows = rows.filter((r) => !attemptedSet.has(r.id));
  }

  return {
    questions: rows,
    total: rows.length,
    stats: {
      totalPool: SEED_QUESTIONS.length,
      filtered: rows.length,
      attempted: rows.filter((r) => attemptedSet.has(r.id)).length,
    },
  };
}

function sanitizeAiQuestions(raw = []) {
  return (Array.isArray(raw) ? raw : [])
    .map((item, index) => {
      const category = normalizeCategory(item.category);
      const difficulty = String(item.difficulty || 'medium').toLowerCase();
      return {
        id: `ai-${Date.now()}-${index}`,
        category: VALID_CATEGORIES.has(category) ? category : 'technical',
        difficulty: VALID_DIFFICULTIES.has(difficulty) ? difficulty : 'medium',
        title: String(item.question || item.title || `Suggested question ${index + 1}`).slice(0, 200),
        topic: String(item.topic || item.category || 'Role-specific').slice(0, 80),
        companies: Array.isArray(item.companies)
          ? item.companies.map(String).slice(0, 5)
          : item.company
            ? [String(item.company)]
            : [],
        points: difficulty === 'easy' ? 10 : difficulty === 'hard' ? 30 : 20,
        whatTheyLookFor: String(item.whatTheyLookFor || item.signal || '').slice(0, 300),
        sampleAnswerOutline: String(item.sampleAnswerOutline || item.outline || '').slice(0, 500),
        source: 'ai',
      };
    })
    .filter((q) => q.title.length > 5);
}

async function loadJobContext(jobId) {
  if (!jobId) return null;
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      jobTitle: true,
      companyName: true,
      description: true,
      requirements: true,
      requiredSkills: true,
    },
  });
  if (!job) return null;
  const jobDescription = [job.description, job.requirements, job.requiredSkills]
    .filter(Boolean)
    .join('\n\n');
  return { ...job, jobDescription };
}

export async function generatePersonalizedQuestions(userId, body = {}) {
  const student = await prisma.student.findUnique({
    where: { userId },
    include: {
      skills: true,
      experiences: true,
      education: true,
      projects: true,
      resumeFiles: { orderBy: { uploadedAt: 'desc' }, take: 1 },
    },
  });

  if (!student) {
    const err = new Error('Student profile not found');
    err.status = 404;
    throw err;
  }

  let jobTitle = body.jobTitle || '';
  let company = body.company || body.companyName || '';
  let jobDescription = body.jobDescription || '';

  if (body.jobId) {
    const job = await loadJobContext(body.jobId);
    if (job) {
      jobTitle = job.jobTitle || jobTitle;
      company = job.companyName || company;
      jobDescription = job.jobDescription || jobDescription;
    }
  }

  if (!jobDescription || jobDescription.trim().length < 30) {
    const err = new Error('Job description is required (min 30 characters) or select a job with a description');
    err.status = 400;
    throw err;
  }

  const resumeText = buildStudentResumeText(student);
  if (resumeText.length < 40) {
    const err = new Error('Complete your profile or upload a resume before generating personalized questions');
    err.status = 400;
    throw err;
  }

  if (!AI_CONFIG.enabled || !AI_CONFIG.google.apiKey) {
    return {
      questions: fallbackPersonalizedQuestions({ jobTitle, company, jobDescription, resumeText }),
      source: 'fallback',
      jobTitle,
      company,
    };
  }

  const prompt = `You are a senior placement trainer. Read the candidate resume and job description. Return ONLY valid JSON (no markdown fences) with this schema:
{
  "questions": [
    {
      "category": "technical" | "aptitude" | "logical" | "behavioural" | "situational",
      "difficulty": "easy" | "medium" | "hard",
      "question": "string — the interview question",
      "topic": "short topic label",
      "companies": ["Company names this style fits"],
      "whatTheyLookFor": "under 30 words",
      "sampleAnswerOutline": "3-5 bullet points joined by | referencing resume where possible"
    }
  ]
}

Generate EXACTLY 12 questions:
- 3 technical (aligned to JD skills)
- 2 aptitude
- 2 logical
- 3 behavioural (STAR-style)
- 2 situational

JOB: ${jobTitle || 'Not specified'} at ${company || 'Not specified'}
JD:
${jobDescription.slice(0, 3500)}

RESUME:
${resumeText.slice(0, 4000)}

Rules: Never invent resume facts. Tie role-specific questions to real resume lines when possible.`;

  try {
    const raw = await generateGoogleContent(prompt, { temperature: 0.35, maxTokens: 2048 });
    let parsed;
    try {
      const jsonText = raw.trim().replace(/^```json?\s*/i, '').replace(/```\s*$/, '');
      parsed = JSON.parse(jsonText);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { questions: [] };
    }
    const questions = sanitizeAiQuestions(parsed.questions);
    if (!questions.length) {
      return {
        questions: fallbackPersonalizedQuestions({ jobTitle, company, jobDescription, resumeText }),
        source: 'fallback',
        jobTitle,
        company,
      };
    }
    return { questions, source: 'ai', jobTitle, company };
  } catch (error) {
    console.warn('[QuestionBank] AI generation failed:', error.message);
    return {
      questions: fallbackPersonalizedQuestions({ jobTitle, company, jobDescription, resumeText }),
      source: 'fallback',
      jobTitle,
      company,
    };
  }
}

function fallbackPersonalizedQuestions({ jobTitle, company, jobDescription }) {
  const jdLower = jobDescription.toLowerCase();
  const companyTag = company || 'Campus';
  const extras = [];

  if (/java|spring|backend|api/i.test(jdLower)) {
    extras.push({
      category: 'technical',
      difficulty: 'medium',
      question: `How would you design a REST API for a core feature in the ${jobTitle || 'target'} role?`,
      topic: 'Backend / API',
      companies: [companyTag],
      whatTheyLookFor: 'Resource modeling, validation, and error handling.',
      sampleAnswerOutline: 'Define entities | CRUD endpoints | Auth layer | Idempotency for writes',
    });
  }
  if (/react|frontend|ui|javascript/i.test(jdLower)) {
    extras.push({
      category: 'technical',
      difficulty: 'medium',
      question: 'Walk through how you would optimize a slow React page you built.',
      topic: 'Frontend performance',
      companies: [companyTag],
      whatTheyLookFor: 'Profiling mindset and concrete techniques.',
      sampleAnswerOutline: 'Measure first | Memoization | Code splitting | List virtualization',
    });
  }

  const base = [
    {
      category: 'behavioural',
      difficulty: 'medium',
      question: `Why ${companyTag} and this ${jobTitle || 'role'} specifically?`,
      topic: 'Motivation',
      companies: [companyTag],
      whatTheyLookFor: 'Research-backed interest, not generic praise.',
      sampleAnswerOutline: 'Company fact you researched | Role-skill fit | Your recent project proof | Growth ask',
    },
    {
      category: 'situational',
      difficulty: 'medium',
      question: 'You disagree with a senior on a technical approach. What do you do?',
      topic: 'Collaboration',
      companies: [companyTag],
      whatTheyLookFor: 'Respectful dissent with data.',
      sampleAnswerOutline: 'Listen fully | Bring evidence | Propose experiment | Accept team decision',
    },
    ...extras,
  ];

  return sanitizeAiQuestions(base);
}
