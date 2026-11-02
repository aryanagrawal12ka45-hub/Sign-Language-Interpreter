#!/usr/bin/env python3
"""
Scalable ASL Dataset Bulk Import Pipeline
=========================================
Converts external sign language datasets (WLASL, MS-ASL, or custom Folder-per-Gloss)
into the compact, web-ready ASL Lexicon format:
  - data/lexicon/index.json (searchable index)
  - data/lexicon/signs/<id>.json (per-sign wrist-relative landmark frames)
  - import_quality_report.json (auditing metrics & rejected clips)
  - CREDITS.md (attributions and licensing terms)

Usage:
  python scripts/import_dataset.py --config data/import/import_config.json
  python scripts/import_dataset.py --help-adapters
"""

import os
import sys
import json
import glob
import math
import argparse
from datetime import datetime

# =========================================================================
# 1. Adapter System & Instructions
# =========================================================================

ADAPTER_GUIDE = """
=== How to Add a New Dataset Adapter ===
1. Create a class inheriting from `DatasetAdapter`.
2. Implement `discover_clips(self) -> dict[str, list[ClipMetadata]]`.
   Return a dictionary mapping gloss (uppercase string) to a list of clip info dicts:
   {
       "clip_id": "unique_clip_id",
       "file_path": "path/to/video/or/pose.json",
       "gloss": "GLOSS",
       "fps": 30,
       "start_frame": 0,
       "end_frame": -1
   }
3. Register your class in `ADAPTER_REGISTRY` below:
   ADAPTER_REGISTRY["my_format"] = MyCustomAdapter
4. Set "format": "my_format" in your import_config.json file.
========================================
"""

class DatasetAdapter:
    def __init__(self, config):
        self.config = config
        self.input_path = config.get("input_path", "")
        self.labels_file = config.get("labels_file", "")

    def discover_clips(self):
        raise NotImplementedError("Adapters must implement discover_clips()")


class WLASLAdapter(DatasetAdapter):
    """
    Adapter for Word-Level American Sign Language (WLASL) dataset.
    Expects WLASL_v0.3.json labels file and video directory.
    """
    def discover_clips(self):
        if not os.path.exists(self.labels_file):
            print(f"[!] Warning: WLASL labels file '{self.labels_file}' not found.")
            return {}

        with open(self.labels_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        gloss_map = {}
        for entry in data:
            gloss = entry.get("gloss", "").strip().upper()
            if not gloss:
                continue

            instances = entry.get("instances", [])
            clips = []
            for inst in instances:
                video_id = inst.get("video_id")
                # Look for video file with extensions .mp4, .mkv, .webm
                file_path = os.path.join(self.input_path, f"{video_id}.mp4")
                if not os.path.exists(file_path):
                    # Check alternate extensions or subdirectories
                    matches = glob.glob(os.path.join(self.input_path, "**", f"{video_id}.*"), recursive=True)
                    if matches:
                        file_path = matches[0]

                clips.append({
                    "clip_id": video_id,
                    "file_path": file_path,
                    "gloss": gloss,
                    "fps": inst.get("fps", 30),
                    "start_frame": inst.get("frame_start", 0),
                    "end_frame": inst.get("frame_end", -1),
                    "url": inst.get("url", "")
                })

            if clips:
                gloss_map[gloss] = clips
        return gloss_map


class MSASLAdapter(DatasetAdapter):
    """
    Adapter for Microsoft ASL (MS-ASL) dataset.
    Expects MSASL_train.json / val.json / test.json.
    """
    def discover_clips(self):
        if not os.path.exists(self.labels_file):
            print(f"[!] Warning: MS-ASL labels file '{self.labels_file}' not found.")
            return {}

        with open(self.labels_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        gloss_map = {}
        for entry in data:
            gloss = entry.get("clean_text", entry.get("text", "")).strip().upper()
            if not gloss:
                continue

            url = entry.get("url", "")
            video_id = entry.get("file", f"clip_{entry.get('signer_id')}_{entry.get('start_time')}")
            file_path = os.path.join(self.input_path, f"{video_id}.mp4")
            if not os.path.exists(file_path):
                matches = glob.glob(os.path.join(self.input_path, "**", f"{video_id}.*"), recursive=True)
                if matches:
                    file_path = matches[0]

            clip = {
                "clip_id": str(video_id),
                "file_path": file_path,
                "gloss": gloss,
                "fps": entry.get("fps", 30),
                "start_frame": entry.get("start", 0),
                "end_frame": entry.get("end", -1),
                "box": entry.get("box", [])
            }
            gloss_map.setdefault(gloss, []).append(clip)
        return gloss_map


class FolderPerGlossAdapter(DatasetAdapter):
    """
    Adapter for custom datasets structured by gloss folder:
      input_path/
        HELLO/
          clip1.mp4
          clip2.mp4
        THANK_YOU/
          clip1.mp4
    Or pre-extracted keypoint json files.
    """
    def discover_clips(self):
        gloss_map = {}
        if not os.path.exists(self.input_path):
            os.makedirs(self.input_path, exist_ok=True)
            return {}

        for item in os.listdir(self.input_path):
            item_path = os.path.join(self.input_path, item)
            if os.path.isdir(item_path):
                gloss = item.strip().upper()
                clips = []
                for fname in os.listdir(item_path):
                    if fname.lower().endswith(('.mp4', '.avi', '.mov', '.webm', '.json')):
                        fpath = os.path.join(item_path, fname)
                        clip_id = os.path.splitext(fname)[0]
                        clips.append({
                            "clip_id": clip_id,
                            "file_path": fpath,
                            "gloss": gloss,
                            "fps": self.config.get("target_fps", 30),
                            "start_frame": 0,
                            "end_frame": -1
                        })
                if clips:
                    gloss_map[gloss] = clips
            elif item.lower().endswith(('.mp4', '.avi', '.mov', '.webm', '.json')):
                # Flat file named GLOSS.mp4 or GLOSS_clip1.mp4
                base = os.path.splitext(item)[0]
                gloss = base.split('_')[0].strip().upper()
                clips = [{
                    "clip_id": base,
                    "file_path": item_path,
                    "gloss": gloss,
                    "fps": self.config.get("target_fps", 30),
                    "start_frame": 0,
                    "end_frame": -1
                }]
                gloss_map.setdefault(gloss, []).extend(clips)

        return gloss_map


ADAPTER_REGISTRY = {
    "wlasl": WLASLAdapter,
    "msasl": MSASLAdapter,
    "folder_per_gloss": FolderPerGlossAdapter
}

# =========================================================================
# 2. Frame Processing, Normalization & Smoothing
# =========================================================================

def normalize_hand_landmarks(raw_landmarks_21):
    """
    Normalizes 21 3D landmarks relative to wrist (landmark 0).
    Scales coordinates by distance between wrist (0) and middle MCP (9).
    Rounds to 3 decimal places.
    """
    if not raw_landmarks_21 or len(raw_landmarks_21) != 21:
        return None

    wrist = raw_landmarks_21[0]
    wx, wy, wz = wrist[0], wrist[1], wrist[2] if len(wrist) > 2 else 0.0

    # Landmark 9 is Middle finger MCP joint
    mcp = raw_landmarks_21[9]
    dx = mcp[0] - wx
    dy = mcp[1] - wy
    dz = (mcp[2] if len(mcp) > 2 else 0.0) - wz
    scale = math.sqrt(dx * dx + dy * dy + dz * dz)
    if scale < 1e-4:
        scale = 1.0

    normalized = []
    for lm in raw_landmarks_21:
        lx = (lm[0] - wx) / scale
        ly = (lm[1] - wy) / scale
        lz = ((lm[2] if len(lm) > 2 else 0.0) - wz) / scale
        normalized.append([round(lx, 3), round(ly, 3), round(lz, 3)])

    return normalized


def smooth_landmark_stream(frames, window_size=3):
    """
    Applies moving average window across landmark frames to remove jitter.
    """
    if len(frames) <= window_size:
        return frames

    half = window_size // 2
    smoothed_frames = []

    for i in range(len(frames)):
        frame = frames[i]
        t = frame["t"]

        # Smooth right hand
        right_res = None
        if frame.get("right"):
            right_res = []
            for lm_idx in range(21):
                avg_xyz = [0.0, 0.0, 0.0]
                count = 0
                for w in range(max(0, i - half), min(len(frames), i + half + 1)):
                    target_frame = frames[w]
                    if target_frame.get("right") and len(target_frame["right"]) == 21:
                        pt = target_frame["right"][lm_idx]
                        avg_xyz[0] += pt[0]
                        avg_xyz[1] += pt[1]
                        avg_xyz[2] += pt[2]
                        count += 1
                if count > 0:
                    right_res.append([round(avg_xyz[0]/count, 3), round(avg_xyz[1]/count, 3), round(avg_xyz[2]/count, 3)])
                else:
                    right_res.append(frame["right"][lm_idx])

        # Smooth left hand
        left_res = None
        if frame.get("left"):
            left_res = []
            for lm_idx in range(21):
                avg_xyz = [0.0, 0.0, 0.0]
                count = 0
                for w in range(max(0, i - half), min(len(frames), i + half + 1)):
                    target_frame = frames[w]
                    if target_frame.get("left") and len(target_frame["left"]) == 21:
                        pt = target_frame["left"][lm_idx]
                        avg_xyz[0] += pt[0]
                        avg_xyz[1] += pt[1]
                        avg_xyz[2] += pt[2]
                        count += 1
                if count > 0:
                    left_res.append([round(avg_xyz[0]/count, 3), round(avg_xyz[1]/count, 3), round(avg_xyz[2]/count, 3)])
                else:
                    left_res.append(frame["left"][lm_idx])

        smoothed_frames.append({
            "t": round(t, 3),
            "right": right_res,
            "left": left_res
        })

    return smoothed_frames


def trim_idle_frames(frames, idle_threshold=0.015):
    """
    Trims motionless lead-in and lead-out frames by measuring hand landmark velocity.
    """
    if len(frames) < 10:
        return frames

    def frame_movement(f1, f2):
        pts1 = f1.get("right") or f1.get("left")
        pts2 = f2.get("right") or f2.get("left")
        if not pts1 or not pts2:
            return 0.0
        tot = 0.0
        for p1, p2 in zip(pts1, pts2):
            tot += math.sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2 + (p1[2]-p2[2])**2)
        return tot / len(pts1)

    start_idx = 0
    while start_idx < len(frames) - 5:
        mov = frame_movement(frames[start_idx], frames[start_idx + 1])
        if mov > idle_threshold:
            break
        start_idx += 1

    end_idx = len(frames) - 1
    while end_idx > start_idx + 5:
        mov = frame_movement(frames[end_idx - 1], frames[end_idx])
        if mov > idle_threshold:
            break
        end_idx -= 1

    trimmed = frames[start_idx:end_idx + 1]
    # Re-zero timestamps
    if trimmed:
        t0 = trimmed[0]["t"]
        for f in trimmed:
            f["t"] = round(f["t"] - t0, 3)

    return trimmed if len(trimmed) >= 5 else frames


# =========================================================================
# 3. MediaPipe / Video Extraction & Evaluation
# =========================================================================

def extract_clip_landmarks(clip_info, config):
    """
    Extracts landmark frames from video using cv2 & mediapipe.
    If input is already a JSON keypoint file, loads it directly.
    """
    file_path = clip_info.get("file_path", "")
    if not os.path.exists(file_path):
        return None, 0.0, "File does not exist on disk"

    # Support pre-extracted JSON keypoint files directly
    if file_path.lower().endswith('.json'):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            frames = data.get("frames", data if isinstance(data, list) else [])
            return frames, 1.0, None
        except Exception as e:
            return None, 0.0, f"JSON parse error: {e}"

    # Try importing cv2 and mediapipe
    try:
        import cv2
        import mediapipe as mp
    except ImportError:
        return None, 0.0, "OpenCV (cv2) or MediaPipe is not installed. Run: pip install opencv-python mediapipe"

    mp_hands = mp.solutions.hands
    hands = mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )

    cap = cv2.VideoCapture(file_path)
    if not cap.isOpened():
        return None, 0.0, f"Could not open video file {file_path}"

    video_fps = cap.get(cv2.CAP_PROP_FPS) or config.get("target_fps", 30)
    raw_frames = []
    frame_idx = 0
    start_frame = clip_info.get("start_frame", 0)
    end_frame = clip_info.get("end_frame", -1)

    detected_frames_count = 0
    total_processed = 0

    while True:
        ret, frame_bgr = cap.read()
        if not ret:
            break

        if frame_idx < start_frame:
            frame_idx += 1
            continue
        if end_frame > 0 and frame_idx > end_frame:
            break

        frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        results = hands.process(frame_rgb)

        right_hand = None
        left_hand = None

        if results.multi_hand_landmarks and results.multi_handedness:
            detected_frames_count += 1
            for lms, handedness in zip(results.multi_hand_landmarks, results.multi_handedness):
                label = handedness.classification[0].label # "Right" or "Left"
                coords = [[lm.x, lm.y, lm.z] for lm in lms.landmark]
                normalized = normalize_hand_landmarks(coords)
                if label == "Right":
                    right_hand = normalized
                else:
                    left_hand = normalized

        raw_frames.append({
            "t": round(total_processed / video_fps, 3),
            "right": right_hand,
            "left": left_hand
        })

        total_processed += 1
        frame_idx += 1

    cap.release()
    hands.close()

    if total_processed == 0:
        return None, 0.0, "Video contained 0 frames"

    visibility_ratio = detected_frames_count / total_processed
    if visibility_ratio < 0.25:
        return None, visibility_ratio, f"Hand detection visibility too low: {visibility_ratio:.1%}"

    return raw_frames, visibility_ratio, None


def score_clip(clip_info, frames, visibility_ratio, config):
    """
    Scores a clip to pick the best demonstration for a gloss:
    Score = 0.5 * visibility + 0.3 * confidence + 0.2 * duration_optimality
    """
    target_duration = 1.0 # 1.0 second typical ASL lexical sign
    duration = frames[-1]["t"] if frames else 0.0
    duration_diff = abs(duration - target_duration)
    duration_score = max(0.0, 1.0 - (duration_diff / 2.0))

    score = (0.6 * visibility_ratio) + (0.4 * duration_score)
    return score


# =========================================================================
# 4. Pipeline Execution & Output Writers
# =========================================================================

def run_import_pipeline(config_path, force=False):
    if not os.path.exists(config_path):
        print(f"[-] Config file '{config_path}' not found.")
        sys.exit(1)

    with open(config_path, "r", encoding="utf-8") as f:
        config_data = json.load(f)

    dataset_cfg = config_data.get("dataset", {})
    license_confirmed = dataset_cfg.get("license_confirmed", False)
    license_name = dataset_cfg.get("license", "Unknown")

    if not license_confirmed:
        print("[!] ERROR: Dataset import blocked. License has not been confirmed.")
        print("    Please review data/import/import_config.json, verify license terms,")
        print("    and set 'license_confirmed': true before running.")
        sys.exit(1)

    fmt = dataset_cfg.get("format", "folder_per_gloss").lower()
    adapter_cls = ADAPTER_REGISTRY.get(fmt)
    if not adapter_cls:
        print(f"[-] Unknown format '{fmt}'. Available formats: {list(ADAPTER_REGISTRY.keys())}")
        print(ADAPTER_GUIDE)
        sys.exit(1)

    adapter = adapter_cls(dataset_cfg)
    print(f"[*] Discovering clips using adapter '{fmt}' from '{dataset_cfg.get('input_path')}'...")
    gloss_map = adapter.discover_clips()
    print(f"[*] Found {len(gloss_map)} distinct glosses.")

    if len(gloss_map) == 0:
        print("[!] No clips found. Check data/import/import_config.json paths or place clips in data/import/custom/")
        print("    Official datasets can be downloaded from:")
        print("    - WLASL: https://github.com/dxli94/WLASL")
        print("    - MS-ASL: https://www.microsoft.com/en-us/research/project/ms-asl/")
        return

    checkpoint_file = ".import_checkpoint.json"
    checkpoint = {}
    if os.path.exists(checkpoint_file) and not force:
        try:
            with open(checkpoint_file, "r", encoding="utf-8") as f:
                checkpoint = json.load(f)
        except Exception:
            checkpoint = {}

    quality_report = {
        "timestamp": datetime.now().isoformat(),
        "dataset_name": dataset_cfg.get("name", "Unknown"),
        "license": license_name,
        "total_glosses_discovered": len(gloss_map),
        "total_imported": 0,
        "rejected_clips": [],
        "processed_glosses": []
    }

    index_path = "data/lexicon/index.json"
    existing_index = {"version": "2.0.0", "license": "Apache-2.0", "signs": []}
    if os.path.exists(index_path):
        try:
            with open(index_path, "r", encoding="utf-8") as f:
                existing_index = json.load(f)
        except Exception:
            pass

    existing_signs_map = {s["id"]: s for s in existing_index.get("signs", [])}

    total_glosses = len(gloss_map)
    curr_idx = 0

    for gloss, clips in gloss_map.items():
        curr_idx += 1
        sign_id = gloss.lower().replace(" ", "_")

        if sign_id in checkpoint and not force:
            continue

        print(f"[{curr_idx}/{total_glosses}] Processing gloss: {gloss} ({len(clips)} candidate clips)...")

        scored_candidates = []
        for clip in clips:
            frames, vis_ratio, err = extract_clip_landmarks(clip, dataset_cfg)
            if err:
                quality_report["rejected_clips"].append({
                    "gloss": gloss,
                    "clip_id": clip.get("clip_id"),
                    "reason": err
                })
                continue

            score = score_clip(clip, frames, vis_ratio, dataset_cfg)
            scored_candidates.append({
                "clip": clip,
                "frames": frames,
                "score": score
            })

        if not scored_candidates:
            print(f"    [-] Skipped {gloss}: all clips rejected.")
            continue

        # Sort descending by score
        scored_candidates.sort(key=lambda x: x["score"], reverse=True)
        best = scored_candidates[0]
        alternates = [c["clip"]["clip_id"] for c in scored_candidates[1:]]

        # Post-process frames
        frames = best["frames"]
        frames = trim_idle_frames(frames, dataset_cfg.get("idle_movement_threshold", 0.015))
        frames = smooth_landmark_stream(frames, dataset_cfg.get("smooth_window", 3))

        has_left = any(f.get("left") is not None for f in frames)

        sign_entry = {
            "id": sign_id,
            "gloss": gloss,
            "category": dataset_cfg.get("category_default", "General"),
            "fps": dataset_cfg.get("target_fps", 30),
            "frameCount": len(frames),
            "twoHanded": has_left,
            "frames": frames,
            "source": dataset_cfg.get("source_attribution", "Import Pipeline"),
            "license": license_name,
            "alternates": alternates
        }

        sign_file_rel = f"signs/{sign_id}.json"
        sign_file_path = os.path.join("data", "lexicon", "signs", f"{sign_id}.json")
        with open(sign_file_path, "w", encoding="utf-8") as f:
            json.dump(sign_entry, f, separators=(',', ':'))

        # Update index entry
        index_entry = {
            "id": sign_id,
            "glosses": [gloss],
            "synonyms": [],
            "category": dataset_cfg.get("category_default", "General"),
            "frameCount": len(frames),
            "twoHanded": has_left,
            "file": sign_file_rel,
            "source": dataset_cfg.get("source_attribution", "Import Pipeline"),
            "license": license_name
        }
        if alternates:
            index_entry["alternates"] = alternates

        existing_signs_map[sign_id] = index_entry

        checkpoint[sign_id] = True
        quality_report["total_imported"] += 1
        quality_report["processed_glosses"].append(sign_id)

        # Save checkpoint periodically
        with open(checkpoint_file, "w", encoding="utf-8") as f:
            json.dump(checkpoint, f)

    # Save index.json
    all_signs = list(existing_signs_map.values())
    all_signs.sort(key=lambda s: s["id"])
    existing_index["totalSigns"] = len(all_signs)
    existing_index["signs"] = all_signs
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(existing_index, f, indent=2)

    # Save quality report
    with open("import_quality_report.json", "w", encoding="utf-8") as f:
        json.dump(quality_report, f, indent=2)

    # Update CREDITS.md
    update_credits_file(dataset_cfg)

    print("\n[+] Import Completed Successfully!")
    print(f"    Total signs in index: {len(all_signs)}")
    print(f"    Report written to: import_quality_report.json")
    print(f"    Credits updated: CREDITS.md\n")


def update_credits_file(dataset_cfg):
    credits_path = "CREDITS.md"
    entry_line = f"- **{dataset_cfg.get('name', 'Dataset')}**: {dataset_cfg.get('source_attribution')} (License: {dataset_cfg.get('license')}) - Imported on {datetime.now().strftime('%Y-%m-%d')}"

    existing_content = ""
    if os.path.exists(credits_path):
        with open(credits_path, "r", encoding="utf-8") as f:
            existing_content = f.read()
    else:
        existing_content = "# Third-Party Datasets and Attributions\n\nThis project respects original authors, copyright holders, and dataset licenses.\n\n## Sources & Datasets\n\n"

    if dataset_cfg.get('name') not in existing_content:
        with open(credits_path, "a", encoding="utf-8") as f:
            f.write(f"\n{entry_line}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sign Language Dataset Bulk Import Pipeline")
    parser.add_argument("--config", default="data/import/import_config.json", help="Path to import config JSON")
    parser.add_argument("--force", action="store_true", help="Force re-importing already processed signs")
    parser.add_argument("--help-adapters", action="store_true", help="Print guide on adding custom dataset adapters")
    args = parser.parse_args()

    if args.help_adapters:
        print(ADAPTER_GUIDE)
        sys.exit(0)

    run_import_pipeline(args.config, args.force)

