@echo off
REM ==============================================================================
REM PrivacyVision — Permanent Background Service Setup (Windows)
REM Installs PrivacyVision backend as an automatic background service on Windows.
REM ==============================================================================

echo ==================================================
echo  PrivacyVision - Permanent Backend Service Setup
echo ==================================================

cd /d "%~dp0server"

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python 3 was not found in PATH. Please install Python 3.9+ from python.org.
    pause
    exit /b 1
)

REM Setup venv if not exists
if not exist "venv\Scripts\python.exe" (
    echo Creating virtual environment in server\venv...
    python -m venv venv
)

echo Installing dependencies...
venv\Scripts\pip install -q -r requirements.txt

echo Installing permanent Windows Startup service...
venv\Scripts\python daemon.py install

echo.
echo ==================================================
echo Setup Complete!
echo PrivacyVision backend will now run silently in the background
echo even after closing Command Prompt or VS Code, and on every boot.
echo ==================================================
pause
