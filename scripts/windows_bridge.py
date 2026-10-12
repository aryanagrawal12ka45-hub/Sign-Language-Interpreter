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

        # Send initial status handshake & telemetry
        status_data = self.controller.get_status()
        initial_status = {
            "type": "handshake",
            "status": "connected",
            "server": "SignLanguage_WindowsBridge_v2.5",
            "telemetry": status_data,
            **status_data
        }
        await websocket.send(json.dumps(initial_status))

        # Also send explicit type: "telemetry" so client HUD sets up immediately
        initial_telemetry = {
            "type": "telemetry",
            **status_data
        }
        await websocket.send(json.dumps(initial_telemetry))

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
        action = data.get("action")
        command = data.get("command")

        # 1. Cursor Movement
        if cmd_type == "mouse_move" or action == "move":
            x = data.get("x", 0.5)
            y = data.get("y", 0.5)
            self.controller.move_mouse(x, y)
            return

        # 2. Mouse Clicks & Buttons
        if cmd_type == "mouse_click" or action in ("left_click", "right_click", "double_click"):
            btn = data.get("button", "left")
            if action == "left_click" or (cmd_type == "mouse_click" and btn == "left"):
                self.controller.left_click()
                logger.info("[OS Action] Left Click executed")
            elif action == "right_click" or (cmd_type == "mouse_click" and btn == "right"):
                self.controller.right_click()
                logger.info("[OS Action] Right Click executed")
            elif action == "double_click" or (cmd_type == "mouse_click" and btn == "double"):
                self.controller.double_click()
                logger.info("[OS Action] Double Click executed")
            return

        # 3. Mouse Drag & Drop
        if cmd_type == "mouse_drag" or action in ("mouse_down", "mouse_up", "start_drag", "end_drag"):
            drag_action = action or data.get("action")
            if cmd_type == "mouse_drag":
                drag_action = "start" if data.get("action") == "start" else "end"
            if drag_action in ("start", "mouse_down", "start_drag"):
                self.controller.start_drag()
                logger.info("[OS Action] Drag START (MouseDown)")
            else:
                self.controller.end_drag()
                logger.info("[OS Action] Drag END (MouseUp)")
            return

        # 4. Scroll
        if cmd_type == "scroll" or action == "scroll":
            dy = data.get("dy") if data.get("dy") is not None else data.get("clicks", 0)
            self.controller.scroll(dy)
            return

        # 5. Master Volume
        if cmd_type == "volume" or action in ("set_volume", "volume", "toggle_mute", "mute"):
            vol_val = data.get("percent") if data.get("percent") is not None else data.get("value")
            if vol_val is not None:
                new_vol = self.controller.set_volume(float(vol_val))
                logger.info(f"[OS Action] Volume set to {new_vol}%")
            elif data.get("delta") is not None:
                new_vol = self.controller.change_volume(float(data.get("delta")))
                logger.info(f"[OS Action] Volume changed to {new_vol}%")
            elif action in ("toggle_mute", "mute") or data.get("action") == "mute":
                is_muted = self.controller.toggle_mute()
                logger.info(f"[OS Action] Mute toggled: {is_muted}")

            # Respond with updated volume telemetry
            resp = {
                "type": "telemetry",
                "volume": self.controller.get_volume(),
                "is_muted": self.controller.is_muted(),
                "last_action": f"Volume {int(self.controller.get_volume())}%"
            }
            await websocket.send(json.dumps(resp))
            return

        # 6. Screen Brightness
        if cmd_type == "brightness" or action in ("set_brightness", "brightness"):
            bri_val = data.get("percent") if data.get("percent") is not None else data.get("value")
            if bri_val is not None:
                new_bri = self.controller.set_brightness(int(bri_val))
                logger.info(f"[OS Action] Brightness set to {new_bri}%")
            elif data.get("delta") is not None:
                new_bri = self.controller.change_brightness(int(data.get("delta")))
                logger.info(f"[OS Action] Brightness changed to {new_bri}%")

            resp = {
                "type": "telemetry",
                "brightness": self.controller.get_brightness(),
                "last_action": f"Brightness {int(self.controller.get_brightness())}%"
            }
            await websocket.send(json.dumps(resp))
            return

        # 7. System Tools & Actions
        target_action = command or action
        if cmd_type == "action" or target_action in (
            "screenshot", "snip", "desktop", "minimize_all", "explorer",
            "taskmgr", "task_manager", "osk", "lock", "alt_tab",
            "close_window", "maximize", "snap_left", "snap_right", "browser"
        ):
            result = None
            if target_action == "screenshot":
                result = self.controller.take_screenshot()
                logger.info(f"[OS Action] Screenshot captured: {result.get('filename') if isinstance(result, dict) else result}")
            elif target_action == "snip":
                self.controller.open_snipping_tool()
                logger.info("[OS Action] Snipping Tool launched (Win+Shift+S)")
            elif target_action in ("desktop", "minimize_all"):
                self.controller.minimize_all()
                logger.info("[OS Action] Show Desktop triggered (Win+D)")
            elif target_action == "explorer":
                self.controller.open_file_explorer()
                logger.info("[OS Action] File Explorer opened (Win+E)")
            elif target_action in ("taskmgr", "task_manager"):
                self.controller.open_task_manager()
                logger.info("[OS Action] Task Manager opened (Ctrl+Shift+Esc)")
            elif target_action == "osk":
                self.controller.open_on_screen_keyboard()
                logger.info("[OS Action] On-Screen Keyboard opened")
            elif target_action == "lock":
                self.controller.lock_workstation()
                logger.info("[OS Action] Workstation locked (Win+L)")
            elif target_action == "alt_tab":
                self.controller.alt_tab()
                logger.info("[OS Action] Alt+Tab triggered")
            elif target_action == "close_window":
                self.controller.close_active_window()
                logger.info("[OS Action] Close window triggered (Alt+F4)")
            elif target_action == "maximize":
                self.controller.maximize_window()
                logger.info("[OS Action] Maximize window triggered (Win+Up)")
            elif target_action == "snap_left":
                self.controller.snap_window_left()
                logger.info("[OS Action] Snap left triggered (Win+Left)")
            elif target_action == "snap_right":
                self.controller.snap_window_right()
                logger.info("[OS Action] Snap right triggered (Win+Right)")
            elif target_action == "browser":
                url = data.get("url", "https://www.google.com")
                self.controller.open_browser(url)
                logger.info(f"[OS Action] Browser opened: {url}")

            resp = {
                "type": "action_result",
                "command": target_action,
                "data": result or {"status": "executed"}
            }
            await websocket.send(json.dumps(resp))
            return

        # 8. Virtual Typing & Keyboard
        if cmd_type == "type_text" or action == "type_text":
            text = data.get("text", "")
            self.controller.type_text(text)
            logger.info(f"[OS Action] Virtual Typing: '{text}'")
            return

        if cmd_type == "send_key" or action == "send_key":
            key_name = data.get("key", "")
            self.controller.send_key(key_name)
            logger.info(f"[OS Action] Key pressed: {key_name}")
            return

        # 9. Status Query
        if cmd_type in ("get_status", "status") or action == "get_status":
            resp = {
                "type": "telemetry",
                **self.controller.get_status()
            }
            await websocket.send(json.dumps(resp))
            return

        logger.warning(f"[WindowsBridge] Unhandled message payload: {data}")

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
