#!/bin/bash

# Navigate to the correct directory
cd "$(dirname "$0")"

echo "🚀 Deploying Gemini Question Extractor Function..."
echo ""

# Deploy the function
npx supabase functions deploy gemini-question-extractor --project-ref cuumxmfzhwljylbdlflj --no-verify-jwt --workdir /Users/alfie/alfie-ai-coach/apps/main

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Set your Gemini API key:"
echo "   npx supabase secrets set GEMINI_API_KEY=your_actual_api_key_here --project-ref cuumxmfzhwljylbdlflj"
echo ""
echo "2. Get your API key from: https://aistudio.google.com/app/apikey"
echo ""
echo "You can now use the AI Question Extraction feature in your admin panel!"
