#!/usr/bin/env python3
"""
ASL Interpreter - Windows OS Gesture Controller Runner
======================================================
Unified launcher for the Real-time Hand Gesture Windows Controller.
Starts both the WebSocket native automation bridge (port 8765) and
the local HTTP web server (port 8000), then automatically opens your browser.

Usage:
    python run_os_control.py
    python run_os_control.py --port 8765 --http-port 8000
    python run_os_control.py --no-browser
"""

import sys
import os
import time
import argparse
import webbrowser
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler

# Ensure workspace root is in python path
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from scripts.windows_bridge import WindowsBridgeServer

class QuietHTTPRequestHandler(SimpleHTTPRequestHandler):
    """Custom HTTP handler serving the workspace with suppressed standard GET logs."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_DIR, **kwargs)

    def translate_path(self, path):
        # Route root '/' or empty path to index.html (Overview / Landing page)
        if path == "/" or path == "":
            path = "/index.html"
        return super().translate_path(path)

    def log_message(self, format, *args):
        # Only log 4xx and 5xx errors to keep terminal output clean
        if len(args) > 1 and str(args[1]).startswith(('4', '5')):
            super().log_message(format, *args)

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


def start_http_server(port=8000):
    """Starts a local HTTP server in a daemon background thread."""
    server_address = ('127.0.0.1', port)
    try:
        httpd = HTTPServer(server_address, QuietHTTPRequestHandler)
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        return httpd
    except Exception as e:
        print(f"[-] Note: Local HTTP server on port {port} could not start: {e}")
        print("    You can still open index.html directly or through Live Server.")
        return None


def print_banner(ws_port, http_port):
    print("=" * 72)
    print("   ASL INTERPRETER & WINDOWS OS GESTURE CONTROLLER   v2.5")
    print("=" * 72)
    print(" [+] Native Windows Automation Engine: ACTIVE")
    print(f" [+] WebSocket Bridge:                 ws://127.0.0.1:{ws_port}")
    if http_port:
        print(f" [+] Web Application:                  http://localhost:{http_port}/")
        print(f" [+] Gesture Detector View:            http://localhost:{http_port}/detector.html?mode=os_control")
    print("-" * 72)
    print(" GESTURE CONTROLS QUICK CHEATSHEET:")
    print("   - Steer Cursor:      Point Index Finger (Landmark 8)")
    print("   - Left Click:        Quick Pinch (Thumb + Index < 380ms)")
    print("   - Double Click:      Double Pinch within 320ms")
    print("   - Drag & Drop:       Hold Pinch (Thumb + Index > 380ms)")
    print("   - Right Click:       Pinch Thumb + Middle Finger")
    print("   - Smooth Scroll:     Index & Middle upright, move hand up/down")
    print("   - Master Volume:     Adjust Thumb-Index aperture distance (0-100%)")
    print("   - Screen Brightness: 3 Fingers upright (W / 3), elevate hand up/down")
    print("   - Screenshot/Snip:   Hold 'L' pose for 1.2 seconds (Win+Shift+S)")
    print("   - Virtual Typing:    Click 'Type to App' to inject sentences")
    print("-" * 72)
    print(" Press Ctrl+C at any time to stop the server.")
    print("=" * 72)
    print()


def main():
    parser = argparse.ArgumentParser(description="ASL Windows OS Gesture Controller Launcher")
    parser.add_argument("--port", type=int, default=8765, help="WebSocket bridge port (default: 8765)")
    parser.add_argument("--http-port", type=int, default=8000, help="Local HTTP server port (default: 8000)")
    parser.add_argument("--no-browser", action="store_true", help="Do not automatically launch web browser")
    parser.add_argument("--detector", action="store_true", help="Open detector view directly instead of landing page")
    args = parser.parse_args()

    http_server = start_http_server(args.http_port)
    actual_http_port = args.http_port if http_server else None

    print_banner(args.port, actual_http_port)

    if not args.no_browser and actual_http_port:
        time.sleep(0.5)
        path = "detector.html?mode=os_control" if args.detector else ""
        app_url = f"http://localhost:{actual_http_port}/{path}"
        print(f"[*] Opening browser: {app_url}")
        try:
            webbrowser.open(app_url)
        except Exception:
            pass

    bridge_server = WindowsBridgeServer(host="127.0.0.1", port=args.port)
    try:
        bridge_server.run()
    except KeyboardInterrupt:
        print("\n[*] Stopping Windows OS Controller Bridge. Goodbye!")
        bridge_server.stop()
        if http_server:
            httpd_close = getattr(http_server, 'shutdown', None)
            if httpd_close:
                httpd_close()


if __name__ == "__main__":
    main()
