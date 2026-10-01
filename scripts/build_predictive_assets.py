"""
Build offline static assets for Smart Predictive Text & Autocomplete:
1. assets/data/word_corpus.json  (~5,000 words with frequencies)
2. assets/data/bigrams.json       (~2,000 bigram pairs with normalized scores)
"""

import json
import os
import re
import urllib.request
from collections import defaultdict

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "data")
os.makedirs(ASSETS_DIR, exist_ok=True)

# 1. Essential conversational ASL words to ensure are top-ranked
CORE_ASL_CONVERSATIONAL = [
    "hello", "hi", "hey", "yes", "no", "please", "thank", "thanks", "sorry",
    "welcome", "excuse", "good", "bad", "fine", "ok", "okay", "help", "need",
    "want", "like", "love", "friend", "family", "mother", "father", "sister",
    "brother", "name", "sign", "language", "learn", "practice", "school",
    "work", "home", "house", "bathroom", "restroom", "water", "food", "eat",
    "drink", "time", "day", "night", "morning", "afternoon", "evening", "today",
    "tomorrow", "yesterday", "now", "later", "again", "slow", "understand",
    "know", "think", "feel", "happy", "sad", "tired", "busy", "ready", "who",
    "what", "where", "when", "why", "how", "much", "many", "call", "meet",
    "see", "hear", "deaf", "hearing", "stop", "go", "come", "wait", "more"
]

print("--- Step 1: Building Word Corpus ---")

# We use OpenSubtitles frequency (spoken dialogues) + Google 10k list
word_freq_map = {}

# Try fetching OpenSubtitles spoken frequency list
spoken_url = "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt"
google_url = "https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-usa-no-swears.txt"

words_loaded = False
try:
    print(f"Fetching spoken dialogue frequencies from {spoken_url}...")
    req = urllib.request.Request(spoken_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        lines = resp.read().decode("utf-8", errors="ignore").splitlines()
        max_f = 0
        for i, line in enumerate(lines):
            parts = line.strip().split()
            if len(parts) == 2:
                w, f_str = parts[0].lower(), parts[1]
                if w.isalpha() and len(w) >= 2:
                    try:
                        freq_val = int(f_str)
                        if not max_f:
                            max_f = freq_val
                        # Normalize logarithmically or linearly between 10 and 100
                        norm_f = max(10, int(10 + 90 * (1 - (i / 15000))))
                        word_freq_map[w] = norm_f
                    except ValueError:
                        pass
            if len(word_freq_map) >= 6000:
                break
        words_loaded = True
        print(f"Loaded {len(word_freq_map)} words from spoken corpus.")
except Exception as e:
    print("Spoken frequency fetch failed, falling back to Google 10k:", e)

if not words_loaded or len(word_freq_map) < 3000:
    try:
        print(f"Fetching from {google_url}...")
        req = urllib.request.Request(google_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            lines = resp.read().decode("utf-8", errors="ignore").splitlines()
            for i, line in enumerate(lines):
                w = line.strip().lower()
                if w.isalpha() and len(w) >= 2:
                    norm_f = max(10, int(100 - (i / len(lines)) * 85))
                    if w not in word_freq_map:
                        word_freq_map[w] = norm_f
    except Exception as e:
        print("Google list fetch failed:", e)

# Ensure core ASL vocabulary gets high frequency
for w in CORE_ASL_CONVERSATIONAL:
    current = word_freq_map.get(w, 0)
    word_freq_map[w] = max(current, 95)

# Sort words by frequency descending, pick top 5000
sorted_words = sorted(word_freq_map.items(), key=lambda x: x[1], reverse=True)[:5000]
corpus_data = [{"w": w, "f": f} for w, f in sorted_words]

corpus_file = os.path.join(ASSETS_DIR, "word_corpus.json")
with open(corpus_file, "w", encoding="utf-8") as f:
    json.dump(corpus_data, f, separators=(',', ':'))

print(f"Saved {len(corpus_data)} words to {corpus_file} ({os.path.getsize(corpus_file) / 1024:.1f} KB)")


print("\n--- Step 2: Building Bigrams Table ---")

# High-priority conversational bigrams curated for daily speech and ASL interpreting
CURATED_BIGRAMS = {
    "HOW": [["ARE", 98], ["DO", 88], ["IS", 82], ["CAN", 78], ["MUCH", 75], ["MANY", 70], ["WAS", 65]],
    "ARE": [["YOU", 99], ["WE", 80], ["THEY", 75], ["THERE", 70], ["THESE", 60]],
    "YOU": [["ARE", 95], ["CAN", 88], ["HAVE", 85], ["WANT", 82], ["NEED", 80], ["KNOW", 78], ["LOOK", 72], ["FEEL", 70], ["LIKE", 70], ["SEE", 68]],
    "I": [["AM", 98], ["WANT", 90], ["NEED", 88], ["HAVE", 85], ["LIKE", 84], ["LOVE", 82], ["THINK", 80], ["FEEL", 78], ["CAN", 76], ["KNOW", 75], ["SEE", 70]],
    "AM": [["FINE", 90], ["GOOD", 88], ["READY", 85], ["HERE", 80], ["TIRED", 75], ["SORRY", 75], ["HAPPY", 70], ["LEARNING", 65]],
    "WHAT": [["IS", 95], ["ARE", 88], ["DO", 85], ["DID", 75], ["HAPPENED", 70], ["TIME", 68], ["ABOUT", 65]],
    "WHAT IS": [["YOUR", 95], ["THAT", 90], ["THIS", 85], ["THE", 80]],
    "WHERE": [["IS", 95], ["ARE", 88], ["DO", 78], ["CAN", 75], ["DID", 70]],
    "WHEN": [["WILL", 90], ["IS", 85], ["ARE", 80], ["CAN", 78], ["DID", 72]],
    "WHY": [["ARE", 90], ["DID", 85], ["DO", 80], ["IS", 75], ["NOT", 70]],
    "WHO": [["IS", 95], ["ARE", 85], ["WAS", 80], ["CAN", 75]],
    "CAN": [["YOU", 98], ["I", 95], ["WE", 85], ["IT", 75], ["HELP", 70]],
    "COULD": [["YOU", 98], ["I", 92], ["WE", 80]],
    "WOULD": [["YOU", 98], ["LIKE", 90], ["BE", 75]],
    "THANK": [["YOU", 99], ["GOD", 70]],
    "THANKS": [["FOR", 95], ["A", 85], ["AGAIN", 80]],
    "GOOD": [["MORNING", 95], ["AFTERNOON", 90], ["EVENING", 88], ["NIGHT", 86], ["JOB", 82], ["LUCK", 80], ["IDEA", 75], ["TO", 70]],
    "NICE": [["TO", 98], ["MEETING", 90], ["DAY", 80]],
    "TO": [["MEET", 95], ["SEE", 90], ["GO", 85], ["DO", 82], ["HELP", 80], ["BE", 75], ["HAVE", 70]],
    "MEET": [["YOU", 99]],
    "SEE": [["YOU", 98], ["THAT", 75], ["LATER", 70]],
    "SEE YOU": [["LATER", 95], ["SOON", 90], ["AGAIN", 85], ["TOMORROW", 80]],
    "PLEASE": [["HELP", 95], ["REPEAT", 90], ["SIGN", 88], ["SLOW", 85], ["WAIT", 82], ["COME", 75], ["TELL", 70]],
    "HELP": [["ME", 98], ["YOU", 85], ["US", 75]],
    "MY": [["NAME", 98], ["FRIEND", 85], ["FAMILY", 80], ["PHONE", 75], ["HOUSE", 70]],
    "MY NAME": [["IS", 99]],
    "YOUR": [["NAME", 95], ["TURN", 80], ["HELP", 75], ["FAMILY", 70]],
    "DO": [["YOU", 98], ["NOT", 88], ["WE", 75], ["THEY", 70]],
    "DO YOU": [["KNOW", 95], ["WANT", 92], ["NEED", 90], ["HAVE", 88], ["UNDERSTAND", 85], ["LIKE", 82], ["SIGN", 80]],
    "DON'T": [["KNOW", 95], ["WORRY", 90], ["HAVE", 80], ["WANT", 75]],
    "DONT": [["KNOW", 95], ["WORRY", 90], ["HAVE", 80], ["WANT", 75]],
    "NO": [["PROBLEM", 95], ["WORRIES", 88], ["THANKS", 85], ["WAY", 75]],
    "YES": [["PLEASE", 95], ["I", 88], ["OF", 80], ["THAT", 75]],
    "OF": [["COURSE", 98], ["THE", 85], ["YOU", 70]],
    "IT": [["IS", 98], ["WAS", 90], ["WILL", 80], ["WORKS", 75], ["LOOKS", 72]],
    "IT IS": [["GOOD", 90], ["NICE", 85], ["OK", 80], ["TIME", 75]],
    "THAT": [["IS", 98], ["WAS", 90], ["SOUNDS", 82], ["WOULD", 78]],
    "THAT IS": [["GREAT", 95], ["GOOD", 90], ["NICE", 85], ["TRUE", 80]],
    "THIS": [["IS", 98], ["ONE", 80], ["TIME", 75], ["WAY", 70]],
    "WE": [["ARE", 95], ["CAN", 90], ["HAVE", 85], ["WILL", 80], ["NEED", 78]],
    "THEY": [["ARE", 95], ["WERE", 85], ["HAVE", 80], ["WILL", 78]],
    "HE": [["IS", 98], ["WAS", 90], ["WILL", 80], ["HAS", 75]],
    "SHE": [["IS", 98], ["WAS", 90], ["WILL", 80], ["HAS", 75]],
    "HAVE": [["A", 95], ["TO", 90], ["YOU", 85], ["BEEN", 80]],
    "HAVE A": [["GOOD", 98], ["NICE", 95], ["GREAT", 90]],
    "SIGN": [["LANGUAGE", 99], ["AGAIN", 85], ["SLOW", 80]],
    "RESTROOM": [["WHERE", 90], ["PLEASE", 85]],
    "BATHROOM": [["WHERE", 90], ["PLEASE", 85]],
    "WATER": [["PLEASE", 95]],
    "TIME": [["IS", 90], ["TO", 85], ["FOR", 80]],
    "LET": [["ME", 95], ["US", 90]],
    "LET ME": [["KNOW", 95], ["SEE", 90], ["HELP", 85]],
    "TAKE": [["CARE", 98], ["TIME", 85], ["A", 80]],
    "TAKE CARE": [["AND", 80], ["SEE", 75]],
    "SORRY": [["FOR", 95], ["ABOUT", 90], ["I", 85]],
    "WELCOME": [["TO", 95], ["BACK", 90]],
    "YOU'RE": [["WELCOME", 99]],
    "YOURE": [["WELCOME", 99]],
    "MORE": [["TIME", 85], ["INFORMATION", 80], ["THAN", 75]],
    "ONE": [["MORE", 95], ["MOMENT", 90], ["DAY", 80]],
    "WAIT": [["A", 95], ["FOR", 88], ["MINUTE", 85]],
    "WAIT A": [["MINUTE", 98], ["MOMENT", 95], ["SECOND", 90]],
    "GO": [["TO", 95], ["HOME", 85], ["AHEAD", 80]],
    "COME": [["IN", 90], ["HERE", 88], ["BACK", 85], ["WITH", 80]],
    "VERY": [["MUCH", 95], ["GOOD", 92], ["WELL", 88], ["HAPPY", 80], ["NICE", 75]],
    "SO": [["MUCH", 95], ["GOOD", 85], ["HAPPY", 80], ["GLAD", 78]],
    "TOO": [["MUCH", 95], ["LATE", 85], ["FAST", 80]]
}

# Now incorporate Peter Norvig 2-word ngrams for comprehensive coverage up to ~2,000 pairs
bigram_map = defaultdict(dict)

# Seed with curated bigrams first
for word, next_list in CURATED_BIGRAMS.items():
    w_key = word.upper()
    for nxt, score in next_list:
        bigram_map[w_key][nxt.upper()] = score

print(f"Curated bigrams loaded for {len(bigram_map)} words.")

# Stream from Norvig count_2w to expand
norvig_url = "https://norvig.com/ngrams/count_2w.txt"
try:
    print(f"Fetching Norvig bigrams from {norvig_url}...")
    req = urllib.request.Request(norvig_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=12) as resp:
        # Read lines in chunks
        chunk = resp.read(1500000).decode("utf-8", errors="ignore")
        lines = chunk.splitlines()
        print(f"Processing {len(lines)} lines from Norvig bigrams...")
        for line in lines:
            parts = line.strip().split("\t")
            if len(parts) == 2:
                pair, count_str = parts[0], parts[1]
                w_pair = pair.split()
                if len(w_pair) == 2:
                    w1, w2 = w_pair[0].upper(), w_pair[1].upper()
                    if w1.isalpha() and w2.isalpha() and len(w1) >= 2 and len(w2) >= 2:
                        try:
                            count = int(count_str)
                            # Convert count to score 30-70 for general bigrams (so curated stay on top)
                            score = min(75, max(30, int(30 + 10 * (len(str(count)) - 5))))
                            if w2 not in bigram_map[w1]:
                                bigram_map[w1][w2] = score
                        except ValueError:
                            pass
            if len(bigram_map) >= 800:
                total_pairs = sum(len(v) for v in bigram_map.values())
                if total_pairs >= 2500:
                    break
        print(f"Expanded bigram map to {len(bigram_map)} keys, total pairs: {sum(len(v) for v in bigram_map.values())}")
except Exception as e:
    print("Norvig bigram stream failed (using curated):", e)

# Finalize bigram JSON structure: { "WORD": [["NEXT", score], ...], ... }
final_bigrams = {}
total_pairs_count = 0

for w1, nexts in bigram_map.items():
    # Sort next words by score descending, keep top 6
    sorted_nexts = sorted(nexts.items(), key=lambda x: x[1], reverse=True)[:6]
    final_bigrams[w1] = [[w2, sc] for w2, sc in sorted_nexts]
    total_pairs_count += len(final_bigrams[w1])

bigram_file = os.path.join(ASSETS_DIR, "bigrams.json")
with open(bigram_file, "w", encoding="utf-8") as f:
    json.dump(final_bigrams, f, separators=(',', ':'))

print(f"Saved {len(final_bigrams)} bigram words ({total_pairs_count} pairs) to {bigram_file} ({os.path.getsize(bigram_file) / 1024:.1f} KB)")
print("Done! Both datasets built successfully.")
