import { parseInputValue } from './sanitize.js';
import { buildJavaSource } from './runners/java.js';

/**
 * Build a complete program for Judge0 from student code + portal `solution(input)` contract.
 */
export function wrapCodeForJudge0(language, code, input) {
  const lang = String(language || 'javascript').toLowerCase();
  const parsedInput = parseInputValue(input);
  const inputJson = JSON.stringify(parsedInput);

  if (lang === 'javascript' || lang === 'js') {
    return `"use strict";
${code}
(function () {
  const INPUT = ${inputJson};
  if (typeof solution === "function") {
    const result = solution(INPUT);
    if (result !== undefined && result !== null) {
      console.log(result);
    }
  }
})();`;
  }

  if (lang === 'python') {
    return `import json
INPUT = json.loads(${JSON.stringify(inputJson)})
${code}
if "solution" in dir() and callable(solution):
    result = solution(INPUT)
    if result is not None:
        print(result)`;
  }

  if (lang === 'java') {
    const rawLiteral =
      typeof input === 'string' ? JSON.stringify(input) : JSON.stringify(String(input ?? ''));
    return buildJavaSource(code, rawLiteral);
  }

  if (lang === 'cpp' || lang === 'c++') {
    const stdin = typeof input === 'string' ? input : String(input ?? '');
    const hasMain = /\bint\s+main\s*\(/.test(code);
    if (hasMain) {
      return { source: code, stdin };
    }
    return {
      source: `#include <iostream>
#include <string>
using namespace std;
${code}
int main() {
  return 0;
}`,
      stdin,
    };
  }

  throw new Error(`Unsupported language for Judge0 wrapper: ${language}`);
}

export function resolveWrappedSubmission(language, code, input) {
  const wrapped = wrapCodeForJudge0(language, code, input);
  if (typeof wrapped === 'string') {
    return { sourceCode: wrapped, stdin: '' };
  }
  return { sourceCode: wrapped.source, stdin: wrapped.stdin || '' };
}
