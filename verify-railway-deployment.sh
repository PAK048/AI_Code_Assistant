#!/bin/bash

# ============================================
# Railway Deployment Verification Script
# ============================================
# Tests deployed backend health and connectivity
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
echo -e "${BLUE}║  Railway Deployment Verification      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Get deployment URL
echo -e "${YELLOW}[1/6] Getting deployment URL...${NC}"

if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not installed${NC}"
    echo ""
    echo -e "${BLUE}This script requires Railway CLI to verify your deployment.${NC}"
    echo ""
    echo -e "${YELLOW}To install Railway CLI:${NC}"
    echo ""
    echo -e "  ${CYAN}Option 1 - npm (recommended):${NC}"
    echo "    npm i -g @railway/cli"
    echo ""
    echo -e "  ${CYAN}Option 2 - Homebrew (macOS/Linux):${NC}"
    echo "    brew install railway"
    echo ""
    echo -e "  ${CYAN}Option 3 - Install script:${NC}"
    echo "    bash <(curl -fsSL https://railway.app/install.sh)"
    echo ""
    echo -e "${YELLOW}After installation:${NC}"
    echo "  1. Authenticate: railway login"
    echo "  2. Deploy: ./deploy-railway.sh"
    echo "  3. Run this script again: ./verify-railway-deployment.sh"
    echo ""
    echo -e "${BLUE}Or manually verify deployment:${NC}"
    echo "  curl https://your-railway-url.railway.app/health"
    echo ""
    exit 1
fi

# Try to get URL from Railway
DEPLOY_URL=$(railway status --json 2>/dev/null | grep -o '"url":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -z "$DEPLOY_URL" ]; then
    echo -e "${YELLOW}⚠️  Could not auto-detect URL${NC}"
    read -p "Enter your Railway deployment URL: " DEPLOY_URL
fi

# Remove trailing slash
DEPLOY_URL=${DEPLOY_URL%/}

echo -e "${GREEN}✓ Using URL: $DEPLOY_URL${NC}"
echo ""

# Test 1: Health endpoint
echo -e "${YELLOW}[2/6] Testing health endpoint...${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL/health" || echo "000")

if [ "$response" = "200" ]; then
    echo -e "${GREEN}✓ Health check passed (HTTP $response)${NC}"
    health_data=$(curl -s "$DEPLOY_URL/health")
    echo -e "  Response: $health_data"
else
    echo -e "${RED}❌ Health check failed (HTTP $response)${NC}"
    echo -e "${YELLOW}  Check logs: railway logs${NC}"
fi
echo ""

# Test 2: Root endpoint
echo -e "${YELLOW}[3/6] Testing root endpoint...${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL/" || echo "000")

if [ "$response" = "200" ]; then
    echo -e "${GREEN}✓ Root endpoint accessible (HTTP $response)${NC}"
    root_data=$(curl -s "$DEPLOY_URL/")
    echo -e "  Response: $root_data"
else
    echo -e "${RED}❌ Root endpoint failed (HTTP $response)${NC}"
fi
echo ""

# Test 3: Database connection
echo -e "${YELLOW}[4/6] Checking database connection...${NC}"
health_response=$(curl -s "$DEPLOY_URL/health")

if echo "$health_response" | grep -q "connected"; then
    echo -e "${GREEN}✓ Database connected${NC}"
else
    echo -e "${RED}❌ Database connection issue${NC}"
    echo -e "${YELLOW}  Check MONGODB_URI variable${NC}"
fi
echo ""

# Test 4: Environment variables
echo -e "${YELLOW}[5/6] Verifying environment variables...${NC}"

required_vars=(
    "MONGODB_URI"
    "QDRANT_URL"
    "QDRANT_API_KEY"
    "JWT_SECRET"
    "NODE_ENV"
    "WATSONX_API_KEY"
    "WATSONX_URL"
    "WATSONX_PROJECT_ID"
)

missing_vars=()

for var in "${required_vars[@]}"; do
    if railway variables get "$var" &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} $var"
    else
        echo -e "  ${RED}✗${NC} $var"
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ All required variables set${NC}"
else
    echo -e "${RED}❌ Missing variables: ${missing_vars[*]}${NC}"
fi
echo ""

# Test 5: CORS configuration
echo -e "${YELLOW}[6/6] Checking CORS configuration...${NC}"

frontend_url=$(railway variables get FRONTEND_URL 2>/dev/null || echo "")

if [ -n "$frontend_url" ]; then
    echo -e "${GREEN}✓ FRONTEND_URL configured: $frontend_url${NC}"
else
    echo -e "${YELLOW}⚠️  FRONTEND_URL not set${NC}"
    echo -e "  Set it after frontend deployment:"
    echo -e "  railway variables set FRONTEND_URL=\"https://your-frontend.com\""
fi
echo ""

# Summary
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}  Verification Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

# Count checks
total_checks=6
passed_checks=0

if [ "$response" = "200" ]; then ((passed_checks++)); fi
if echo "$health_response" | grep -q "connected"; then ((passed_checks++)); fi
if [ ${#missing_vars[@]} -eq 0 ]; then ((passed_checks++)); fi

echo -e "Deployment URL: ${CYAN}$DEPLOY_URL${NC}"
echo -e "Health Status: $([ "$response" = "200" ] && echo -e "${GREEN}Healthy${NC}" || echo -e "${RED}Unhealthy${NC}")"
echo -e "Database: $(echo "$health_response" | grep -q "connected" && echo -e "${GREEN}Connected${NC}" || echo -e "${RED}Disconnected${NC}")"
echo -e "Environment: $([ ${#missing_vars[@]} -eq 0 ] && echo -e "${GREEN}Complete${NC}" || echo -e "${RED}Incomplete${NC}")"
echo ""

# Next steps
echo -e "${BLUE}📝 Next Steps:${NC}"
echo ""

if [ "$response" != "200" ]; then
    echo "1. ${RED}Fix health check issues:${NC}"
    echo "   railway logs -f"
    echo ""
fi

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo "2. ${RED}Set missing environment variables:${NC}"
    for var in "${missing_vars[@]}"; do
        echo "   railway variables set $var=\"value\""
    done
    echo ""
fi

if [ -z "$frontend_url" ]; then
    echo "3. ${YELLOW}Configure FRONTEND_URL (after frontend deployment):${NC}"
    echo "   railway variables set FRONTEND_URL=\"https://your-frontend.com\""
    echo "   railway restart"
    echo ""
fi

echo "4. ${BLUE}Run RAG ingestion:${NC}"
echo "   railway run python3 rag/ingest.py"
echo ""

echo "5. ${BLUE}Monitor deployment:${NC}"
echo "   railway logs -f"
echo ""

echo "6. ${BLUE}View dashboard:${NC}"
echo "   railway open"
echo ""

# Final status
if [ "$response" = "200" ] && [ ${#missing_vars[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment verification passed!${NC}"
    echo -e "${GREEN}Your backend is ready to use! 🚀${NC}"
else
    echo -e "${YELLOW}⚠️  Some issues detected.${NC}"
    echo -e "${YELLOW}Follow the steps above to resolve them.${NC}"
fi

echo ""
