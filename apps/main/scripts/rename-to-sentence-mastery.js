#!/usr/bin/env node

/**
 * Script to rename Earthworm to Sentence Mastery in all language files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, '../public/locales');

// Translations for each language
const translations = {
  'ar.json': {
    "sentenceMastery": "إتقان الجملة"
  },
  'bn.json': {
    "sentenceMastery": "বাক্য দক্ষতা"
  },
  'de.json': {
    "sentenceMastery": "Satzmeisterschaft"
  },
  'es.json': {
    "sentenceMastery": "Dominio de Oraciones"
  },
  'fa.json': {
    "sentenceMastery": "تسلط جملات"
  },
  'fr.json': {
    "sentenceMastery": "Maîtrise des Phrases"
  },
  'hi.json': {
    "sentenceMastery": "वाक्य दक्षता"
  },
  'id.json': {
    "sentenceMastery": "Penguasaan Kalimat"
  },
  'ja.json': {
    "sentenceMastery": "文の習得"
  },
  'kk.json': {
    "sentenceMastery": "Сөйлем сіңдігі"
  },
  'ko.json': {
    "sentenceMastery": "문장 습득"
  },
  'ms.json': {
    "sentenceMastery": "Penguasaan Ayat"
  },
  'ne.json': {
    "sentenceMastery": "वाक्य निपुणता"
  },
  'pt.json': {
    "sentenceMastery": "Domínio de Sentenças"
  },
  'ru.json': {
    "sentenceMastery": "Мастерство предложений"
  },
  'ta.json': {
    "sentenceMastery": "வாக்கிய தேர்ச்சி"
  },
  'th.json': {
    "sentenceMastery": "การเชี่ยวชาญประโยค"
  },
  'tr.json': {
    "sentenceMastery": "Cümle Uzmanlaşması"
  },
  'ur.json': {
    "sentenceMastery": "جملے میں مہارت"
  },
  'vi.json': {
    "sentenceMastery": "Thành thạo Câu"
  },
  'yue.json': {
    "sentenceMastery": "句子精通"
  },
  'zh.json': {
    "sentenceMastery": "句子掌握"
  }
};

// Update each language file
Object.entries(translations).forEach(([filename, newKeys]) => {
  const filePath = path.join(localesDir, filename);

  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Remove old sentenceBuilder key if it exists
    if (data.navigation && data.navigation.sentenceBuilder) {
      delete data.navigation.sentenceBuilder;
    }

    // Update navigation section
    if (!data.navigation) {
      data.navigation = {};
    }

    // Add new keys
    Object.assign(data.navigation, newKeys);

    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    console.log(`✓ Updated ${filename}`);
  } catch (error) {
    console.error(`✗ Failed to update ${filename}:`, error.message);
  }
});

console.log('\n✓ All language files updated to use "Sentence Mastery"');
