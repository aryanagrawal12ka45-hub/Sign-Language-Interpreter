# Weekly ASL Lexicon Growth Workflow

This operational guide provides the step-by-step process for systematically expanding the 3D Avatar's whole-word sign vocabulary using client-side missing word tracking, offline dataset imports, and webcam sign recording.

---

## 1. Review Top Missing Words (Client Telemetry)

1. Open **Sign Language Studio** ([http://localhost:8000/avatar.html](http://localhost:8000/avatar.html)).
2. Click **⚠️ Missing Words** in the timeline toolbar.
3. Review the frequency-sorted table of words that fell back to fingerspelling during practice sessions.
4. Click **Export CSV / JSON** to download `missing-words-<timestamp>.csv`.
5. Identify the top 20–30 high-frequency words for the current sprint.

---

## 2. Option A: Record Signs via Webcam Studio

For quick additions of missing signs:
1. In `avatar.html`, click **📹 Record Sign**.
2. Enter the **Sign Gloss** (e.g. `SUNSHINE`) and **Category** (e.g. `Weather`).
3. Click **Start Camera** and position your hands within view of the MediaPipe tracker.
4. Click **Record (2s)**. A 3-second countdown will initiate followed by a 2-second capture window (~60 frames of 21 wrist-relative landmarks).
5. Click **Save to Lexicon**. This saves the compact landmark file to `data/lexicon/signs/<gloss>.json` and registers the entry in `data/lexicon/index.json`.

---

## 3. Option B: Bulk Import from Curated Datasets

To import signs from academic sign datasets (e.g., WLASL or MS-ASL):

### Step 3.1: Download & Verify Dataset
- Obtain official dataset access from the original authors.
- Verify terms:
  - **WLASL**: Research and educational use only.
  - **MS-ASL**: Non-commercial research use only.
- Place downloaded video clips into `data/import/<dataset_name>/videos/`.
- Place labels file into `data/import/<dataset_name>/labels.json`.

### Step 3.2: Configure Import Settings
Edit `scripts/import_config.json`:
```json
{
  "dataset_name": "wlasl",
  "adapter": "wlasl",
  "input_dir": "data/import/wlasl/videos",
  "labels_file": "data/import/wlasl/labels.json",
  "output_dir": "data/lexicon/",
  "min_hand_confidence": 0.65,
  "max_frames_per_sign": 30,
  "license_acknowledged": "WLASL-Research-License"
}
```

### Step 3.3: Execute Import Pipeline
```bash
python scripts/import_dataset.py --config scripts/import_config.json
```
The pipeline automatically:
- Extracts 21 3D landmarks for both hands using MediaPipe.
- Trims leading and trailing rest frames.
- Applies wrist-relative spatial normalization and 3-decimal rounding.
- Automatically selects the highest-confidence clip when multiple recordings exist for a gloss.
- Updates `data/lexicon/index.json` and writes compact sign files to `data/lexicon/signs/<id>.json`.

---

## 4. Integrity and Coverage Validation

After any addition or dataset import, run the validation suite:
```bash
python scripts/validate_lexicon.py
```
This verifies:
1. **Schema Integrity**: Zero duplicate IDs, missing files, frame anomalies, or coordinate deviations.
2. **License Compliance**: Confirms every entry has an attributed license field.
3. **Coverage Benchmark**: Measures whole-word match percentage against the 5,000 common English words list.

---

## 5. Automated Regression Testing

Ensure all unit and end-to-end integration tests remain passing:
```bash
node tests/test_lexicon_resolver.js
node --test tests/test_text_to_sign_generation.js tests/test_two_way.mjs tests/test_two_way_pipeline.js
```

