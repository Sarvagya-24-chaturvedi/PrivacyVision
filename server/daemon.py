#!/usr/bin/env python3
"""
PrivacyVision Permanent Background Service Manager (SIH26171)
Cross-platform daemon installer and controller for macOS, Linux, and Windows.

Usage:
    python3 daemon.py install   # Install as permanent OS background service (starts on boot)
    python3 daemon.py start     # Start background daemon immediately
    python3 daemon.py stop      # Stop background daemon
    python3 daemon.py restart   # Restart background daemon
    python3 daemon.py status    # Check if backend is alive
    python3 daemon.py uninstall # Remove from OS auto-start
"""

import os
import sys
import platform
import subprocess
import signal
import time
import urllib.request
import urllib.error
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parent
PROJECT_DIR = SERVER_DIR.parent
PID_FILE = SERVER_DIR / "server.pid"
LOG_OUT = SERVER_DIR / "server.log"
LOG_ERR = SERVER_DIR / "server_error.log"

OS_TYPE = platform.system().lower()

def get_python_exe() -> str:
    """Finds virtualenv python or fallback system python."""
    venv_py = SERVER_DIR / "venv" / "bin" / "python"
    venv_py_win = SERVER_DIR / "venv" / "Scripts" / "python.exe"
    if venv_py.exists():
        return str(venv_py)
    if venv_py_win.exists():
        return str(venv_py_win)
    return sys.executable

def check_health(port: int = 8000, timeout: float = 1.5) -> bool:
    """Checks if the FastAPI backend is running and healthy."""
    url = f"http://127.0.0.1:{port}/health"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "PrivacyVisionDaemon/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status == 200
    except Exception:
        return False

# ==============================================================================
# macOS: launchd (User LaunchAgent)
# ==============================================================================
MACOS_LABEL = "com.privacyvision.backend"
MACOS_PLIST_PATH = Path.home() / "Library" / "LaunchAgents" / f"{MACOS_LABEL}.plist"

def install_macos_launchd():
    python_exe = get_python_exe()
    MACOS_PLIST_PATH.parent.mkdir(parents=True, exist_ok=True)

    plist_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>{MACOS_LABEL}</string>
    <key>WorkingDirectory</key>
    <string>{SERVER_DIR}</string>
    <key>ProgramArguments</key>
    <array>
        <string>{python_exe}</string>
        <string>-m</string>
        <string>uvicorn</string>
        <string>app.main:app</string>
        <string>--host</string>
        <string>0.0.0.0</string>
        <string>--port</string>
        <string>8000</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>{LOG_OUT}</string>
    <key>StandardErrorPath</key>
    <string>{LOG_ERR}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:{Path(python_exe).parent}</string>
        <key>PYTHONPATH</key>
        <string>{SERVER_DIR}</string>
    </dict>
</dict>
</plist>
"""
    with open(MACOS_PLIST_PATH, "w", encoding="utf-8") as f:
        f.write(plist_content)

    print(f"✓ Created launchd plist at: {MACOS_PLIST_PATH}")

    # Unload if already loaded, then load
    try:
        subprocess.run(["launchctl", "unload", str(MACOS_PLIST_PATH)], stderr=subprocess.DEVNULL, check=False)
    except Exception:
        pass

    res = subprocess.run(["launchctl", "load", "-w", str(MACOS_PLIST_PATH)], capture_output=True, text=True)
    if res.returncode == 0:
        print("✓ Successfully registered with macOS launchd!")
        print("  The PrivacyVision backend will now run 24/7 in the background.")
        print("  It will automatically start on reboot and stay alive even if Terminal/VSCode closes.")
    else:
        print(f"Notice: launchctl load output: {res.stderr.strip()}")

def uninstall_macos_launchd():
    if MACOS_PLIST_PATH.exists():
        try:
            subprocess.run(["launchctl", "unload", str(MACOS_PLIST_PATH)], stderr=subprocess.DEVNULL, check=False)
        except Exception:
            pass
        MACOS_PLIST_PATH.unlink(missing_ok=True)
        print("✓ Removed macOS launchd service.")
    else:
        print("No macOS launchd service found.")

# ==============================================================================
# Linux: systemd user service
# ==============================================================================
SYSTEMD_DIR = Path.home() / ".config" / "systemd" / "user"
SYSTEMD_SERVICE = SYSTEMD_DIR / "privacyvision.service"

def install_linux_systemd():
    python_exe = get_python_exe()
    SYSTEMD_DIR.mkdir(parents=True, exist_ok=True)

    service_content = f"""[Unit]
Description=PrivacyVision On-Device Visual Browser Agent Backend
After=network.target

[Service]
Type=simple
WorkingDirectory={SERVER_DIR}
Environment="PYTHONPATH={SERVER_DIR}"
ExecStart={python_exe} -m uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=3
StandardOutput=append:{LOG_OUT}
StandardError=append:{LOG_ERR}

[Install]
WantedBy=default.target
"""
    with open(SYSTEMD_SERVICE, "w", encoding="utf-8") as f:
        f.write(service_content)

    print(f"✓ Created systemd service at: {SYSTEMD_SERVICE}")
    subprocess.run(["systemctl", "--user", "daemon-reload"], check=False)
    subprocess.run(["systemctl", "--user", "enable", "--now", "privacyvision"], check=False)
    print("✓ Enabled and started systemd user service for PrivacyVision.")

def uninstall_linux_systemd():
    if SYSTEMD_SERVICE.exists():
        subprocess.run(["systemctl", "--user", "stop", "privacyvision"], check=False)
        subprocess.run(["systemctl", "--user", "disable", "privacyvision"], check=False)
        SYSTEMD_SERVICE.unlink(missing_ok=True)
        subprocess.run(["systemctl", "--user", "daemon-reload"], check=False)
        print("✓ Removed Linux systemd user service.")

# ==============================================================================
# Windows: Startup VBS
# ==============================================================================
def get_windows_startup_dir() -> Path:
    appdata = os.getenv("APPDATA")
    if appdata:
        return Path(appdata) / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "Startup"
    return Path.home() / "AppData" / "Roaming" / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "Startup"

def install_windows_startup():
    startup_dir = get_windows_startup_dir()
    startup_dir.mkdir(parents=True, exist_ok=True)
    vbs_path = startup_dir / "PrivacyVisionBackend.vbs"

    # Try pythonw.exe if in venv, else python.exe
    py_exe = Path(get_python_exe())
    pyw_exe = py_exe.parent / "pythonw.exe"
    target_py = str(pyw_exe if pyw_exe.exists() else py_exe)

    vbs_content = f"""Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "{SERVER_DIR}"
WshShell.Run "\"{target_py}\" -m uvicorn app.main:app --host 0.0.0.0 --port 8000", 0, False
"""
    with open(vbs_path, "w", encoding="utf-8") as f:
        f.write(vbs_content)
    print(f"✓ Created Windows Startup script at: {vbs_path}")
    print("✓ PrivacyVision will now run silently in the background on every Windows login.")

# ==============================================================================
# Detached Process Management (Cross-Platform fallback)
# ==============================================================================
def start_detached():
    if check_health():
        print("✓ PrivacyVision backend is ALREADY running and healthy on http://localhost:8000")
        return

    python_exe = get_python_exe()
    cmd = [
        python_exe,
        "-m", "uvicorn",
        "app.main:app",
        "--host", "0.0.0.0",
        "--port", "8000"
    ]

    out_file = open(LOG_OUT, "a", encoding="utf-8")
    err_file = open(LOG_ERR, "a", encoding="utf-8")

    env = os.environ.copy()
    env["PYTHONPATH"] = str(SERVER_DIR)

    if OS_TYPE == "windows":
        creationflags = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS
        proc = subprocess.Popen(
            cmd,
            cwd=str(SERVER_DIR),
            stdout=out_file,
            stderr=err_file,
            env=env,
            creationflags=creationflags,
            close_fds=True
        )
    else:
        proc = subprocess.Popen(
            cmd,
            cwd=str(SERVER_DIR),
            stdout=out_file,
            stderr=err_file,
            env=env,
            start_new_session=True,  # Detach from terminal/VSCode session
            close_fds=True
        )

    with open(PID_FILE, "w", encoding="utf-8") as f:
        f.write(str(proc.pid))

    print(f"✓ Started detached backend process [PID: {proc.pid}]")
    print("  Waiting for health check...")

    for _ in range(15):
        time.sleep(0.5)
        if check_health():
            print("✓ PrivacyVision backend is now ONLINE at http://localhost:8000")
            print(f"  Logs: {LOG_OUT}")
            return

    print("⚠️ Backend started, but health check is taking longer than expected. Check server.log:")
    if LOG_ERR.exists() and LOG_ERR.stat().st_size > 0:
        with open(LOG_ERR, "r", encoding="utf-8") as f:
            print(f.read()[-500:])

def stop_process():
    stopped = False

    # Stop via launchd if on macOS
    if OS_TYPE == "darwin" and MACOS_PLIST_PATH.exists():
        subprocess.run(["launchctl", "unload", str(MACOS_PLIST_PATH)], stderr=subprocess.DEVNULL, check=False)
        stopped = True

    # Stop via systemd if on Linux
    if OS_TYPE == "linux" and SYSTEMD_SERVICE.exists():
        subprocess.run(["systemctl", "--user", "stop", "privacyvision"], check=False)
        stopped = True

    # Stop via PID file
    if PID_FILE.exists():
        try:
            with open(PID_FILE, "r", encoding="utf-8") as f:
                pid = int(f.read().strip())
            os.kill(pid, signal.SIGTERM)
            print(f"✓ Sent SIGTERM to PID {pid}")
            stopped = True
        except Exception:
            pass
        PID_FILE.unlink(missing_ok=True)

    # Fallback: kill any process occupying port 8000
    if OS_TYPE != "windows":
        try:
            pids = subprocess.check_output(["lsof", "-ti", ":8000"]).decode().strip().split()
            for p in pids:
                try:
                    os.kill(int(p), signal.SIGKILL)
                    print(f"✓ Killed lingering port 8000 process [PID: {p}]")
                    stopped = True
                except Exception:
                    pass
        except Exception:
            pass

    if stopped or not check_health():
        print("✓ PrivacyVision backend stopped.")
    else:
        print("Notice: No active backend was stopped or process could not be found.")

def print_status():
    alive = check_health()
    print("==================================================")
    print("PrivacyVision Backend Status")
    print("==================================================")
    print(f"Host:       http://localhost:8000")
    print(f"Status:     {'🟢 ONLINE (Connected)' if alive else '🔴 OFFLINE'}")
    print(f"Python:     {get_python_exe()}")
    print(f"Directory:  {SERVER_DIR}")

    if OS_TYPE == "darwin":
        installed = MACOS_PLIST_PATH.exists()
        print(f"Auto-Start: {'Installed (macOS launchd)' if installed else 'Not installed as permanent service'}")
    elif OS_TYPE == "linux":
        installed = SYSTEMD_SERVICE.exists()
        print(f"Auto-Start: {'Installed (Linux systemd)' if installed else 'Not installed as permanent service'}")
    elif OS_TYPE == "windows":
        installed = (get_windows_startup_dir() / "PrivacyVisionBackend.vbs").exists()
        print(f"Auto-Start: {'Installed (Windows Startup)' if installed else 'Not installed as permanent service'}")

    if PID_FILE.exists():
        print(f"PID File:   {PID_FILE.read_text().strip()}")
    print("==================================================")

def install():
    print(f"Installing permanent background service on {platform.system()}...")
    if OS_TYPE == "darwin":
        install_macos_launchd()
    elif OS_TYPE == "linux":
        install_linux_systemd()
    elif OS_TYPE == "windows":
        install_windows_startup()
    else:
        print(f"Generic OS detected. Falling back to detached runner.")
        start_detached()

    time.sleep(1.5)
    print_status()

def uninstall():
    print(f"Uninstalling permanent service on {platform.system()}...")
    if OS_TYPE == "darwin":
        uninstall_macos_launchd()
    elif OS_TYPE == "linux":
        uninstall_linux_systemd()
    stop_process()

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        print_status()
        return

    cmd = sys.argv[1].lower()
    if cmd == "install":
        install()
    elif cmd == "start":
        start_detached()
    elif cmd == "stop":
        stop_process()
    elif cmd == "restart":
        stop_process()
        time.sleep(1)
        start_detached()
    elif cmd == "status":
        print_status()
    elif cmd == "uninstall":
        uninstall()
    else:
        print(f"Unknown command: {cmd}")
        print(__doc__)

if __name__ == "__main__":
    main()
