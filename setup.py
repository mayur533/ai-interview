#!/usr/bin/env python3
"""
Cross-platform Setup Script for AI Interview Platform
Installs dependencies for both backend (Python/Django) and frontend (Node.js/React)
Works on: Windows, Linux, macOS, Unix
"""

import os
import sys
import subprocess
import platform
from pathlib import Path

# Colors for output (ANSI codes)
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color

def print_colored(message, color=Colors.NC):
    """Print colored message (works on Unix-like systems)"""
    if platform.system() != 'Windows':
        print(f"{color}{message}{Colors.NC}")
    else:
        print(message)

def run_command(command, cwd=None, shell=True):
    """Run a shell command and return success status"""
    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            shell=shell,
            check=True,
            capture_output=True,
            text=True
        )
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        return False, e.stderr

def check_command(command, name):
    """Check if a command is available"""
    success, _ = run_command(f"{command} --version", shell=True)
    if success:
        result = subprocess.run(
            f"{command} --version",
            shell=True,
            capture_output=True,
            text=True
        )
        version = result.stdout.strip()
        print_colored(f"✅ Found {name} {version}", Colors.GREEN)
        return True
    else:
        print_colored(f"❌ {name} is not installed or not in PATH", Colors.RED)
        return False

def main():
    script_dir = Path(__file__).parent.absolute()
    frontend_dir = script_dir / "frontend"
    venv_dir = script_dir / "venv"
    
    print_colored("🎯 AI Interview Platform - Setup Script", Colors.BLUE)
    print("=" * 50)
    print()
    
    # Check for Python
    print_colored("🔍 Checking Python installation...", Colors.BLUE)
    if not check_command("python3" if platform.system() != 'Windows' else "python", "Python"):
        sys.exit(1)
    print()
    
    # Check for Node.js
    print_colored("🔍 Checking Node.js installation...", Colors.BLUE)
    if not check_command("node", "Node.js"):
        print_colored("💡 Visit: https://nodejs.org/ to install Node.js", Colors.YELLOW)
        sys.exit(1)
    print()
    
    # Check for npm
    print_colored("🔍 Checking npm installation...", Colors.BLUE)
    if not check_command("npm", "npm"):
        sys.exit(1)
    print()
    
    # Setup Backend (Python/Django)
    print_colored("📦 Setting up Backend (Python/Django)...", Colors.BLUE)
    print()
    
    # Create virtual environment if it doesn't exist
    if not venv_dir.exists():
        print_colored("Creating Python virtual environment...", Colors.YELLOW)
        python_cmd = "python3" if platform.system() != 'Windows' else "python"
        success, _ = run_command(f"{python_cmd} -m venv {venv_dir}")
        if success:
            print_colored("✅ Virtual environment created", Colors.GREEN)
        else:
            print_colored("❌ Failed to create virtual environment", Colors.RED)
            sys.exit(1)
    else:
        print_colored("✅ Virtual environment already exists", Colors.GREEN)
    
    # Activate virtual environment and install dependencies
    if platform.system() == 'Windows':
        activate_script = venv_dir / "Scripts" / "activate.bat"
        pip_cmd = str(venv_dir / "Scripts" / "pip.exe")
        python_cmd = str(venv_dir / "Scripts" / "python.exe")
    else:
        activate_script = venv_dir / "bin" / "activate"
        pip_cmd = str(venv_dir / "bin" / "pip")
        python_cmd = str(venv_dir / "bin" / "python")
    
    # Upgrade pip
    print_colored("Upgrading pip...", Colors.YELLOW)
    run_command(f"{python_cmd} -m pip install --upgrade pip --quiet")
    
    # Install Python dependencies
    print_colored("Installing Python dependencies...", Colors.YELLOW)
    requirements_file = script_dir / "requirements.txt"
    if requirements_file.exists():
        success, output = run_command(f"{pip_cmd} install -r {requirements_file}")
        if success:
            print_colored("✅ Backend dependencies installed", Colors.GREEN)
        else:
            print_colored(f"❌ Failed to install dependencies: {output}", Colors.RED)
            sys.exit(1)
    else:
        print_colored("⚠️  requirements.txt not found, skipping backend setup", Colors.YELLOW)
    print()
    
    # Setup Frontend (Node.js/React)
    print_colored("📦 Setting up Frontend (Node.js/React)...", Colors.BLUE)
    print()
    
    # Check if frontend directory exists
    if not frontend_dir.exists():
        print_colored(f"❌ Frontend directory not found at {frontend_dir}", Colors.RED)
        sys.exit(1)
    
    # Check if package.json exists
    package_json = frontend_dir / "package.json"
    if not package_json.exists():
        print_colored("❌ package.json not found in frontend directory", Colors.RED)
        sys.exit(1)
    
    # Install Node.js dependencies
    print_colored("Installing Node.js dependencies...", Colors.YELLOW)
    success, output = run_command("npm install", cwd=frontend_dir)
    if success:
        print_colored("✅ Frontend dependencies installed", Colors.GREEN)
    else:
        print_colored(f"❌ Failed to install dependencies: {output}", Colors.RED)
        sys.exit(1)
    print()
    
    # Summary
    print_colored("🎉 Setup completed successfully!", Colors.GREEN)
    print()
    print_colored("📋 Summary:", Colors.BLUE)
    print(f"  ✅ Python virtual environment: {venv_dir}")
    print("  ✅ Backend dependencies installed")
    print("  ✅ Frontend dependencies installed")
    print()
    print_colored("💡 Next steps:", Colors.YELLOW)
    print("  To start both servers, run:")
    if platform.system() == 'Windows':
        print("    start_servers.bat (Windows)")
    else:
        print("    ./start_servers.sh (Unix/Linux/macOS)")
    print("    or")
    print("    cd frontend && npm start (Cross-platform)")
    print()

if __name__ == "__main__":
    main()

