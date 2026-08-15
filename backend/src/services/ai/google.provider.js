/**
 * Google AI Provider
 * Handles Google Gemini API interactions
 * Model name comes from environment variables only
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_CONFIG } from '../../config/ai.config.js';
import logger from '../../config/logger.js';

let genAI = null;

/**
 * Initialize Google AI client
 */
function initializeGoogleAI() {
  if (genAI) {
    return;
  }

  // DEBUG: Log API key status (masked for security)
  const apiKey = AI_CONFIG.google.apiKey;
  const apiKeyPreview = apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'MISSING';
  console.log('[GOOGLE_AI] Initializing with API key:', apiKeyPreview);
  console.log('[GOOGLE_AI] Model:', AI_CONFIG.google.model || 'gemini-2.5-flash');

  if (!apiKey) {
    console.error('[GOOGLE_AI] ❌ GOOGLE_AI_API_KEY is missing. Set it in your .env file.');
    console.error('[GOOGLE_AI] Checked env vars: GOOGLE_AI_API_KEY, GOOGLE_GEMINI_API_KEY, GEMINI_API_KEY');
    throw new Error('Google AI API key not configured');
  }

  if (apiKey.trim() === '') {
    console.error('[GOOGLE_AI] ❌ GOOGLE_AI_API_KEY is empty. Set a valid key in your .env file.');
    throw new Error('Google AI API key cannot be empty');
  }

  // Validate API key format (Google AI keys typically start with AIza)
  if (!apiKey.startsWith('AIza') && apiKey.length < 30) {
    console.warn('[GOOGLE_AI] ⚠️  API key format looks unusual. Google AI keys usually start with "AIza" and are 39+ characters.');
  }

  try {
    genAI = new GoogleGenerativeAI(apiKey);
    logger.info('Google AI client initialized', {
      model: AI_CONFIG.google.model || 'gemini-2.5-flash',
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey.length,
    });
    console.log('[GOOGLE_AI] ✅ Client initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Google AI client', { error: error.message, stack: error.stack });
    console.error('[GOOGLE_AI] ❌ Failed to initialize:', error.message);
    throw new Error('Failed to initialize Google AI service');
  }
}

/**
 * Generate content using Google Gemini
 * @param {string} prompt - The prompt to send to the AI
 * @param {Object} overrideConfig - Optional config override { temperature, maxTokens }
 * @returns {Promise<string>} The generated text response
 */
export async function generateContent(prompt, overrideConfig = {}) {
  if (!AI_CONFIG.google.apiKey) {
    throw new Error('Google AI API key not configured. Set GOOGLE_AI_API_KEY or GEMINI_API_KEY environment variable.');
  }

  if (!genAI) {
    initializeGoogleAI();
  }

  const temperature = overrideConfig.temperature !== undefined ? overrideConfig.temperature : AI_CONFIG.google.temperature;
  const maxTokens = overrideConfig.maxTokens !== undefined ? overrideConfig.maxTokens : AI_CONFIG.google.maxTokens;
  const requestTimeoutMs = overrideConfig.timeoutMs ?? 60000;

  const configuredModel = overrideConfig.model || AI_CONFIG.google.model || 'gemini-2.5-flash';
  const modelCandidates = [...new Set([
    configuredModel,
    'gemini-2.5-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest',
  ])];

  let lastError = null;

  for (const modelName of modelCandidates) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: maxTokens,
        },
      });

      logger.info('Sending request to Google AI', {
        model: modelName,
        promptLength: prompt.length,
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), requestTimeoutMs);
      });

      const generatePromise = model.generateContent(prompt);
      const response = await Promise.race([generatePromise, timeoutPromise]);
      const result = await response.response;

      let text = '';
      try {
        text = result.text();
      } catch (textError) {
        if (result.candidates?.[0]?.content?.parts) {
          text = result.candidates[0].content.parts.map((part) => part.text || '').join('');
        }
        if (!text) {
          throw new Error(`Failed to extract text from response: ${textError.message}`);
        }
      }

      if (!text?.trim()) {
        throw new Error('AI service returned an empty response');
      }

      logger.info('Received response from Google AI', {
        model: modelName,
        responseLength: text.length,
      });

      return text;
    } catch (error) {
      lastError = error;
      const retryable = error.message?.includes('404')
        || error.message?.includes('not found')
        || error.message?.includes('not available')
        || error.status === 404;
      if (!retryable) {
        break;
      }
      console.warn(`[GOOGLE_AI] Model ${modelName} failed, trying fallback...`, error.message?.slice(0, 120));
    }
  }

  const error = lastError || new Error('Google AI request failed');

  console.error('[GOOGLE_AI] ❌ Generation error:', {
    model: configuredModel,
    errorMessage: error.message,
    errorStatus: error.status,
  });

  logger.error('Google AI generation error', {
    model: configuredModel,
    error: error.message,
    errorStatus: error.status,
  });

  if (error.message.includes('quota') || error.message.includes('rate limit') || error.message.includes('429') || error.status === 429) {
    throw new Error('AI service quota exceeded. Please try again later.');
  }

  if (error.message.includes('timeout')) {
    throw new Error('AI request timed out. Please try again.');
  }

  if (error.message.includes('API key') || error.message.includes('401') || error.message.includes('403') || error.status === 401 || error.status === 403) {
    throw new Error('AI service authentication failed. Use a valid Google AI Studio key (starts with AIza...) in GOOGLE_AI_API_KEY.');
  }

  if (error.message.includes('not found') || error.message.includes('404') || error.status === 404) {
    throw new Error('No Gemini model available with your API key. Set GOOGLE_AI_MODEL=gemini-2.5-flash and verify your key at https://aistudio.google.com/apikey');
  }

  throw new Error(`AI service error: ${error.message}`);
}

