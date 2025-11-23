# CodeEcho Backend - Railway Deployment Guide

> Complete guide for deploying CodeEcho backend, RAG, Python agents, runner, orchestrate, and sandbox to Railway. **Frontend is NOT included** in this deployment.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Post-Deployment](#post-deployment)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

---

## 🎯 Overview

This deployment includes:

- **Backend API** (`/backend`): Node.js/Express server with Socket.IO
- **RAG System** (`/rag`): Python-based vector embeddings and document ingestion
- **Python Agents** (`main.py`, `graph.py`): LangGraph-based AI agents
- **Orchestrate** (`/orchestrate`): Agent configuration and workflows
- **Runner** (`/runner`): Dockerfile for code execution environment
- **Sandbox** (`/sandbox`): Safe file storage and execution

**Excluded**: `/frontend` (deploy separately to Vercel/Netlify)

---

## 🏗️ Architecture

```
Railway Container (Docker)
├── Node.js Backend (Express + Socket.IO)
│   ├── REST API endpoints
│   ├── WebSocket connections
│   └── MongoDB integration
├── Python RAG Services
│   ├── Embedding generation (watsonx.ai)
│   ├── Document ingestion
│   └── Qdrant vector search
├── Python AI Agents
│   ├── LangGraph orchestration
│   └── Code generation/execution
└── Orchestrate & Runner configs
```

**External Services:**

- MongoDB (Railway plugin or Atlas)
- Qdrant Cloud (vector database)
- IBM Watsonx.ai (embeddings & LLM)
- GitHub (optional, for git operations)

---

## ✅ Prerequisites

### 1. Install Railway CLI

```bash
# Using npm
npm i -g @railway/cli

# Or using Homebrew (macOS/Linux)
brew install railway

# Verify installation
railway --version
```

### 2. Authenticate with Railway

```bash
railway login
```

This opens a browser window to authenticate.

### 3. Required Accounts & Services

- **Railway Account**: [railway.app](https://railway.app) (free tier available)
- **MongoDB**: Railway plugin or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- **Qdrant Cloud**: [cloud.qdrant.io](https://cloud.qdrant.io) (free tier available)
- **IBM Cloud**: [cloud.ibm.com](https://cloud.ibm.com) for watsonx.ai
- **GitHub** (optional): For repository integration

---

## 🚀 Quick Start

If you have all prerequisites ready:

```bash
# 1. Navigate to project root
cd /path/to/CodeEcho-main

# 2. Make deploy script executable
chmod +x deploy-railway.sh

# 3. Run deployment
./deploy-railway.sh
```

The script will guide you through:

1. Prerequisites checking
2. Environment variable configuration
3. Project initialization
4. Deployment to Railway

---

## 🔧 Detailed Setup

### Step 1: Create Railway Project

```bash
# Initialize new project
railway init --name codeecho-backend

# Or link to existing project
railway link
```

### Step 2: Add MongoDB

**Option A: Railway Plugin (Recommended)**

```bash
railway add
# Select "MongoDB" from the list
```

Railway automatically sets `MONGODB_URI` environment variable.

**Option B: External MongoDB Atlas**

1. Create cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Get connection string
3. Set manually:
   ```bash
   railway variables set MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/codeecho"
   ```

### Step 3: Setup Qdrant Cloud

1. Create account at [cloud.qdrant.io](https://cloud.qdrant.io)
2. Create a cluster (free tier available)
3. Get cluster URL and API key
4. Set environment variables:
   ```bash
   railway variables set QDRANT_URL="https://your-cluster.qdrant.io"
   railway variables set QDRANT_API_KEY="your-api-key"
   ```

### Step 4: Configure IBM Watsonx.ai

1. Create IBM Cloud account at [cloud.ibm.com](https://cloud.ibm.com)
2. Create watsonx.ai service instance
3. Get API key and project ID
4. Set environment variables:
   ```bash
   railway variables set WATSONX_API_KEY="your-ibm-cloud-api-key"
   railway variables set WATSONX_URL="https://us-south.ml.cloud.ibm.com"
   railway variables set WATSONX_PROJECT_ID="your-project-id"
   ```

---

## 🔐 Environment Variables

### Required Variables

Set these **before** deployment:

```bash
# Database
railway variables set MONGODB_URI="mongodb+srv://..."
railway variables set QDRANT_URL="https://your-cluster.qdrant.io"
railway variables set QDRANT_API_KEY="your-qdrant-key"

# Security
railway variables set JWT_SECRET="$(openssl rand -base64 32)"
railway variables set NODE_ENV="production"

# IBM Watsonx.ai
railway variables set WATSONX_API_KEY="your-key"
railway variables set WATSONX_URL="https://us-south.ml.cloud.ibm.com"
railway variables set WATSONX_PROJECT_ID="your-project-id"
```

### Optional Variables

```bash
# CORS (set after frontend deployment)
railway variables set FRONTEND_URL="https://your-frontend.vercel.app"

# GitHub Integration
railway variables set GITHUB_TOKEN="ghp_..."
railway variables set GITHUB_OWNER="your-username"
railway variables set GITHUB_REPO="your-repo"

# OpenAI (fallback/alternative)
railway variables set OPENAI_API_KEY="sk-..."

# Model Configuration
railway variables set WATSONX_MODEL="meta-llama/llama-3-70b-instruct"
railway variables set WATSONX_EMBEDDING_MODEL="sentence-transformers/all-minilm-l6-v2"
```

### View All Variables

```bash
railway variables
```

---

## 🚢 Deployment

### Automated Deployment (Recommended)

```bash
chmod +x deploy-railway.sh
./deploy-railway.sh
```

### Manual Deployment

```bash
# Deploy to Railway
railway up --detach

# Monitor deployment
railway logs -f
```

### Verify Deployment

```bash
# Check status
railway status

# Test health endpoint
curl https://your-deployment-url.railway.app/health

# Expected response:
# {
#   "status": "healthy",
#   "database": "connected",
#   "timestamp": "2025-11-23T..."
# }
```

---

## 📊 Post-Deployment

### 1. Run RAG Ingestion

Index documentation for retrieval:

```bash
# Run ingestion script
railway run python3 rag/ingest.py

# Or with custom collection
railway run python3 rag/ingest.py --collection my-docs
```

This will:

- Scan `/docs` directory
- Generate embeddings using watsonx.ai
- Upload to Qdrant vector database

### 2. Test API Endpoints

```bash
# Health check
curl https://your-url.railway.app/health

# API status
curl https://your-url.railway.app/

# Test agent endpoint (requires authentication)
curl -X POST https://your-url.railway.app/api/agents/execute \
  -H "Content-Type: application/json" \
  -d '{"task": "test"}'
```

### 3. Configure Frontend

After backend deployment:

1. Get backend URL: `railway status`
2. In your frontend deployment (Vercel/Netlify), set:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   NEXT_PUBLIC_WS_URL=wss://your-backend.railway.app
   ```
3. Update backend FRONTEND_URL:
   ```bash
   railway variables set FRONTEND_URL="https://your-frontend.vercel.app"
   railway restart
   ```

### 4. Setup Monitoring

```bash
# View real-time logs
railway logs -f

# Check resource usage
railway status

# Open Railway dashboard
railway open
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Build Fails - Missing Dependencies

**Problem**: Docker build fails with missing packages

**Solution**:

```bash
# Check Dockerfile includes all dependencies
# Verify requirements.txt is complete
railway logs | grep -i "error"
```

#### 2. MongoDB Connection Error

**Problem**: `MongoServerError: Authentication failed`

**Solution**:

```bash
# Verify MongoDB URI format
railway variables | grep MONGODB_URI

# Test connection
railway run node -e "require('./backend/config/mongodb').connectMongoDB()"
```

#### 3. Qdrant Connection Timeout

**Problem**: RAG ingestion fails with timeout

**Solution**:

```bash
# Check Qdrant URL and API key
railway variables | grep QDRANT

# Verify Qdrant cluster is running
curl -H "api-key: your-key" https://your-cluster.qdrant.io/collections
```

#### 4. Watsonx.ai Authentication Error

**Problem**: `401 Unauthorized` from watsonx.ai

**Solution**:

```bash
# Verify API key and project ID
railway variables | grep WATSONX

# Test token generation
railway run python3 -c "from rag.embedder import get_iam_token, os; print(get_iam_token(os.getenv('WATSONX_API_KEY')))"
```

#### 5. CORS Errors

**Problem**: Frontend can't connect to backend

**Solution**:

```bash
# Set FRONTEND_URL
railway variables set FRONTEND_URL="https://your-frontend.vercel.app"
railway restart

# Verify CORS in logs
railway logs | grep CORS
```

### Debug Commands

```bash
# View all environment variables
railway variables

# Run shell in Railway environment
railway run bash

# Test Python imports
railway run python3 -c "import sys; print(sys.path)"

# Check Node.js modules
railway run npm list

# View recent logs
railway logs --tail 100

# Restart service
railway restart
```

---

## 🔄 Maintenance

### Update Deployment

```bash
# After making code changes
git add .
git commit -m "Update backend"
git push

# Railway auto-deploys from git (if enabled)
# Or manually:
railway up
```

### Scale Resources

```bash
# Open dashboard to adjust resources
railway open

# Go to Settings → Resources
# Adjust:
# - Memory allocation
# - CPU limits
# - Replicas (for load balancing)
```

### Backup Database

```bash
# MongoDB backup (if using Railway plugin)
railway run mongodump --uri="$MONGODB_URI" --out=/tmp/backup

# Qdrant backup (export collection)
railway run python3 -c "
from qdrant_client import QdrantClient
import os
client = QdrantClient(url=os.getenv('QDRANT_URL'), api_key=os.getenv('QDRANT_API_KEY'))
# Implement backup logic
"
```

### View Metrics

```bash
# Railway dashboard shows:
# - Request rate
# - Response times
# - Memory usage
# - CPU usage
# - Build times
railway open
```

### Update Environment Variables

```bash
# Update single variable
railway variables set KEY="new-value"

# Delete variable
railway variables delete KEY

# Restart after changes
railway restart
```

---

## 📚 Additional Resources

### Railway Documentation

- [Railway Docs](https://docs.railway.app)
- [Railway CLI Reference](https://docs.railway.app/develop/cli)
- [Environment Variables](https://docs.railway.app/develop/variables)

### CodeEcho Documentation

- `ARCHITECTURE.md` - System architecture
- `backend/README.deployment.md` - Backend specifics
- `docs/` - API documentation

### External Services

- [MongoDB Atlas](https://www.mongodb.com/docs/atlas/)
- [Qdrant Cloud Docs](https://qdrant.tech/documentation/)
- [IBM Watsonx.ai Docs](https://www.ibm.com/docs/en/watsonx-as-a-service)

---

## 🆘 Support

### Get Help

1. **Check logs first**: `railway logs -f`
2. **Review environment**: `railway variables`
3. **Test health endpoint**: `curl https://your-url/health`
4. **Check Railway status**: [status.railway.app](https://status.railway.app)

### Contact

- Railway Support: [help.railway.app](https://help.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Project Issues: GitHub Issues

---

## 📝 Checklist

Before going to production:

- [ ] All required environment variables set
- [ ] MongoDB connected and tested
- [ ] Qdrant cluster accessible
- [ ] Watsonx.ai authentication working
- [ ] RAG ingestion completed
- [ ] Health endpoint responding
- [ ] Frontend URL configured
- [ ] CORS properly set
- [ ] Logs monitored for errors
- [ ] Backup strategy in place
- [ ] Monitoring enabled
- [ ] Resource limits appropriate

---

## 🎉 Success!

Your CodeEcho backend is now deployed on Railway!

**Next Steps:**

1. Deploy frontend to Vercel/Netlify
2. Connect frontend to backend
3. Test end-to-end functionality
4. Monitor performance and logs
5. Scale as needed

Happy coding! 🚀
