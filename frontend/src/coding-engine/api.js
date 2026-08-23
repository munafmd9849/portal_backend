import api from '../services/api';

export async function runCode({ language, code, input, sessionId, questionId }) {
  return api.runCode({ language, code, input, sessionId, questionId });
}

export async function evaluateCode({ language, code, testCases, sessionId, questionId, mode }) {
  return api.evaluateCode({ language, code, testCases, sessionId, questionId, mode });
}
