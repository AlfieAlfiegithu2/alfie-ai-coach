#!/usr/bin/env node

/**
 * Verification Script for Dashboard Translations
 * 
 * Checks that all dashboard translation keys exist in all supported language files.
 * 
 * Usage: node scripts/verify-dashboard-translations.js
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const LOCALES_DIR = path.join(__dirname, '../public/locales');
const SUPPORTED_LANGUAGES = [
  'en', 'ko', 'zh', 'ja', 'es', 'pt', 'fr', 'de', 'ru', 'hi', 'vi',
  'ar', 'bn', 'ur', 'id', 'tr', 'fa', 'ta', 'ne', 'th', 'yue', 'ms', 'kk', 'sr'
];

// All dashboard keys that should exist
const DASHBOARD_KEYS = [
  'myWordBook',
  'tests',
  'studyPlan',
  'home',
  'resetResults',
  'greeting',
  'helloUser',
  'overall',
  'studyProgress',
  'testsTaken',
  'wordsSaved',
  'dayStreak',
  'practiceAreas',
  'resultsFeedback',
  'viewHistory',
  'viewDetailedResults',
  'averageScore',
  'latestScore',
  'noTestsYet',
  'startFirstTest',
  'deadline',
  'clickToOpenSettings'
];

/**
 * Check if all dashboard keys exist in a language file
 */
async function verifyLanguage(lang) {
  try {
    const filePath = path.join(LOCALES_DIR, `${lang}.json`);
    const content = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(content);
    
    if (!data.dashboard) {
      return {
        lang,
        missing: DASHBOARD_KEYS,
        status: 'missing_section'
      };
    }
    
    const missing = DASHBOARD_KEYS.filter(key => !(key in data.dashboard) || data.dashboard[key] === undefined || data.dashboard[key] === '');
    
    return {
      lang,
      missing,
      status: missing.length === 0 ? 'complete' : 'incomplete'
    };
  } catch (error) {
    return {
      lang,
      missing: DASHBOARD_KEYS,
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Verifying dashboard translations...\n');
  
  const results = [];
  
  for (const lang of SUPPORTED_LANGUAGES) {
    const result = await verifyLanguage(lang);
    results.push(result);
  }
  
  // Print results
  console.log('📊 Dashboard Translation Status:\n');
  
  const complete = results.filter(r => r.status === 'complete');
  const incomplete = results.filter(r => r.status === 'incomplete');
  const missingSection = results.filter(r => r.status === 'missing_section');
  const errors = results.filter(r => r.status === 'error');
  
  if (complete.length > 0) {
    console.log(`✅ Complete (${complete.length}):`);
    complete.forEach(r => console.log(`   - ${r.lang}`));
    console.log('');
  }
  
  if (incomplete.length > 0) {
    console.log(`⚠️  Incomplete (${incomplete.length}):`);
    incomplete.forEach(r => {
      console.log(`   - ${r.lang} (missing ${r.missing.length} keys): ${r.missing.slice(0, 3).join(', ')}${r.missing.length > 3 ? '...' : ''}`);
    });
    console.log('');
  }
  
  if (missingSection.length > 0) {
    console.log(`❌ Missing dashboard section (${missingSection.length}):`);
    missingSection.forEach(r => console.log(`   - ${r.lang}`));
    console.log('');
  }
  
  if (errors.length > 0) {
    console.log(`💥 Errors (${errors.length}):`);
    errors.forEach(r => console.log(`   - ${r.lang}: ${r.error}`));
    console.log('');
  }
  
  // Summary
  const totalMissing = incomplete.length + missingSection.length + errors.length;
  
  if (totalMissing === 0) {
    console.log('🎉 All dashboard translations are complete!');
    process.exit(0);
  } else {
    console.log(`⚠️  ${totalMissing} language(s) need dashboard translations.`);
    console.log('💡 Run: node scripts/sync-translations.js to automatically translate missing keys.');
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});

