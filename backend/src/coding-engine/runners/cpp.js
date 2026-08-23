import { writeFile, mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { sanitizeInput } from '../sanitize.js';
import { timedProcess } from './timedProcess.js';

const COMPILE_TIMEOUT_MS = 20_000;

function cppSource(code) {
  const hasMain = /\bint\s+main\s*\(/.test(code);
  if (hasMain) return code;
  return `#include <iostream>
#include <string>
#include <iterator>
using namespace std;
${code}
int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  string input((istreambuf_iterator<char>(cin)), istreambuf_iterator<char>());
  cout << solution(input);
  return 0;
}`;
}

function compileErrorResult(compile) {
  return {
    output: '',
    error: compile.timedOut ? 'Time Limit Exceeded' : compile.stderr || 'Compilation failed',
    executionTime: compile.executionTime,
  };
}

export async function runCpp(code, input, timeoutMs = 5000) {
  const results = await runCppSuite(code, [input], timeoutMs);
  return results[0];
}

/** Compile once, then run each stdin. Submit was recompiling C++ on every hidden test via Judge0. */
export async function runCppSuite(code, inputs, timeoutMs = 5000) {
  const source = cppSource(code);
  const stdinList = (inputs || []).map((v) => sanitizeInput(v));
  let dir;
  try {
    dir = await mkdtemp(join(tmpdir(), 'portal-cpp-'));
    const src = join(dir, 'main.cpp');
    const out = join(dir, 'main');
    await writeFile(src, source, 'utf8');
    const compile = await timedProcess('g++', ['-std=c++17', '-O0', src, '-o', out], {
      cwd: dir,
      timeoutMs: COMPILE_TIMEOUT_MS,
    });
    if (!compile.ok) {
      return stdinList.map(() => compileErrorResult(compile));
    }
    const runs = [];
    for (const stdin of stdinList) {
      runs.push(await timedProcess(out, [], { cwd: dir, timeoutMs, stdin }));
    }
    return runs.map((run) => ({
      output: run.output,
      error: run.ok ? null : run.timedOut ? 'Time Limit Exceeded' : run.stderr || 'Runtime error',
      executionTime: run.executionTime,
    }));
  } finally {
    if (dir) {
      try { await rm(dir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  }
}
