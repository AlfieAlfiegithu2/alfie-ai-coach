#!/usr/bin/env node

/**
 * Upload images to public folder with optimization
 * Usage: node scripts/upload-to-public.js <source-image> [target-name]
 */

import { copyFileSync, existsSync } from 'fs';
import { join, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function uploadToPublic(sourcePath, targetName) {
  try {
    // Check if source file exists
    if (!existsSync(sourcePath)) {
      console.error(`❌ Source file not found: ${sourcePath}`);
      process.exit(1);
    }

    // Determine target path
    const publicDir = join(__dirname, '..', 'public');
    const fileExt = extname(sourcePath);
    const baseName = targetName || basename(sourcePath, fileExt);

    // For hero images, use a consistent naming
    let finalName;
    if (baseName.includes('hero') || targetName?.includes('hero')) {
      finalName = `hero-${Date.now()}${fileExt}`;
    } else {
      finalName = `${baseName}${fileExt}`;
    }

    const targetPath = join(publicDir, finalName);

    // Copy the file
    copyFileSync(sourcePath, targetPath);

    console.log(`✅ Image uploaded to public folder:`);
    console.log(`   📁 Location: public/${finalName}`);
    console.log(`   🌐 URL: /${finalName}`);
    console.log(`   📏 Size: ${require('fs').statSync(sourcePath).size} bytes`);

    // Check file size and warn if too large
    const stats = require('fs').statSync(sourcePath);
    const sizeMB = stats.size / (1024 * 1024);

    if (sizeMB > 2) {
      console.log(`⚠️  Warning: File is ${sizeMB.toFixed(1)}MB. Large files may slow down CI/CD builds.`);
      console.log(`   Consider optimizing the image or using the R2 upload script instead.`);
    } else if (sizeMB > 5) {
      console.log(`🚨 Large file detected: ${sizeMB.toFixed(1)}MB`);
      console.log(`   This may cause CI/CD timeouts. Consider using R2 storage:`);
      console.log(`   node scripts/upload-hero-image.js "${sourcePath}"`);
    } else {
      console.log(`✅ File size looks good for git commits!`);
    }

    // If it's a hero image, offer to update the component
    if (finalName.includes('hero')) {
      console.log(`\n🎨 Hero Image Detected!`);
      console.log(`   To use this as your hero background, update HeroIndex.tsx:`);
      console.log(`   Change src="/hero-cat-reading-book.png" to src="/${finalName}"`);
      console.log(`\n   Want me to do this automatically? Run:`);
      console.log(`   node scripts/update-hero-image.js "/${finalName}"`);
    }

    return finalName;

  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Upload images to public folder');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/upload-to-public.js <source-image> [target-name]');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/upload-to-public.js my-photo.jpg');
  console.log('  node scripts/upload-to-public.js ~/Desktop/hero.png hero-background');
  console.log('  node scripts/upload-to-public.js image.jpeg hero-image');
  console.log('');
  console.log('Notes:');
  console.log('  - Images under 2MB work best with CI/CD');
  console.log('  - Hero images are automatically named with timestamp');
  console.log('  - Use R2 storage for very large images (>5MB)');
  process.exit(1);
}

const [sourcePath, targetName] = args;
uploadToPublic(sourcePath, targetName);
