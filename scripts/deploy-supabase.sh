#!/bin/bash

# Supabase Edge Functions Deployment Script
# This deploys your local functions to the live Supabase environment

echo "🚀 Deploying Supabase Edge Functions..."

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    
    # Try different installation methods
    if command -v brew &> /dev/null; then
        brew install supabase/tap/supabase
    else
        echo "⚠️ Please install Supabase CLI manually:"
        echo "   Visit: https://supabase.com/docs/guides/cli"
        exit 1
    fi
fi

# Login to Supabase (if not already logged in)
echo "🔐 Checking Supabase login status..."
if ! supabase status &> /dev/null; then
    echo "📝 Please login to Supabase:"
    supabase login
fi

# Deploy all functions
echo "📦 Deploying Edge Functions..."

# Deploy specific functions that were updated
functions_to_deploy=(
    "writing-feedback"
    "ielts-writing-examiner"
    "content-generator-gemini"
    "gemini-chat"
    "send-email-otp"
    "verify-email-otp"
    "send-magic-link"
    "plan-ai-generator"
    "plan-focus-to-todos"
    "r2-upload"
    "r2-delete"
    "r2-list"
    "r2-health-check"
    "migrate-to-r2"
    "enhanced-speech-analysis"
)

for func in "${functions_to_deploy[@]}"; do
    echo "🔄 Deploying $func..."
    supabase functions deploy $func --project-ref cuumxmfzhwljylbdlflj
done

echo "✅ Deployment complete!"
echo "🌐 Your updated functions are now live on Supabase"
echo "📱 Test your website at: http://localhost:8080/"
