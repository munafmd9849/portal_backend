import multer from 'multer';
import * as XLSX from 'xlsx';
import * as bulk from '../services/assessmentBulkImportService.js';
import { logAction } from '../utils/auditLogger.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype.includes('sheet') ||
      file.mimetype.includes('excel') ||
      file.mimetype === 'text/csv' ||
      file.originalname.match(/\.(xlsx|xls|csv)$/i);
    if (ok) cb(null, true);
    else cb(new Error('Only Excel (.xlsx) or CSV files are allowed'));
  },
});

export const uploadImportFile = upload.single('file');

function sheetToRows(buffer, fileName = '') {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return json.map((row) => {
    const mapped = {};
    for (const [k, v] of Object.entries(row)) {
      const key = String(k).trim().toLowerCase();
      if (['type', 'question type'].includes(key)) mapped.type = v;
      else if (['question', 'title', 'question text', 'question title'].includes(key)) mapped.questionText = v;
      else if (['points', 'marks', 'score'].includes(key)) mapped.points = v;
      else if (['option a', 'a'].includes(key)) mapped.optionA = v;
      else if (['option b', 'b'].includes(key)) mapped.optionB = v;
      else if (['option c', 'c'].includes(key)) mapped.optionC = v;
      else if (['option d', 'd'].includes(key)) mapped.optionD = v;
      else if (['correct', 'correct answer', 'answer'].includes(key)) mapped.correctAnswer = v;
      else if (['description', 'problem statement'].includes(key)) mapped.description = v;
      else if (['constraints', 'constraint'].includes(key)) mapped.constraints = v;
      else if (['difficulty'].includes(key)) mapped.difficulty = v;
      else if (['explanation'].includes(key)) mapped.explanation = v;
      else if (['hints', 'hint'].includes(key)) mapped.hints = v;
      else if (['tags', 'tag'].includes(key)) mapped.tags = String(v).split(',').map((t) => t.trim()).filter(Boolean);
      else if (['topic'].includes(key)) mapped.topic = v;
      else if (['category', 'assessment category'].includes(key)) mapped.category = v;
      else if (['time', 'time limit', 'timelimit', 'time limit (s)', 'time limit sec'].includes(key)) {
        mapped.time = v;
        mapped.timeLimitSec = v;
      }
      else if (['memory limit (mb)', 'memory limit', 'memorylimit', 'memory mb'].includes(key)) mapped.memoryLimitMb = v;
      else if (['language', 'programming language'].includes(key)) mapped.language = v;
      else if (['starter code', 'startercode'].includes(key)) mapped.starterCode = v;
      else {
        const testMatch = key.match(/^test\s*(\d+)\s*(input|output|hidden|weight)$/);
        if (testMatch) {
          const n = Number(testMatch[1]);
          mapped._tests = mapped._tests || {};
          mapped._tests[n] = mapped._tests[n] || {};
          mapped._tests[n][testMatch[2]] = v;
        } else {
          mapped[k] = v;
        }
      }
    }
    const testCases = Object.keys(mapped._tests || {})
      .sort((a, b) => Number(a) - Number(b))
      .map((n) => {
        const t = mapped._tests[n];
        const hiddenRaw = String(t.hidden || '').trim().toLowerCase();
        return {
          input: t.input || '',
          expectedOutput: t.output || '',
          hidden: hiddenRaw === 'true' || hiddenRaw === 'yes' || hiddenRaw === '1' || hiddenRaw === 'hidden',
          weight: Math.max(1, parseInt(t.weight, 10) || 1),
          label: `Case ${n}`,
        };
      })
      .filter((tc) => tc.input || tc.expectedOutput);
    delete mapped._tests;
    if (testCases.length) mapped.testCases = testCases;
    return mapped;
  });
}

export async function previewImport(req, res) {
  try {
    if (!req.file?.buffer) return res.status(400).json({ error: 'File is required' });
    const fileType = req.file.originalname.toLowerCase().endsWith('.csv') ? 'csv' : 'xlsx';
    const rows = sheetToRows(req.file.buffer, req.file.originalname);
    const result = await bulk.createImportBatch({
      assessmentId: req.body?.assessmentId || null,
      uploadedById: req.userId,
      fileName: req.file.originalname,
      fileType,
      rows,
    });
    await logAction(req, {
      actionType: 'ASSESSMENT_BULK_PREVIEW',
      targetType: 'AssessmentImportBatch',
      targetId: result.batch.id,
      details: JSON.stringify({
        fileName: req.file.originalname,
        total: result.batch.totalRows,
        valid: result.preview.length,
        errors: result.errors.length,
      }),
    });
    res.json(result);
  } catch (error) {
    console.error('previewImport', error);
    res.status(400).json({ error: error.message || 'Failed to parse upload' });
  }
}

export async function commitImport(req, res) {
  try {
    const batch = await bulk.commitImport(req.params.batchId, {
      assessmentId: req.body?.assessmentId,
      partial: req.body?.partial !== false,
      userId: req.userId,
    });
    await logAction(req, {
      actionType: 'ASSESSMENT_BULK_COMMIT',
      targetType: 'AssessmentImportBatch',
      targetId: batch.id,
      details: JSON.stringify({ status: batch.status, imported: batch.successCount }),
    });
    res.json({ batch });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Import failed' });
  }
}

export async function rollbackImport(req, res) {
  try {
    const batch = await bulk.rollbackImport(req.params.batchId);
    await logAction(req, {
      actionType: 'ASSESSMENT_BULK_ROLLBACK',
      targetType: 'AssessmentImportBatch',
      targetId: batch.id,
    });
    res.json({ batch });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Rollback failed' });
  }
}

export async function getImportBatch(req, res) {
  try {
    const batch = await bulk.getImportBatch(req.params.batchId);
    if (!batch) return res.status(404).json({ error: 'Not found' });
    res.json({ batch });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load batch' });
  }
}

export async function listImportHistory(req, res) {
  try {
    const items = await bulk.listImportHistory({
      assessmentId: req.query.assessmentId,
      uploadedById: req.query.mine === 'true' ? req.userId : undefined,
      limit: req.query.limit,
    });
    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load import history' });
  }
}

export async function downloadTemplate(_req, res) {
  const rows = [
    {
      Type: 'MCQ',
      Question: 'Sample MCQ?',
      Points: 2,
      'Option A': 'A',
      'Option B': 'B',
      'Option C': 'C',
      'Option D': 'D',
      Correct: 'B',
      Difficulty: 'EASY',
      Topic: 'Algorithms',
      Tags: 'search,basics',
      Explanation: 'Binary search is O(log n)',
    },
    {
      Type: 'CODING',
      Question: 'Two Sum',
      Points: 10,
      Description: 'Return indices of two numbers that add to target',
      Constraints: '2 <= n <= 10^4',
      Difficulty: 'MEDIUM',
      Language: 'javascript',
      'Time Limit (s)': 2,
      'Memory Limit (MB)': 256,
      'Test 1 Input': '2 7 11 15\n9',
      'Test 1 Output': '0 1',
      'Test 1 Hidden': 'FALSE',
      'Test 1 Weight': 1,
      'Test 2 Input': '3 2 4\n6',
      'Test 2 Output': '1 2',
      'Test 2 Hidden': 'TRUE',
      'Test 2 Weight': 1,
    },
    {
      Type: 'SQL',
      Question: 'Select active users',
      Points: 5,
      Description: 'Write a SQL query to select active users',
      Difficulty: 'EASY',
      Language: 'sql',
    },
    {
      Type: 'CASE_STUDY',
      Question: 'Scale a notification system',
      Points: 15,
      Description: 'Design approach for high-throughput notifications',
      Difficulty: 'HARD',
      Category: 'System Design',
    },
  ];
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Questions');
  const buffer = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="assessment_questions_template.xlsx"');
  res.send(buffer);
}
