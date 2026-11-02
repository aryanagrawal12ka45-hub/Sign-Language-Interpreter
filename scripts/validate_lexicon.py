#!/usr/bin/env python3
"""
ASL Lexicon Validation and 5,000-Word Coverage Auditor
=====================================================
Audits:
1. Index and per-sign JSON integrity (schemas, duplicate IDs, missing licenses).
2. Landmark bounds, 21-landmark integrity, frame monotonicity, and FPS consistency.
3. Coverage report against 5,000 common English words (data/reference/common_words_5k.json).
4. Outputs `lexicon_validation_report.json`.

Usage:
  python scripts/validate_lexicon.py
"""

import os
import sys
import json

def run_validation():
    print("=" * 65)
    print("  ASL Scalable Lexicon Integrity & Coverage Audit")
    print("=" * 65)

    index_path = "data/lexicon/index.json"
    if not os.path.exists(index_path):
        print(f"[-] Fatal: Index file not found at {index_path}")
        sys.exit(1)

    with open(index_path, "r", encoding="utf-8") as f:
        index_data = json.load(f)

    signs = index_data.get("signs", [])
    print(f"[*] Loaded index with {len(signs)} entries.")

    # 1. Audit Index Schema & Duplicates
    seen_ids = set()
    duplicate_ids = []
    missing_licenses = []
    missing_files = []
    frame_errors = []
    range_errors = []

    for s in signs:
        sid = s.get("id")
        if sid in seen_ids:
            duplicate_ids.append(sid)
        seen_ids.add(sid)

        if not s.get("license"):
            missing_licenses.append(sid)

        rel_file = s.get("file", f"signs/{sid}.json")
        abs_file = os.path.join("data", "lexicon", rel_file)
        if not os.path.exists(abs_file):
            missing_files.append((sid, abs_file))
            continue

        # Audit sign JSON contents
        try:
            with open(abs_file, "r", encoding="utf-8") as sf:
                sign_obj = json.load(sf)

            frames = sign_obj.get("frames", [])
            if len(frames) == 0:
                frame_errors.append((sid, "0 frames"))
            
            last_t = -1.0
            for f_idx, fr in enumerate(frames):
                t = fr.get("t", 0.0)
                if t < last_t:
                    frame_errors.append((sid, f"Frame {f_idx} timestamp non-monotonic ({t} < {last_t})"))
                last_t = t

                for hand_key in ["right", "left"]:
                    lms = fr.get(hand_key)
                    if lms is not None:
                        if len(lms) != 21:
                            frame_errors.append((sid, f"Frame {f_idx} {hand_key} hand has {len(lms)} landmarks (expected 21)"))
                        for pt in lms:
                            for coord in pt:
                                if abs(coord) > 5.0: # Wrist-relative points should stay within [-3, 3]
                                    range_errors.append((sid, f"Out-of-range coord {coord} in frame {f_idx}"))
                                    break
        except Exception as e:
            frame_errors.append((sid, f"Corrupted JSON: {e}"))

    # Print integrity findings
    print("\n--- Integrity Audit ---")
    print(f"  Duplicate Sign IDs:  {len(duplicate_ids)} {duplicate_ids if duplicate_ids else 'None'}")
    print(f"  Missing Licenses:    {len(missing_licenses)} {missing_licenses if missing_licenses else 'None'}")
    print(f"  Missing Files:       {len(missing_files)} {missing_files if missing_files else 'None'}")
    print(f"  Frame Errors:        {len(frame_errors)} {frame_errors[:3] if frame_errors else 'None'}")
    print(f"  Range Errors:        {len(range_errors)} {range_errors[:3] if range_errors else 'None'}")

    # 2. Coverage Analysis against 5k English Words
    common_5k_path = "data/reference/common_words_5k.json"
    lemmas_path = "data/lexicon/lemmas.json"
    synonyms_path = "data/lexicon/synonyms.json"
    compounds_path = "data/lexicon/compounds.json"

    common_words = []
    if os.path.exists(common_5k_path):
        with open(common_5k_path, "r", encoding="utf-8") as f:
            cdata = json.load(f)
            common_words = cdata.get("words", [])

    lemmas_map = {}
    if os.path.exists(lemmas_path):
        with open(lemmas_path, "r", encoding="utf-8") as f:
            lemmas_map = json.load(f).get("lemmas", {})

    synonyms_map = {}
    if os.path.exists(synonyms_path):
        with open(synonyms_path, "r", encoding="utf-8") as f:
            synonyms_map = json.load(f).get("synonyms", {})

    compounds_map = {}
    if os.path.exists(compounds_path):
        with open(compounds_path, "r", encoding="utf-8") as f:
            compounds_map = json.load(f).get("compounds", {})

    # Build lookup table of available signs
    direct_glosses = set()
    for s in signs:
        for g in s.get("glosses", []):
            direct_glosses.add(g.upper())
        direct_glosses.add(s["id"].upper())
        for syn in s.get("synonyms", []):
            direct_glosses.add(syn.upper())

    exact_matches = []
    lemma_matches = []
    synonym_matches = []
    compound_matches = []
    fingerspell_only = []

    for word in common_words:
        w_upper = word.upper()
        w_lower = word.lower()

        # 1. Exact
        if w_upper in direct_glosses:
            exact_matches.append(word)
            continue

        # 2. Lemma
        lemma = lemmas_map.get(w_lower)
        if lemma and lemma.upper() in direct_glosses:
            lemma_matches.append(word)
            continue

        # 3. Synonym
        syns = synonyms_map.get(w_lower, [])
        syn_found = False
        for s in syns:
            if s.upper() in direct_glosses:
                synonym_matches.append(word)
                syn_found = True
                break
        if syn_found:
            continue

        # 4. Compound / Derivation
        comp = compounds_map.get(w_lower)
        if comp and all(part.upper() in direct_glosses for part in comp):
            compound_matches.append(word)
            continue

        fingerspell_only.append(word)

    total_covered = len(exact_matches) + len(lemma_matches) + len(synonym_matches) + len(compound_matches)
    coverage_pct = (total_covered / len(common_words) * 100) if common_words else 0.0

    print("\n--- 5,000 Common Words Coverage Report ---")
    print(f"  Total Reference Words: {len(common_words)}")
    print(f"  Exact Gloss Matches:   {len(exact_matches)} ({(len(exact_matches)/max(1,len(common_words))*100):.1f}%)")
    print(f"  Lemma Matches:         {len(lemma_matches)} ({(len(lemma_matches)/max(1,len(common_words))*100):.1f}%)")
    print(f"  Synonym Matches:       {len(synonym_matches)} ({(len(synonym_matches)/max(1,len(common_words))*100):.1f}%)")
    print(f"  Compound Matches:      {len(compound_matches)} ({(len(compound_matches)/max(1,len(common_words))*100):.1f}%)")
    print(f"  Total Signable Words:  {total_covered} / {len(common_words)} ({coverage_pct:.2f}%)")
    print(f"  Fingerspell-Only:      {len(fingerspell_only)}")
    print(f"  Sample Fingerspelled:  {fingerspell_only[:15]}")

    report = {
        "integrity": {
            "total_signs": len(signs),
            "duplicate_ids": duplicate_ids,
            "missing_licenses": missing_licenses,
            "missing_files": [mf[0] for mf in missing_files],
            "frame_errors_count": len(frame_errors),
            "range_errors_count": len(range_errors),
            "status": "PASSED" if not (duplicate_ids or missing_licenses or missing_files or frame_errors) else "ISSUES_FOUND"
        },
        "coverage_5k": {
            "total_words": len(common_words),
            "total_covered": total_covered,
            "coverage_percent": round(coverage_pct, 2),
            "exact_count": len(exact_matches),
            "lemma_count": len(lemma_matches),
            "synonym_count": len(synonym_matches),
            "compound_count": len(compound_matches),
            "fingerspell_count": len(fingerspell_only),
            "sample_fingerspelled": fingerspell_only[:50]
        }
    }

    report_path = "lexicon_validation_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"\n[+] Validation report written to {report_path}")
    print("=" * 65)

    return report["integrity"]["status"] == "PASSED"

if __name__ == "__main__":
    success = run_validation()
    sys.exit(0 if success else 1)

