#!/bin/bash

# Cross-platform Setup Script for AI Interview Platform
# Installs dependencies for both backend (Python/Django) and frontend (Node.js/React)
# Works on: Linux, macOS, Unix

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory of the script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
VENV_DIR="$SCRIPT_DIR/venv"

echo -e "${BLUE}🎯 AI Interview Platform - Setup Script${NC}"
echo "=================================================="
echo ""

# Check for Python
echo -e "${BLUE}🔍 Checking Python installation...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed. Please install Python 3.8 or higher.${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo -e "${GREEN}✅ Found Python $PYTHON_VERSION${NC}"
echo ""

# Check for Node.js
echo -e "${BLUE}🔍 Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 16 or higher.${NC}"
    echo -e "${YELLOW}💡 Visit: https://nodejs.org/ to install Node.js${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Found Node.js $NODE_VERSION${NC}"
echo ""

# Check for npm
echo -e "${BLUE}🔍 Checking npm installation...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm.${NC}"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo -e "${GREEN}✅ Found npm $NPM_VERSION${NC}"
echo ""

# Setup Backend (Python/Django)
echo -e "${BLUE}📦 Setting up Backend (Python/Django)...${NC}"
echo ""

# Create virtual environment if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo -e "${YELLOW}Creating Python virtual environment...${NC}"
    python3 -m venv "$VENV_DIR"
    echo -e "${GREEN}✅ Virtual environment created${NC}"
else
    echo -e "${GREEN}✅ Virtual environment already exists${NC}"
fi

# Activate virtual environment
echo -e "${YELLOW}Activating virtual environment...${NC}"
source "$VENV_DIR/bin/activate"

# Upgrade pip
echo -e "${YELLOW}Upgrading pip...${NC}"
pip install --upgrade pip --quiet

# Install Python dependencies
echo -e "${YELLOW}Installing Python dependencies...${NC}"
pip install -r requirements.txt

echo -e "${GREEN}✅ Backend dependencies installed${NC}"
echo ""

# Deactivate virtual environment
deactivate

# Setup Frontend (Node.js/React)
echo -e "${BLUE}📦 Setting up Frontend (Node.js/React)...${NC}"
echo ""

# Check if frontend directory exists
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Frontend directory not found at $FRONTEND_DIR${NC}"
    exit 1
fi

# Check if package.json exists
if [ ! -f "$FRONTEND_DIR/package.json" ]; then
    echo -e "${RED}❌ package.json not found in frontend directory${NC}"
    exit 1
fi

# Install Node.js dependencies
echo -e "${YELLOW}Installing Node.js dependencies...${NC}"
cd "$FRONTEND_DIR"
npm install
cd "$SCRIPT_DIR"

echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
echo ""

# Summary
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo -e "  ✅ Python virtual environment: $VENV_DIR"
echo -e "  ✅ Backend dependencies installed"
echo -e "  ✅ Frontend dependencies installed"
echo ""
echo -e "${YELLOW}💡 Next steps:${NC}"
echo -e "  To start both servers, run:"
echo -e "    ${GREEN}./start_servers.sh${NC} (Unix/Linux/macOS)"
echo -e "    or"
echo -e "    ${GREEN}cd frontend && npm start${NC} (Cross-platform)"
echo ""

