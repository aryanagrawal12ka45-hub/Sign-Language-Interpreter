import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SUPPORTED_TOKENS,
  SUPPORTED_TOKEN_SET,
  isFingerspellToken,
  isPlayableToken,
  sanitizeTokens,
} from '../src/text_to_sign/islVocabulary.js';
import { textToGloss, lemmatizeWord } from '../src/text_to_sign/textToGloss.js';
import {
  validateSentenceInput,
  buildStructuredTokens,
  convertTextOffline,
} from '../src/text_to_sign/text_to_sign_service.js';

test('JS Vocabulary & Tokens integrity', () => {
  assert.ok(SUPPORTED_TOKENS.length >= 100);
  assert.equal(SUPPORTED_TOKEN_SET.size, SUPPORTED_TOKENS.length);
  assert.ok(isPlayableToken('HELLO'));
  assert.ok(isPlayableToken('A'));
  assert.ok(!isPlayableToken('UNKNOWN_TERM'));
});

test('JS Validation catches empty strings & excessive length', () => {
  assert.equal(validateSentenceInput('').valid, false);
  assert.equal(validateSentenceInput('   ').valid, false);
  assert.equal(validateSentenceInput('a'.repeat(300)).valid, false);
  assert.equal(validateSentenceInput('Hello world!').valid, true);
});

test('JS Offline Text-to-Sign produces valid structured tokens', () => {
  const res = convertTextOffline('Where is the hospital?');
  assert.equal(res.sentence, 'Where is the hospital?');
  assert.ok(res.tokens.length >= 2);
  const words = res.tokens.map((t) => t.word);
  assert.ok(words.includes('HOSPITAL'));
  assert.ok(words.includes('WHERE'));

  for (const t of res.tokens) {
    assert.ok(t.word);
    assert.ok(t.sign_id);
    assert.ok(t.type === 'sign' || t.type === 'fingerspell');
    assert.ok(typeof t.duration === 'number');
  }
});

test('JS Fingerspelling fallback for names', () => {
  const res = convertTextOffline('My name is Amit');
  const words = res.tokens.map((t) => t.word);
  assert.ok(words.includes('A'));
  assert.ok(words.includes('M'));
  assert.ok(words.includes('I'));
  assert.ok(words.includes('T'));
});

