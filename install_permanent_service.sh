#!/usr/bin/env bash
# ==============================================================================
# PrivacyVision — Permanent Background Service Setup (macOS & Linux)
# Installs PrivacyVision backend as an OS background service so it stays on 24/7
# even after closing Terminal, closing VSCode, or rebooting the computer.
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$DIR/server"

echo "=================================================="
echo " PrivacyVision — Permanent Backend Service Setup"
echo "=================================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 was not found. Please install Python 3.9+ first."
    exit 1
fi

# Ensure virtual environment exists
if [ ! -d "$SERVER_DIR/venv" ]; then
    echo "Creating Python virtual environment in $SERVER_DIR/venv..."
    python3 -m venv "$SERVER_DIR/venv"
fi

# Ensure requirements are installed
echo "Checking dependencies..."
"$SERVER_DIR/venv/bin/pip" install -q -r "$SERVER_DIR/requirements.txt"

# Run the daemon installer
echo "Installing permanent background service..."
"$SERVER_DIR/venv/bin/python" "$SERVER_DIR/daemon.py" install

echo ""
echo "🎉 Setup Complete!"
echo "The PrivacyVision backend is now permanently running in the background."
echo "You can now safely close this terminal and close VS Code."
