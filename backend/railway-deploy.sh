#!/bin/bash

# Railway Deployment Script for CodeEcho Backend
# This script helps automate the deployment process to Railway

set -e

echo "🚂 CodeEcho Backend - Railway Deployment Script"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI is not installed${NC}"
    echo "Install it with: npm i -g @railway/cli"
    echo "Or: curl -fsSL https://railway.app/install.sh | sh"
    exit 1
fi

echo -e "${GREEN}✓ Railway CLI found${NC}"

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}⚠ Not logged in to Railway${NC}"
    echo "Please login with: railway login"
    exit 1
fi

echo -e "${GREEN}✓ Authenticated with Railway${NC}"

# Check if in Railway project
if ! railway status &> /dev/null; then
    echo -e "${YELLOW}⚠ No Railway project linked${NC}"
    echo "Do you want to:"
    echo "1) Link to existing project"
    echo "2) Create new project"
    read -p "Enter choice (1 or 2): " choice
    
    if [ "$choice" == "1" ]; then
        railway link
    elif [ "$choice" == "2" ]; then
        railway init
    else
        echo -e "${RED}Invalid choice${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Railway project linked${NC}"

# Display current project info
echo ""
echo "Current Project Info:"
railway status

echo ""
echo "📋 Pre-deployment Checklist:"
echo "=============================="

# Check for required environment variables
echo "Checking environment variables..."

REQUIRED_VARS=(
    "MONGODB_URI"
    "JWT_SECRET"
    "WATSONX_API_KEY"
    "WATSONX_PROJECT_ID"
    "QDRANT_URL"
    "QDRANT_API_KEY"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if railway variables get "$var" &> /dev/null; then
        echo -e "${GREEN}✓ $var is set${NC}"
    else
        echo -e "${RED}✗ $var is missing${NC}"
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠ Missing environment variables:${NC}"
    printf '%s\n' "${MISSING_VARS[@]}"
    echo ""
    echo "Set them using: railway variables set KEY=value"
    read -p "Continue anyway? (y/n): " continue_deploy
    if [ "$continue_deploy" != "y" ]; then
        exit 1
    fi
fi

# Check Node version in package.json
echo ""
echo "Checking package.json configuration..."
if [ -f "package.json" ]; then
    echo -e "${GREEN}✓ package.json found${NC}"
else
    echo -e "${RED}✗ package.json not found${NC}"
    exit 1
fi

# Show current railway.toml config
if [ -f "railway.toml" ]; then
    echo -e "${GREEN}✓ railway.toml found${NC}"
else
    echo -e "${YELLOW}⚠ railway.toml not found (optional)${NC}"
fi

echo ""
echo "🚀 Ready to Deploy"
echo "=================="
read -p "Deploy to Railway? (y/n): " deploy_confirm

if [ "$deploy_confirm" != "y" ]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "Deploying to Railway..."

# Deploy using Railway CLI
railway up

echo ""
echo -e "${GREEN}✓ Deployment initiated${NC}"
echo ""
echo "📊 Monitoring deployment..."
echo "Use 'railway logs' to view logs"
echo "Use 'railway open' to open in browser"
echo ""

# Wait a bit and check logs
sleep 5
echo "Recent logs:"
railway logs --lines 20

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo "Useful commands:"
echo "  railway logs          - View application logs"
echo "  railway open          - Open project dashboard"
echo "  railway status        - Check project status"
echo "  railway domain        - Manage custom domains"
echo "  railway variables     - Manage environment variables"
echo ""
