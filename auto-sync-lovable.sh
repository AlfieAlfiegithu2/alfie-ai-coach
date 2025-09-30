#!/bin/bash

echo "🚀 Starting Lovable auto-sync..."

# Function to sync and rebuild
sync_and_rebuild() {
    echo "📦 Pulling latest changes from GitHub..."
    
    # Pull latest changes
    git pull origin main --no-edit
    
    if [ $? -eq 0 ]; then
        echo "✅ Changes pulled successfully!"
        
        # Check if dist directory needs rebuilding
        if [ -f "package.json" ]; then
            echo "🔄 Rebuilding project..."
            
            # Try different build commands
            if command -v npm >/dev/null 2>&1; then
                npm run build
            elif command -v bun >/dev/null 2>&1; then
                bun run build
            elif command -v yarn >/dev/null 2>&1; then
                yarn build
            else
                echo "⚠️  No package manager found. Please rebuild manually."
            fi
            
            echo "✅ Project rebuilt!"
        else
            echo "ℹ️  No package.json found, skipping rebuild"
        fi
        
        # Update route symlinks if needed
        echo "🔗 Updating route symlinks..."
        ROUTES=(hero auth dashboard ielts-portal general-portal pte-portal toefl-portal reading listening writing speaking practice tests community settings signup admin)
        for r in "${ROUTES[@]}"; do
            if [ ! -d "dist/$r" ]; then
                mkdir -p "dist/$r"
                ln -sfn ../index.html "dist/$r/index.html"
            fi
        done
        echo "✅ Routes updated!"
        
    else
        echo "❌ Failed to pull changes"
    fi
}

# Initial sync
sync_and_rebuild

# Monitor for changes every 30 seconds
echo "👀 Monitoring for Lovable updates..."
while true; do
    # Check if there are remote changes
    git fetch origin main >/dev/null 2>&1
    
    # Check if local is behind remote
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/main)
    
    if [ "$LOCAL" != "$REMOTE" ]; then
        echo "🔄 Lovable updates detected, syncing..."
        sync_and_rebuild
    fi
    
    # Wait 30 seconds before next check
    sleep 30
done
