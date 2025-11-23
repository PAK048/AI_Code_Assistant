#!/bin/bash

# ============================================
# Railway Environment - Copy from .env file
# ============================================
# This script reads your .env file and sets
# variables in Railway
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Copy .env to Railway Variables       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not installed${NC}"
    echo "Install with: npm i -g @railway/cli"
    exit 1
fi

# Check if authenticated
if ! railway whoami &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with Railway${NC}"
    echo "Run: railway login"
    exit 1
fi

# Check if linked to project
if ! railway status &> /dev/null; then
    echo -e "${RED}❌ Not linked to a Railway project${NC}"
    echo "Run: railway init --name codeecho-backend"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Railway CLI ready${NC}"
echo -e "${GREEN}✓ .env file found${NC}"
echo ""

echo -e "${YELLOW}This will copy environment variables from .env to Railway${NC}"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi

echo ""
echo -e "${BLUE}Copying variables...${NC}"
echo ""

# Function to set variable from .env
set_from_env() {
    local key=$1
    local value=$(grep "^${key}=" .env | cut -d'=' -f2- | sed 's/^["'\'']//' | sed 's/["'\'']$//')
    
    if [ -n "$value" ]; then
        echo -n "Setting $key... "
        if railway variables set "$key=$value" &> /dev/null; then
            echo -e "${GREEN}✓${NC}"
            return 0
        else
            echo -e "${RED}✗${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⊗ $key not found in .env${NC}"
        return 1
    fi
}

# Required variables
echo -e "${BLUE}Required variables:${NC}"
set_from_env "MONGODB_URI"
set_from_env "QDRANT_URL"
set_from_env "QDRANT_API_KEY"
set_from_env "QDRANT_COLLECTION"
set_from_env "JWT_SECRET"
set_from_env "WATSONX_API_KEY"
set_from_env "WATSONX_URL"
set_from_env "WATSONX_PROJECT_ID"

# Set NODE_ENV to production
echo -n "Setting NODE_ENV... "
if railway variables set "NODE_ENV=production" &> /dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

echo ""
echo -e "${BLUE}Optional variables:${NC}"
set_from_env "WATSONX_GENERATION_MODEL" || true
set_from_env "WATSONX_EMBEDDING_MODEL" || true
set_from_env "GITHUB_TOKEN" || true
set_from_env "GITHUB_OWNER" || true
set_from_env "GITHUB_REPO" || true

echo ""
echo -e "${GREEN}✅ Variables copied!${NC}"
echo ""

echo -e "${BLUE}Verifying variables in Railway:${NC}"
echo ""
railway variables

echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo ""
echo "1. Add FRONTEND_URL after frontend deployment:"
echo "   railway variables set FRONTEND_URL=\"https://your-frontend.vercel.app\""
echo ""
echo "2. Deploy to Railway:"
echo "   ./deploy-railway.sh"
echo ""
echo "3. Verify deployment:"
echo "   ./verify-railway-deployment.sh"
echo ""
