#!/usr/bin/env node

/**
 * Verification Script for All Translations
 * 
 * Checks that all required translation keys exist in all supported language files.
 * 
 * Usage: node scripts/verify-all-translations.js
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
  'ar', 'bn', 'ur', 'id', 'tr', 'fa', 'ta', 'ne', 'th', 'yue', 'ms', 'kk', 'sr', 'tl'
];

// All required keys that should exist
const REQUIRED_KEYS = {
  dashboard: [
    'myWordBook', 'tests', 'studyPlan', 'home', 'resetResults',
    'greeting', 'helloUser', 'overall', 'studyProgress',
    'testsTaken', 'wordsSaved', 'dayStreak', 'practiceAreas',
    'resultsFeedback', 'viewHistory', 'viewDetailedResults',
    'averageScore', 'latestScore', 'noTestsYet', 'startFirstTest',
    'deadline', 'clickToOpenSettings'
  ],
  navigation: [
    'myWordBook', 'tests', 'studyPlan', 'home', 'settings',
    'resetResults', 'community', 'practice', 'sentenceMastery',
    'adminLogin', 'adminDashboard'
  ],
  community: [
    'studyCommunity'
  ]
};

/**
 * Check if all required keys exist in a language file
 */
async function verifyLanguage(lang) {
  try {
    const filePath = path.join(LOCALES_DIR, `${lang}.json`);
    const content = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(content);
    
    const missing = {};
    
    // Check each section
    for (const [section, keys] of Object.entries(REQUIRED_KEYS)) {
      if (!data[section]) {
        missing[section] = keys;
        continue;
      }
      
      const sectionMissing = keys.filter(key => 
        !(key in data[section]) || 
        data[section][key] === undefined || 
        data[section][key] === ''
      );
      
      if (sectionMissing.length > 0) {
        missing[section] = sectionMissing;
      }
    }
    
    const totalMissing = Object.values(missing).flat().length;
    
    return {
      lang,
      missing,
      status: totalMissing === 0 ? 'complete' : 'incomplete',
      totalMissing
    };
  } catch (error) {
    return {
      lang,
      missing: REQUIRED_KEYS,
      status: 'error',
      error: error.message,
      totalMissing: Object.values(REQUIRED_KEYS).flat().length
    };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Verifying all translations...\n');
  
  const results = [];
  
  for (const lang of SUPPORTED_LANGUAGES) {
    const result = await verifyLanguage(lang);
    results.push(result);
  }
  
  // Print results
  console.log('📊 Translation Status:\n');
  
  const complete = results.filter(r => r.status === 'complete');
  const incomplete = results.filter(r => r.status === 'incomplete');
  const errors = results.filter(r => r.status === 'error');
  
  if (complete.length > 0) {
    console.log(`✅ Complete (${complete.length}):`);
    complete.forEach(r => console.log(`   - ${r.lang}`));
    console.log('');
  }
  
  if (incomplete.length > 0) {
    console.log(`⚠️  Incomplete (${incomplete.length}):`);
    incomplete.forEach(r => {
      console.log(`   - ${r.lang} (missing ${r.totalMissing} keys):`);
      for (const [section, keys] of Object.entries(r.missing)) {
        console.log(`     ${section}: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}`);
      }
    });
    console.log('');
  }
  
  if (errors.length > 0) {
    console.log(`💥 Errors (${errors.length}):`);
    errors.forEach(r => console.log(`   - ${r.lang}: ${r.error}`));
    console.log('');
  }
  
  // Summary
  const totalMissing = incomplete.length + errors.length;
  
  if (totalMissing === 0) {
    console.log('🎉 All translations are complete!');
    process.exit(0);
  } else {
    console.log(`⚠️  ${totalMissing} language(s) need translations.`);
    console.log('💡 Run: node scripts/sync-translations.js to automatically translate missing keys.');
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});

