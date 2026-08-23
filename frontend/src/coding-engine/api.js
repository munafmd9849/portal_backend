import api from '../services/api';

export async function runCode({ language, code, input, sessionId }) {
  return api.runCode({ language, code, input, sessionId });
}

export async function evaluateCode({ language, code, testCases, sessionId, questionId }) {
  return api.evaluateCode({ language, code, testCases, sessionId, questionId });
}
