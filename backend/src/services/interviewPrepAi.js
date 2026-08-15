/**
 * Interview Prep AI — Mistral primary, Gemini fallback
 */

import { AI_CONFIG } from '../config/ai.config.js';
import { generateContent as generateGoogleContent } from './ai/google.provider.js';
import { generateMistralJSON } from './mistralService.js';

const JSON_SYSTEM = 'You are an expert technical interviewer and placement coach. Respond with a single valid JSON object only — no markdown fences, no prose outside JSON.';

function parseAiJson(raw) {
  const text = String(raw || '').trim();
  const cleaned = text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('AI returned invalid JSON');
  }
}

export function isInterviewPrepAiAvailable() {
  if (!AI_CONFIG.enabled) return false;
  return Boolean(process.env.MISTRAL_API_KEY || AI_CONFIG.google.apiKey);
}

export function getInterviewPrepAiProvider() {
  if (process.env.MISTRAL_API_KEY) return 'mistral';
  if (AI_CONFIG.google.apiKey) return 'google';
  return null;
}

/**
 * Generate structured JSON for interview prep (analysis, questions, evaluation).
 * Prefers Mistral when MISTRAL_API_KEY is set.
 */
export async function generateInterviewPrepJson(userPrompt, { temperature = 0.3, maxTokens = 4096 } = {}) {
  const mistralKey = process.env.MISTRAL_API_KEY;

  if (mistralKey) {
    try {
      return await generateMistralJSON(JSON_SYSTEM, userPrompt, temperature);
    } catch (error) {
      console.warn('[InterviewPrep] Mistral request failed:', error.message);
      if (!AI_CONFIG.google.apiKey) throw error;
    }
  }

  if (AI_CONFIG.enabled && AI_CONFIG.google.apiKey) {
    const raw = await generateGoogleContent(`${JSON_SYSTEM}\n\n${userPrompt}`, {
      temperature,
      maxTokens,
      timeoutMs: 90000,
    });
    return parseAiJson(raw);
  }

  throw new Error('No AI provider configured. Set MISTRAL_API_KEY or GOOGLE_AI_API_KEY.');
}
