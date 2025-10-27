#!/usr/bin/env node

/**
 * Security Fix Script - Update CORS headers in Supabase functions
 *
 * This script helps update remaining functions to use secure CORS headers
 * instead of the insecure 'Access-Control-Allow-Origin': '*'
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readdirSync, statSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple recursive function to find files
function findFiles(dir, pattern) {
  const results = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      results.push(...findFiles(fullPath, pattern));
    } else if (entry.isFile() && entry.name === pattern) {
      results.push(fullPath);
    }
  }

  return results;
}

const supabaseFunctionsPath = 'supabase/functions';

// Functions that should keep permissive CORS (webhooks, etc.)
const EXCEPTIONS = [
  'stripe-webhook',
  'admin-auth', // May need special authentication
  'send-magic-link',
  'verify-email-otp',
  'send-email-otp'
];

// Functions that need JWT verification added
const HIGH_PRIORITY_FUNCTIONS = [
  'enhanced-speech-analysis',
  'create-payment-intent',
  'r2-upload',
  'admin-content',
  'ielts-writing-examiner',
  'translation-service',
  'gemini-chat',
  'openai-chat',
  'elevenlabs-voice',
  'speech-analysis'
];

function findFunctionsNeedingUpdates() {
  const functionsDir = path.resolve(__dirname, '..', supabaseFunctionsPath);
  const files = findFiles(functionsDir, 'index.ts');

  return files.filter(file => {
    const functionName = path.basename(path.dirname(file));

    // Skip exceptions
    if (EXCEPTIONS.includes(functionName)) {
      return false;
    }

    // Check if file contains insecure CORS
    const content = fs.readFileSync(file, 'utf8');
    return content.includes("'Access-Control-Allow-Origin': '*'");
  });
}

function updateFunctionCors(filePath) {
  console.log(`Updating CORS in: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');

  // Update import to include secure CORS function
  if (!content.includes('getSecureCorsHeaders')) {
    // Find the import section
    const importPattern = /import.*from.*['"]https:\/\/deno\.land\/std[^'"]*['"];?/;
    const hasRateLimiterImport = content.includes('rate-limiter-utils');

    if (hasRateLimiterImport) {
      // Already has rate limiter imports, just add getSecureCorsHeaders
      content = content.replace(
        /from "\.\.\/rate-limiter-utils\.ts";/,
        'getSecureCorsHeaders\n} from "../rate-limiter-utils.ts";'
      );
    } else {
      // Need to add the import
      content = content.replace(
        /(import.*from.*['"]https:\/\/deno\.land\/std[^'"]*['"];?)/,
        '$1\nimport { getSecureCorsHeaders } from "../rate-limiter-utils.ts";'
      );
    }
  }

  // Update CORS headers definition
  if (content.includes("'Access-Control-Allow-Origin': '*'")) {
    content = content.replace(
      /const corsHeaders = \{[^}]*'Access-Control-Allow-Origin': '\*',[^}]*\};/,
      `// Updated to use secure CORS headers\nconst corsHeaders = getSecureCorsHeaders(req.headers.get('origin'));`
    );
  }

  // Update OPTIONS handler
  content = content.replace(
    /if \(req\.method === ['"]OPTIONS['"]\) \{\s*return new Response\(null, \{ headers: corsHeaders \}\);\s*\}/,
    `// Handle CORS preflight\n  if (req.method === 'OPTIONS') {\n    return new Response(null, {\n      headers: getSecureCorsHeaders(req.headers.get('origin'))\n    });\n  }`
  );

  // Update all response headers
  content = content.replace(
    /headers: \{ \.\.\.corsHeaders/g,
    'headers: { ...getSecureCorsHeaders(req.headers.get(\'origin\'))'
  );

  fs.writeFileSync(filePath, content);
  console.log(`✅ Updated: ${filePath}`);
}

function main() {
  console.log('🔍 Finding functions needing CORS updates...');

  const functionsToUpdate = findFunctionsNeedingUpdates();

  if (functionsToUpdate.length === 0) {
    console.log('✅ All functions already have secure CORS!');
    return;
  }

  console.log(`📝 Found ${functionsToUpdate.length} functions to update:`);
  functionsToUpdate.forEach(file => {
    const functionName = path.basename(path.dirname(file));
    console.log(`  - ${functionName}`);
  });

  console.log('\n🔧 Updating functions...');

  for (const file of functionsToUpdate) {
    try {
      updateFunctionCors(file);
    } catch (error) {
      console.error(`❌ Failed to update ${file}:`, error.message);
    }
  }

  console.log('\n🎉 Security update complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Run: supabase db push (to apply RLS policy fixes)');
  console.log('2. Test your functions to ensure they work correctly');
  console.log('3. Update ALLOWED_ORIGINS environment variable with your actual domains');
  console.log('4. Consider adding JWT verification to high-priority functions listed above');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (error) {
    console.error(error);
  }
}

export { findFunctionsNeedingUpdates, updateFunctionCors };
