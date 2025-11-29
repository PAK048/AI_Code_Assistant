# Railway Deployment Guide - CodeEcho Backend

This guide walks you through deploying the CodeEcho backend to Railway.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Railway CLI**: Install the Railway CLI
   ```bash
   npm i -g @railway/cli
   # OR
   curl -fsSL https://railway.app/install.sh | sh
   ```
3. **Git Repository**: Your code should be in a Git repository

## Quick Start

### Option 1: Using the Deployment Script (Recommended)

1. Make the script executable:

   ```bash
   chmod +x railway-deploy.sh
   ```

2. Run the deployment script:
   ```bash
   ./railway-deploy.sh
   ```

The script will guide you through the deployment process and check for required configurations.

### Option 2: Manual Deployment

1. **Login to Railway**:

   ```bash
   railway login
   ```

2. **Initialize/Link Project**:

   For a new project:

   ```bash
   railway init
   ```

   For an existing project:

   ```bash
   railway link
   ```

3. **Set Environment Variables**:

   ```bash
   railway variables set MONGODB_URI="your_mongodb_uri"
   railway variables set JWT_SECRET="your_jwt_secret"
   railway variables set WATSONX_API_KEY="your_watsonx_api_key"
   railway variables set WATSONX_PROJECT_ID="your_project_id"
   railway variables set QDRANT_URL="your_qdrant_url"
   railway variables set QDRANT_API_KEY="your_qdrant_api_key"
   railway variables set FRONTEND_URL="your_frontend_url"
   railway variables set NODE_ENV="production"
   ```

4. **Deploy**:
   ```bash
   railway up
   ```

## Required Environment Variables

| Variable             | Description                          | Example                                              |
| -------------------- | ------------------------------------ | ---------------------------------------------------- |
| `MONGODB_URI`        | MongoDB connection string            | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` |
| `JWT_SECRET`         | Secret key for JWT tokens            | `your-secret-key-here`                               |
| `WATSONX_API_KEY`    | IBM Watson API key                   | `your-api-key`                                       |
| `WATSONX_PROJECT_ID` | IBM Watson project ID                | `your-project-id`                                    |
| `QDRANT_URL`         | Qdrant vector database URL           | `https://your-cluster.qdrant.io`                     |
| `QDRANT_API_KEY`     | Qdrant API key                       | `your-qdrant-key`                                    |
| `FRONTEND_URL`       | Frontend application URL             | `https://your-frontend.vercel.app`                   |
| `NODE_ENV`           | Environment (production/development) | `production`                                         |
| `PORT`               | Server port (auto-set by Railway)    | `5000`                                               |

## Optional Environment Variables

| Variable         | Description                      | Default |
| ---------------- | -------------------------------- | ------- |
| `OPENAI_API_KEY` | OpenAI API key (if using OpenAI) | -       |
| `OPENAI_MODEL`   | OpenAI model to use              | `gpt-4` |
| `LOG_LEVEL`      | Logging level                    | `info`  |

## Configuration Files

### `railway.toml`

Main configuration file for Railway deployment. Specifies build and deployment settings.

### `nixpacks.toml`

Configures the build process, including Node.js and Python dependencies.

### `railway.json`

Alternative configuration format (project root level).

## Deployment from GitHub

1. **Connect Repository**:

   - Go to Railway dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Select the `backend` directory as the root

2. **Configure Service**:

   - Set root directory to `/backend`
   - Railway will auto-detect Node.js
   - Add environment variables in the dashboard

3. **Deploy**:
   - Railway will automatically deploy on push to main branch
   - View logs in the Railway dashboard

## Useful Commands

```bash
# View logs
railway logs

# Open Railway dashboard
railway open

# Check deployment status
railway status

# Run commands in Railway environment
railway run node index.js

# Manage domains
railway domain

# List environment variables
railway variables

# Delete a variable
railway variables delete VARIABLE_NAME
```

## MongoDB Setup on Railway

If you don't have MongoDB, you can add it directly in Railway:

1. In your project, click "New Service"
2. Select "Database" → "MongoDB"
3. Railway will provide the connection string
4. Copy it to your `MONGODB_URI` variable

## Monitoring and Logs

### View Logs:

```bash
railway logs --follow
```

### Check Health:

```bash
curl https://your-app.railway.app/health
```

### Monitor Performance:

- Visit Railway dashboard
- Go to "Metrics" tab
- View CPU, Memory, and Network usage

## Troubleshooting

### Build Failures

1. **Python dependencies fail**:

   - Ensure `nixpacks.toml` includes Python packages
   - Check `rag/requirements.txt` syntax

2. **Node modules error**:
   - Clear build cache in Railway dashboard
   - Redeploy

### Runtime Errors

1. **MongoDB connection fails**:

   - Verify `MONGODB_URI` is correct
   - Check MongoDB whitelist IPs (use `0.0.0.0/0` for Railway)

2. **Port binding issues**:

   - Railway automatically sets `PORT` variable
   - Don't hardcode port in code

3. **Environment variables missing**:
   ```bash
   railway variables
   ```

### Health Check Failures

The app includes health endpoints:

- `/` - Basic status
- `/health` - Detailed health check

Check logs if health checks fail:

```bash
railway logs --lines 50
```

## Rollback

If deployment fails:

```bash
# View deployments
railway status

# Rollback to previous deployment via dashboard
# Go to Deployments → Select previous → Rollback
```

## Custom Domain

Add a custom domain:

```bash
railway domain
```

Or via dashboard:

1. Go to "Settings"
2. Click "Domains"
3. Add custom domain
4. Update DNS records as shown

## CI/CD Integration

Railway automatically deploys when you push to GitHub. To configure:

1. **Branch deployment**:

   - Settings → Environment → Production Branch
   - Set to `main` or `backend_branch`

2. **Auto-deploy**:
   - Enabled by default
   - Disable in Settings if needed

## Cost Management

- Railway provides $5 free credit monthly
- Monitor usage in dashboard
- Set spending limits in Account Settings

## Performance Optimization

1. **Environment variables**: Store all secrets in Railway variables
2. **Health checks**: Enabled by default at `/health`
3. **Auto-scaling**: Railway handles this automatically
4. **Cold starts**: First request may be slower

## Support

- Railway Docs: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- CodeEcho Issues: [GitHub Issues](https://github.com/your-repo/issues)

## Next Steps

After deploying backend:

1. Update frontend `NEXT_PUBLIC_API_URL` to Railway URL
2. Test all API endpoints
3. Configure CORS with frontend URL
4. Set up monitoring and alerts
5. Configure custom domain (optional)

---

**Happy Deploying! 🚂**
