#!/usr/bin/env node

/**
 * Hero Image Upload Utility
 * Uploads hero images to Cloudflare R2 storage and updates the HeroIndex component
 *
 * Usage:
 * node scripts/upload-hero-image.js <image-path> [alt-text]
 *
 * Example:
 * node scripts/upload-hero-image.js my-hero-image.jpg "Beautiful hero background"
 */

import { readFileSync } from 'fs';
import { createHmac, createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file if not already loaded
if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
  try {
    const envPath = join(__dirname, '..', '.env');
    const envContent = readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');

    for (const line of envLines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
          process.env[key] = value;
        }
      }
    }
    console.log('✅ Loaded environment variables from .env file');
  } catch (error) {
    console.log('⚠️  Could not load .env file, using system environment variables');
  }
}

// Configuration - update these with your Cloudflare R2 details
const R2_CONFIG = {
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
  accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
  bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME || 'alfie-ai-audio',
  publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL || `https://${process.env.CLOUDFLARE_R2_BUCKET_NAME || 'alfie-ai-audio'}.${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.dev`
};

// Validate configuration
if (!R2_CONFIG.accountId || !R2_CONFIG.accessKeyId || !R2_CONFIG.secretAccessKey) {
  console.error('❌ Missing Cloudflare R2 configuration. Please set these environment variables:');
  console.error('   CLOUDFLARE_ACCOUNT_ID');
  console.error('   CLOUDFLARE_R2_ACCESS_KEY_ID');
  console.error('   CLOUDFLARE_R2_SECRET_ACCESS_KEY');
  console.error('   CLOUDFLARE_R2_BUCKET_NAME (optional)');
  console.error('   CLOUDFLARE_R2_PUBLIC_URL (optional)');
  process.exit(1);
}

// Generate AWS Signature V4
function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = createHmac('sha256', 'AWS4' + key).update(dateStamp).digest();
  const kRegion = createHmac('sha256', kDate).update(regionName).digest();
  const kService = createHmac('sha256', kRegion).update(serviceName).digest();
  const kSigning = createHmac('sha256', kService).update('aws4_request').digest();
  return kSigning;
}

function sha256(data) {
  const hash = createHash('sha256');
  hash.update(typeof data === 'string' ? new TextEncoder().encode(data) : data);
  return hash.digest('hex');
}

async function uploadToR2(filePath, altText = '') {
  try {
    console.log(`📤 Reading file: ${filePath}`);

    // Read file
    const fileBuffer = readFileSync(filePath);
    const fileName = filePath.split('/').pop() || 'hero-image.jpg';
    const contentType = fileName.toLowerCase().endsWith('.png') ? 'image/png' :
                       fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.jpeg') ? 'image/jpeg' :
                       'image/webp';

    // Generate unique path for hero images
    const timestamp = Date.now();
    const path = `hero-images/${timestamp}-${fileName}`;

    console.log(`📤 Uploading to R2: ${path} (${fileBuffer.length} bytes)`);

    // Prepare the upload
    const endpoint = `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`;
    const canonicalPath = `/${R2_CONFIG.bucketName}/${path.split('/').map(encodeURIComponent).join('/')}`;
    const url = `${endpoint}${canonicalPath}`;

    // Create signature
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const payloadHash = 'UNSIGNED-PAYLOAD';

    const canonicalRequest = [
      'PUT',
      canonicalPath,
      '',
      `host:${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
      `x-amz-content-sha256:${payloadHash}`,
      `x-amz-date:${amzDate}`,
      '',
      'host;x-amz-content-sha256;x-amz-date',
      payloadHash
    ].join('\n');

    const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256(canonicalRequest)
    ].join('\n');

    const signingKey = getSignatureKey(R2_CONFIG.secretAccessKey, dateStamp, 'auto', 's3');
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${R2_CONFIG.accessKeyId}/${credentialScope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${signature}`;

    // Upload to R2
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        'Authorization': authorizationHeader,
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Generate public URL
    const publicUrl = `${R2_CONFIG.publicUrl}/${path}`;

    console.log('✅ Upload successful!');
    console.log(`📍 Public URL: ${publicUrl}`);

    // Update HeroIndex.tsx
    const heroFilePath = join(__dirname, '..', 'apps', 'main', 'src', 'pages', 'HeroIndex.tsx');
    let heroContent = readFileSync(heroFilePath, 'utf8');

    // Find the current hero image line and replace it
    const imageRegex = /src="[^"]*hero-cat-reading-book\.png" alt="[^"]*"/;
    const altDescription = altText || 'English AIdol - Hero background image';

    const newImageTag = `src="${publicUrl}" alt="${altDescription}"`;
    heroContent = heroContent.replace(imageRegex, newImageTag);

    // Write back the updated file
    const fs = await import('fs');
    fs.writeFileSync(heroFilePath, heroContent, 'utf8');

    console.log('✅ HeroIndex.tsx updated successfully!');
    console.log(`🔄 Changed hero image to: ${publicUrl}`);

    return {
      success: true,
      url: publicUrl,
      path: path
    };

  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Main execution
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node scripts/upload-hero-image.js <image-path> [alt-text]');
  console.log('Example: node scripts/upload-hero-image.js my-hero-image.jpg "Beautiful hero background"');
  process.exit(1);
}

const [imagePath, altText] = args;

if (!imagePath) {
  console.error('❌ Please provide an image path');
  process.exit(1);
}

uploadToR2(imagePath, altText).then(result => {
  if (result.success) {
    console.log('\n🎉 Hero image uploaded and configured successfully!');
    console.log(`Next steps:`);
    console.log(`1. Commit the changes: git add apps/main/src/pages/HeroIndex.tsx`);
    console.log(`2. Push to deploy: git commit -m "Update hero image" && git push`);
  } else {
    process.exit(1);
  }
});
