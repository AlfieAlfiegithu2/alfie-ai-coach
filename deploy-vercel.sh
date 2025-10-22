#!/bin/bash

echo "🚀 Vercel Deployment Script"
echo "=========================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Install it with: npm install -g vercel"
    exit 1
fi

echo "✅ Vercel CLI is installed"

# Function to deploy an app
deploy_app() {
    local app_name=$1
    local app_path=$2

    echo "📦 Deploying $app_name..."
    echo "Path: $app_path"

    cd "$app_path" || {
        echo "❌ Failed to navigate to $app_path"
        return 1
    }

    if [ ! -f "vercel.json" ]; then
        echo "❌ vercel.json not found in $app_path"
        return 1
    fi

    echo "🚀 Running vercel deploy --prod for $app_name..."
    vercel deploy --prod

    if [ $? -eq 0 ]; then
        echo "✅ $app_name deployed successfully!"
    else
        echo "❌ Failed to deploy $app_name"
        return 1
    fi
}

echo ""
echo "Step 1: Deploying Main App"
echo "=========================="
deploy_app "Main App" "apps/main"

echo ""
echo "Step 2: Deploying Earthworm App"
echo "================================"
deploy_app "Earthworm App" "apps/earthworm/apps/client"

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Set up environment variables in both Vercel projects"
echo "2. Update apps/main/vite.config.ts with actual URLs"
echo "3. Redeploy main app to apply new configuration"
echo "4. Test the integration between both apps"
echo ""
echo "📖 See VERCEL-DEPLOYMENT-GUIDE.md for detailed instructions"

