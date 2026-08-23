/**
 * Coding-question only Excel + bulk-paste test cases
 * for LeetCode 1877: Minimize Maximum Pair Sum in Array.
 *
 * Admin → Assessments → Import from Excel, or create a CODING question
 * and paste samples/minimize-max-pair-sum-testcases-paste.txt
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

const hiddenA = randomEvenArray(200, 1, 1000, 1877);
const hiddenB = randomEvenArray(1000, 1, 100000, 42);

const codingTests = [
  { nums: [3, 5, 2, 3], hidden: false, weight: 1, note: 'LeetCode example 1' },
  { nums: [3, 5, 4, 2, 4, 6], hidden: false, weight: 1, note: 'LeetCode example 2' },
  { nums: [1, 1], hidden: true, weight: 1, note: 'Minimum n = 2' },
  { nums: [1, 100000], hidden: true, weight: 1, note: 'Max values, n = 2' },
  { nums: [1, 1, 1, 1], hidden: true, weight: 1, note: 'All equal' },
  { nums: [1, 2, 3, 6], hidden: true, weight: 2, note: 'Greedy trap' },
  { nums: [4, 3, 2, 1], hidden: true, weight: 1, note: 'Reverse sorted' },
  { nums: [5, 5, 5, 1], hidden: true, weight: 1, note: 'Duplicates' },
  { nums: hiddenA, hidden: true, weight: 2, note: 'n = 200 mixed' },
  { nums: hiddenB, hidden: true, weight: 3, note: 'n = 1000' },
].map((t, i) => ({
  ...t,
  index: i + 1,
  input: `${t.nums.length}\n${t.nums.join(' ')}`,
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
Explanation: Pairs (3,5), (4,4), (2,6) → all pair sums 8.`;

const codingConstraints = `n == nums.length
2 <= n <= 1000 in this exam (LeetCode original allows up to 1e5)
n is even
1 <= nums[i] <= 1e5
Time limit: 2 seconds per test
Memory limit: 256 MB`;

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

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([codingRow]), 'Questions');

const xlsxPath = join(__dir, 'minimize-max-pair-sum-coding.xlsx');
XLSX.writeFile(wb, xlsxPath);

const small = codingTests.filter((t) => t.nums.length <= 8);
const pasteBlocks = codingTests.map((t) => {
  const hiddenLine = t.hidden ? 'hidden: true\n' : 'hidden: false\n';
  return `${hiddenLine}${t.input}\n===\n${t.output}`;
});

const pasteTxt = `${pasteBlocks.join('\n---\n')}\n`;

writeFileSync(join(__dir, 'minimize-max-pair-sum-testcases-paste.txt'), pasteTxt);

const smallTxt = `SMALL CASES — paste one-by-one in the coding editor (Input / Expected output).
Tick Hidden for tests 3–8. Tests 1–2 stay public.

For tests 9 (n=200) and 10 (n=1000) use minimize-max-pair-sum-testcases-paste.txt
or upload minimize-max-pair-sum-coding.xlsx instead.

${small
  .map(
    (t) => `========== Test ${t.index} — ${t.note} ==========
Hidden: ${t.hidden ? 'YES' : 'NO'}
Weight: ${t.weight}

INPUT
${t.input}

EXPECTED OUTPUT
${t.output}
`,
  )
  .join('\n')}
`;

writeFileSync(join(__dir, 'minimize-max-pair-sum-testcases-small.txt'), smallTxt);

const check = XLSX.readFile(xlsxPath);
const rows = XLSX.utils.sheet_to_json(check.Sheets.Questions, { defval: '' });
if (rows.length !== 1) throw new Error(`Expected 1 row, got ${rows.length}`);
if (String(rows[0].Type).toUpperCase() !== 'CODING') throw new Error('Must be CODING');
if (!rows[0]['Test 1 Input'] || !rows[0]['Test 10 Input']) throw new Error('Missing tests');

console.log('Wrote', xlsxPath);
console.log('Wrote', join(__dir, 'minimize-max-pair-sum-testcases-paste.txt'));
console.log('Wrote', join(__dir, 'minimize-max-pair-sum-testcases-small.txt'));
console.log(
  'Public:',
  codingTests
    .filter((t) => !t.hidden)
    .map((t) => `${t.input.replace('\n', ' | ')} → ${t.output}`)
    .join('  ;;  '),
);
