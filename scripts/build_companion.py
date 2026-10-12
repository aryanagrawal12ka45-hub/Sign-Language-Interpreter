#!/usr/bin/env python3
"""
PyInstaller Standalone Executable Bundler for Sign Language Studio
=================================================================
Builds a portable single-file Windows executable:
    dist/SignLanguageOSBridge.exe

Usage:
    python scripts/build_companion.py
"""

import os
import sys
import subprocess

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def build():
    print("=" * 72)
    print("  SIGN LANGUAGE STUDIO - OS GESTURE COMPANION EXECUTABLE BUILDER")
    print("=" * 72)

    entry_point = os.path.join(ROOT_DIR, "run_os_control.py")
    dist_dir = os.path.join(ROOT_DIR, "dist")
    build_dir = os.path.join(ROOT_DIR, "build")

    os.makedirs(dist_dir, exist_ok=True)
    os.makedirs(build_dir, exist_ok=True)

    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--clean",
        "--onefile",
        "--name=SignLanguageOSBridge",
        f"--distpath={dist_dir}",
        f"--workpath={build_dir}",
        f"--specpath={build_dir}",
        "--hidden-import=websockets",
        "--hidden-import=pyautogui",
        "--hidden-import=pycaw",
        "--hidden-import=comtypes",
        "--hidden-import=screen_brightness_control",
        "--hidden-import=ctypes",
        "--hidden-import=PIL",
        f"--paths={ROOT_DIR}",
        entry_point
    ]

    print(f"[*] Command: {' '.join(cmd)}\n")
    result = subprocess.run(cmd, cwd=ROOT_DIR)

    if result.returncode == 0:
        exe_path = os.path.join(dist_dir, "SignLanguageOSBridge.exe")
        size_mb = os.path.getsize(exe_path) / (1024 * 1024) if os.path.exists(exe_path) else 0
        print("\n" + "=" * 72)
        print(" [+] BUILD SUCCESSFUL: Standalone Companion Executable created!")
        print(f" [+] Output: {exe_path} ({size_mb:.1f} MB)")
        print(" [+] Users can double-click this executable to activate real-time")
        print("     Windows OS gesture controls from both localhost and Netlify!")
        print("=" * 72)
        return True
    else:
        print(f"\n[-] Build failed with exit code {result.returncode}")
        return False


if __name__ == "__main__":
    success = build()
    sys.exit(0 if success else 1)
