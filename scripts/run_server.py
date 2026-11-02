"""
Development HTTP Server for Sign Language Interpreter.
Serves the web application locally with proper CORS and MIME headers for MediaPipe/TF.js.
"""

import argparse
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import json
import os
import sys
import time
import urllib.parse

# Ephemeral in-memory WebRTC signaling relay queues for local P2P pairing
ROOM_SIGNALS = {}
MAX_SIGNALS_PER_ROOM = 60

class CustomRequestHandler(SimpleHTTPRequestHandler):
    """Custom request handler enabling CORS, WebRTC signaling relay, and correct caching/MIME settings."""

    extensions_map = SimpleHTTPRequestHandler.extensions_map.copy()
    extensions_map.update({
        ".glb": "model/gltf-binary",
        ".gltf": "model/gltf+json",
        ".wasm": "application/wasm",
    })

    def translate_path(self, path):
        # Route root '/' or empty path to index.html
        if path == "/" or path == "":
            path = "/index.html"
        return super().translate_path(path)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Requested-With")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/signal":
            # Signaling poll endpoint
            params = urllib.parse.parse_qs(parsed.query)
            room = params.get("room", [""])[0].upper()
            peer_id = params.get("peerId", [""])[0]
            since_ts = float(params.get("since", [0])[0])

            signals = ROOM_SIGNALS.get(room, [])
            pending = [s for s in signals if s.get("ts", 0) > since_ts and s.get("senderId") != peer_id]

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"signals": pending, "serverTime": time.time()}).encode("utf-8"))
            return

        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/signal":
            # Signaling publish endpoint
            content_length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(content_length)
            try:
                payload = json.loads(raw_body.decode("utf-8"))
                room = payload.get("room", "").upper()
                if room:
                    payload["ts"] = time.time()
                    queue = ROOM_SIGNALS.setdefault(room, [])
                    queue.append(payload)
                    if len(queue) > MAX_SIGNALS_PER_ROOM:
                        ROOM_SIGNALS[room] = queue[-MAX_SIGNALS_PER_ROOM:]

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok"}).encode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()


def run_server(port: int = 8000, directory: str = "."):
    """Starts the local development HTTP server."""
    root_dir = os.path.abspath(directory)
    handler = partial(CustomRequestHandler, directory=root_dir)

    print("=" * 70)
    print(" SIGN LANGUAGE STUDIO - LOCAL DEV SERVER")
    print("=" * 70)
    print(f" Serving Directory : {root_dir}")
    print(f" Local URL         : http://localhost:{port}")
    print(f" Network URL       : http://127.0.0.1:{port}")
    print(" Press Ctrl+C to stop the server.")
    print("=" * 70)

    try:
        with ThreadingHTTPServer(("", port), handler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[+] Server stopped gracefully.")
        sys.exit(0)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Sign Language Interpreter Dev Server")
    parser.add_argument("--port", "-p", type=int, default=8000, help="Port to bind (default: 8000)")
    parser.add_argument(
        "--dir", "-d", type=str, default=os.path.join(os.path.dirname(__file__), ".."), help="Root directory"
    )
    args = parser.parse_args()
    run_server(port=args.port, directory=args.dir)
