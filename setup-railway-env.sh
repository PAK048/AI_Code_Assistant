#!/bin/bash

# ============================================
# Railway Environment Variables Setup Helper
# ============================================
# This script helps you set all required 
# environment variables for Railway deployment
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Railway Environment Setup Helper      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI is not installed.${NC}"
    echo ""
    echo "Install it with:"
    echo "  npm i -g @railway/cli"
    echo ""
    echo "Or using Homebrew:"
    echo "  brew install railway"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Railway.${NC}"
    echo ""
    echo "Please authenticate with:"
    echo "  railway login"
    exit 1
fi

echo -e "${GREEN}✓ Railway CLI ready${NC}"
echo ""

# Function to set variable
set_var() {
    local key=$1
    local description=$2
    local required=$3
    local default_value=$4
    local is_secret=$5
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}$key${NC}"
    echo -e "  $description"
    
    if [ -n "$default_value" ]; then
        echo -e "  ${BLUE}Default:${NC} $default_value"
    fi
    
    if [ "$required" = "true" ]; then
        echo -e "  ${RED}[REQUIRED]${NC}"
    else
        echo -e "  ${GREEN}[Optional]${NC}"
    fi
    echo ""
    
    # Check if already set
    existing=$(railway variables get "$key" 2>/dev/null || echo "")
    if [ -n "$existing" ]; then
        echo -e "  ${GREEN}Current value:${NC} ${existing}"
        read -p "  Update? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return
        fi
    fi
    
    # Get new value
    if [ "$is_secret" = "true" ]; then
        echo -n "  Enter value (input hidden): "
        read -s value
        echo
        if [ -z "$value" ]; then
            echo -n "  Enter value (input will be visible): "
            read value
        fi
    else
        if [ -n "$default_value" ]; then
            read -p "  Enter value (or press Enter for default): " value
            value=${value:-$default_value}
        else
            read -p "  Enter value: " value
        fi
    fi
    
    # Skip if empty and optional
    if [ -z "$value" ] && [ "$required" != "true" ]; then
        echo -e "  ${YELLOW}Skipped${NC}"
        return
    fi
    
    # Validate required
    if [ -z "$value" ] && [ "$required" = "true" ]; then
        echo -e "  ${RED}Value required!${NC}"
        return 1
    fi
    
    # Set variable
    if railway variables set "$key=$value" &> /dev/null; then
        echo -e "  ${GREEN}✓ Set successfully${NC}"
    else
        echo -e "  ${RED}❌ Failed to set${NC}"
    fi
}

echo -e "${BLUE}This wizard will help you configure all environment variables.${NC}"
echo -e "${BLUE}Press Ctrl+C to cancel at any time.${NC}"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}  DATABASE CONFIGURATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

set_var "MONGODB_URI" \
    "MongoDB connection string (from Atlas or Railway plugin)" \
    "true" \
    "" \
    "true"

echo ""

set_var "QDRANT_URL" \
    "Qdrant Cloud cluster URL" \
    "true" \
    "https://your-cluster.qdrant.io" \
    "false"

echo ""

set_var "QDRANT_API_KEY" \
    "Qdrant API key for authentication" \
    "true" \
    "" \
    "true"

echo ""

set_var "QDRANT_COLLECTION" \
    "Qdrant collection name" \
    "false" \
    "Hackathons" \
    "false"

echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}  SECURITY${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

# Generate JWT secret if not set
jwt_secret=$(railway variables get JWT_SECRET 2>/dev/null || echo "")
if [ -z "$jwt_secret" ]; then
    echo -e "${YELLOW}JWT_SECRET${NC}"
    echo "  Secret key for JWT token signing"
    echo -e "  ${RED}[REQUIRED]${NC}"
    echo ""
    generated_secret=$(openssl rand -base64 32)
    echo "  Generated secure secret:"
    echo -e "  ${GREEN}$generated_secret${NC}"
    echo ""
    read -p "  Use this generated secret? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        railway variables set "JWT_SECRET=$generated_secret" &> /dev/null
        echo -e "  ${GREEN}✓ Set successfully${NC}"
    else
        set_var "JWT_SECRET" \
            "Custom JWT secret" \
            "true" \
            "" \
            "true"
    fi
else
    echo -e "${GREEN}✓ JWT_SECRET already set${NC}"
fi

echo ""

set_var "NODE_ENV" \
    "Node.js environment mode" \
    "true" \
    "production" \
    "false"

echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}  IBM WATSONX.AI${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

set_var "WATSONX_API_KEY" \
    "IBM Cloud API key for watsonx.ai" \
    "true" \
    "" \
    "true"

echo ""

set_var "WATSONX_URL" \
    "Watsonx.ai endpoint URL" \
    "true" \
    "https://us-south.ml.cloud.ibm.com" \
    "false"

echo ""

set_var "WATSONX_PROJECT_ID" \
    "Watsonx.ai project ID" \
    "true" \
    "" \
    "false"

echo ""

set_var "WATSONX_MODEL" \
    "Watsonx.ai text generation model" \
    "false" \
    "meta-llama/llama-3-70b-instruct" \
    "false"

echo ""

set_var "WATSONX_EMBEDDING_MODEL" \
    "Watsonx.ai embedding model" \
    "false" \
    "sentence-transformers/all-minilm-l6-v2" \
    "false"

echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}  FRONTEND (Optional - add after deployment)${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

set_var "FRONTEND_URL" \
    "Frontend URL for CORS configuration" \
    "false" \
    "" \
    "false"

echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}  GITHUB INTEGRATION (Optional)${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

set_var "GITHUB_TOKEN" \
    "GitHub Personal Access Token" \
    "false" \
    "" \
    "true"

echo ""

set_var "GITHUB_OWNER" \
    "GitHub repository owner username" \
    "false" \
    "" \
    "false"

echo ""

set_var "GITHUB_REPO" \
    "GitHub repository name" \
    "false" \
    "" \
    "false"

echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}  OPENAI (Optional - for fallback)${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

set_var "OPENAI_API_KEY" \
    "OpenAI API key for additional features" \
    "false" \
    "" \
    "true"

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}✅ Environment configuration complete!${NC}"
echo ""
echo -e "${BLUE}📋 Summary of configured variables:${NC}"
echo ""
railway variables
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo ""
echo "1. Review variables above"
echo "2. Run deployment script:"
echo "   ./deploy-railway.sh"
echo ""
echo "3. After deployment, add FRONTEND_URL:"
echo "   railway variables set FRONTEND_URL=\"https://your-frontend.com\""
echo "   railway restart"
echo ""
echo -e "${GREEN}Ready to deploy! 🚀${NC}"
echo ""
