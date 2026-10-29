"""
Automated Unit Tests for Text-to-Sign Translation and Tokenization Pipeline.
Tests:
- Short sentence
- Long sentence
- Punctuation handling
- Numbers handling
- Unknown words (fingerspelling fallback)
- Empty input and max length validation
- Structured output schema verification
- In-memory caching
"""

import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from scripts.text_to_sign_backend import (
    validate_sentence,
    lemmatize,
    text_to_isl_tokens,
    build_structured_tokens,
    translate_to_sign,
    SUPPORTED_SET,
)


class TestTextToSignPipeline(unittest.TestCase):

    def test_validation_empty_input(self):
        """Validates that empty input and whitespace are caught gracefully."""
        valid, _, err = validate_sentence("")
        self.assertFalse(valid)
        self.assertIn("Please enter a sentence", err)

        valid, _, err = validate_sentence("    ")
        self.assertFalse(valid)
        self.assertIn("Please enter a sentence", err)

        valid, _, err = validate_sentence(None)
        self.assertFalse(valid)

    def test_validation_max_length(self):
        """Validates that strings exceeding max length return an error."""
        long_str = "a" * 260
        valid, _, err = validate_sentence(long_str)
        self.assertFalse(valid)
        self.assertIn("too long", err)

    def test_validation_sanitization_and_emojis(self):
        """Validates that emojis and special characters are safely handled."""
        valid, sanitized, err = validate_sentence("Hello world! 👋😀")
        self.assertTrue(valid)
        self.assertNotIn("👋", sanitized)
        self.assertNotIn("😀", sanitized)
        self.assertIn("Hello world!", sanitized)

    def test_short_sentence(self):
        """Tests short sentence translation."""
        res = translate_to_sign("Hello")
        self.assertEqual(res["sentence"], "Hello")
        self.assertTrue(len(res["tokens"]) >= 1)
        self.assertEqual(res["tokens"][0]["word"], "HELLO")
        self.assertEqual(res["tokens"][0]["type"], "sign")

    def test_long_sentence(self):
        """Tests long multi-clause sentence translation."""
        long_sentence = "Good morning teacher, I go to school and read a book because tomorrow is exam"
        res = translate_to_sign(long_sentence)
        self.assertTrue(len(res["tokens"]) >= 4)
        words = [t["word"] for t in res["tokens"]]
        # Expect key tokens to be present
        self.assertTrue(any(w in words for w in ["TEACHER", "SCHOOL", "BOOK", "EXAM"]))

    def test_punctuation_handling(self):
        """Tests handling of question marks, exclamation marks, commas, and dots."""
        res = translate_to_sign("Where is the hospital?!...")
        self.assertNotIn("error", res)
        words = [t["word"] for t in res["tokens"]]
        self.assertIn("HOSPITAL", words)
        self.assertIn("WHERE", words)
        # ISL grammar: question word should be at the end
        self.assertEqual(words[-1], "WHERE")

    def test_numbers_handling(self):
        """Tests sentence with alphanumeric characters."""
        res = translate_to_sign("Bus 5")
        self.assertNotIn("error", res)
        words = [t["word"] for t in res["tokens"]]
        self.assertIn("BUS", words)

    def test_unknown_words_fingerspelling_fallback(self):
        """Tests that unknown proper names fallback to letter-by-letter fingerspelling."""
        res = translate_to_sign("My name is John")
        self.assertNotIn("error", res)
        tokens = res["tokens"]
        words = [t["word"] for t in tokens]

        self.assertIn("MY", words)
        self.assertIn("NAME", words)
        # 'John' should be expanded into J, O, H, N fingerspelling
        self.assertIn("J", words)
        self.assertIn("O", words)
        self.assertIn("H", words)
        self.assertIn("N", words)

        for t in tokens:
            if t["word"] in ["J", "O", "H", "N"]:
                self.assertEqual(t["type"], "fingerspell")
                self.assertEqual(t["sign_id"], t["word"])
                self.assertEqual(t["duration"], 380)

    def test_structured_token_schema(self):
        """Verifies that every token strictly matches the required structured schema."""
        res = translate_to_sign("I need help please")
        self.assertIn("sentence", res)
        self.assertIn("tokens", res)
        self.assertIn("glossText", res)
        self.assertIn("mode", res)

        for t in res["tokens"]:
            self.assertIn("word", t)
            self.assertIn("sign_id", t)
            self.assertIn("type", t)
            self.assertIn("duration", t)
            self.assertIn(t["type"], ["sign", "fingerspell"])
            self.assertIsInstance(t["duration"], (int, float))

    def test_in_memory_caching(self):
        """Verifies that repeated requests hit the fast cache."""
        test_sent = "Where do you live?"
        res1 = translate_to_sign(test_sent)
        self.assertFalse(res1.get("cached", False))

        res2 = translate_to_sign(test_sent)
        self.assertTrue(res2.get("cached", False))
        self.assertEqual(res1["tokens"], res2["tokens"])


if __name__ == "__main__":
    unittest.main()

