#!/usr/bin/env node

/**
 * Create Filipino (Tagalog) translation file
 * Translates all keys from English to Tagalog
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '../public/locales');

// Filipino/Tagalog translations
const tlTranslations = {
  "header": {
    "brand": "English AIdol",
    "dashboard": "Dashboard",
    "signIn": "Mag-sign In",
    "startFreeTrial": "Simulan ang Libreng Trial",
    "continueLearning": "Magpatuloy sa Pag-aaral",
    "language": "Wika"
  },
  "dashboard": {
    "myWordBook": "Aking Aklat ng Salita",
    "tests": "Mga Pagsusulit",
    "studyPlan": "Plano sa Pag-aaral",
    "home": "Home",
    "resetResults": "I-reset ang mga Resulta",
    "greeting": "Magandang umaga, {{name}}!",
    "helloUser": "Kumusta, {{name}}",
    "overall": "Kabuuan",
    "studyProgress": "Pag-unlad sa Pag-aaral",
    "testsTaken": "Mga Pagsusulit na Natapos",
    "wordsSaved": "Mga Salitang Nai-save",
    "dayStreak": "Araw ng Sunod-sunod",
    "practiceAreas": "Mga Lugar ng Pagsasanay",
    "resultsFeedback": "Mga Resulta at Feedback ng {{skill}}",
    "viewHistory": "Tingnan ang Kasaysayan",
    "viewDetailedResults": "Tingnan ang Detalyadong Resulta",
    "averageScore": "Average na Score",
    "latestScore": "Pinakabagong Score",
    "noTestsYet": "Wala pang {{skill}} na pagsusulit na natapos",
    "startFirstTest": "Simulan ang Unang Pagsusulit",
    "deadline": "Deadline",
    "clickToOpenSettings": "I-click para buksan ang settings"
  },
  "navigation": {
    "myWordBook": "Aking Aklat ng Salita",
    "tests": "Mga Pagsusulit",
    "studyPlan": "Plano sa Pag-aaral",
    "home": "Home",
    "settings": "Settings",
    "resetResults": "I-reset ang mga Resulta",
    "community": "Komunidad",
    "practice": "Pagsasanay",
    "sentenceMastery": "Pag-master ng Pangungusap",
    "adminLogin": "Admin Login",
    "adminDashboard": "Admin Dashboard"
  },
  "community": {
    "studyCommunity": "Komunidad ng Pag-aaral"
  },
  "skills": {
    "reading": "Pagbasa",
    "listening": "Pakikinig",
    "writing": "Pagsulat",
    "speaking": "Pagsasalita",
    "overall": "Kabuuan"
  }
};

async function main() {
  // Read English file to get full structure
  const enPath = path.join(LOCALES_DIR, 'en.json');
  const enContent = await fs.readFile(enPath, 'utf8');
  const enData = JSON.parse(enContent);
  
  // Start with English as base, then override with Tagalog translations
  const tlData = { ...enData };
  
  // Apply Tagalog translations where available
  for (const [section, translations] of Object.entries(tlTranslations)) {
    if (tlData[section]) {
      tlData[section] = { ...tlData[section], ...translations };
    } else {
      tlData[section] = translations;
    }
  }
  
  // Write the file
  const tlPath = path.join(LOCALES_DIR, 'tl.json');
  await fs.writeFile(tlPath, JSON.stringify(tlData, null, 2) + '\n', 'utf8');
  
  console.log('✅ Created tl.json with Filipino/Tagalog translations');
  console.log('💡 Run: node scripts/sync-translations.js to translate remaining keys');
}

main().catch(console.error);


