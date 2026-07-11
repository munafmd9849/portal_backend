import * as XLSX from 'xlsx';
import { createEmptyStarterCodesByLang } from '../coding-engine/starterCodeStorage';
import { emptyExample, emptyTestCase } from '../coding-engine/testCaseUtils';

/** Template rows shown in downloaded Excel file */
export const ASSESSMENT_QUESTION_TEMPLATE_ROWS = [
  {
    Type: 'MCQ',
    Question: 'What is the time complexity of binary search on a sorted array?',
    Points: 2,
    'Option A': 'O(n)',
    'Option B': 'O(log n)',
    'Option C': 'O(n log n)',
    'Option D': 'O(1)',
    Correct: 'B',
    Description: '',
    Constraints: '',
    'Test 1 Input': '',
    'Test 1 Output': '',
    'Test 2 Input': '',
    'Test 2 Output': '',
  },
  {
    Type: 'DESCRIPTIVE',
    Question: 'Explain the difference between SQL and NoSQL databases.',
    Points: 5,
    'Option A': '',
    'Option B': '',
    'Option C': '',
    'Option D': '',
    Correct: '',
    Description: '',
    Constraints: '',
    'Test 1 Input': '',
    'Test 1 Output': '',
    'Test 2 Input': '',
    'Test 2 Output': '',
  },
  {
    Type: 'CODING',
    Question: 'Two Sum',
    Points: 10,
    'Option A': '',
    'Option B': '',
    'Option C': '',
    'Option D': '',
    Correct: '',
    Description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    Constraints: '2 <= nums.length <= 10^4',
    'Test 1 Input': 'nums = [2,7,11,15], target = 9',
    'Test 1 Output': '[0,1]',
    'Test 2 Input': 'nums = [3,2,4], target = 6',
    'Test 2 Output': '[1,2]',
  },
];

const COL = {
  type: ['type', 'question type', 'q type'],
  text: ['question', 'question text', 'text', 'title', 'question title'],
  points: ['points', 'point', 'marks', 'score'],
  optionA: ['option a', 'a', 'choice a'],
  optionB: ['option b', 'b', 'choice b'],
  optionC: ['option c', 'c', 'choice c'],
  optionD: ['option d', 'd', 'choice d'],
  correct: ['correct', 'correct answer', 'answer', 'key'],
  description: ['description', 'problem statement', 'details'],
  constraints: ['constraints', 'constraint'],
  test1In: ['test 1 input', 'testcase1 input', 'tc1 input'],
  test1Out: ['test 1 output', 'testcase1 output', 'tc1 output'],
  test2In: ['test 2 input', 'testcase2 input', 'tc2 input'],
  test2Out: ['test 2 output', 'testcase2 output', 'tc2 output'],
};

function normKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function buildHeaderIndex(headerRow) {
  const index = {};
  headerRow.forEach((cell, i) => {
    const key = normKey(cell);
    if (!key) return;
    for (const [field, aliases] of Object.entries(COL)) {
      if (aliases.includes(key) && index[field] == null) {
        index[field] = i;
      }
    }
  });
  return index;
}

function cell(row, idx) {
  if (idx == null || idx < 0) return '';
  const v = row[idx];
  if (v == null) return '';
  return String(v).trim();
}

function parseCorrectAnswer(raw, options) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const letter = s.toUpperCase();
  if (letter === 'A') return '0';
  if (letter === 'B') return '1';
  if (letter === 'C') return '2';
  if (letter === 'D') return '3';
  if (/^\d+$/.test(s)) return s;
  const matchIdx = options.findIndex(
    (opt) => opt && opt.toLowerCase() === s.toLowerCase()
  );
  return matchIdx >= 0 ? String(matchIdx) : '';
}

function normalizeType(raw) {
  const t = String(raw ?? '').trim().toUpperCase();
  if (['MCQ', 'MULTIPLE CHOICE', 'MULTIPLE_CHOICE'].includes(t)) return 'MCQ';
  if (['CODING', 'CODE', 'PROGRAMMING'].includes(t)) return 'CODING';
  if (['DESCRIPTIVE', 'DESCRIPTIVE_TEXT', 'TEXT', 'SUBJECTIVE'].includes(t)) return 'DESCRIPTIVE';
  return '';
}

function rowToQuestion(row, headerIndex, rowNum) {
  const text = cell(row, headerIndex.text);
  if (!text) return null;

  let type = normalizeType(cell(row, headerIndex.type));
  const options = [
    cell(row, headerIndex.optionA),
    cell(row, headerIndex.optionB),
    cell(row, headerIndex.optionC),
    cell(row, headerIndex.optionD),
  ];
  const nonEmptyOptions = options.filter(Boolean);

  if (!type) {
    if (nonEmptyOptions.length >= 2) type = 'MCQ';
    else if (cell(row, headerIndex.test1In) || cell(row, headerIndex.description)) type = 'CODING';
    else type = 'DESCRIPTIVE';
  }

  const pointsRaw = cell(row, headerIndex.points);
  const points = pointsRaw ? Math.max(1, parseInt(pointsRaw, 10) || 1) : 1;

  const warnings = [];

  if (type === 'MCQ') {
    if (nonEmptyOptions.length < 2) {
      return { error: `Row ${rowNum}: MCQ needs at least two options (A and B).` };
    }
    const padded = [...options];
    while (padded.length < 4) padded.push('');
    const correctAnswer = parseCorrectAnswer(cell(row, headerIndex.correct), padded);
    if (!correctAnswer) {
      return { error: `Row ${rowNum}: MCQ needs a valid Correct value (A, B, C, D, or option index).` };
    }
    return {
      question: {
        text,
        description: cell(row, headerIndex.description) || '',
        type: 'MCQ',
        options: padded,
        correctAnswer,
        points,
        difficulty: 'MEDIUM',
      },
    };
  }

  if (type === 'DESCRIPTIVE') {
    return {
      question: {
        text,
        description: cell(row, headerIndex.description) || '',
        type: 'DESCRIPTIVE',
        options: [''],
        correctAnswer: '',
        points,
        difficulty: 'MEDIUM',
      },
    };
  }

  if (type === 'CODING') {
    const description = cell(row, headerIndex.description) || text;
    const testCases = [];
    const pairs = [
      [headerIndex.test1In, headerIndex.test1Out],
      [headerIndex.test2In, headerIndex.test2Out],
    ];
    pairs.forEach(([inIdx, outIdx], i) => {
      const input = cell(row, inIdx);
      const expectedOutput = cell(row, outIdx);
      if (input || expectedOutput) {
        testCases.push({
          ...emptyTestCase(),
          input,
          expectedOutput,
          label: `Case ${i + 1}`,
        });
      }
    });
    if (!testCases.length) {
      warnings.push(`Row ${rowNum}: coding question has no test cases — add them in the editor before publish.`);
      testCases.push({ ...emptyTestCase() });
    }
    return {
      question: {
        text,
        description,
        type: 'CODING',
        options: [''],
        correctAnswer: '',
        points,
        difficulty: 'MEDIUM',
        constraints: cell(row, headerIndex.constraints) || '',
        starterCodes: createEmptyStarterCodesByLang(),
        examples: [{ ...emptyExample() }],
        testCases,
      },
      warnings,
    };
  }

  return { error: `Row ${rowNum}: unsupported question type "${cell(row, headerIndex.type)}".` };
}

/**
 * Parse workbook (first sheet) into assessment question objects for AdminAssessments form.
 */
export function parseAssessmentQuestionsWorkbook(workbook) {
  const errors = [];
  const warnings = [];
  const questions = [];

  if (!workbook?.SheetNames?.length) {
    return { questions, errors: ['Excel file has no sheets.'], warnings };
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (!rows.length) {
    return { questions, errors: ['Sheet is empty.'], warnings };
  }

  const headerIndex = buildHeaderIndex(rows[0]);
  if (headerIndex.text == null) {
    return {
      questions,
      errors: ['Missing required column: Question (or Question Text).'],
      warnings,
    };
  }

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || row.every((c) => String(c ?? '').trim() === '')) continue;

    const result = rowToQuestion(row, headerIndex, i + 1);
    if (!result) continue;
    if (result.error) {
      errors.push(result.error);
      continue;
    }
    if (result.warnings?.length) warnings.push(...result.warnings);
    questions.push(result.question);
  }

  if (!questions.length && !errors.length) {
    errors.push('No question rows found. Add data below the header row.');
  }

  return { questions, errors, warnings };
}

export function parseAssessmentQuestionsFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        resolve(parseAssessmentQuestionsWorkbook(workbook));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function downloadAssessmentQuestionTemplate() {
  const ws = XLSX.utils.json_to_sheet(ASSESSMENT_QUESTION_TEMPLATE_ROWS);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Questions');
  XLSX.writeFile(wb, 'assessment_questions_template.xlsx');
}
