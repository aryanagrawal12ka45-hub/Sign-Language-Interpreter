"""
End-to-end HTTP integration test for dev server and Text-to-Sign API.
"""

import json
import os
import subprocess
import sys
import time
import urllib.request
import urllib.error

PORT = 8012
BASE_URL = f"http://127.0.0.1:{PORT}"

def test_server():
    server_proc = subprocess.Popen(
        [sys.executable, "scripts/run_server.py", "--port", str(PORT)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    )

    time.sleep(1.2)

    try:
        # 1. Test GET /quiz.html
        req = urllib.request.Request(f"{BASE_URL}/quiz.html")
        with urllib.request.urlopen(req, timeout=5) as resp:
            html = resp.read().decode("utf-8")
            assert resp.status == 200
            assert "Text to Sign Lab" in html
            assert "t2s-avatar-container" in html
            print("[+] GET /quiz.html passed")

        # 2. Test GET /assets/models/ybot.glb
        req = urllib.request.Request(f"{BASE_URL}/assets/models/ybot.glb")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = resp.read()
            assert resp.status == 200
            assert len(data) > 1000000  # ~2.2MB
            print(f"[+] GET /assets/models/ybot.glb passed ({len(data)} bytes)")

        # 3. Test OPTIONS /api/translate-to-sign (CORS)
        req = urllib.request.Request(f"{BASE_URL}/api/translate-to-sign", method="OPTIONS")
        with urllib.request.urlopen(req, timeout=5) as resp:
            assert resp.status == 204
            assert resp.headers.get("Access-Control-Allow-Origin") == "*"
            print("[+] OPTIONS /api/translate-to-sign passed")

        # 4. Test POST /api/translate-to-sign with sentence
        payload = json.dumps({"text": "Where is the hospital?"}).encode("utf-8")
        req = urllib.request.Request(
            f"{BASE_URL}/api/translate-to-sign",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            assert resp.status == 200
            res = json.loads(resp.read().decode("utf-8"))
            assert res["sentence"] == "Where is the hospital?"
            assert len(res["tokens"]) >= 2
            assert res["tokens"][0]["word"] == "HOSPITAL"
            assert res["tokens"][-1]["word"] == "WHERE"
            print("[+] POST /api/translate-to-sign (Where is the hospital?) passed")

        # 5. Test POST /api/translate-to-sign with name (fingerspelling)
        payload = json.dumps({"text": "My name is John"}).encode("utf-8")
        req = urllib.request.Request(
            f"{BASE_URL}/api/translate-to-sign",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            assert resp.status == 200
            res = json.loads(resp.read().decode("utf-8"))
            words = [t["word"] for t in res["tokens"]]
            assert "MY" in words
            assert "NAME" in words
            assert "J" in words and "O" in words and "H" in words and "N" in words
            print("[+] POST /api/translate-to-sign (My name is John -> fingerspelling) passed")

        # 6. Test POST /api/translate-to-sign with empty input (Validation error)
        payload = json.dumps({"text": ""}).encode("utf-8")
        req = urllib.request.Request(
            f"{BASE_URL}/api/translate-to-sign",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                assert False, "Should have returned 400"
        except urllib.error.HTTPError as e:
            assert e.code == 400
            err_body = json.loads(e.read().decode("utf-8"))
            assert "error" in err_body
            print("[+] POST /api/translate-to-sign (empty input validation) passed")

        # 7. Test Repeated sentence (caching)
        payload = json.dumps({"text": "Where is the hospital?"}).encode("utf-8")
        req = urllib.request.Request(
            f"{BASE_URL}/api/translate-to-sign",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            assert resp.status == 200
            res = json.loads(resp.read().decode("utf-8"))
            assert res.get("cached") is True
            print("[+] In-memory cache hit verification passed")

        print("\n[ALL 7 HTTP INTEGRATION TESTS PASSED SUCCESSFULLY!]")
    finally:
        server_proc.terminate()
        server_proc.wait()

if __name__ == "__main__":
    test_server()

