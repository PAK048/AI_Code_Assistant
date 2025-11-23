# 🚀 Railway Deployment Checklist

Complete this checklist before and after deployment to ensure everything is configured correctly.

---

## 📋 Pre-Deployment Checklist

### Prerequisites

- [ ] Railway CLI installed (`npm i -g @railway/cli`)
- [ ] Railway account created ([railway.app](https://railway.app))
- [ ] Authenticated with Railway (`railway login`)
- [ ] Git repository pushed to GitHub/GitLab (optional but recommended)

### External Services Setup

- [ ] MongoDB ready (Railway plugin or Atlas)
  - [ ] Connection string obtained
  - [ ] Database created
  - [ ] Network access configured (if Atlas)
- [ ] Qdrant Cloud setup
  - [ ] Cluster created
  - [ ] API key generated
  - [ ] Cluster URL noted
- [ ] IBM Watsonx.ai configured
  - [ ] IBM Cloud account created
  - [ ] Watsonx.ai service provisioned
  - [ ] API key generated
  - [ ] Project ID obtained

### Required Environment Variables

- [ ] `MONGODB_URI` - MongoDB connection string
- [ ] `QDRANT_URL` - Qdrant cluster URL
- [ ] `QDRANT_API_KEY` - Qdrant authentication
- [ ] `JWT_SECRET` - Generated with `openssl rand -base64 32`
- [ ] `NODE_ENV=production` - Environment mode
- [ ] `WATSONX_API_KEY` - IBM Cloud API key
- [ ] `WATSONX_URL` - Watsonx endpoint (usually `https://us-south.ml.cloud.ibm.com`)
- [ ] `WATSONX_PROJECT_ID` - Watsonx project identifier

### Optional Environment Variables

- [ ] `FRONTEND_URL` - Frontend URL (add after frontend deployment)
- [ ] `GITHUB_TOKEN` - GitHub personal access token
- [ ] `GITHUB_OWNER` - GitHub username/org
- [ ] `GITHUB_REPO` - Repository name
- [ ] `OPENAI_API_KEY` - OpenAI API key (fallback)
- [ ] `WATSONX_MODEL` - Custom model name
- [ ] `WATSONX_EMBEDDING_MODEL` - Custom embedding model

### Project Files

- [ ] `Dockerfile` present in project root
- [ ] `railway.json` present in project root
- [ ] `.dockerignore` present in project root
- [ ] `deploy-railway.sh` executable
- [ ] `backend/package.json` present
- [ ] `requirements.txt` present
- [ ] All backend code in `/backend` directory
- [ ] RAG scripts in `/rag` directory
- [ ] Orchestrate configs in `/orchestrate` directory

---

## 🔧 Deployment Checklist

### Initial Setup

- [ ] Run `railway init` or `railway link`
- [ ] Set all required environment variables:
  ```bash
  ./setup-railway-env.sh
  # OR manually:
  railway variables set KEY="value"
  ```
- [ ] Verify variables: `railway variables`

### Deploy

- [ ] Run deployment script: `./deploy-railway.sh`
  - OR manually: `railway up`
- [ ] Wait for build to complete (check logs: `railway logs -f`)
- [ ] Note deployment URL: `railway status`

### Verify Deployment

- [ ] Run verification script: `./verify-railway-deployment.sh`
- [ ] Check health endpoint: `curl https://your-app.railway.app/health`
- [ ] Verify response: `{"status":"healthy","database":"connected"}`
- [ ] Check root endpoint: `curl https://your-app.railway.app/`
- [ ] Review logs for errors: `railway logs`

---

## 📊 Post-Deployment Checklist

### Database Setup

- [ ] MongoDB connection successful (check logs)
- [ ] Collections created automatically
- [ ] Test data operations work

### RAG System

- [ ] Run ingestion script:
  ```bash
  railway run python3 rag/ingest.py
  ```
- [ ] Verify documents indexed in Qdrant
- [ ] Check ingestion logs for errors
- [ ] Test vector search functionality

### API Testing

- [ ] Health endpoint responding: `GET /health`
- [ ] Root endpoint responding: `GET /`
- [ ] Agent endpoints accessible: `GET /api/agents`
- [ ] WebSocket connection works (if testing frontend)

### Frontend Integration

- [ ] Frontend deployed to Vercel/Netlify
- [ ] Backend URL configured in frontend env vars
- [ ] FRONTEND_URL set in Railway:
  ```bash
  railway variables set FRONTEND_URL="https://your-frontend.com"
  railway restart
  ```
- [ ] CORS working (no console errors)
- [ ] WebSocket connections successful

### Security

- [ ] JWT_SECRET is random and secure (32+ characters)
- [ ] All API keys are set as environment variables (not hardcoded)
- [ ] MongoDB credentials secure
- [ ] Qdrant API key configured
- [ ] GitHub tokens have minimal required permissions
- [ ] No sensitive data in logs

### Monitoring

- [ ] Railway logs accessible: `railway logs -f`
- [ ] No critical errors in logs
- [ ] Health checks passing
- [ ] Resource usage acceptable (CPU, memory)
- [ ] Response times good

---

## 🔍 Testing Checklist

### Manual Tests

- [ ] Health check: `curl https://your-app.railway.app/health`
- [ ] Root endpoint: `curl https://your-app.railway.app/`
- [ ] API responds to requests
- [ ] WebSocket connections work (if applicable)
- [ ] File uploads work (if applicable)
- [ ] Code execution works (sandbox)

### Integration Tests

- [ ] Frontend connects to backend
- [ ] Authentication works
- [ ] RAG retrieval returns results
- [ ] Agent execution completes
- [ ] Real-time updates via WebSocket
- [ ] Error handling works

### Performance Tests

- [ ] Response times < 2s for most endpoints
- [ ] Concurrent users supported (if load testing)
- [ ] Memory usage stable
- [ ] No memory leaks
- [ ] Database queries optimized

---

## 📝 Maintenance Checklist

### Regular Checks (Daily)

- [ ] Review logs for errors: `railway logs`
- [ ] Check health endpoint
- [ ] Monitor resource usage
- [ ] Verify database connectivity

### Weekly Tasks

- [ ] Review Railway dashboard metrics
- [ ] Check for dependency updates
- [ ] Monitor disk usage (if applicable)
- [ ] Review error rates

### Monthly Tasks

- [ ] Update dependencies: `npm update`, `pip install --upgrade`
- [ ] Review and optimize database queries
- [ ] Clean up old logs/data
- [ ] Review and update documentation
- [ ] Rotate secrets if necessary

### As Needed

- [ ] Scale resources if needed
- [ ] Update environment variables
- [ ] Redeploy after code changes
- [ ] Backup database
- [ ] Update Railway plan if needed

---

## 🐛 Troubleshooting Checklist

If deployment fails, check:

### Build Issues

- [ ] All dependencies listed in `package.json` and `requirements.txt`
- [ ] Dockerfile syntax correct
- [ ] `.dockerignore` not excluding required files
- [ ] Build logs for specific errors: `railway logs`

### Runtime Issues

- [ ] All environment variables set correctly
- [ ] MongoDB connection string valid
- [ ] Qdrant credentials correct
- [ ] Watsonx.ai API key valid
- [ ] Port configuration correct (Railway sets PORT automatically)

### Connection Issues

- [ ] Backend URL accessible from browser
- [ ] Health endpoint returns 200
- [ ] CORS configured correctly
- [ ] Frontend URL set in FRONTEND_URL variable
- [ ] Firewall/network not blocking requests

### Database Issues

- [ ] MongoDB URI format correct: `mongodb+srv://user:pass@host/db`
- [ ] MongoDB cluster allows Railway IPs
- [ ] Database user has correct permissions
- [ ] Connection logs show successful auth

### RAG Issues

- [ ] Qdrant cluster accessible
- [ ] API key valid and not expired
- [ ] Collection exists in Qdrant
- [ ] Watsonx.ai credentials valid
- [ ] Embedding dimension matches (384)

---

## ✅ Final Verification

Before considering deployment complete:

- [ ] ✅ All required environment variables set
- [ ] ✅ Health endpoint returns "healthy"
- [ ] ✅ Database connection working
- [ ] ✅ RAG ingestion completed successfully
- [ ] ✅ Frontend connected (if applicable)
- [ ] ✅ No errors in logs
- [ ] ✅ Monitoring enabled
- [ ] ✅ Documentation updated
- [ ] ✅ Team notified of deployment
- [ ] ✅ Backup strategy in place

---

## 🎯 Quick Reference

```bash
# Setup environment
./setup-railway-env.sh

# Deploy
./deploy-railway.sh

# Verify
./verify-railway-deployment.sh

# Check status
railway status

# View logs
railway logs -f

# Set variable
railway variables set KEY="value"

# Restart
railway restart

# Open dashboard
railway open
```

---

## 📚 Documentation References

- **Full Guide**: [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)
- **Quick Start**: [RAILWAY_QUICK_START.md](./RAILWAY_QUICK_START.md)
- **Files Summary**: [RAILWAY_FILES_SUMMARY.md](./RAILWAY_FILES_SUMMARY.md)
- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 🆘 Need Help?

If stuck, try:

1. ✅ Review logs: `railway logs -f`
2. ✅ Check this checklist again
3. ✅ Consult [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) troubleshooting section
4. ✅ Railway Discord: [discord.gg/railway](https://discord.gg/railway)
5. ✅ Railway Support: [help.railway.app](https://help.railway.app)

---

**Last Updated**: November 23, 2025  
**Deployment Target**: Railway.app  
**Includes**: Backend, RAG, Python Agents, Orchestrate, Runner, Sandbox  
**Excludes**: Frontend (deploy separately)
