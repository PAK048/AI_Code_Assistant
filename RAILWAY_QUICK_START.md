# 🚀 CodeEcho Railway Deployment - Quick Reference

> Ultra-fast deployment guide. For detailed instructions, see [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)

## ⚡ 30-Second Setup

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Authenticate
railway login

# 3. Deploy
chmod +x deploy-railway.sh && ./deploy-railway.sh
```

## 📋 Pre-Flight Checklist

Before running `deploy-railway.sh`, have these ready:

- [ ] MongoDB connection string (Atlas or Railway plugin)
- [ ] Qdrant Cloud URL + API key
- [ ] IBM Watsonx.ai API key + Project ID
- [ ] JWT secret (generate with `openssl rand -base64 32`)

## 🔑 Essential Environment Variables

```bash
# Required (set before first deployment)
railway variables set MONGODB_URI="mongodb+srv://..."
railway variables set QDRANT_URL="https://xyz.qdrant.io"
railway variables set QDRANT_API_KEY="abc123..."
railway variables set WATSONX_API_KEY="your-ibm-key"
railway variables set WATSONX_URL="https://us-south.ml.cloud.ibm.com"
railway variables set WATSONX_PROJECT_ID="your-project-id"
railway variables set JWT_SECRET="$(openssl rand -base64 32)"
railway variables set NODE_ENV="production"
```

```bash
# Add after frontend deployment
railway variables set FRONTEND_URL="https://your-frontend.vercel.app"
railway restart
```

## 🏗️ What Gets Deployed

```
Railway Container
├─ /backend      → Node.js API (Express + Socket.IO)
├─ /rag          → Python RAG (embeddings, ingestion)
├─ /orchestrate  → Agent configs (agents.yaml)
├─ /runner       → Docker execution environment
├─ /sandbox      → Safe file storage
├─ main.py       → Python voice agent (legacy)
└─ graph.py      → LangGraph definitions
```

**NOT INCLUDED**: `/frontend` (deploy separately to Vercel)

## 📦 Project Structure

```
CodeEcho-main/
├── Dockerfile                 ✓ Backend + Python multi-stage
├── railway.json               ✓ Railway configuration
├── .dockerignore             ✓ Excludes frontend
├── .env.railway.template     ✓ Environment template
├── deploy-railway.sh         ✓ Automated deployment
├── RAILWAY_DEPLOYMENT.md     ✓ Detailed guide
├── backend/                  ✓ Node.js API
├── rag/                      ✓ Python RAG scripts
├── orchestrate/              ✓ Agent configs
├── runner/                   ✓ Docker configs
├── sandbox/                  ✓ Safe execution
├── main.py, graph.py         ✓ Python agents
└── frontend/                 ✗ EXCLUDED
```

## 🎯 Deployment Commands

### First Time

```bash
# Initialize and deploy
./deploy-railway.sh
```

### Updates

```bash
# Quick redeploy after code changes
railway up

# Or with detached mode
railway up --detach
```

### Monitoring

```bash
# Real-time logs
railway logs -f

# Check status
railway status

# Open dashboard
railway open
```

## 🔧 Post-Deployment Tasks

### 1. Run RAG Ingestion (Index Documentation)

```bash
railway run python3 rag/ingest.py
```

### 2. Test Health

```bash
# Get your URL
railway status

# Test endpoint
curl https://your-app.railway.app/health
```

### 3. Connect Frontend

In your frontend deployment (Vercel/Netlify):

```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXT_PUBLIC_WS_URL=wss://your-backend.railway.app
```

Then update backend:

```bash
railway variables set FRONTEND_URL="https://your-frontend.vercel.app"
railway restart
```

## 🐛 Common Fixes

### Build Fails

```bash
railway logs | grep -i "error"
railway restart
```

### MongoDB Connection Error

```bash
# Check URI format
railway variables | grep MONGODB_URI

# Should be: mongodb+srv://user:pass@host/dbname
```

### CORS Issues

```bash
railway variables set FRONTEND_URL="https://your-frontend.com"
railway restart
```

### Watsonx.ai Errors

```bash
# Verify credentials
railway variables | grep WATSONX

# Test authentication
railway run python3 -c "from rag.embedder import get_iam_token; import os; print(get_iam_token(os.getenv('WATSONX_API_KEY')))"
```

## 🔗 Quick Links

| Resource          | Link                                                           |
| ----------------- | -------------------------------------------------------------- |
| Railway Dashboard | [railway.app/dashboard](https://railway.app/dashboard)         |
| MongoDB Atlas     | [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) |
| Qdrant Cloud      | [cloud.qdrant.io](https://cloud.qdrant.io)                     |
| IBM Cloud         | [cloud.ibm.com](https://cloud.ibm.com)                         |
| Railway Docs      | [docs.railway.app](https://docs.railway.app)                   |
| Full Guide        | [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)               |

## 🚦 Status Codes

| Endpoint          | Expected Response                                             |
| ----------------- | ------------------------------------------------------------- |
| `GET /`           | `{"status":"ok","message":"CodeEcho Backend API is running"}` |
| `GET /health`     | `{"status":"healthy","database":"connected"}`                 |
| `GET /api/agents` | `[...]` (list of agents)                                      |

## 💡 Pro Tips

1. **Auto-Deploy**: Connect Railway to GitHub for automatic deployments
2. **Logs**: Always check logs first: `railway logs -f`
3. **Variables**: Use Railway dashboard for easier variable management
4. **Plugins**: Use Railway MongoDB plugin instead of external Atlas
5. **Monitoring**: Enable Railway metrics in dashboard
6. **Backups**: Set up periodic MongoDB backups
7. **Scaling**: Upgrade Railway plan for production loads

## 🎓 Learn More

- **Detailed Guide**: [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)
- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **API Docs**: [docs/api-reference.md](./docs/api-reference.md)
- **Backend Details**: [backend/README.deployment.md](./backend/README.deployment.md)

## 🆘 Need Help?

1. Check [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) troubleshooting section
2. View logs: `railway logs -f`
3. Railway Discord: [discord.gg/railway](https://discord.gg/railway)
4. Railway Support: [help.railway.app](https://help.railway.app)

---

**Ready to deploy?** Run: `./deploy-railway.sh` 🚀
