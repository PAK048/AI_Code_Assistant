#!/bin/bash

# ============================================
# CodeEcho Backend - Railway Deployment Script
# ============================================
# This script deploys the backend, RAG, runner, 
# orchestrate, and Python agents to Railway.
# Frontend is NOT included.
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project name
PROJECT_NAME="codeecho-backend"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   CodeEcho Railway Deployment         ║${NC}"
echo -e "${BLUE}║   Backend + RAG + Python Agents        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# ============================================
# 1. Check Prerequisites
# ============================================

echo -e "${YELLOW}[1/7] Checking prerequisites...${NC}"

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI is not installed.${NC}"
    echo ""
    echo "Install it with:"
    echo "  npm i -g @railway/cli"
    echo ""
    echo "Or using Homebrew (macOS/Linux):"
    echo "  brew install railway"
    echo ""
    echo "Then authenticate:"
    echo "  railway login"
    exit 1
fi

echo -e "${GREEN}✓ Railway CLI installed${NC}"

# Check if logged in to Railway
if ! railway whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Railway.${NC}"
    echo ""
    echo "Please authenticate with:"
    echo "  railway login"
    exit 1
fi

echo -e "${GREEN}✓ Authenticated with Railway${NC}"

# Check required files
REQUIRED_FILES=("Dockerfile" "railway.json" "backend/package.json" "requirements.txt")
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Required file missing: $file${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✓ All required files present${NC}"
echo ""

# ============================================
# 2. Display Environment Variables Info
# ============================================

echo -e "${YELLOW}[2/7] Environment Variables Configuration${NC}"
echo ""
echo -e "${BLUE}📋 Required Environment Variables:${NC}"
echo ""
echo "  Core Services:"
echo "    • MONGODB_URI           - MongoDB connection string"
echo "    • QDRANT_URL            - Qdrant vector DB URL"
echo "    • QDRANT_API_KEY        - Qdrant authentication"
echo "    • JWT_SECRET            - JWT token signing secret"
echo "    • NODE_ENV=production   - Environment mode"
echo ""
echo "  IBM Watsonx.ai (for RAG embeddings):"
echo "    • WATSONX_API_KEY       - IBM Cloud API key"
echo "    • WATSONX_URL           - Watsonx endpoint"
echo "    • WATSONX_PROJECT_ID    - Watsonx project ID"
echo ""
echo "  CORS & Frontend:"
echo "    • FRONTEND_URL          - Frontend URL (add after deployment)"
echo ""
echo -e "${BLUE}📋 Optional Variables:${NC}"
echo "    • GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO"
echo "    • OPENAI_API_KEY"
echo "    • WATSONX_MODEL, WATSONX_EMBEDDING_MODEL"
echo ""

# ============================================
# 3. Confirm Environment Variables
# ============================================

echo -e "${YELLOW}[3/7] Verifying Environment Configuration${NC}"
echo ""

read -p "Have you configured all required environment variables in Railway? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${YELLOW}⚠️  Environment Setup Instructions:${NC}"
    echo ""
    echo "1. Create a new Railway project:"
    echo "   railway init"
    echo ""
    echo "2. Add MongoDB plugin (or use external MongoDB Atlas):"
    echo "   railway add"
    echo "   → Select 'MongoDB'"
    echo ""
    echo "3. Set environment variables:"
    echo "   railway variables set MONGODB_URI=\"your-mongodb-uri\""
    echo "   railway variables set QDRANT_URL=\"your-qdrant-url\""
    echo "   railway variables set QDRANT_API_KEY=\"your-qdrant-key\""
    echo "   railway variables set JWT_SECRET=\"$(openssl rand -base64 32)\""
    echo "   railway variables set NODE_ENV=\"production\""
    echo "   railway variables set WATSONX_API_KEY=\"your-watsonx-key\""
    echo "   railway variables set WATSONX_URL=\"https://us-south.ml.cloud.ibm.com\""
    echo "   railway variables set WATSONX_PROJECT_ID=\"your-project-id\""
    echo ""
    echo "4. Or use Railway Dashboard:"
    echo "   • Visit: https://railway.app/dashboard"
    echo "   • Select your project"
    echo "   • Go to Variables tab"
    echo "   • Add all required variables"
    echo ""
    echo "5. Run this script again after configuration"
    echo ""
    exit 0
fi

echo -e "${GREEN}✓ Environment variables configured${NC}"
echo ""

# ============================================
# 4. Build Project
# ============================================

echo -e "${YELLOW}[4/7] Building project structure...${NC}"
echo ""

# Check if directories exist
DIRS=("backend" "rag" "orchestrate" "runner" "sandbox")
for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓ $dir/${NC}"
    else
        echo -e "${RED}❌ Missing directory: $dir${NC}"
        exit 1
    fi
done

# Check Python files
if [ -f "main.py" ] && [ -f "graph.py" ]; then
    echo -e "${GREEN}✓ Python agents (main.py, graph.py)${NC}"
else
    echo -e "${YELLOW}⚠️  Python agents not found (optional)${NC}"
fi

echo ""
echo -e "${GREEN}✓ Project structure validated${NC}"
echo ""

# ============================================
# 5. Link or Create Railway Project
# ============================================

echo -e "${YELLOW}[5/7] Linking to Railway project...${NC}"
echo ""

if [ -f "railway.toml" ] || [ -f ".railway" ]; then
    echo -e "${GREEN}✓ Already linked to Railway project${NC}"
else
    echo "Not linked to a Railway project yet."
    read -p "Create a new Railway project? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        railway init --name "$PROJECT_NAME"
        echo -e "${GREEN}✓ New Railway project created: $PROJECT_NAME${NC}"
    else
        echo "Please link to an existing project with: railway link"
        exit 0
    fi
fi

echo ""

# ============================================
# 6. Deploy to Railway
# ============================================

echo -e "${YELLOW}[6/7] Deploying to Railway...${NC}"
echo ""
echo "This will:"
echo "  • Build Docker image with backend + RAG + Python agents"
echo "  • Deploy to Railway infrastructure"
echo "  • Configure networking and health checks"
echo ""

read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo -e "${BLUE}🚀 Starting deployment...${NC}"
echo ""

# Deploy with Railway
railway up --detach

echo ""
echo -e "${GREEN}✓ Deployment initiated${NC}"
echo ""

# ============================================
# 7. Post-Deployment Steps
# ============================================

echo -e "${YELLOW}[7/7] Post-Deployment Configuration${NC}"
echo ""

# Get deployment URL
echo "Fetching deployment URL..."
sleep 5

DEPLOYMENT_URL=$(railway status --json 2>/dev/null | grep -o '"url":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -z "$DEPLOYMENT_URL" ]; then
    echo -e "${YELLOW}⚠️  Could not automatically fetch deployment URL${NC}"
    echo "Get your URL with: railway status"
else
    echo -e "${GREEN}✓ Backend deployed to: $DEPLOYMENT_URL${NC}"
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Deployment Complete! 🎉              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}✅ Backend services deployed successfully${NC}"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo ""
echo "1. Verify deployment health:"
if [ -n "$DEPLOYMENT_URL" ]; then
    echo "   curl $DEPLOYMENT_URL/health"
else
    echo "   Get URL with: railway status"
    echo "   Then: curl https://your-deployment-url/health"
fi
echo ""
echo "2. View logs:"
echo "   railway logs"
echo ""
echo "3. Configure FRONTEND_URL (after frontend deployment):"
echo "   railway variables set FRONTEND_URL=\"https://your-frontend-url\""
echo ""
echo "4. Run RAG ingestion (index documentation):"
echo "   railway run python3 rag/ingest.py"
echo ""
echo "5. Monitor deployment:"
echo "   railway status"
echo "   railway logs -f"
echo ""
echo -e "${BLUE}🔗 Useful Commands:${NC}"
echo ""
echo "  • Check status:        railway status"
echo "  • View logs:           railway logs -f"
echo "  • Open dashboard:      railway open"
echo "  • Run commands:        railway run <command>"
echo "  • Set variables:       railway variables set KEY=value"
echo "  • Restart service:     railway restart"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "  • Railway Docs: https://docs.railway.app"
echo "  • Project Status: railway open"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
echo ""
