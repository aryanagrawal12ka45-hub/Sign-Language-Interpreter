/**
 * Text-to-Sign Translation and Tokenization Service
 * 
 * Integrates Sign-Flow's ISL NLP engine, validation, caching,
 * and hybrid backend/offline translation pipeline.
 */

import { textToGloss, getActionIdForGloss } from './textToGloss.js';
import { SUPPORTED_TOKEN_SET, sanitizeTokens, isFingerspellToken } from './islVocabulary.js';

export const MAX_SENTENCE_LENGTH = 250;
const CACHE_MAX_SIZE = 100;
const translationCache = new Map();

/**
 * Validate input text.
 * Returns { valid: boolean, error?: string, sanitized?: string, warnings?: string[] }
 */
export function validateSentenceInput(rawInput) {
  if (rawInput === undefined || rawInput === null) {
    return { valid: false, error: 'Please enter a sentence to translate.' };
  }

  const str = String(rawInput).trim();
  if (str.length === 0) {
    return { valid: false, error: 'Please enter a sentence to translate.' };
  }

  if (str.length > MAX_SENTENCE_LENGTH) {
    return {
      valid: false,
      error: `Input is too long (${str.length} characters). Maximum allowed is ${MAX_SENTENCE_LENGTH} characters.`,
    };
  }

  const warnings = [];
  // Check for emojis or non-standard symbols
  const hasEmoji = /[\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Extended_Pictographic}/u.test(str);
  if (hasEmoji) {
    warnings.push('Emojis cannot be directly signed and were skipped.');
  }

  // Sanitize: allow letters, numbers, basic punctuation, spaces
  const cleaned = str
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Extended_Pictographic}/gu, ' ')
    .replace(/[^\w\s,.?!'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length === 0) {
    return { valid: false, error: 'Sentence contains no readable words or characters.' };
  }

  return { valid: true, sanitized: cleaned, warnings };
}

/**
 * Build the structured token metadata array required for playback and UI.
 * Format:
 * [
 *   { word: "HOSPITAL", sign_id: "clip_hospital", type: "sign", duration: 850 },
 *   { word: "A", sign_id: "A", type: "fingerspell", duration: 380 }
 * ]
 */
/**
 * Build structured token metadata array from gloss words.
 * Any gloss word in SUPPORTED_TOKEN_SET is kept as a whole-word sign.
 * Any unsupported word is decomposed into letter-by-letter fingerspelling.
 */
export function buildStructuredTokens(rawTokens) {
  if (!Array.isArray(rawTokens)) return [];
  const structured = [];

  for (const entry of rawTokens) {
    const rawWord = String(entry ?? '').trim().toUpperCase().replace(/[-\s]+/g, '_');
    const word = rawWord.replace(/[^A-Z_]/g, '');
    if (!word) continue;

    if (SUPPORTED_TOKEN_SET.has(word)) {
      structured.push({
        word,
        sign_id: getActionIdForGloss(word) || `clip_${word.toLowerCase()}`,
        type: 'sign',
        duration: 850,
      });
    } else {
      // Decompose unsupported word into fingerspelled letters
      for (const letter of word.replace(/_/g, '')) {
        if (/^[A-Z]$/.test(letter)) {
          structured.push({
            word: letter,
            sign_id: letter,
            type: 'fingerspell',
            duration: 380,
            sourceWord: word,
          });
        }
      }
    }
  }

  return structured;
}

/**
 * Deterministic local conversion using Sign-Flow's textToGloss engine.
 */
export function convertTextOffline(text) {
  const glossResult = textToGloss(text);
  const structuredTokens = buildStructuredTokens(glossResult.tokens);

  return {
    sentence: text,
    rawText: text,
    glossText: structuredTokens.map((t) => t.word).join(' '),
    tokens: structuredTokens,
    mode: 'offline',
  };
}

/**
 * Hybrid translation: Attempts backend API /api/translate-to-sign with timeout,
 * falls back to client-side rule engine seamlessly. Uses in-memory LRU cache.
 */
export async function translateSentenceToSign(text, options = {}) {
  const validation = validateSentenceInput(text);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const cleanText = validation.sanitized;
  const cacheKey = cleanText.toLowerCase();

  // 1. Check in-memory cache
  if (translationCache.has(cacheKey)) {
    const cached = translationCache.get(cacheKey);
    // Refresh LRU order
    translationCache.delete(cacheKey);
    translationCache.set(cacheKey, cached);
    return { ...cached, cached: true, warnings: validation.warnings };
  }

  // 2. Attempt Backend POST /api/translate-to-sign
  let result = null;
  const apiEndpoint = options.apiEndpoint || '/api/translate-to-sign';
  const timeoutMs = options.timeoutMs || 2500;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.tokens) && data.tokens.length > 0) {
        // If backend returned raw token strings or full token objects, normalize
        const tokens = typeof data.tokens[0] === 'string'
          ? buildStructuredTokens(data.tokens)
          : data.tokens;

        result = {
          sentence: data.sentence || cleanText,
          rawText: cleanText,
          glossText: data.glossText || tokens.map((t) => t.word).join(' '),
          tokens,
          mode: data.mode || 'online',
        };
      }
    }
  } catch (_err) {
    // Backend unavailable or timed out, will fall through to offline engine
  }

  // 3. Fallback to offline rule-based converter
  if (!result) {
    result = convertTextOffline(cleanText);
  }

  result.warnings = validation.warnings;

  // Add to cache
  if (translationCache.size >= CACHE_MAX_SIZE) {
    const oldestKey = translationCache.keys().next().value;
    translationCache.delete(oldestKey);
  }
  translationCache.set(cacheKey, result);

  return { ...result, cached: false };
}

/** Clear translation cache if needed */
export function clearTranslationCache() {
  translationCache.clear();
}

