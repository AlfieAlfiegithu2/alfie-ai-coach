#!/bin/bash

# Navigate to the correct directory
cd "$(dirname "$0")"

echo "🚀 Deploying IELTS Speaking Evaluator Function..."
echo ""

# Deploy the function
npx supabase functions deploy ielts-speaking-evaluator --project-ref cuumxmfzhwljylbdlflj --no-verify-jwt --workdir /Users/alfie/alfie-ai-coach/apps/main

echo ""
echo "✅ Deployment complete!"
echo "You can now use the 'Evaluate AI' button in your IELTS Speaking Test."
