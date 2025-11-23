# Backend Deployment Guide

## 🚀 Deploy to Vercel

### Quick Deploy Button

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/PAK048/AI_Code_Assistant&project-name=codeecho-backend&root-directory=backend)

### Manual Deployment

1. **Install Vercel CLI**:

   ```bash
   npm i -g vercel
   ```

2. **Deploy from this directory**:

   ```bash
   cd backend
   vercel --prod
   ```

3. **Add Environment Variables** in Vercel Dashboard:

   ```bash
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/codeecho
   QDRANT_URL=https://xxx.cloud.qdrant.io:6333
   QDRANT_API_KEY=your_qdrant_api_key
   JWT_SECRET=your_secure_random_string_32_chars_minimum
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend.vercel.app

   # Optional - for AI features
   OPENAI_API_KEY=sk-...
   WATSONX_API_KEY=your_key
   WATSONX_PROJECT_ID=your_project_id
   WATSONX_URL=https://us-south.ml.cloud.ibm.com
   GITHUB_TOKEN=ghp_...
   GITHUB_OWNER=your_github_username
   GITHUB_REPO=your_repo_name
   ```

## 🛠️ Alternative: Railway.app (Recommended)

Railway provides better WebSocket support for real-time features.

1. **Sign up at [railway.app](https://railway.app)**
2. **New Project** → **Deploy from GitHub**
3. **Select repository** → Set root directory: `backend`
4. **Add environment variables** (same as above)
5. **Deploy!**

## ✅ Verify Deployment

After deployment, test these endpoints:

- Health check: `https://your-backend-url.vercel.app/health`
- API status: `https://your-backend-url.vercel.app/`
- Agents API: `https://your-backend-url.vercel.app/api/agents`

## 📋 Environment Variables Explained

| Variable          | Required    | Description                                  |
| ----------------- | ----------- | -------------------------------------------- |
| `MONGODB_URI`     | ✅ Yes      | MongoDB connection string from MongoDB Atlas |
| `QDRANT_URL`      | ✅ Yes      | Qdrant Cloud cluster URL                     |
| `QDRANT_API_KEY`  | ✅ Yes      | Qdrant Cloud API key                         |
| `JWT_SECRET`      | ✅ Yes      | Random string (32+ chars) for JWT tokens     |
| `NODE_ENV`        | ✅ Yes      | Set to `production`                          |
| `FRONTEND_URL`    | ✅ Yes      | Your frontend URL for CORS                   |
| `OPENAI_API_KEY`  | ⭕ Optional | For OpenAI features                          |
| `WATSONX_API_KEY` | ⭕ Optional | For IBM Watson features                      |
| `GITHUB_TOKEN`    | ⭕ Optional | For GitHub integration                       |

## 🔧 Pre-Deployment Checklist

- [ ] MongoDB Atlas cluster created and connection string obtained
- [ ] Qdrant Cloud cluster created and API key obtained
- [ ] All required environment variables prepared
- [ ] `.env.production.example` file reviewed
- [ ] `vercel.json` configuration checked

## 🐛 Troubleshooting

**500 Internal Server Error**

- Check environment variables in Vercel dashboard
- Verify MongoDB URI and Qdrant credentials
- Check deployment logs: `vercel logs <deployment-url>`

**Database Connection Failed**

- Ensure MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- Verify connection string format
- Check if database user has proper permissions

**CORS Errors**

- Ensure `FRONTEND_URL` is set correctly
- Redeploy after adding `FRONTEND_URL`
- Check that frontend URL doesn't have trailing slash

## 📚 Related Files

- `vercel.json` - Vercel deployment configuration
- `.env.production.example` - Example environment variables
- `package.json` - Dependencies and scripts

## 🔗 Next Steps

1. After backend deployment, copy your backend URL
2. Use it to configure the frontend deployment
3. Return to backend and add `FRONTEND_URL` environment variable
4. Redeploy backend to apply CORS settings

---

Need help? Check the root `VERCEL_DEPLOYMENT_GUIDE.md` for detailed instructions.
