#!/bin/bash

# CodeEcho Vercel Deployment Script
# This script helps you deploy CodeEcho to Vercel

set -e  # Exit on error

echo "🚀 CodeEcho Vercel Deployment Helper"
echo "====================================="
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed."
    echo "Install it with: npm i -g vercel"
    exit 1
fi

echo "✅ Vercel CLI is installed"
echo ""

# Function to deploy backend
deploy_backend() {
    echo "📦 Deploying Backend..."
    echo ""
    
    cd backend
    
    echo "Required environment variables for backend:"
    echo "- MONGODB_URI"
    echo "- QDRANT_URL"
    echo "- QDRANT_API_KEY"
    echo "- JWT_SECRET"
    echo "- NODE_ENV"
    echo "- FRONTEND_URL (add this after frontend deployment)"
    echo ""
    
    read -p "Do you want to deploy backend now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        vercel --prod
        echo ""
        echo "✅ Backend deployed!"
        echo "📝 Copy your backend URL and use it for frontend deployment"
        echo ""
    fi
    
    cd ..
}

# Function to deploy frontend
deploy_frontend() {
    echo "🎨 Deploying Frontend..."
    echo ""
    
    cd frontend
    
    echo "Required environment variables for frontend:"
    echo "- NEXT_PUBLIC_API_URL (your backend URL)"
    echo "- NEXT_PUBLIC_WS_URL (your backend URL)"
    echo ""
    
    read -p "Do you want to deploy frontend now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        vercel --prod
        echo ""
        echo "✅ Frontend deployed!"
        echo "📝 Copy your frontend URL and add it to backend FRONTEND_URL env variable"
        echo ""
    fi
    
    cd ..
}

# Main menu
echo "What would you like to deploy?"
echo "1) Backend only"
echo "2) Frontend only"
echo "3) Both (Backend first, then Frontend)"
echo "4) Exit"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        deploy_backend
        ;;
    2)
        deploy_frontend
        ;;
    3)
        deploy_backend
        echo ""
        read -p "Press Enter after you've noted the backend URL..." 
        echo ""
        deploy_frontend
        ;;
    4)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Add backend FRONTEND_URL environment variable in Vercel dashboard"
echo "2. Redeploy backend to apply CORS settings"
echo "3. Test your application at the frontend URL"
echo ""
echo "Need help? Check QUICK_DEPLOY.md or VERCEL_DEPLOYMENT_GUIDE.md"
