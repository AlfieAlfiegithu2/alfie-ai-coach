#!/bin/bash

# Navigate to the correct directory
cd "$(dirname "$0")"

echo "🚀 Deploying Listening Explanations Generator Function..."
echo ""

# Deploy the function
npx supabase functions deploy generate-listening-explanations --project-ref cuumxmfzhwljylbdlflj --no-verify-jwt --workdir /Users/alfie/alfie-ai-coach/apps/main

echo ""
echo "✅ Deployment complete!"
