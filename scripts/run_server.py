"""
Development HTTP Server for Sign Language Interpreter.
Serves the web application locally with proper CORS, MIME headers, and
Text-to-Sign translation API endpoints (POST /api/translate-to-sign).
"""

import argparse
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import json
import mimetypes
import os
import sys

# Ensure proper MIME types for 3D models and ES modules
mimetypes.add_type("model/gltf-binary", ".glb")
mimetypes.add_type("model/gltf+json", ".gltf")
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/javascript", ".mjs")

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
try:
    from scripts.text_to_sign_backend import translate_to_sign
except ImportError:
    translate_to_sign = None


class CustomRequestHandler(SimpleHTTPRequestHandler):
    """Custom request handler enabling CORS, caching, and API endpoints."""

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        """Handle pre-flight CORS requests."""
        self.send_response(204)
        self.end_headers()

    def do_POST(self):
        """Handle API requests such as POST /api/translate-to-sign."""
        clean_path = self.path.split('?')[0].rstrip('/')
        if clean_path in ("/api/translate-to-sign", "/api/translate-isl"):
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
            try:
                data = json.loads(body) if body else {}
            except Exception:
                data = {}

            raw_text = data.get("text", "")
            if not translate_to_sign:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Translation backend module unavailable", "tokens": []}).encode("utf-8"))
                return

            result = translate_to_sign(raw_text)
            status_code = 400 if "error" in result else 200

            self.send_response(status_code)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode("utf-8"))
            return

        self.send_response(404)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"error": "Not Found"}).encode("utf-8"))


def get_lan_ip():
    """Detects primary LAN IP for network sharing."""
    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'


def run_server(port: int = 8000, directory: str = "."):
    """Starts the local development HTTP server."""
    root_dir = os.path.abspath(directory)
    handler = partial(CustomRequestHandler, directory=root_dir)
    lan_ip = get_lan_ip()

    print("=" * 70)
    print(" SIGN LANGUAGE INTERPRETER — LOCAL DEV SERVER")
    print("=" * 70)
    print(f" Serving Directory : {root_dir}")
    print(f" Local URL         : http://localhost:{port}")
    print(f" Network URL       : http://{lan_ip}:{port}")
    print(f" Text-to-Sign API  : http://localhost:{port}/api/translate-to-sign")
    print(" Press Ctrl+C to stop the server.")
    print("=" * 70)

    # Attempt to start the Windows OS Control & Two-Way Signaling WebSocket Bridge on port 8765
    try:
        import threading
        sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
        from scripts.windows_bridge import WindowsBridgeServer
        bridge = WindowsBridgeServer(host="0.0.0.0", port=8765)
        bridge_thread = threading.Thread(target=bridge.run, daemon=True)
        bridge_thread.start()
        print(f" WebSocket Bridge  : ws://127.0.0.1:8765 (and ws://{lan_ip}:8765)")
    except Exception as e:
        print(f" [-] WebSocket Bridge on port 8765 not started: {e}")

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
