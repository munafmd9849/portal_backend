/**
 * Builds the 30-min assessment Excel:
 *   20 MCQs + 1 coding question (LeetCode 1877: Minimize Maximum Pair Sum).
 * First sheet is "Questions" — that is what Admin → Import from Excel reads.
 */
import { createRequire } from 'module';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const XLSX = require('../backend/node_modules/xlsx');

const __dir = dirname(fileURLToPath(import.meta.url));

function minMaxPairSum(nums) {
  const a = [...nums].sort((x, y) => x - y);
  let best = 0;
  for (let i = 0, j = a.length - 1; i < j; i += 1, j -= 1) {
    best = Math.max(best, a[i] + a[j]);
  }
  return best;
}

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function randomEvenArray(n, min, max, seed) {
  const r = rng(seed);
  return Array.from({ length: n }, () => min + Math.floor(r() * (max - min + 1)));
}

function stdinInput(nums) {
  return `${nums.length}\n${nums.join(' ')}`;
}

const hiddenA = randomEvenArray(200, 1, 1000, 1877);
const hiddenB = randomEvenArray(1000, 1, 100000, 42);

const codingTests = [
  { nums: [3, 5, 2, 3], hidden: false, weight: 1, note: 'LeetCode example 1' },
  { nums: [3, 5, 4, 2, 4, 6], hidden: false, weight: 1, note: 'LeetCode example 2' },
  { nums: [1, 1], hidden: true, weight: 1, note: 'Minimum n = 2' },
  { nums: [1, 100000], hidden: true, weight: 1, note: 'Max values, n = 2' },
  { nums: [1, 1, 1, 1], hidden: true, weight: 1, note: 'All equal' },
  { nums: [1, 2, 3, 6], hidden: true, weight: 2, note: 'Greedy trap (pair largest two is wrong)' },
  { nums: [4, 3, 2, 1], hidden: true, weight: 1, note: 'Reverse sorted' },
  { nums: [5, 5, 5, 1], hidden: true, weight: 1, note: 'Duplicates' },
  { nums: hiddenA, hidden: true, weight: 2, note: 'n = 200 mixed' },
  { nums: hiddenB, hidden: true, weight: 3, note: 'n = 1000 (catches very slow solutions)' },
].map((t, i) => ({
  ...t,
  index: i + 1,
  input: stdinInput(t.nums),
  output: String(minMaxPairSum(t.nums)),
}));

const codingDescription = `The pair sum of a pair (a, b) is equal to a + b. The maximum pair sum is the largest pair sum in a list of pairs.

Given an array nums of even length n, pair the elements of nums into n / 2 pairs such that:

- Each element of nums is in exactly one pair, and
- The maximum pair sum is minimized.

Return the minimized maximum pair sum after optimally pairing.

INPUT FORMAT
Line 1: integer n (even) — number of elements in the array
Line 2: n space-separated integers — the array nums

OUTPUT FORMAT
A single integer — the minimized maximum pair sum

HOW TO READ INPUT
JavaScript / Python / Java: implement solution(input). input is the full stdin text (two lines).
C++: read from stdin in main (cin).

Example (C++):
int n;
cin >> n;
vector<int> nums(n);
for (int i = 0; i < n; i++) cin >> nums[i];

Example (Python):
def solution(input):
    parts = str(input).split()
    n = int(parts[0])
    nums = list(map(int, parts[1:1+n]))
    # return the answer

EXAMPLES
Input:
4
3 5 2 3
Output:
7
Explanation: Pairs (3,3) and (5,2) give pair sums 6 and 7. The maximum is 7. This is optimal.

Input:
6
3 5 4 2 4 6
Output:
8
Explanation: Pairs (3,5), (4,4), (2,6) → all pair sums 8.

Follow-up thinking: sort the array, pair smallest with largest, and take the max of those pair sums.`;

const codingConstraints = `n == nums.length
2 <= n <= 1000 in this exam (LeetCode original allows up to 1e5)
n is even
1 <= nums[i] <= 1e5
Time limit: 2 seconds per test
Memory limit: 256 MB`;

const mcqs = [
  ['What is the time complexity of sorting an array of n integers with a comparison sort such as mergesort?', 'O(n)', 'O(n log n)', 'O(n^2)', 'O(log n)', 'B'],
  ['An array has even length n. How many pairs are formed if every element is used in exactly one pair?', 'n', 'n / 2', 'n - 1', '2n', 'B'],
  ['Which data structure is the natural choice for storing a one-dimensional list of integers?', 'Graph', 'Array / list', 'Binary tree only', 'Hash of hashes', 'B'],
  ['Two pointers moving from both ends of a sorted array are most often used for:', 'DFS on trees', 'Pairing extremes (smallest with largest)', 'Building a heap', 'Parsing HTML', 'B'],
  ['If you pair the two largest numbers first in [1,2,3,6], the maximum pair sum is 9. The optimal maximum pair sum is:', '9', '7', '6', '4', 'B'],
  ['What is the pair sum of (4, 5)?', '9', '20', '1', '45', 'A'],
  ['Which statement about a stable sort is true?', 'Equal keys keep their original relative order', 'It always runs in O(n)', 'It cannot sort numbers', 'It uses no extra memory ever', 'A'],
  ['Worst-case time of quicksort on n elements is:', 'O(n log n)', 'O(n)', 'O(n^2)', 'O(1)', 'C'],
  ['A greedy algorithm:', 'Always explores every subset', 'Makes a locally best choice at each step', 'Is the same as Dijkstra only', 'Never works on arrays', 'B'],
  ['If nums = [1,1,1,1], the minimized maximum pair sum is:', '1', '2', '4', '0', 'B'],
  ['Space complexity of an in-place sort such as heapsort is typically:', 'O(n^2)', 'O(n log n)', 'O(1) extra', 'O(n!)', 'C'],
  ['Which input size is even?', '3', '7', '10', '9', 'C'],
  ['JSON array [3,5,2,3] contains how many integers?', '3', '4', '5', '2', 'B'],
  ['After sorting [3,5,2,3] ascending you get:', '[2,3,3,5]', '[5,3,3,2]', '[3,3,2,5]', '[2,3,5,3]', 'A'],
  ['If the judge compares output "7\\n" with expected "7", a correct program should:', 'Print extra text like "Answer: 7"', 'Print only the number (whitespace around it is OK)', 'Print the pairs', 'Print JSON', 'B'],
  ['TLE (Time Limit Exceeded) means:', 'The program used too much RAM', 'The program did not finish within the CPU time limit', 'The compiler crashed', 'Wrong answer on sample 1', 'B'],
  ['Hidden tests in this portal:', 'Are shown in Run Tests', 'Run only on Submit and do not reveal their input', 'Are never executed', 'Are the same as examples', 'B'],
  ['Which pairing of a sorted array [a1 <= a2 <= … <= an] minimizes the maximum pair sum?', 'Pair a1 with a2, a3 with a4, …', 'Pair a1 with an, a2 with a(n-1), …', 'Pair only the two largest', 'Random pairing is always optimal', 'B'],
  ['n = 2 and nums = [1, 100000]. The only pair sum is:', '100001', '100000', '1', '99999', 'A'],
  ['Run Tests in this portal executes:', 'All hidden tests', 'Only public / non-hidden tests', 'A random 50% of tests', 'Compilation only', 'B'],
];

function mcqRow(i, q) {
  const [question, a, b, c, d, correct] = q;
  return {
    Type: 'MCQ',
    Question: question,
    Points: 1,
    'Option A': a,
    'Option B': b,
    'Option C': c,
    'Option D': d,
    Correct: correct,
    Description: '',
    Constraints: '',
    Difficulty: i < 8 ? 'EASY' : i < 16 ? 'MEDIUM' : 'MEDIUM',
    'Time Limit (s)': '',
    'Memory Limit (MB)': '',
  };
}

const codingRow = {
  Type: 'CODING',
  Question: 'Minimize Maximum Pair Sum in Array',
  Points: 20,
  'Option A': '',
  'Option B': '',
  'Option C': '',
  'Option D': '',
  Correct: '',
  Description: codingDescription,
  Constraints: codingConstraints,
  Difficulty: 'MEDIUM',
  'Time Limit (s)': 2,
  'Memory Limit (MB)': 256,
};

for (const t of codingTests) {
  codingRow[`Test ${t.index} Input`] = t.input;
  codingRow[`Test ${t.index} Output`] = t.output;
  codingRow[`Test ${t.index} Hidden`] = t.hidden ? 'TRUE' : 'FALSE';
  codingRow[`Test ${t.index} Weight`] = t.weight;
}

const questionRows = [...mcqs.map((q, i) => mcqRow(i, q)), codingRow];

const howTo = [
  ['MINIMIZE MAXIMUM PAIR SUM — 30 MINUTE ASSESSMENT'],
  [''],
  ['FILE USE'],
  ['1. Admin → Assessments → create or edit an assessment.'],
  ['2. Duration: 30 minutes. Title e.g. "DSA Sprint — Pair Sum".'],
  ['3. Questions tab → Import from Excel → upload THIS file.'],
  ['4. The FIRST sheet (Questions) is imported. Other sheets are notes only.'],
  ['5. Review the 20 MCQs + 1 coding question, then save / publish.'],
  ['6. Allowed languages: JavaScript, Python, Java, C++ (portal default). Prefer telling students Python.'],
  [''],
  ['WHAT STUDENTS SEE'],
  ['- 20 MCQs (1 mark each).'],
  ['- 1 coding question (20 marks).'],
  ['- Run Tests: only Test 1 and Test 2 (public). They see input, expected, actual.'],
  ['- Submit: all 10 tests. Hidden tests show only Pass/Fail / WA / TLE / RE — never hidden I/O.'],
  [''],
  ['CODING I/O CONTRACT'],
  ['Line 1: n (even). Line 2: n space-separated integers. Example:'],
  ['4'],
  ['3 5 2 3'],
  ['Output is one integer, e.g. 7'],
  ['C++: cin >> n then read n ints. JS/Python/Java: parse solution(input) the same way.'],
  [''],
  ['RECOMMENDED EXAM SETTINGS'],
  ['Duration 30 minutes. Shuffle MCQ options if your UI supports it.'],
  ['Start Judge0 before the exam. Raise worker COUNT if the VM has 4+ vCPUs.'],
  ['Ask students to Submit code before the last 2 minutes to avoid the auto-submit judge spike.'],
];

const adminKey = [
  ['Case', 'Hidden', 'Weight', 'n', 'Expected', 'Why it exists'],
  ...codingTests.map((t) => [
    `Test ${t.index}`,
    t.hidden ? 'YES' : 'NO (public / Run Tests)',
    t.weight,
    t.nums.length,
    t.output,
    t.note,
  ]),
  [''],
  ['Reference idea (admin only — do not paste into the student statement):'],
  ['Sort nums. Pair nums[i] with nums[n-1-i]. Answer is max of those sums. O(n log n).'],
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(questionRows), 'Questions');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(howTo), 'How_to_upload');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(adminKey), 'Admin_test_key');

const out = join(__dir, 'minimize-max-pair-sum-30min.xlsx');
XLSX.writeFile(wb, out);

const check = XLSX.readFile(out);
const rows = XLSX.utils.sheet_to_json(check.Sheets.Questions, { defval: '' });
if (rows.length !== 21) throw new Error(`Expected 21 question rows, got ${rows.length}`);
if (String(rows[20].Type).toUpperCase() !== 'CODING') throw new Error('Last row must be CODING');
if (!rows[20]['Test 1 Input'] || !rows[20]['Test 10 Input']) throw new Error('Missing tests');

writeFileSync(
  join(__dir, 'minimize-max-pair-sum-30min.verify.json'),
  JSON.stringify(
    {
      questions: rows.length,
      publicTests: codingTests.filter((t) => !t.hidden).map((t) => ({ in: t.input.replace('\n', ' | '), out: t.output })),
      hiddenExpected: codingTests.filter((t) => t.hidden).map((t) => ({ n: t.nums.length, out: t.output, note: t.note })),
    },
    null,
    2,
  ),
);

console.log('Wrote', out);
console.log('Questions:', rows.length, '(20 MCQ + 1 CODING, 2 public + 8 hidden tests)');
