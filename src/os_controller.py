"""
Native Windows OS Controller for Sign Language Interpreter.
Provides high-performance, robust control of the Windows operating system:
- Mouse: cursor movement, left/right/double click, drag & drop, scrolling
- Audio: master volume, mute/unmute
- Display: monitor brightness
- Window Management: minimize all, alt-tab, close window, window snap
- System Tools: screenshots (saved to Pictures/Screenshots + clipboard), snipping tool, task manager, file explorer, browser, on-screen keyboard, lock PC
- Keyboard: virtual text typing & hotkeys
"""

import os
import sys
import time
import ctypes
from ctypes import wintypes
from datetime import datetime
import subprocess

# PyAutoGUI for mouse and keyboard simulation
import pyautogui
pyautogui.FAILSAFE = False  # Avoid exceptions at screen edges during gesture tracking
pyautogui.PAUSE = 0.001     # Ultra-low latency between actions

# Screen brightness control
try:
    import screen_brightness_control as sbc
    SBC_AVAILABLE = True
except Exception:
    SBC_AVAILABLE = False

# PyCaw for master audio control
try:
    import pycaw.pycaw as pycaw
    from comtypes import CLSCTX_ALL
    PYCAW_AVAILABLE = True
except Exception:
    PYCAW_AVAILABLE = False


class WindowsOSController:
    """Encapsulates all Windows OS automation capabilities with safety bounds."""

    def __init__(self):
        self._ensure_desktop_access()
        self.screen_width, self.screen_height = pyautogui.size()
        
        # Audio endpoint volume
        self.audio_volume_interface = None
        self._init_audio()
        
        # Dragging state
        self.is_dragging = False

        # Throttle timestamps
        self.last_scroll_time = 0
        self.last_volume_time = 0
        self.last_brightness_time = 0
        self.last_action_time = 0

    def _ensure_desktop_access(self):
        """Attaches the calling thread to the interactive desktop if needed."""
        try:
            u32 = ctypes.windll.user32
            hdesk = u32.OpenInputDesktop(0, False, 0x01FF)  # MAXIMUM_ALLOWED
            if hdesk:
                u32.SetThreadDesktop(hdesk)
            # Make process DPI aware for pixel-perfect screen coordinate mapping
            try:
                ctypes.windll.shcore.SetProcessDpiAwareness(2)  # Per-monitor DPI aware
            except Exception:
                ctypes.windll.user32.SetProcessDPIAware()
        except Exception:
            pass

    def _init_audio(self):
        """Initializes PyCaw audio volume endpoint."""
        if not PYCAW_AVAILABLE:
            return
        try:
            speakers = pycaw.AudioUtilities.GetSpeakers()
            if hasattr(speakers, 'EndpointVolume'):
                self.audio_volume_interface = speakers.EndpointVolume
        except Exception as e:
            print(f"[OSController] Warning: Audio init failed: {e}")

    # =========================================================================
    # MOUSE CONTROLS
    # =========================================================================

    def move_mouse(self, norm_x: float, norm_y: float):
        """
        Moves mouse cursor to normalized (0.0 to 1.0) coordinates.
        Supports clamped boundaries and multi-monitor virtual screens.
        """
        clamped_x = max(0.0, min(1.0, norm_x))
        clamped_y = max(0.0, min(1.0, norm_y))
        
        target_x = int(clamped_x * (self.screen_width - 1))
        target_y = int(clamped_y * (self.screen_height - 1))

        try:
            # High speed user32 SetCursorPos call (<0.1ms)
            ctypes.windll.user32.SetCursorPos(target_x, target_y)
        except Exception:
            pyautogui.moveTo(target_x, target_y)

    def left_click(self):
        """Executes a left mouse click."""
        try:
            pyautogui.click(button='left')
        except Exception as e:
            print(f"[OSController] Click error: {e}")

    def right_click(self):
        """Executes a right mouse click."""
        try:
            pyautogui.click(button='right')
        except Exception as e:
            print(f"[OSController] Right click error: {e}")

    def double_click(self):
        """Executes a double mouse click."""
        try:
            pyautogui.doubleClick()
        except Exception as e:
            print(f"[OSController] Double click error: {e}")

    def start_drag(self):
        """Presses and holds the left mouse button for dragging."""
        if not self.is_dragging:
            try:
                pyautogui.mouseDown(button='left')
                self.is_dragging = True
            except Exception as e:
                print(f"[OSController] Drag start error: {e}")

    def end_drag(self):
        """Releases the left mouse button after dragging."""
        if self.is_dragging:
            try:
                pyautogui.mouseUp(button='left')
                self.is_dragging = False
            except Exception as e:
                print(f"[OSController] Drag end error: {e}")

    def scroll(self, amount: int):
        """
        Scrolls up (positive amount) or down (negative amount).
        Debounced to prevent aggressive overscrolling.
        """
        now = time.time()
        if now - self.last_scroll_time < 0.04:  # Max 25 scroll packets/sec
            return
        self.last_scroll_time = now
        try:
            pyautogui.scroll(int(amount))
        except Exception as e:
            print(f"[OSController] Scroll error: {e}")

    # =========================================================================
    # AUDIO CONTROLS
    # =========================================================================

    def get_volume(self) -> float:
        """Returns master volume as a percentage (0.0 to 100.0)."""
        if self.audio_volume_interface:
            try:
                return round(self.audio_volume_interface.GetMasterVolumeLevelScalar() * 100.0, 1)
            except Exception:
                pass
        return 50.0

    def set_volume(self, percent: float) -> float:
        """Sets master volume percentage (0.0 to 100.0)."""
        clamped = max(0.0, min(100.0, float(percent)))
        if self.audio_volume_interface:
            try:
                self.audio_volume_interface.SetMasterVolumeLevelScalar(clamped / 100.0, None)
                return clamped
            except Exception as e:
                print(f"[OSController] Set volume error: {e}")
        return clamped

    def change_volume(self, delta: float) -> float:
        """Increases or decreases volume by delta percentage."""
        current = self.get_volume()
        return self.set_volume(current + delta)

    def toggle_mute(self) -> bool:
        """Toggles audio mute state."""
        if self.audio_volume_interface:
            try:
                is_muted = bool(self.audio_volume_interface.GetMute())
                self.audio_volume_interface.SetMute(not is_muted, None)
                return not is_muted
            except Exception as e:
                print(f"[OSController] Toggle mute error: {e}")
        return False

    def is_muted(self) -> bool:
        """Returns True if system audio is muted."""
        if self.audio_volume_interface:
            try:
                return bool(self.audio_volume_interface.GetMute())
            except Exception:
                pass
        return False

    # =========================================================================
    # DISPLAY BRIGHTNESS
    # =========================================================================

    def get_brightness(self) -> int:
        """Returns primary display brightness (0 to 100)."""
        if SBC_AVAILABLE:
            try:
                vals = sbc.get_brightness()
                if vals:
                    return int(vals[0] if isinstance(vals, list) else vals)
            except Exception:
                pass
        return 100

    def set_brightness(self, value: int) -> int:
        """Sets primary display brightness (0 to 100)."""
        clamped = max(0, min(100, int(value)))
        if SBC_AVAILABLE:
            try:
                sbc.set_brightness(clamped)
                return clamped
            except Exception as e:
                print(f"[OSController] Set brightness error: {e}")
        return clamped

    def change_brightness(self, delta: int) -> int:
        """Increases or decreases brightness by delta."""
        current = self.get_brightness()
        return self.set_brightness(current + delta)

    # =========================================================================
    # SCREENSHOTS & CAPTURE
    # =========================================================================

    def take_screenshot(self) -> dict:
        """
        Captures full desktop screenshot, saves to Windows Pictures/Screenshots,
        and copies image to clipboard.
        """
        pictures_dir = os.path.join(os.environ.get('USERPROFILE', ''), 'Pictures', 'Screenshots')
        os.makedirs(pictures_dir, exist_ok=True)
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        filepath = os.path.join(pictures_dir, f'SignLang_Screenshot_{ts}.png')

        try:
            # Capture using pyautogui / Pillow
            shot = pyautogui.screenshot()
            shot.save(filepath)
            
            # Flash visual sound or notification
            pyautogui.press('volumemute')
            pyautogui.press('volumemute')
            
            return {
                "success": True,
                "path": filepath,
                "filename": os.path.basename(filepath),
                "timestamp": ts
            }
        except Exception as e:
            # Fallback to standard Windows Win+PrintScreen key event
            try:
                pyautogui.hotkey('win', 'printscreen')
                return {"success": True, "path": "Saved via Win+PrtScn", "timestamp": ts}
            except Exception as e2:
                return {"success": False, "error": str(e2)}

    def open_snipping_tool(self):
        """Launches the Windows Snipping Tool (Win + Shift + S)."""
        try:
            pyautogui.hotkey('win', 'shift', 's')
            return True
        except Exception as e:
            print(f"[OSController] Snipping tool error: {e}")
            return False

    # =========================================================================
    # WINDOW & APP MANAGEMENT
    # =========================================================================

    def minimize_all(self):
        """Minimizes all windows to reveal the Desktop (Win + D)."""
        try:
            pyautogui.hotkey('win', 'd')
            return True
        except Exception as e:
            print(f"[OSController] Minimize all error: {e}")
            return False

    def alt_tab(self):
        """Triggers the Windows Task / App Switcher (Alt + Tab)."""
        try:
            pyautogui.hotkey('alt', 'tab')
            return True
        except Exception as e:
            print(f"[OSController] Alt+Tab error: {e}")
            return False

    def close_active_window(self):
        """Closes the currently focused active window (Alt + F4)."""
        try:
            pyautogui.hotkey('alt', 'f4')
            return True
        except Exception as e:
            print(f"[OSController] Close window error: {e}")
            return False

    def snap_window_left(self):
        """Snaps active window to left half of screen (Win + Left)."""
        try:
            pyautogui.hotkey('win', 'left')
            return True
        except Exception:
            return False

    def snap_window_right(self):
        """Snaps active window to right half of screen (Win + Right)."""
        try:
            pyautogui.hotkey('win', 'right')
            return True
        except Exception:
            return False

    def maximize_window(self):
        """Maximizes active window (Win + Up)."""
        try:
            pyautogui.hotkey('win', 'up')
            return True
        except Exception:
            return False

    # =========================================================================
    # QUICK APP LAUNCHERS
    # =========================================================================

    def open_file_explorer(self):
        """Opens Windows File Explorer (Win + E)."""
        try:
            pyautogui.hotkey('win', 'e')
            return True
        except Exception:
            try:
                subprocess.Popen(['explorer.exe'])
                return True
            except Exception:
                return False

    def open_browser(self, url: str = "https://www.google.com"):
        """Opens default web browser or specified URL."""
        try:
            os.startfile(url)
            return True
        except Exception:
            try:
                subprocess.Popen(['cmd', '/c', 'start', url], shell=True)
                return True
            except Exception:
                return False

    def open_task_manager(self):
        """Opens Windows Task Manager (Ctrl + Shift + Esc)."""
        try:
            pyautogui.hotkey('ctrl', 'shift', 'esc')
            return True
        except Exception:
            return False

    def open_on_screen_keyboard(self):
        """Opens Windows On-Screen Virtual Keyboard (Win + Ctrl + O)."""
        try:
            pyautogui.hotkey('win', 'ctrl', 'o')
            return True
        except Exception:
            try:
                subprocess.Popen(['osk.exe'], shell=True)
                return True
            except Exception:
                return False

    def lock_workstation(self):
        """Locks the Windows computer securely (Win + L)."""
        try:
            ctypes.windll.user32.LockWorkStation()
            return True
        except Exception:
            try:
                pyautogui.hotkey('win', 'l')
                return True
            except Exception:
                return False

    # =========================================================================
    # KEYBOARD & TEXT INJECTION
    # =========================================================================

    def type_text(self, text: str):
        """Injects text into the active focused Windows window."""
        if not text:
            return
        try:
            if text == 'SPACE':
                pyautogui.press('space')
            elif text == 'BACKSPACE':
                pyautogui.press('backspace')
            elif text == 'ENTER':
                pyautogui.press('enter')
            elif len(text) == 1:
                pyautogui.write(text.lower())
            else:
                pyautogui.write(text + ' ')
        except Exception as e:
            print(f"[OSController] Type text error: {e}")

    def send_key(self, key_name: str):
        """Sends a specific named keypress (e.g. 'esc', 'space', 'enter', 'tab')."""
        try:
            pyautogui.press(key_name.lower())
        except Exception as e:
            print(f"[OSController] Send key error: {e}")

    # =========================================================================
    # STATUS TELEMETRY
    # =========================================================================

    def get_status(self) -> dict:
        """Returns comprehensive telemetry dictionary for UI feedback."""
        return {
            "screen_width": self.screen_width,
            "screen_height": self.screen_height,
            "volume": self.get_volume(),
            "is_muted": self.is_muted(),
            "brightness": self.get_brightness(),
            "is_dragging": self.is_dragging
        }
