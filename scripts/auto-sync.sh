#!/bin/bash

# Auto-sync script for real-time GitHub updates
# This will commit and push changes automatically

echo "🔄 Auto-syncing changes to GitHub..."

# Add all changes
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "✅ No changes to commit"
else
    # Create commit with timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    git commit -m "Auto-sync: $timestamp - Updates from Cursor/Lovable"
    
    # Push to GitHub
    git push origin main
    
    echo "✅ Changes pushed to GitHub successfully!"
    echo "🔄 Lovable should update within a few seconds..."
fi
