#!/bin/bash

# Smart Auto-sync script for Cursor ↔ Lovable integration
# Intelligently manages commits and provides real-time sync

echo "🤖 Smart Auto-sync for Cursor ↔ Lovable"

# Function to check if we're in a good state to commit
check_git_status() {
    # Check if we have uncommitted changes
    if git diff --quiet && git diff --cached --quiet; then
        echo "✅ No changes to sync"
        return 1
    fi
    
    # Check if we're in the middle of a merge or rebase
    if [ -f .git/MERGE_HEAD ] || [ -f .git/REBASE_HEAD ]; then
        echo "⚠️ Git operation in progress, skipping sync"
        return 1
    fi
    
    return 0
}

# Function to create intelligent commit message
create_commit_message() {
    # Get list of changed files
    changed_files=$(git diff --cached --name-only)
    
    # Count different types of changes
    js_files=$(echo "$changed_files" | grep -E '\.(js|ts|tsx)$' | wc -l)
    supabase_files=$(echo "$changed_files" | grep 'supabase/' | wc -l)
    config_files=$(echo "$changed_files" | grep -E '\.(json|toml|md)$' | wc -l)
    
    # Create descriptive message
    message="🔄 Auto-sync: "
    
    if [ $js_files -gt 0 ]; then
        message+="Code updates ($js_files files) "
    fi
    
    if [ $supabase_files -gt 0 ]; then
        message+="Supabase functions ($supabase_files files) "
    fi
    
    if [ $config_files -gt 0 ]; then
        message+="Config changes ($config_files files) "
    fi
    
    message+="| $(date '+%H:%M:%S')"
    
    echo "$message"
}

# Main sync logic
main() {
    # Check if we should sync
    if ! check_git_status; then
        exit 0
    fi
    
    echo "📦 Staging changes..."
    git add .
    
    # Create intelligent commit message
    commit_msg=$(create_commit_message)
    
    echo "💾 Creating commit..."
    git commit -m "$commit_msg"
    
    echo "🚀 Pushing to GitHub..."
    if git push origin main; then
        echo "✅ Successfully synced to GitHub!"
        echo "🔄 Lovable should update within 10-30 seconds..."
        echo "📱 You can now see changes in both Cursor and Lovable"
    else
        echo "❌ Push failed. You may need to pull changes first:"
        echo "   git pull origin main"
    fi
}

# Run the sync
main
