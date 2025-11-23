#!/bin/bash

# ============================================
# Railway Prerequisites Checker
# ============================================
# Checks if all required tools are installed
# before attempting deployment
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Railway Prerequisites Checker        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

MISSING_TOOLS=()
ALL_OK=true

# Check Node.js
echo -e "${YELLOW}Checking Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js installed: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js not found${NC}"
    MISSING_TOOLS+=("Node.js")
    ALL_OK=false
fi
echo ""

# Check npm
echo -e "${YELLOW}Checking npm...${NC}"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm installed: $NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm not found${NC}"
    MISSING_TOOLS+=("npm")
    ALL_OK=false
fi
echo ""

# Check Python
echo -e "${YELLOW}Checking Python...${NC}"
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✓ Python installed: $PYTHON_VERSION${NC}"
else
    echo -e "${RED}✗ Python 3 not found${NC}"
    MISSING_TOOLS+=("Python 3")
    ALL_OK=false
fi
echo ""

# Check Railway CLI
echo -e "${YELLOW}Checking Railway CLI...${NC}"
if command -v railway &> /dev/null; then
    RAILWAY_VERSION=$(railway --version 2>&1 || echo "installed")
    echo -e "${GREEN}✓ Railway CLI installed: $RAILWAY_VERSION${NC}"
    
    # Check if authenticated
    if railway whoami &> /dev/null; then
        RAILWAY_USER=$(railway whoami 2>&1 || echo "authenticated")
        echo -e "${GREEN}✓ Authenticated with Railway${NC}"
    else
        echo -e "${YELLOW}⚠️  Railway CLI installed but not authenticated${NC}"
        echo -e "   Run: ${CYAN}railway login${NC}"
        ALL_OK=false
    fi
else
    echo -e "${RED}✗ Railway CLI not found${NC}"
    MISSING_TOOLS+=("Railway CLI")
    ALL_OK=false
fi
echo ""

# Check Git (optional but recommended)
echo -e "${YELLOW}Checking Git...${NC}"
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version)
    echo -e "${GREEN}✓ Git installed: $GIT_VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  Git not found (optional but recommended)${NC}"
fi
echo ""

# Check curl
echo -e "${YELLOW}Checking curl...${NC}"
if command -v curl &> /dev/null; then
    echo -e "${GREEN}✓ curl installed${NC}"
else
    echo -e "${YELLOW}⚠️  curl not found (needed for health checks)${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}  Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

if [ "$ALL_OK" = true ]; then
    echo -e "${GREEN}✅ All prerequisites met!${NC}"
    echo ""
    echo -e "${BLUE}You're ready to deploy!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Setup environment: ./setup-railway-env.sh"
    echo "  2. Deploy: ./deploy-railway.sh"
    echo "  3. Verify: ./verify-railway-deployment.sh"
    echo ""
else
    echo -e "${RED}❌ Some prerequisites are missing${NC}"
    echo ""
    echo -e "${YELLOW}Missing tools:${NC}"
    for tool in "${MISSING_TOOLS[@]}"; do
        echo "  • $tool"
    done
    echo ""
    echo -e "${BLUE}Installation Instructions:${NC}"
    echo ""
    
    if [[ " ${MISSING_TOOLS[@]} " =~ " Node.js " ]] || [[ " ${MISSING_TOOLS[@]} " =~ " npm " ]]; then
        echo -e "${CYAN}Node.js & npm:${NC}"
        echo "  • Ubuntu/Debian: sudo apt install nodejs npm"
        echo "  • macOS: brew install node"
        echo "  • Windows: Download from https://nodejs.org"
        echo "  • Or use nvm: https://github.com/nvm-sh/nvm"
        echo ""
    fi
    
    if [[ " ${MISSING_TOOLS[@]} " =~ " Python 3 " ]]; then
        echo -e "${CYAN}Python 3:${NC}"
        echo "  • Ubuntu/Debian: sudo apt install python3 python3-pip"
        echo "  • macOS: brew install python3"
        echo "  • Windows: Download from https://python.org"
        echo ""
    fi
    
    if [[ " ${MISSING_TOOLS[@]} " =~ " Railway CLI " ]]; then
        echo -e "${CYAN}Railway CLI:${NC}"
        echo ""
        echo "  Option 1 - npm (recommended):"
        echo "    npm i -g @railway/cli"
        echo ""
        echo "  Option 2 - Homebrew (macOS/Linux):"
        echo "    brew install railway"
        echo ""
        echo "  Option 3 - Install script:"
        echo "    bash <(curl -fsSL https://railway.app/install.sh)"
        echo ""
        echo "  After installation, authenticate:"
        echo "    railway login"
        echo ""
    fi
fi

echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

exit $([ "$ALL_OK" = true ] && echo 0 || echo 1)
