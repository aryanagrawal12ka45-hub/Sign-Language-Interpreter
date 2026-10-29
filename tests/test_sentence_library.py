"""
Comprehensive test suite verifying that every sentence in the practice sentence library
translates properly through the Text-to-Sign translation service into a valid sign sequence.
"""

import json
import os
import unittest
from scripts.text_to_sign_backend import translate_to_sign

class TestSentenceLibrary(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        json_path = os.path.join("assets", "data", "practice_sentences.json")
        cls.assertTrue(os.path.exists(json_path), f"Sentences file not found at {json_path}")
        with open(json_path, "r", encoding="utf-8") as f:
            cls.sentences = json.load(f)

    def test_library_size_and_categories(self):
        """Ensure library has >= 100 sentences across the 11 designated categories."""
        self.assertGreaterEqual(len(self.sentences), 100)

        expected_categories = [
            "Greetings and introductions",
            "Daily routine",
            "Family and friends",
            "School and college",
            "Food and drinks",
            "Health and emergencies",
            "Travel and directions",
            "Shopping and money",
            "Feelings and emotions",
            "Questions (who, what, where, when, why, how)",
            "Time, days, weather"
        ]

        cat_counts = {}
        for s in self.sentences:
            cat = s.get("category")
            self.assertIn(cat, expected_categories, f"Unknown category: {cat}")
            cat_counts[cat] = cat_counts.get(cat, 0) + 1

        for cat in expected_categories:
            self.assertIn(cat, cat_counts, f"Missing category: {cat}")
            self.assertGreaterEqual(cat_counts[cat], 10, f"Category '{cat}' has fewer than 10 sentences ({cat_counts[cat]})")

    def test_sentence_difficulties_and_word_counts(self):
        """Verify difficulty rules: beginner (2-4 words), intermediate (5-8 words), advanced (9-15 words)."""
        valid_difficulties = {"beginner", "intermediate", "advanced"}
        for s in self.sentences:
            text = s.get("text", "")
            diff = s.get("difficulty", "")
            self.assertIn(diff, valid_difficulties)

            word_count = len(text.split())
            if diff == "beginner":
                self.assertTrue(2 <= word_count <= 4, f"Beginner word count violation: '{text}' has {word_count} words")
            elif diff == "intermediate":
                self.assertTrue(5 <= word_count <= 8, f"Intermediate word count violation: '{text}' has {word_count} words")
            elif diff == "advanced":
                self.assertTrue(9 <= word_count <= 15, f"Advanced word count violation: '{text}' has {word_count} words")

    def test_every_sentence_produces_valid_sign_sequence(self):
        """Translate every single sentence and assert valid non-empty tokens."""
        for s in self.sentences:
            text = s.get("text", "")
            res = translate_to_sign(text)
            self.assertNotIn("error", res, f"Translation returned error for: '{text}'")
            tokens = res.get("tokens", [])
            self.assertGreater(len(tokens), 0, f"No tokens produced for: '{text}'")

            for t in tokens:
                self.assertIn("word", t)
                self.assertIn("sign_id", t)
                self.assertIn("type", t)
                self.assertIn(t["type"], {"sign", "fingerspell"})
                self.assertIn("duration", t)
                self.assertGreater(t["duration"], 0)

if __name__ == "__main__":
    unittest.main()

