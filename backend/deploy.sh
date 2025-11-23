#!/bin/bash

# Backend Deployment Script for Vercel
# Run this from the backend directory

set -e

echo "🚀 CodeEcho Backend Deployment"
echo "==============================="
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed."
    echo "Install it with: npm i -g vercel"
    exit 1
fi

echo "✅ Vercel CLI is installed"
echo ""

# Check if required files exist
if [ ! -f "vercel.json" ]; then
    echo "❌ vercel.json not found in current directory"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ package.json not found in current directory"
    exit 1
fi

echo "✅ Configuration files found"
echo ""

# Display required environment variables
echo "📋 Required Environment Variables:"
echo "   - MONGODB_URI"
echo "   - QDRANT_URL"
echo "   - QDRANT_API_KEY"
echo "   - JWT_SECRET"
echo "   - NODE_ENV=production"
echo "   - FRONTEND_URL (add after frontend deployment)"
echo ""
echo "Optional:"
echo "   - OPENAI_API_KEY"
echo "   - WATSONX_API_KEY"
echo "   - WATSONX_PROJECT_ID"
echo "   - WATSONX_URL"
echo "   - GITHUB_TOKEN"
echo "   - GITHUB_OWNER"
echo "   - GITHUB_REPO"
echo ""

# Prompt user
read -p "Have you configured all environment variables in Vercel Dashboard? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "⚠️  Please configure environment variables first:"
    echo "   1. Go to https://vercel.com/dashboard"
    echo "   2. Select your project (or create new one)"
    echo "   3. Go to Settings → Environment Variables"
    echo "   4. Add all required variables"
    echo "   5. Come back and run this script again"
    echo ""
    exit 0
fi

echo ""
echo "🚀 Starting deployment..."
echo ""

# Deploy to production
vercel --prod

echo ""
echo "✅ Backend Deployment Complete!"
echo ""
echo "📝 Next Steps:"
echo "   1. Copy your backend URL from the output above"
echo "   2. Use it to configure frontend deployment"
echo "   3. After frontend deployment, return here and:"
echo "      - Add FRONTEND_URL to environment variables"
echo "      - Redeploy with: vercel --prod"
echo ""
echo "🔍 Verify deployment:"
echo "   Visit: https://your-backend-url.vercel.app/health"
echo ""
