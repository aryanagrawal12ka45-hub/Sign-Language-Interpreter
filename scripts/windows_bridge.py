"""
High-Speed WebSocket & HTTP Bridge Server for Windows OS Gesture Controls.
Listens on ws://127.0.0.1:8765
Connects the browser's MediaPipe hand tracking to native Windows automation.
"""

import asyncio
import json
import logging
import os
import sys

# Ensure repository root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import websockets
from src.os_controller import WindowsOSController

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("WindowsBridge")

PORT = 8765
HOST = "127.0.0.1"


class WindowsBridgeServer:
    def __init__(self, host=HOST, port=PORT):
        self.host = host
        self.port = port
        self.controller = WindowsOSController()
        self.connected_clients = set()
        self._stop_event = None
        logger.info(f"Initialized WindowsOSController (Screen: {self.controller.screen_width}x{self.controller.screen_height})")

    async def handle_client(self, websocket):
        self.connected_clients.add(websocket)
        client_addr = websocket.remote_address
        logger.info(f"Client connected: {client_addr}")

        # Send initial status handshake
        initial_status = {
            "type": "handshake",
            "status": "connected",
            "server": "SignLanguage_WindowsBridge_v1.0",
            "telemetry": self.controller.get_status()
        }
        await websocket.send(json.dumps(initial_status))

        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    await self.process_command(websocket, data)
                except json.JSONDecodeError:
                    logger.warning(f"Malformed JSON from client: {message[:100]}")
                except Exception as e:
                    logger.error(f"Error executing command: {e}")
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Client disconnected: {client_addr}")
        finally:
            self.connected_clients.discard(websocket)
            # Ensure any active drag is released on disconnect
            if self.controller.is_dragging:
                self.controller.end_drag()

    async def process_command(self, websocket, data: dict):
        cmd_type = data.get("type")

        if cmd_type == "mouse_move":
            x = data.get("x", 0.5)
            y = data.get("y", 0.5)
            self.controller.move_mouse(x, y)

        elif cmd_type == "mouse_click":
            btn = data.get("button", "left")
            if btn == "left":
                self.controller.left_click()
            elif btn == "right":
                self.controller.right_click()
            elif btn == "double":
                self.controller.double_click()

        elif cmd_type == "mouse_drag":
            action = data.get("action", "start")
            if action == "start":
                self.controller.start_drag()
            else:
                self.controller.end_drag()

        elif cmd_type == "scroll":
            dy = data.get("dy", 0)
            self.controller.scroll(dy)

        elif cmd_type == "volume":
            action = data.get("action")
            if action == "set":
                val = self.controller.set_volume(data.get("value", 50))
            elif action == "delta":
                val = self.controller.change_volume(data.get("delta", 0))
            elif action == "mute":
                is_muted = self.controller.toggle_mute()
            # Respond with updated volume
            resp = {
                "type": "volume_update",
                "volume": self.controller.get_volume(),
                "is_muted": self.controller.is_muted()
            }
            await websocket.send(json.dumps(resp))

        elif cmd_type == "brightness":
            action = data.get("action")
            if action == "set":
                val = self.controller.set_brightness(data.get("value", 100))
            elif action == "delta":
                val = self.controller.change_brightness(data.get("delta", 0))
            resp = {
                "type": "brightness_update",
                "brightness": self.controller.get_brightness()
            }
            await websocket.send(json.dumps(resp))

        elif cmd_type == "action":
            action_name = data.get("command")
            result = None
            if action_name == "screenshot":
                result = self.controller.take_screenshot()
            elif action_name == "snip":
                self.controller.open_snipping_tool()
            elif action_name == "minimize_all":
                self.controller.minimize_all()
            elif action_name == "alt_tab":
                self.controller.alt_tab()
            elif action_name == "close_window":
                self.controller.close_active_window()
            elif action_name == "snap_left":
                self.controller.snap_window_left()
            elif action_name == "snap_right":
                self.controller.snap_window_right()
            elif action_name == "maximize":
                self.controller.maximize_window()
            elif action_name == "explorer":
                self.controller.open_file_explorer()
            elif action_name == "browser":
                url = data.get("url", "https://www.google.com")
                self.controller.open_browser(url)
            elif action_name == "task_manager":
                self.controller.open_task_manager()
            elif action_name == "osk":
                self.controller.open_on_screen_keyboard()
            elif action_name == "lock":
                self.controller.lock_workstation()

            resp = {
                "type": "action_result",
                "command": action_name,
                "data": result or {"status": "executed"}
            }
            await websocket.send(json.dumps(resp))

        elif cmd_type == "type_text":
            text = data.get("text", "")
            self.controller.type_text(text)

        elif cmd_type == "send_key":
            key_name = data.get("key", "")
            self.controller.send_key(key_name)

        elif cmd_type == "get_status":
            resp = {
                "type": "status",
                "telemetry": self.controller.get_status()
            }
            await websocket.send(json.dumps(resp))

    async def start(self):
        logger.info(f"Starting Windows OS Bridge Server on ws://{self.host}:{self.port}...")
        print(f"\n========================================================")
        print(f"  ASL Windows OS Control Bridge Active")
        print(f"  WebSocket URL : ws://{self.host}:{self.port}")
        print(f"  Status        : Ready for Browser Connections")
        print(f"========================================================\n")
        self._stop_event = asyncio.Event()
        async with websockets.serve(self.handle_client, self.host, self.port):
            await self._stop_event.wait()

    def run(self):
        try:
            asyncio.run(self.start())
        except KeyboardInterrupt:
            logger.info("Bridge stopped by user.")

    def stop(self):
        if self._stop_event:
            self._stop_event.set()


def main():
    import argparse
    parser = argparse.ArgumentParser(description="ASL Windows OS WebSocket Bridge Server")
    parser.add_argument("--host", default=HOST, help="Host to bind (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=PORT, help="Port to bind (default: 8765)")
    args = parser.parse_args()

    server = WindowsBridgeServer(host=args.host, port=args.port)
    server.run()


if __name__ == "__main__":
    main()
