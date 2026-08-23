# 30-minute assessment pack — Minimize Maximum Pair Sum

Use this with **100 students**, **20 MCQs + 1 coding question**, **30 minutes**.

Files:

- `samples/minimize-max-pair-sum-30min.xlsx` — upload this
- This manual

LeetCode source: [1877. Minimize Maximum Pair Sum in Array](https://leetcode.com/problems/minimize-maximum-pair-sum-in-array/)

---

## 1. What is in the Excel

**Sheet `Questions` (imported — must stay first)**

| Rows | Type | Marks |
|---|---|---|
| 1–20 | MCQ (4 options, Correct = A/B/C/D) | 1 each = 20 |
| 21 | CODING | 20 |
| **Total** | | **40** |

**Coding tests**

| Test | Visible to student | Role |
|---|---|---|
| 1–2 | Public (`Hidden = FALSE`) | **Run Tests** — input + expected + actual shown |
| 3–10 | Hidden (`Hidden = TRUE`) | **Submit only** — verdict only, no I/O leak |

Coverage: LeetCode samples, n=2, max values, all-equal, greedy trap, reverse-sorted, duplicates, n=200, n=1000.

**Other sheets** (`How_to_upload`, `Admin_test_key`) are for you. The importer only reads the first sheet.

---

## 2. Student coding contract (this portal, not raw LeetCode)

**Input (stdin / `solution(input)` text):**

```
n
a1 a2 ... an
```

Example:

```
4
3 5 2 3
```

- Line 1: even integer `n` (length of the array)
- Line 2: `n` space-separated integers
- **Output:** one integer, e.g. `7` — no extra text

| Language | What they write |
|---|---|
| JavaScript | `function solution(input)` — parse `n` then the next `n` numbers from the text |
| Python | `def solution(input)` — same (`str(input).split()`) |
| Java | `public static Object solution(Object input)` — parse the string |
| C++ | `cin >> n;` then read `n` ints in `main` |

C++ uses **stdin**. JS / Python / Java get the same two-line text as `input`.

---

## 3. Upload steps (admin)

1. Open **Admin → Assessments**.
2. Create assessment:
   - Name: e.g. `DSA Sprint — Pair Sum`
   - **Duration: 30 minutes**
   - Enable coding languages you want (recommend **Python + JavaScript + C++**; Java is slowest on this judge).
3. Questions → **Import from Excel** → choose `samples/minimize-max-pair-sum-30min.xlsx`.
4. Confirm **21 questions**. Open the coding item and check:
   - Test 1 / Test 2 are **not** hidden
   - Tests 3–10 **are** hidden
   - Time 2s, memory 256 MB
5. Save / publish. Assign to the 100 students.
6. Start **Judge0** on the server **before** the exam.

Do not reorder sheets so that `How_to_upload` becomes first — import would break.

---

## 4. How Run Tests vs Submit works

- **Run Tests:** public tests only (1–2). Students debug with full I/O.
- **Submit (in editor):** all 10 tests. Hidden I/O never returned.
- **End of exam:** the server grades coding again on all tests.

Tell students: use Run Tests while writing; Submit once it passes public tests; **submit the exam before the last 2 minutes** so 100 people are not judged at the exact timer.

---

## 5. Reference algorithm (admin only — do not paste into the question)

```text
Sort nums.
Pair nums[i] with nums[n-1-i] for i = 0 .. n/2-1.
Answer = max of those pair sums.
Time O(n log n). Extra space O(1) after sort (or O(n) if you copy).
```

Wrong greedy: pairing the two largest first (fails on `[1,2,3,6]` → 9 vs optimal 7).

Python reference:

```python
def solution(input):
    parts = str(input).split()
    n = int(parts[0])
    nums = list(map(int, parts[1:1 + n]))
    nums.sort()
    best = 0
    i, j = 0, len(nums) - 1
    while i < j:
        best = max(best, nums[i] + nums[j])
        i += 1
        j -= 1
    return best
```

---

## 6. Suggested student briefing (2 minutes at start)

- 20 MCQs + 1 coding question, 30 minutes, 40 marks.
- Coding input: first line `n`, second line `n` integers. Output is **one number**.
- **Run Tests** = samples only. **Submit** = hidden tests too.
- Do not spam Run Tests. Prefer Python. Submit code before the last 2 minutes.

---

## 7. 100 students / 30 minutes — operations

MCQs will hold. Risk is **everyone judging code at once** (especially Java, especially auto-submit at 30:00).

Before the exam:

- Judge0 container healthy
- If the VM has ≥4 vCPUs, set Judge0 `COUNT` to 8+ and `MAX_QUEUE_SIZE` to 500+

After the exam: if some coding scores look empty/timeout, re-run official grade for those sessions.

---

## 8. Regenerating the Excel

From repo root:

```bash
node samples/generate-pair-sum-assessment.mjs
```

This overwrites `samples/minimize-max-pair-sum-30min.xlsx`.
