#!/bin/bash

# ============================================
# Railway Environment Variables - Manual Setup
# ============================================
# Use this if the interactive wizard has issues
# Copy these commands and fill in your values
# ============================================

cat << 'EOF'

╔════════════════════════════════════════╗
║  Railway Environment Variables Setup   ║
║  (Manual Commands)                     ║
╚════════════════════════════════════════╝

Copy and paste these commands into your terminal,
replacing the placeholder values with your actual credentials.

═══════════════════════════════════════
  REQUIRED VARIABLES
═══════════════════════════════════════

# 1. MongoDB Connection
railway variables set MONGODB_URI="mongodb+srv://user:password@cluster.mongodb.net/codeecho"

# 2. Qdrant Vector Database
railway variables set QDRANT_URL="https://your-cluster.qdrant.io"
railway variables set QDRANT_API_KEY="your-qdrant-api-key"

# 3. Security
railway variables set JWT_SECRET="$(openssl rand -base64 32)"
railway variables set NODE_ENV="production"

# 4. IBM Watsonx.ai
railway variables set WATSONX_API_KEY="your-ibm-cloud-api-key"
railway variables set WATSONX_URL="https://us-south.ml.cloud.ibm.com"
railway variables set WATSONX_PROJECT_ID="your-watsonx-project-id"

═══════════════════════════════════════
  OPTIONAL VARIABLES
═══════════════════════════════════════

# Qdrant Collection Name (default: Hackathons)
railway variables set QDRANT_COLLECTION="Hackathons"

# Watsonx Models (optional, has defaults)
railway variables set WATSONX_MODEL="meta-llama/llama-3-70b-instruct"
railway variables set WATSONX_EMBEDDING_MODEL="sentence-transformers/all-minilm-l6-v2"

# Frontend URL (add after frontend deployment)
railway variables set FRONTEND_URL="https://your-frontend.vercel.app"

# GitHub Integration (optional)
railway variables set GITHUB_TOKEN="ghp_your_github_token"
railway variables set GITHUB_OWNER="your-github-username"
railway variables set GITHUB_REPO="your-repo-name"

# OpenAI (optional fallback)
railway variables set OPENAI_API_KEY="sk-your-openai-key"

═══════════════════════════════════════
  STEP-BY-STEP INSTRUCTIONS
═══════════════════════════════════════

1. First, ensure Railway CLI is installed and authenticated:
   npm i -g @railway/cli
   railway login

2. Link to or create a Railway project:
   railway init --name codeecho-backend
   # OR link to existing project:
   # railway link

3. Add MongoDB (optional - use Railway plugin):
   railway add
   # Select MongoDB from the list
   # This automatically sets MONGODB_URI

4. Copy the commands above and replace placeholder values

5. Verify variables are set:
   railway variables

6. Deploy:
   ./deploy-railway.sh

═══════════════════════════════════════
  WHERE TO GET CREDENTIALS
═══════════════════════════════════════

MONGODB_URI:
  • Railway MongoDB plugin (automatic)
  • OR MongoDB Atlas: https://www.mongodb.com/cloud/atlas
  • Format: mongodb+srv://user:pass@host/dbname

QDRANT_URL & QDRANT_API_KEY:
  • Qdrant Cloud: https://cloud.qdrant.io
  • Create cluster → Get URL and API key

WATSONX_API_KEY & WATSONX_PROJECT_ID:
  • IBM Cloud: https://cloud.ibm.com
  • Create watsonx.ai service
  • Get API key from IBM Cloud dashboard
  • Get project ID from watsonx.ai project

JWT_SECRET:
  • Auto-generated with: openssl rand -base64 32
  • Should be 32+ characters, random

GITHUB_TOKEN (optional):
  • GitHub Settings → Developer settings
  • Personal access tokens → Generate new token
  • Needs: repo, read:user permissions

OPENAI_API_KEY (optional):
  • OpenAI: https://platform.openai.com/api-keys

═══════════════════════════════════════
  TROUBLESHOOTING
═══════════════════════════════════════

If "railway variables set" fails:

1. Check you're authenticated:
   railway whoami

2. Check you're linked to a project:
   railway status

3. Create/link project first:
   railway init --name codeecho-backend

4. Try setting variables via Railway dashboard:
   railway open
   → Go to Variables tab
   → Add variables manually

5. Verify variables after setting:
   railway variables

═══════════════════════════════════════

For more help, see:
  • RAILWAY_DEPLOYMENT.md
  • RAILWAY_QUICK_START.md
  • https://docs.railway.app

EOF
