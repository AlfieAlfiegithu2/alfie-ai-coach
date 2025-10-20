#!/bin/bash

echo "🔄 Force updating localhost with latest changes..."

# Kill any existing servers
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

# Pull latest changes
echo "📦 Pulling latest changes from GitHub..."
git fetch origin main
git reset --hard origin/main

# Check if we have a package manager
if command -v npm >/dev/null 2>&1; then
    echo "🔄 Rebuilding with npm..."
    npm run build
elif command -v bun >/dev/null 2>&1; then
    echo "🔄 Rebuilding with bun..."
    bun run build
elif command -v yarn >/dev/null 2>&1; then
    echo "🔄 Rebuilding with yarn..."
    yarn build
else
    echo "⚠️  No package manager found. Installing Node.js..."
    
    # Try to install Node.js using Homebrew
    if command -v brew >/dev/null 2>&1; then
        echo "📦 Installing Node.js via Homebrew..."
        brew install node
        npm run build
    else
        echo "❌ Cannot rebuild without Node.js. Please install Node.js manually."
        echo "Visit: https://nodejs.org/"
        exit 1
    fi
fi

# Update route symlinks
echo "🔗 Updating route symlinks..."
ROUTES=(hero auth dashboard ielts-portal general-portal pte-portal toefl-portal reading listening writing speaking practice tests community settings signup admin)
for r in "${ROUTES[@]}"; do
    if [ ! -d "dist/$r" ]; then
        mkdir -p "dist/$r"
        ln -sfn ../index.html "dist/$r/index.html"
    fi
done

# Start server
echo "🌐 Starting server..."
cd dist && python3 -m http.server 8080 &
SERVER_PID=$!

echo "✅ Localhost updated and running!"
echo "📱 Server: http://localhost:8080"
echo "🎯 Hero: http://localhost:8080/hero/"
echo "Press Ctrl+C to stop"

# Keep running
wait $SERVER_PID
