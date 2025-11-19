#!/bin/bash

# Nikos Messenger Call System - Installation Script
# This script helps set up the call system

echo "=========================================="
echo "Nikos Messenger Call System - Setup"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo -e "${YELLOW}Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    echo "   Visit: https://nodejs.org/"
    exit 1
else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js is installed: $NODE_VERSION${NC}"
fi

# Check if npm is installed
echo -e "${YELLOW}Checking npm installation...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
else
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm is installed: $NPM_VERSION${NC}"
fi

# Check if MySQL is installed
echo -e "${YELLOW}Checking MySQL installation...${NC}"
if ! command -v mysql &> /dev/null; then
    echo -e "${YELLOW}⚠ MySQL client not found. Please ensure MySQL is installed.${NC}"
else
    echo -e "${GREEN}✓ MySQL is installed${NC}"
fi

# Install Node.js dependencies
echo ""
echo -e "${YELLOW}Installing Node.js dependencies...${NC}"
if npm install; then
    echo -e "${GREEN}✓ Dependencies installed successfully${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

# Check if package-lock.json was created
if [ -f "package-lock.json" ]; then
    echo -e "${GREEN}✓ package-lock.json created${NC}"
fi

# Database setup instructions
echo ""
echo -e "${YELLOW}=========================================="
echo "Database Setup"
echo "==========================================${NC}"
echo ""
echo "To set up the database, run the following command:"
echo -e "${GREEN}mysql -u root -p < database.sql${NC}"
echo ""
echo "Or manually:"
echo "1. Log in to MySQL: mysql -u root -p"
echo "2. Run: source database.sql"
echo ""

# Configuration instructions
echo -e "${YELLOW}=========================================="
echo "Configuration"
echo "==========================================${NC}"
echo ""
echo "Edit config.php with your database credentials:"
echo -e "${GREEN}nano config.php${NC}"
echo ""
echo "Update the following settings:"
echo "  - DB_HOST (default: localhost)"
echo "  - DB_USER (default: root)"
echo "  - DB_PASS (your password)"
echo "  - DB_NAME (default: nikos_messenger)"
echo ""

# Server start instructions
echo -e "${YELLOW}=========================================="
echo "Starting the Server"
echo "==========================================${NC}"
echo ""
echo "To start the Socket.IO server:"
echo -e "${GREEN}npm start${NC}"
echo ""
echo "Or for development with auto-reload:"
echo -e "${GREEN}npm run dev${NC}"
echo ""
echo "The server will run on: http://localhost:3000"
echo ""

# Testing instructions
echo -e "${YELLOW}=========================================="
echo "Testing"
echo "==========================================${NC}"
echo ""
echo "After starting the server, test it with:"
echo -e "${GREEN}curl http://localhost:3000/health${NC}"
echo ""
echo "You should see a JSON response with server status."
echo ""

# Access instructions
echo -e "${YELLOW}=========================================="
echo "Accessing the Application"
echo "==========================================${NC}"
echo ""
echo "1. Start your web server (Apache/Nginx)"
echo "2. Access the demo page: http://localhost/demo.html"
echo "3. Access the call page: http://localhost/calls.php"
echo "4. Access the chat: http://localhost/index.html"
echo ""

echo -e "${GREEN}=========================================="
echo "✓ Setup Complete!"
echo "==========================================${NC}"
echo ""
echo "For more information, see README.md"
echo ""
