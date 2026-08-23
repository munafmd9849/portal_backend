import { writeFile, unlink, mkdtemp } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { parseInputValue } from '../sanitize.js';
import { timedProcess } from './timedProcess.js';

export async function runPython(code, input, timeoutMs = 3000) {
  const parsedInput = parseInputValue(input);
  const inputJson = JSON.stringify(parsedInput);
  const script = `
import json
INPUT = json.loads(${JSON.stringify(inputJson)})
${code}
if "solution" in dir() and callable(solution):
    result = solution(INPUT)
    if result is not None:
        print(result)
`;
  let dir;
  let filePath;
  try {
    dir = await mkdtemp(join(tmpdir(), 'portal-py-'));
    filePath = join(dir, 'main.py');
    await writeFile(filePath, script, 'utf8');
    return await timedProcess('python3', [filePath], { timeoutMs });
  } finally {
    if (filePath) {
      try { await unlink(filePath); } catch { /* ignore */ }
    }
  }
}
