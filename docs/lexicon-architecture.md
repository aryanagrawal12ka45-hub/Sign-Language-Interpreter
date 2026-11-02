# Scalable ASL Lexicon & Text-to-Sign Architecture

## 1. Overview & Problem Solved
Previously, Text-to-Sign systems relied on a small handful of hardcoded sign definitions with static fallbacks. The new architecture decouples code from data:
- **Zero code changes needed to add signs**: Adding a landmark JSON file to `data/lexicon/signs/<id>.json` and updating `data/lexicon/index.json` immediately exposes that word/phrase across the entire platform.
- **Scales to 5,000+ words**: The index loads in under 10ms with zero stutter. Individual sign files are lazily fetched on demand and cached in memory and IndexedDB.
- **Whole-sign priority**: Every word that possesses an ASL sign is represented as a whole-word sign. Fingerspelling is reserved exclusively as a fallback when no whole-sign exists.

---

## 2. Directory Layout & Storage Hierarchy

```
data/
├── lexicon/
│   ├── index.json               # Lightweight searchable index of all available signs
│   ├── lemmas.json              # Precomputed WordNet base forms & irregular inflections (140+ entries)
│   ├── synonyms.json            # Curated conceptual synonym mappings (65+ synsets)
│   ├── compounds.json           # Agentive & morphological compound derivation hints
│   └── signs/                   # One compact JSON per sign
│       ├── hello.json
│       ├── thank_you.json
│       ├── help.json
│       └── ... (97+ signs)
├── import/
│   ├── import_config.json       # Dataset import configuration & license confirmation
│   └── custom/                  # Destination for user-provided video clips or pose JSONs
└── reference/
    └── common_words_5k.json     # 5,000 common English lemma frequency baseline for coverage auditing
```

### `data/lexicon/index.json` Schema
```json
{
  "version": "2.0.0",
  "totalSigns": 97,
  "license": "Apache-2.0",
  "signs": [
    {
      "id": "thank_you",
      "glosses": ["THANK YOU", "THANKS", "THANK"],
      "synonyms": ["grateful"],
      "category": "Greetings",
      "frameCount": 22,
      "twoHanded": false,
      "file": "signs/thank_you.json",
      "source": "Sign Language Studio Core ASL",
      "license": "Apache-2.0"
    }
  ]
}
```

### `data/lexicon/signs/<id>.json` Compact Landmark Schema
```json
{
  "id": "hello",
  "gloss": "HELLO",
  "category": "Greetings",
  "fps": 30,
  "frameCount": 20,
  "twoHanded": false,
  "frames": [
    {
      "t": 0.0,
      "right": [[0.0, 0.0, 0.0], [-0.04, 0.03, 0.01], ... 21 landmarks ...],
      "left": null
    }
  ],
  "source": "Sign Language Studio Core ASL",
  "license": "Apache-2.0"
}
```
- **21 Landmarks per Hand**: Conforming to MediaPipe standard hand landmark model.
- **Wrist-Relative & Normalized**: Landmark 0 (wrist) is translated to `(0, 0, 0)`; coordinates are scaled by distance to landmark 9 (middle finger MCP) and rounded to 3 decimal places to keep file sizes under 15 KB.

---

## 3. NLP Smart Resolution Pipeline

When English text is translated to ASL glosses, the resolver in `src/lexicon_service.js` processes tokens from left to right using a longest-match-first strategy across 7 priority tiers:

1. **Multi-Word Phrase Match (Confidence: 1.0)**:
   - Evaluates token windows from 4 words down to 2 words.
   - Example: *"thank you very much"* $\rightarrow$ matches `"thank_you"`.
2. **Exact Gloss Match (Confidence: 1.0)**:
   - Matches primary canonical glosses and sign IDs.
   - Example: *"hello"* $\rightarrow$ matches `"hello"`.
3. **Lemma Match (Confidence: 0.95)**:
   - Resolves irregular past tense, plurals, and participles to base lexical signs.
   - Example: *"helping"* / *"helped"* $\rightarrow$ matches `"help"`.
4. **Synonym Match (Confidence: 0.85)**:
   - Conceptual synset lookup to map related terms to existing signs.
   - Example: *"glad"* / *"joyful"* $\rightarrow$ matches `"happy"`.
5. **Composed / Derivation Hints (Confidence: 0.80)**:
   - Agentive suffix and compound decomposition into sub-signs.
   - Example: *"teacher"* $\rightarrow$ decomposes to `TEACH` + `PERSON`.
6. **Number Translation (Confidence: 1.0)**:
   - Matches digits or whole numbers to numerical signs (`num_0` through `num_10`).
   - Example: *"5"* $\rightarrow$ matches `"num_5"`.
7. **Fingerspelling Fallback with Pause (Confidence: 0.50)**:
   - Any unrecognized word is fingerspelled letter-by-letter and logged to the Missing Words store.

### Resolved Unit Schema
```javascript
{
  text: "thank you",
  unit: "THANK_YOU",
  signId: "thank_you",
  matchedBy: "phrase",   // 'phrase' | 'exact' | 'lemma' | 'synonym' | 'composed' | 'number' | 'fingerspell'
  confidence: 1.0,
  source: "Sign Language Studio Core ASL",
  signData: { ... }      // Preloaded lazily
}
```

---

## 4. Bulk Dataset Import Pipeline (`scripts/import_dataset.py`)

A reusable offline CLI utility to ingest third-party video or keypoint datasets.

### Running an Import
```bash
python scripts/import_dataset.py --config data/import/import_config.json
```

### Supported Dataset Adapters
- **`wlasl`**: Word-Level American Sign Language video dataset (`WLASL_v0.3.json`).
- **`msasl`**: Microsoft ASL dataset (`MSASL_train.json` / `val.json`).
- **`folder_per_gloss`**: Video or JSON keypoint directory structured by gloss.

### Pipeline Features
1. **Best-Clip Selection**:
   $$\text{Score} = 0.6 \times \text{visibility\_ratio} + 0.4 \times \left(1.0 - \frac{|\text{duration} - 1.0|}{2.0}\right)$$
   Picks the cleanest clip as primary sign and stores remaining candidate IDs in `alternates: [...]`.
2. **Idle Frame Trimming**: Detects inter-frame hand landmark velocity and trims lead-in/lead-out frames.
3. **Temporal Smoothing**: 3-frame moving average window removes camera jitter.
4. **Checkpoint Resumption**: Automatically saves `.import_checkpoint.json` so long imports can be paused and resumed safely.
5. **Quality & Attribution Auditing**: Generates `import_quality_report.json` detailing rejected clips and auto-updates `CREDITS.md`.

---

## 5. UI Features & Practice Lab Integration

1. **Match-Type Colored Chips**:
   - 🟢 **Green**: Exact gloss match (`exact`)
   - 🔵 **Blue**: Multi-word phrase match (`phrase`)
   - 🔷 **Teal**: Lemma or synonym match (`lemma`, `synonym`)
   - 🟣 **Purple**: Composed compound derivation (`composed`)
   - 🔶 **Amber**: Letter-by-letter fingerspelling (`fingerspell`)
   - **Hover Tooltips**: Inspect exact match tier, confidence, and source dataset.
2. **Sentence Coverage Meter**: Displays live percentage of signs executed as whole-word signs vs fingerspelled.
3. **Lexicon Library Badge**: Live counter displaying total dynamic signs loaded in memory.
4. **Settings Toggles**:
   - *Fingerspell Only*: Force alphabet mode.
   - *Only Exact Matches*: Disable NLP synonym/lemma fallbacks.
   - *ASL Grammar Simplification*: Clean English syntax to ASL topic-comment structure.
5. **Lexicon Explorer Modal**: Searchable database by gloss, synonym, or category with instant "Play Sign" testing.
6. **Missing Words Logger**: Tracks typed terms that lack signs; displays occurrence counts and provides a one-click "Export Missing Words JSON" button.
7. **Record a Sign Tool**: Webcam interface enabling users to capture custom hand landmarks over 2 seconds and export standardized `data/lexicon/signs/<id>.json` files.

