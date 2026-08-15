/**
 * AI Interview Prep — Mistral / Gemini dynamic questions + evaluation
 */

import prisma from '../config/database.js';
import {
  generateInterviewPrepJson,
  isInterviewPrepAiAvailable,
  getInterviewPrepAiProvider,
} from './interviewPrepAi.js';
import { transcribeInterviewRecording } from './aiInterviewTranscription.js';

export const INTERVIEW_DIFFICULTIES = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
];

export const INTERVIEW_TYPES = [
  { id: 'CONCEPTUAL', label: 'Conceptual', description: 'Theory, fundamentals, and resume deep-dives' },
  { id: 'SITUATIONAL', label: 'Situational', description: 'Behavioural and scenario-based questions' },
  { id: 'CODING', label: 'Coding', description: 'Live coding problems' },
  { id: 'MIXED', label: 'Mixed', description: 'Conceptual, situational, and coding' },
];

const LEGACY_TYPE_MAP = { ORAL: 'CONCEPTUAL' };

function normalizeInterviewType(value) {
  const upper = String(value || 'MIXED').toUpperCase();
  return LEGACY_TYPE_MAP[upper] || upper;
}

const CONCEPTUAL_CATEGORIES = new Set(['conceptual', 'system_design', 'resume_deep_dive']);
const SITUATIONAL_CATEGORIES = new Set(['behavioural', 'behavioral', 'situational', 'scenario']);

function isConceptualQuestion(q) {
  return CONCEPTUAL_CATEGORIES.has(String(q.category || '').toLowerCase());
}

function isSituationalQuestion(q) {
  return SITUATIONAL_CATEGORIES.has(String(q.category || '').toLowerCase());
}

const DIFFICULTY_GUIDE = {
  easy: 'Easy — foundational level for interns and freshers. Straightforward concepts, no trick questions, simple coding if any.',
  medium: 'Medium — standard campus placement depth. Moderate complexity, expects clear reasoning.',
  hard: 'Hard — advanced depth with follow-ups, optimization, trade-offs, and challenging scenarios.',
};

const VALID_DIFFICULTIES = new Set(INTERVIEW_DIFFICULTIES.map((d) => d.id));
const VALID_TYPES = new Set([...INTERVIEW_TYPES.map((t) => t.id), 'ORAL']);

function parseAiJson(raw) {
  const text = String(raw || '').trim();
  const cleaned = text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('AI returned invalid JSON');
  }
}

function questionCountForType(interviewType) {
  const type = normalizeInterviewType(interviewType);
  if (type === 'CONCEPTUAL') return { conceptual: 6, situational: 0, coding: 0 };
  if (type === 'SITUATIONAL') return { conceptual: 0, situational: 6, coding: 0 };
  if (type === 'CODING') return { conceptual: 0, situational: 0, coding: 5 };
  return { conceptual: 2, situational: 2, coding: 2 };
}

function typeConstraintsForPrompt(interviewType) {
  const type = normalizeInterviewType(interviewType);
  if (type === 'CONCEPTUAL') {
    return 'ALL questions must be ORAL with category conceptual, system_design, or resume_deep_dive. No behavioural/situational questions. No coding.';
  }
  if (type === 'SITUATIONAL') {
    return 'ALL questions must be ORAL with category behavioural or situational. Use STAR-style scenario prompts tied to resume where possible. No pure theory or coding.';
  }
  if (type === 'CODING') {
    return 'ALL questions must be CODING inputType. No oral questions.';
  }
  return 'Generate a balanced mix: 2 conceptual ORAL, 2 situational/behavioural ORAL, and 2 CODING questions.';
}

function buildStudentResumeText(student) {
  const parts = [
    student.fullName,
    student.headline || student.bio || student.summary,
    student.school,
    student.batch,
    student.branch,
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

async function resolveResumeText(userId, body = {}) {
  if (body.resumeText?.trim()) {
    return body.resumeText.trim();
  }

  if (body.resumeId) {
    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!student) {
      const err = new Error('Student profile not found');
      err.status = 404;
      throw err;
    }

    const resume = await prisma.studentResumeFile.findFirst({
      where: { id: body.resumeId, studentId: student.id },
    });
    if (!resume) {
      const err = new Error('Resume not found');
      err.status = 404;
      throw err;
    }

    const pdfParse = (await import('pdf-parse')).default;
    const response = await fetch(resume.fileUrl);
    if (!response.ok) {
      const err = new Error('Failed to fetch resume PDF');
      err.status = 400;
      throw err;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text?.trim();
    if (!text || text.length < 80) {
      const err = new Error('Could not extract enough text from resume PDF. Use a text-based PDF or paste resume text.');
      err.status = 400;
      throw err;
    }
    return text.slice(0, 12000);
  }

  const err = new Error('Upload a resume or paste resume text before continuing');
  err.status = 400;
  throw err;
}

async function resolveTargetJob(body = {}) {
  let jobTitle = body.targetRole || body.jobTitle || '';
  let companyName = body.company || body.companyName || '';
  let jobDescription = body.jobDescription || '';
  let jobId = body.jobId || null;

  if (body.jobId) {
    const job = await loadJobContext(body.jobId);
    if (job) {
      jobId = job.id;
      jobTitle = job.jobTitle || jobTitle;
      companyName = job.companyName || companyName;
      jobDescription = job.jobDescription || jobDescription;
    }
  }

  if (!jobTitle?.trim()) {
    const err = new Error('Enter a role title or select a job from the portal');
    err.status = 400;
    throw err;
  }

  if (!companyName?.trim()) {
    companyName = 'General';
  }

  if (!jobDescription?.trim() || jobDescription.trim().length < 40) {
    jobDescription = [
      `${jobTitle} at ${companyName}.`,
      jobDescription,
      'Interview covering role fundamentals, resume experience, problem-solving, and skills relevant to this position.',
    ].filter(Boolean).join('\n');
  }

  return { jobId, jobTitle: jobTitle.trim(), companyName: companyName.trim(), jobDescription: jobDescription.trim() };
}

const SKILL_KEYWORDS = [
  'javascript', 'typescript', 'react', 'node', 'python', 'java', 'sql', 'mongodb',
  'aws', 'docker', 'kubernetes', 'machine learning', 'data structures', 'algorithms',
  'express', 'django', 'flask', 'spring', 'git', 'html', 'css', 'tailwind', 'redux',
  'postgresql', 'mysql', 'redis', 'graphql', 'rest', 'api', 'c++', 'linux',
];

function buildLocalResumeAnalysis(resumeText, target) {
  const lower = resumeText.toLowerCase();
  const extractedSkills = SKILL_KEYWORDS.filter((skill) => lower.includes(skill));
  const projectLines = resumeText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /project|built|developed|implemented|designed/i.test(line))
    .slice(0, 5);

  const extractedProjects = projectLines.map((line, i) => ({
    name: line.slice(0, 80) || `Project ${i + 1}`,
    technologies: extractedSkills.slice(0, 4),
    summary: line.slice(0, 120),
    interviewAngle: `Expect follow-ups on your decisions, tradeoffs, and measurable impact for this work.`,
  }));

  return {
    extractedSkills: extractedSkills.length ? extractedSkills : ['Review skills section on resume'],
    extractedProjects: extractedProjects.length
      ? extractedProjects
      : [{ name: 'Resume projects', technologies: [], summary: 'Walk through a project from your resume', interviewAngle: 'Prepare a STAR-format deep dive' }],
    companyInterviewPatterns: [
      `${target.companyName} ${target.jobTitle} interviews often combine resume deep-dives, core technical concepts, and practical problem-solving.`,
      'Behavioural questions tied to teamwork, ownership, and past projects.',
    ],
    resumeToJdMatch: {
      strongMatches: extractedSkills.slice(0, 5).map((s) => `Resume mentions ${s}`),
      gaps: ['Enable a valid Gemini API key for detailed JD gap analysis'],
    },
    recommendedQuestionFocus: [
      ...extractedProjects.slice(0, 2).map((p) => `Deep dive: ${p.name}`),
      ...extractedSkills.slice(0, 3).map((s) => `Conceptual questions on ${s}`),
      `${target.companyName}-style fundamentals for ${target.jobTitle}`,
    ],
  };
}

async function analyzeWithAI({ resumeText, jobTitle, companyName, jobDescription }) {
  const prompt = `You are a placement interview strategist. Analyze this candidate resume against a specific company role.

Return ONLY valid JSON (no markdown):
{
  "extractedSkills": ["skill from resume"],
  "extractedProjects": [
    { "name": "project title", "technologies": ["..."], "summary": "one line", "interviewAngle": "what interviewer may ask about this project" }
  ],
  "companyInterviewPatterns": [
    "Typical question theme at this company for this role — e.g. DSA, system design, ML fundamentals"
  ],
  "resumeToJdMatch": {
    "strongMatches": ["resume evidence that fits JD"],
    "gaps": ["JD requirement weak or missing on resume"]
  },
  "recommendedQuestionFocus": [
    "Specific topics to drill — must reference BOTH company style AND resume projects/skills"
  ]
}

TARGET: ${jobTitle} at ${companyName}
JOB DESCRIPTION:
${jobDescription.slice(0, 3500)}

RESUME:
${resumeText.slice(0, 4500)}

Rules:
- companyInterviewPatterns: infer from widely known interview culture for ${companyName} and this role type (do NOT claim verbatim leaked questions).
- Tie at least 3 recommendedQuestionFocus items to named resume projects or skills.
- Never invent resume facts.`;

  return generateInterviewPrepJson(prompt, { temperature: 0.25, maxTokens: 2048 });
}

async function getStudentForUser(userId) {
  const student = await prisma.student.findUnique({
    where: { userId },
    include: {
      skills: true,
      experiences: true,
      education: true,
      projects: true,
    },
  });
  if (!student) {
    const err = new Error('Student profile not found');
    err.status = 404;
    throw err;
  }
  return student;
}

async function assertSessionOwner(sessionId, userId) {
  const student = await getStudentForUser(userId);
  const session = await prisma.interviewPrepSession.findFirst({
    where: { id: sessionId, studentId: student.id },
    include: {
      questions: { orderBy: { orderIndex: 'asc' } },
    },
  });
  if (!session) {
    const err = new Error('Interview session not found');
    err.status = 404;
    throw err;
  }
  return { student, session };
}

function buildIdealGuide(item) {
  const parts = [];
  if (item.howToApproach) {
    parts.push(`Approach:\n${String(item.howToApproach).trim()}`);
  }
  const outline = item.idealAnswerOutline || item.idealAnswer || item.ideal_answer;
  if (outline) {
    const bullets = String(outline).includes('|')
      ? String(outline).split('|').map((s) => s.trim()).filter(Boolean).map((s) => `• ${s}`).join('\n')
      : String(outline).trim();
    parts.push(`Points:\n${bullets}`);
  }
  if (item.sampleAnswer || item.sample_answer) {
    parts.push(`Example:\n${String(item.sampleAnswer || item.sample_answer).trim()}`);
  }
  if (item.idealCode || item.ideal_code) {
    parts.push(`Solution:\n${String(item.idealCode || item.ideal_code).trim()}`);
  }
  return parts.join('\n\n').slice(0, 8000);
}

function sanitizeGeneratedQuestions(raw = [], interviewType) {
  const counts = questionCountForType(interviewType);
  const type = normalizeInterviewType(interviewType);
  const items = (Array.isArray(raw) ? raw : []).map((item, index) => {
    const inputType = String(item.inputType || '').toUpperCase() === 'CODING' ? 'CODING' : 'ORAL';
    const roleLang = String(item.language || 'javascript').toLowerCase();
    const language = roleLang === 'python' ? 'python' : 'javascript';
    const category = String(item.category || (inputType === 'CODING' ? 'coding' : 'conceptual')).slice(0, 40);
    return {
      orderIndex: index,
      inputType,
      category,
      title: String(item.title || `Question ${index + 1}`).slice(0, 120),
      prompt: String(item.prompt || item.question || '').slice(0, 4000),
      starterCode: inputType === 'CODING' ? String(item.starterCode || item.starter_code || '').slice(0, 8000) : null,
      language: inputType === 'CODING' ? language : null,
      idealAnswer: buildIdealGuide(item),
      hints: String(item.hints || '').slice(0, 500),
    };
  }).filter((q) => q.prompt.length > 10);

  const coding = items.filter((q) => q.inputType === 'CODING');
  const conceptual = items.filter((q) => q.inputType === 'ORAL' && isConceptualQuestion(q));
  const situational = items.filter((q) => q.inputType === 'ORAL' && isSituationalQuestion(q));
  const otherOral = items.filter(
    (q) => q.inputType === 'ORAL' && !isConceptualQuestion(q) && !isSituationalQuestion(q),
  );

  let selected = [];
  if (type === 'CONCEPTUAL') {
    selected = [...conceptual, ...otherOral].slice(0, counts.conceptual);
  } else if (type === 'SITUATIONAL') {
    selected = [...situational, ...otherOral].slice(0, counts.situational);
  } else if (type === 'CODING') {
    selected = coding.slice(0, counts.coding);
  } else {
    selected = [
      ...conceptual.slice(0, counts.conceptual),
      ...situational.slice(0, counts.situational),
      ...otherOral.slice(0, Math.max(0, counts.conceptual + counts.situational - conceptual.length - situational.length)),
      ...coding.slice(0, counts.coding),
    ];
  }

  return selected.map((q, i) => ({ ...q, orderIndex: i }));
}

async function generateQuestionsWithAI({
  targetRole,
  difficulty,
  interviewType,
  resumeText,
  jobTitle,
  companyName,
  jobDescription,
  analysis,
}) {
  const counts = questionCountForType(interviewType);
  const type = normalizeInterviewType(interviewType);
  const totalQuestions = counts.conceptual + counts.situational + counts.coding;
  const difficultyLine = DIFFICULTY_GUIDE[String(difficulty || 'medium').toLowerCase()] || DIFFICULTY_GUIDE.medium;
  const analysisBlock = analysis
    ? `PRIOR ANALYSIS (use this to anchor questions):
Skills: ${(analysis.extractedSkills || []).join(', ')}
Projects: ${(analysis.extractedProjects || []).map((p) => p.name).join(', ')}
Company patterns: ${(analysis.companyInterviewPatterns || []).join(' | ')}
Focus areas: ${(analysis.recommendedQuestionFocus || []).join(' | ')}
Gaps to probe: ${(analysis.resumeToJdMatch?.gaps || []).join(' | ')}`
    : '';

  const prompt = `You are a senior interviewer at ${companyName}. Generate interview questions for ${jobTitle} that reflect:
1) What ${companyName} typically asks for this role
2) This candidate's actual resume — reference their projects and skills by name where relevant

Return ONLY valid JSON (no markdown fences):
{
  "questions": [
    {
      "inputType": "ORAL" | "CODING",
      "category": "conceptual" | "coding" | "system_design" | "behavioural" | "situational" | "resume_deep_dive",
      "title": "short title",
      "prompt": "full question",
      "resumeAnchor": "project or skill name from resume, or null",
      "starterCode": "for CODING only",
      "language": "javascript" | "python",
      "idealAnswerOutline": "3-5 short phrases separated by |",
      "howToApproach": "max 2 sentences, plain spoken tone",
      "sampleAnswer": "max 4 sentences",
      "idealCode": "for CODING only",
      "hints": "one optional hint"
    }
  ]
}

Constraints:
- Target role: ${targetRole || jobTitle} at ${companyName}
- Difficulty: ${difficultyLine}
- Question format: ${type}
- ${typeConstraintsForPrompt(type)}
- Generate exactly ${totalQuestions} questions.
- At least 40% must reference a resume project, skill, or experience when format includes ORAL.
- CODING questions: match JD stack when possible.
- Do NOT ask the student to submit answers — generate teaching content.
- Never invent resume facts.

JOB DESCRIPTION:
${jobDescription.slice(0, 2800)}

RESUME:
${resumeText.slice(0, 3500)}

${analysisBlock}`;

  const parsed = await generateInterviewPrepJson(prompt, { temperature: 0.4, maxTokens: 4096 });
  const questions = sanitizeGeneratedQuestions(parsed.questions, interviewType);
  if (!questions.length) {
    throw new Error('AI did not return usable questions');
  }
  return questions;
}

function fallbackQuestions({ targetRole, companyName, interviewType, resumeText }) {
  const type = normalizeInterviewType(interviewType);
  const projectHint = resumeText?.includes('project') ? 'a project on your resume' : 'your most recent project';
  const conceptual = [
    {
      inputType: 'ORAL',
      category: 'resume_deep_dive',
      title: 'Project walkthrough',
      prompt: `Walk me through ${projectHint}. What was your contribution, and what would you improve for a ${targetRole} role at ${companyName}?`,
      idealAnswer: 'Context | Your role | Technical decisions | Metrics | Improvements',
      hints: 'Cite real details from your resume.',
    },
    {
      inputType: 'ORAL',
      category: 'conceptual',
      title: 'Role fundamentals',
      prompt: `Explain a core concept required for ${targetRole} that you have used in your work.`,
      idealAnswer: 'Definition | Why it matters | Tradeoffs | Example from resume',
      hints: 'Pick a skill listed on your resume.',
    },
    {
      inputType: 'ORAL',
      category: 'system_design',
      title: 'Design trade-off',
      prompt: `Describe a design or architecture decision you made in ${projectHint} and the trade-offs involved.`,
      idealAnswer: 'Problem | Options considered | Choice | Outcome',
      hints: 'Keep it tied to something you actually built.',
    },
  ];

  const situational = [
    {
      inputType: 'ORAL',
      category: 'behavioural',
      title: `Why ${companyName}?`,
      prompt: `Why ${companyName} and this ${targetRole} role specifically?`,
      idealAnswer: 'Company research | Role-skill fit | Resume proof | Growth ask',
      hints: 'Mention something specific about the company.',
    },
    {
      inputType: 'ORAL',
      category: 'situational',
      title: 'Handling pressure',
      prompt: 'Tell me about a time you had to deliver under a tight deadline. What did you do and what was the outcome?',
      idealAnswer: 'Situation | Task | Action | Result',
      hints: 'Use a real example from academics, projects, or work.',
    },
    {
      inputType: 'ORAL',
      category: 'situational',
      title: 'Team conflict',
      prompt: 'Describe a situation where you disagreed with a teammate. How did you resolve it?',
      idealAnswer: 'Context | Disagreement | How you handled it | Result',
      hints: 'Focus on collaboration, not blame.',
    },
  ];

  const baseCoding = [
    {
      inputType: 'CODING',
      category: 'coding',
      title: 'Array manipulation',
      prompt: 'Given an array of integers, return indices of the two numbers that add up to a target. Assume exactly one solution exists.',
      starterCode: 'function twoSum(nums, target) {\n  // return [i, j]\n}\n',
      language: 'javascript',
      idealAnswer: 'Hash map of value→index | Single pass O(n) | Handle duplicates correctly',
      hints: 'A hash map avoids nested loops.',
    },
    {
      inputType: 'CODING',
      category: 'coding',
      title: 'String processing',
      prompt: 'Implement a function to check if a string is a palindrome, ignoring non-alphanumeric characters and case.',
      starterCode: 'function isPalindrome(s) {\n  \n}\n',
      language: 'javascript',
      idealAnswer: 'Normalize string | Two pointers | O(n) time O(1) space',
      hints: 'Two pointers from both ends after cleanup.',
    },
  ];

  const counts = questionCountForType(type);
  let merged = [];
  if (type === 'CONCEPTUAL') {
    merged = conceptual.slice(0, counts.conceptual);
  } else if (type === 'SITUATIONAL') {
    merged = situational.slice(0, counts.situational);
  } else if (type === 'CODING') {
    merged = baseCoding.slice(0, counts.coding);
  } else {
    merged = [
      ...conceptual.slice(0, counts.conceptual),
      ...situational.slice(0, counts.situational),
      ...baseCoding.slice(0, counts.coding),
    ];
  }

  return merged.map((q, i) => ({ ...q, orderIndex: i }));
}

export function getInterviewPrepMeta() {
  const provider = getInterviewPrepAiProvider();
  return {
    difficulties: INTERVIEW_DIFFICULTIES,
    interviewTypes: INTERVIEW_TYPES,
    aiEnabled: isInterviewPrepAiAvailable(),
    aiProvider: provider,
    requiresResume: true,
    requiresTargetJob: true,
  };
}

export async function analyzeInterviewTarget(userId, body = {}) {
  const resumeText = await resolveResumeText(userId, body);
  const target = await resolveTargetJob(body);

  if (!isInterviewPrepAiAvailable()) {
    return {
      resumeTextLength: resumeText.length,
      target,
      analysis: buildLocalResumeAnalysis(resumeText, target),
      source: 'fallback',
      notice: 'Set MISTRAL_API_KEY or GOOGLE_AI_API_KEY in backend/.env for full AI analysis.',
    };
  }

  try {
    const analysis = await analyzeWithAI({
      resumeText,
      jobTitle: target.jobTitle,
      companyName: target.companyName,
      jobDescription: target.jobDescription,
    });

    return {
      resumeTextLength: resumeText.length,
      target,
      analysis,
      source: 'ai',
    };
  } catch (error) {
    console.warn('[InterviewPrep] AI analysis failed, using local fallback:', error.message);
    return {
      resumeTextLength: resumeText.length,
      target,
      analysis: buildLocalResumeAnalysis(resumeText, target),
      source: 'fallback',
      notice: `AI unavailable (${getInterviewPrepAiProvider() || 'none'}) — showing basic resume analysis.`,
    };
  }
}

export async function createInterviewPrepSession(userId, body = {}) {
  const difficulty = String(body.difficulty || 'medium').toLowerCase();
  const interviewType = normalizeInterviewType(body.interviewType || 'MIXED');

  if (!VALID_DIFFICULTIES.has(difficulty)) {
    const err = new Error('Invalid difficulty.');
    err.status = 400;
    throw err;
  }
  if (!VALID_TYPES.has(interviewType)) {
    const err = new Error('Invalid interview type.');
    err.status = 400;
    throw err;
  }

  const student = await getStudentForUser(userId);
  const resumeText = await resolveResumeText(userId, body);
  const { jobId, jobTitle, companyName, jobDescription } = await resolveTargetJob(body);

  let analysis = body.analysis || null;
  if (!analysis && isInterviewPrepAiAvailable()) {
    try {
      analysis = await analyzeWithAI({
        resumeText,
        jobTitle,
        companyName,
        jobDescription,
      });
    } catch (error) {
      console.warn('[InterviewPrep] Analysis failed:', error.message);
    }
  }

  let generated;
  let source = 'ai';

  if (isInterviewPrepAiAvailable()) {
    try {
      generated = await generateQuestionsWithAI({
        targetRole: jobTitle,
        difficulty,
        interviewType,
        resumeText,
        jobTitle,
        companyName,
        jobDescription,
        analysis,
      });
    } catch (error) {
      console.warn('[InterviewPrep] AI question generation failed:', error.message);
      generated = fallbackQuestions({ targetRole: jobTitle, companyName, interviewType, resumeText });
      source = 'fallback';
    }
  } else {
    generated = fallbackQuestions({ targetRole: jobTitle, companyName, interviewType, resumeText });
    source = 'fallback';
  }

  const session = await prisma.interviewPrepSession.create({
    data: {
      studentId: student.id,
      role: jobTitle,
      difficulty,
      interviewType,
      jobId,
      jobTitle,
      companyName,
      resumeSnapshot: resumeText.slice(0, 12000),
      jdSnapshot: jobDescription.slice(0, 12000),
      analysisJson: analysis ? JSON.stringify(analysis) : null,
      status: 'IN_PROGRESS',
      questions: {
        create: generated.map((q) => ({
          orderIndex: q.orderIndex,
          inputType: q.inputType,
          category: q.category,
          title: q.title,
          prompt: q.prompt,
          starterCode: q.starterCode,
          language: q.language,
          idealAnswer: q.idealAnswer,
          hints: q.hints,
          status: 'PENDING',
        })),
      },
    },
    include: {
      questions: { orderBy: { orderIndex: 'asc' } },
    },
  });

  return { session: formatSession(session), source };
}

function formatQuestion(q) {
  let feedback = null;
  if (q.feedbackJson) {
    try {
      feedback = JSON.parse(q.feedbackJson);
    } catch {
      feedback = null;
    }
  }
  return {
    id: q.id,
    orderIndex: q.orderIndex,
    inputType: q.inputType,
    category: q.category,
    title: q.title,
    prompt: q.prompt,
    starterCode: q.starterCode,
    language: q.language,
    idealAnswer: q.idealAnswer,
    hints: q.hints,
    studentText: q.studentText,
    studentCode: q.studentCode,
    transcript: q.transcript,
    technicalScore: q.technicalScore,
    confidenceScore: q.confidenceScore,
    feedback,
    status: q.status,
    answeredAt: q.answeredAt,
    evaluatedAt: q.evaluatedAt,
  };
}

function formatSession(session) {
  let analysis = null;
  if (session.analysisJson) {
    try {
      analysis = JSON.parse(session.analysisJson);
    } catch {
      analysis = null;
    }
  }
  return {
    id: session.id,
    role: session.role,
    difficulty: session.difficulty,
    interviewType: session.interviewType,
    jobId: session.jobId,
    jobTitle: session.jobTitle,
    companyName: session.companyName,
    technicalScore: session.technicalScore,
    confidenceScore: session.confidenceScore,
    overallScore: session.overallScore,
    status: session.status,
    analysis,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    questions: (session.questions || []).map(formatQuestion),
  };
}

export async function getInterviewPrepSession(userId, sessionId) {
  const { session } = await assertSessionOwner(sessionId, userId);
  return formatSession(session);
}

export async function listInterviewPrepSessions(userId, { limit = 20 } = {}) {
  const student = await getStudentForUser(userId);
  const sessions = await prisma.interviewPrepSession.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Number(limit) || 20, 50),
    include: {
      questions: {
        select: {
          id: true,
          technicalScore: true,
          confidenceScore: true,
          status: true,
        },
      },
    },
  });

  return sessions.map((s) => {
    let analysisSummary = null;
    if (s.analysisJson) {
      try {
        const a = JSON.parse(s.analysisJson);
        analysisSummary = {
          strongMatches: a.resumeToJdMatch?.strongMatches || [],
          gaps: a.resumeToJdMatch?.gaps || [],
          skills: (a.extractedSkills || []).slice(0, 8),
        };
      } catch {
        analysisSummary = null;
      }
    }
    return {
      id: s.id,
      role: s.role,
      difficulty: s.difficulty,
      interviewType: s.interviewType,
      jobTitle: s.jobTitle,
      companyName: s.companyName,
      technicalScore: s.technicalScore,
      confidenceScore: s.confidenceScore,
      overallScore: s.overallScore,
      status: s.status,
      createdAt: s.createdAt,
      questionCount: s.questions.length,
      answeredCount: s.questions.filter((q) => q.status !== 'PENDING').length,
      analysisSummary,
    };
  });
}

export async function submitInterviewPrepAnswer(userId, sessionId, questionId, body = {}) {
  const { session } = await assertSessionOwner(sessionId, userId);
  if (session.status === 'COMPLETED') {
    const err = new Error('Session is already completed');
    err.status = 400;
    throw err;
  }

  const question = session.questions.find((q) => q.id === questionId);
  if (!question) {
    const err = new Error('Question not found');
    err.status = 404;
    throw err;
  }

  let transcript = String(body.transcript || body.studentText || '').trim();
  const studentCode = body.studentCode != null ? String(body.studentCode) : null;

  if (body.audioBase64) {
    const buffer = Buffer.from(String(body.audioBase64), 'base64');
    const mimeType = body.audioMimeType || 'audio/webm';
    const { transcript: serverTranscript, status } = await transcribeInterviewRecording(buffer, mimeType);
    if (serverTranscript) {
      transcript = serverTranscript;
    } else if (!transcript && status === 'SKIPPED') {
      // Client-side transcript only when server transcription unavailable
    }
  }

  if (question.inputType === 'CODING' && !studentCode?.trim()) {
    const err = new Error('Code submission is required for coding questions');
    err.status = 400;
    throw err;
  }
  if (question.inputType === 'ORAL' && !transcript) {
    const err = new Error('Provide a voice transcript or typed answer');
    err.status = 400;
    throw err;
  }

  const updated = await prisma.interviewPrepQuestion.update({
    where: { id: questionId },
    data: {
      studentText: transcript || null,
      transcript: transcript || null,
      studentCode: studentCode,
      status: 'ANSWERED',
      answeredAt: new Date(),
    },
  });

  return formatQuestion(updated);
}

async function evaluateWithAI(question, session) {
  const answerText = question.inputType === 'CODING'
    ? question.studentCode
    : (question.transcript || question.studentText);

  const prompt = `You are a technical interviewer evaluating one answer.

Return ONLY valid JSON (no markdown):
{
  "technicalScore": 0-100,
  "confidenceScore": 0-100,
  "feedback": "2-4 sentences of actionable feedback",
  "idealAnswer": "concise model answer or ideal code approach",
  "strengths": ["..."],
  "improvements": ["..."]
}

Session context:
- Role track: ${session.role}
- Difficulty: ${session.difficulty}
- Question type: ${question.inputType}

Question: ${question.prompt}
Ideal outline: ${question.idealAnswer || 'Not provided'}

Candidate answer:
${String(answerText || '').slice(0, 6000)}

Score technicalScore on correctness/depth. Score confidenceScore on clarity, structure, and communication (for code: readability and approach explanation implied in code comments/structure).`;

  const parsed = await generateInterviewPrepJson(prompt, { temperature: 0.2, maxTokens: 2048 });

  const technicalScore = Math.max(0, Math.min(100, Number(parsed.technicalScore) || 0));
  const confidenceScore = Math.max(0, Math.min(100, Number(parsed.confidenceScore) || 0));

  return {
    technicalScore,
    confidenceScore,
    feedback: {
      summary: String(parsed.feedback || ''),
      idealAnswer: String(parsed.idealAnswer || question.idealAnswer || ''),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
    },
  };
}

function fallbackEvaluation(question) {
  const hasAnswer = question.inputType === 'CODING'
    ? Boolean(question.studentCode?.trim())
    : Boolean(question.transcript?.trim() || question.studentText?.trim());

  return {
    technicalScore: hasAnswer ? 55 : 0,
    confidenceScore: hasAnswer ? 50 : 0,
    feedback: {
      summary: hasAnswer
        ? 'Answer recorded. Enable Gemini API for detailed AI evaluation.'
        : 'No answer provided.',
      idealAnswer: question.idealAnswer || '',
      strengths: hasAnswer ? ['Attempt submitted'] : [],
      improvements: hasAnswer ? ['Connect answer to measurable outcomes'] : ['Provide an answer'],
    },
  };
}

export async function evaluateInterviewPrepAnswer(userId, sessionId, questionId) {
  const { session } = await assertSessionOwner(sessionId, userId);
  const question = session.questions.find((q) => q.id === questionId);
  if (!question) {
    const err = new Error('Question not found');
    err.status = 404;
    throw err;
  }
  if (question.status === 'PENDING') {
    const err = new Error('Submit an answer before evaluation');
    err.status = 400;
    throw err;
  }

  let result;
  if (isInterviewPrepAiAvailable()) {
    try {
      result = await evaluateWithAI(question, session);
    } catch (error) {
      console.warn('[InterviewPrep] Evaluation failed:', error.message);
      result = fallbackEvaluation(question);
    }
  } else {
    result = fallbackEvaluation(question);
  }

  const updated = await prisma.interviewPrepQuestion.update({
    where: { id: questionId },
    data: {
      technicalScore: result.technicalScore,
      confidenceScore: result.confidenceScore,
      feedbackJson: JSON.stringify(result.feedback),
      status: 'EVALUATED',
      evaluatedAt: new Date(),
    },
  });

  return formatQuestion(updated);
}

async function refreshSessionScores(sessionId) {
  const questions = await prisma.interviewPrepQuestion.findMany({
    where: { sessionId, status: 'EVALUATED' },
  });
  if (!questions.length) return;

  const technicalScore = questions.reduce((s, q) => s + (q.technicalScore || 0), 0) / questions.length;
  const confidenceScore = questions.reduce((s, q) => s + (q.confidenceScore || 0), 0) / questions.length;
  const overallScore = Math.round((technicalScore * 0.65 + confidenceScore * 0.35) * 10) / 10;

  await prisma.interviewPrepSession.update({
    where: { id: sessionId },
    data: { technicalScore, confidenceScore, overallScore },
  });
}

export async function completeInterviewPrepSession(userId, sessionId) {
  const { session } = await assertSessionOwner(sessionId, userId);

  const completed = await prisma.interviewPrepSession.update({
    where: { id: sessionId },
    data: { status: 'COMPLETED' },
    include: { questions: { orderBy: { orderIndex: 'asc' } } },
  });

  return formatSession(completed);
}

export async function getInterviewPrepAnalytics(userId) {
  const student = await getStudentForUser(userId);
  const sessions = await prisma.interviewPrepSession.findMany({
    where: { studentId: student.id, status: 'COMPLETED' },
    orderBy: { createdAt: 'asc' },
    take: 30,
    select: {
      id: true,
      role: true,
      difficulty: true,
      interviewType: true,
      technicalScore: true,
      confidenceScore: true,
      overallScore: true,
      createdAt: true,
    },
  });

  const byRole = {};
  for (const s of sessions) {
    if (!byRole[s.role]) {
      byRole[s.role] = { count: 0, technicalSum: 0, confidenceSum: 0 };
    }
    byRole[s.role].count += 1;
    byRole[s.role].technicalSum += s.technicalScore || 0;
    byRole[s.role].confidenceSum += s.confidenceScore || 0;
  }

  return {
    sessions,
    totals: {
      completed: sessions.length,
      avgTechnical: sessions.length
        ? Math.round(sessions.reduce((a, s) => a + (s.technicalScore || 0), 0) / sessions.length)
        : null,
      avgConfidence: sessions.length
        ? Math.round(sessions.reduce((a, s) => a + (s.confidenceScore || 0), 0) / sessions.length)
        : null,
    },
    byRole: Object.entries(byRole).map(([role, v]) => ({
      role,
      count: v.count,
      avgTechnical: Math.round(v.technicalSum / v.count),
      avgConfidence: Math.round(v.confidenceSum / v.count),
    })),
  };
}
