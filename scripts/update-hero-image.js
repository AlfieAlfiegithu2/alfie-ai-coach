#!/usr/bin/env node

/**
 * Update the hero image in HeroIndex.tsx
 * Usage: node scripts/update-hero-image.js <image-path> [alt-text]
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function updateHeroImage(imagePath, altText = '') {
  try {
    const heroFilePath = join(__dirname, '..', 'apps', 'main', 'src', 'pages', 'HeroIndex.tsx');

    let heroContent = readFileSync(heroFilePath, 'utf8');

    // Find and replace the hero image src
    const imageRegex = /src="\/hero-[^"]*\.(png|jpg|jpeg)"/i;
    const altRegex = /alt="[^"]*"/;

    const newImageTag = `src="${imagePath}"`;
    const newAltTag = altText ? `alt="${altText}"` : 'alt="English AIdol - Hero background"';

    // Replace src
    heroContent = heroContent.replace(imageRegex, newImageTag);

    // Replace alt if provided
    if (altText) {
      heroContent = heroContent.replace(altRegex, newAltTag);
    }

    // Write back the updated file
    writeFileSync(heroFilePath, heroContent, 'utf8');

    console.log('✅ Hero image updated in HeroIndex.tsx!');
    console.log(`   📸 New hero image: ${imagePath}`);
    if (altText) {
      console.log(`   📝 Alt text: ${altText}`);
    }

    console.log('\n🚀 Ready to commit and deploy!');
    console.log('   git add apps/main/src/pages/HeroIndex.tsx');
    console.log('   git commit -m "Update hero image"');
    console.log('   git push');

  } catch (error) {
    console.error('❌ Failed to update hero image:', error.message);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Update hero image in HeroIndex.tsx');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/update-hero-image.js <image-path> [alt-text]');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/update-hero-image.js /hero-123456.png');
  console.log('  node scripts/update-hero-image.js /my-hero.jpg "Beautiful learning background"');
  console.log('');
  console.log('Notes:');
  console.log('  - Image path should start with /');
  console.log('  - Alt text is optional but recommended for accessibility');
  process.exit(1);
}

const [imagePath, altText] = args;
updateHeroImage(imagePath, altText);
