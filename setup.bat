@echo off
REM Cross-platform Setup Script for AI Interview Platform (Windows)
REM Installs dependencies for both backend (Python/Django) and frontend (Node.js/React)

setlocal enabledelayedexpansion

echo 🎯 AI Interview Platform - Setup Script
echo ==================================================
echo.

REM Get the directory of the script
set "SCRIPT_DIR=%~dp0"
set "FRONTEND_DIR=%SCRIPT_DIR%frontend"
set "VENV_DIR=%SCRIPT_DIR%venv"

REM Check for Python
echo 🔍 Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH. Please install Python 3.8 or higher.
    exit /b 1
)
for /f "tokens=2" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo ✅ Found Python !PYTHON_VERSION!
echo.

REM Check for Node.js
echo 🔍 Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed or not in PATH. Please install Node.js 16 or higher.
    echo 💡 Visit: https://nodejs.org/ to install Node.js
    exit /b 1
)
for /f %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Found Node.js !NODE_VERSION!
echo.

REM Check for npm
echo 🔍 Checking npm installation...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed or not in PATH. Please install npm.
    exit /b 1
)
for /f %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✅ Found npm !NPM_VERSION!
echo.

REM Setup Backend (Python/Django)
echo 📦 Setting up Backend (Python/Django)...
echo.

REM Create virtual environment if it doesn't exist
if not exist "%VENV_DIR%" (
    echo Creating Python virtual environment...
    python -m venv "%VENV_DIR%"
    echo ✅ Virtual environment created
) else (
    echo ✅ Virtual environment already exists
)

REM Activate virtual environment
echo Activating virtual environment...
call "%VENV_DIR%\Scripts\activate.bat"

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip --quiet

REM Install Python dependencies
echo Installing Python dependencies...
pip install -r requirements.txt

echo ✅ Backend dependencies installed
echo.

REM Deactivate virtual environment
deactivate

REM Setup Frontend (Node.js/React)
echo 📦 Setting up Frontend (Node.js/React)...
echo.

REM Check if frontend directory exists
if not exist "%FRONTEND_DIR%" (
    echo ❌ Frontend directory not found at %FRONTEND_DIR%
    exit /b 1
)

REM Check if package.json exists
if not exist "%FRONTEND_DIR%\package.json" (
    echo ❌ package.json not found in frontend directory
    exit /b 1
)

REM Install Node.js dependencies
echo Installing Node.js dependencies...
cd "%FRONTEND_DIR%"
call npm install
cd "%SCRIPT_DIR%"

echo ✅ Frontend dependencies installed
echo.

REM Summary
echo 🎉 Setup completed successfully!
echo.
echo 📋 Summary:
echo   ✅ Python virtual environment: %VENV_DIR%
echo   ✅ Backend dependencies installed
echo   ✅ Frontend dependencies installed
echo.
echo 💡 Next steps:
echo   To start both servers, run:
echo     start_servers.bat (Windows)
echo     or
echo     cd frontend ^&^& npm start (Cross-platform)
echo.

endlocal

