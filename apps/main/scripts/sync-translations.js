#!/usr/bin/env node

/**
 * Translation Sync Script
 * 
 * Automatically translates missing UI strings from English to all supported languages
 * using OpenAI's API. Reads en.json as source of truth and updates other language files.
 * 
 * Usage: node scripts/sync-translations.js
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const LOCALES_DIR = path.join(__dirname, '../public/locales');
const SUPPORTED_LANGUAGES = [
  'ko', 'zh', 'ja', 'es', 'pt', 'fr', 'de', 'ru', 'hi', 'vi', 'ar',
  'bn', 'ur', 'id', 'tr', 'fa', 'ta', 'ne', 'th', 'yue', 'ms', 'kk', 'sr', 'tl'
];

const LANGUAGE_NAMES = {
  ko: 'Korean',
  zh: 'Chinese (Simplified)',
  ja: 'Japanese',
  es: 'Spanish',
  pt: 'Portuguese',
  fr: 'French',
  de: 'German',
  ru: 'Russian',
  hi: 'Hindi',
  vi: 'Vietnamese',
  ar: 'Arabic',
  bn: 'Bengali',
  ur: 'Urdu',
  id: 'Indonesian',
  tr: 'Turkish',
  fa: 'Persian/Farsi',
  ta: 'Tamil',
  ne: 'Nepali',
  th: 'Thai',
  yue: 'Yue Chinese/Cantonese',
  ms: 'Malay',
  kk: 'Kazakh',
  sr: 'Serbian',
  tl: 'Filipino/Tagalog'
};

// Provider configuration (DeepSeek preferred, OpenAI fallback)
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PROVIDER = DEEPSEEK_API_KEY ? 'deepseek' : (OPENAI_API_KEY ? 'openai' : 'none');
if (PROVIDER === 'none') {
  console.warn('⚠️  No DEEPSEEK_API_KEY or OPENAI_API_KEY found - running in dry-run mode');
  console.log('To enable translation, set: export DEEPSEEK_API_KEY="..." (preferred) or OPENAI_API_KEY="..."');
}

/**
 * Deep comparison to find missing keys between two objects
 */
function findMissingKeys(source, target, prefix = '') {
  const missing = {};
  
  for (const [key, value] of Object.entries(source)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursive check for nested objects
      const targetValue = target[key];
      if (!targetValue || typeof targetValue !== 'object') {
        missing[key] = value;
      } else {
        const nestedMissing = findMissingKeys(value, targetValue, fullKey);
        if (Object.keys(nestedMissing).length > 0) {
          missing[key] = nestedMissing;
        }
      }
    } else {
      // Check for missing leaf values
      if (!(key in target) || target[key] === undefined || target[key] === '') {
        missing[key] = value;
      }
    }
  }
  
  return missing;
}

/**
 * Deep merge two objects, preserving existing values in target
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = deepMerge(result[key] || {}, value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Translate text using selected provider
 */
async function translateText(text, targetLanguage) {
  const languageName = LANGUAGE_NAMES[targetLanguage];
  
  const prompt = `You are translating UI strings for an English learning platform.
Target language: ${languageName}
Context: These are buttons, labels, and navigation items shown to students.

Requirements:
- Use natural, conversational language
- Keep technical terms like "IELTS" untranslated
- Maintain professional but friendly tone
- Be concise - these are UI labels, not sentences
- For placeholders like {{name}}, keep them exactly as is
- For pluralization like {{skill}}, keep them exactly as is

Translate the following JSON object values (keep keys unchanged):
${JSON.stringify(text, null, 2)}`;

  // Helper: parse JSON even if wrapped in code fences or extra text
  const parseJsonLoose = (raw) => {
    if (!raw) throw new Error('Empty translation response');
    let s = String(raw).trim();
    // Strip code fences
    if (s.startsWith('```')) {
      s = s.replace(/^```(?:json)?\s*/i, '');
      if (s.endsWith('```')) s = s.slice(0, -3);
      s = s.trim();
    }
    try {
      return JSON.parse(s);
    } catch (_) {
      const start = s.indexOf('{');
      const end = s.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end >= start) {
        const candidate = s.slice(start, end + 1);
        return JSON.parse(candidate);
      }
      throw new Error('Failed to parse JSON from translation');
    }
  };

  try {
    if (PROVIDER === 'deepseek') {
      const call = async (messages) => {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
            messages,
            temperature: 0.1,
            max_tokens: 2000,
          }),
        });
        if (!response.ok) {
          const textErr = await response.text().catch(()=> '');
          throw new Error(`DeepSeek API error: ${response.status} ${response.statusText} ${textErr}`);
        }
        const data = await response.json();
        const translatedText = (data.choices?.[0]?.message?.content || '').trim();
        return parseJsonLoose(translatedText);
      };

      // First attempt (original prompt)
      try {
        return await call([
          { role: 'system', content: 'You are a professional translator specializing in educational technology. Return only the JSON object with translated values, no explanations.' },
          { role: 'user', content: prompt }
        ]);
      } catch (e1) {
        // Retry with stricter instruction
        return await call([
          { role: 'system', content: 'Return ONLY a valid JSON object. No code fences, no prose, no explanations.' },
          { role: 'user', content: prompt + '\n\nRespond with only the JSON object and nothing else.' }
        ]);
      }
    }

    if (PROVIDER === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'You are a professional translator specializing in educational technology. Return only the JSON object with translated values, no explanations.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });
      if (!response.ok) {
        const textErr = await response.text().catch(()=> '');
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} ${textErr}`);
      }
      const data = await response.json();
      const translatedText = (data.choices?.[0]?.message?.content || '').trim();
      return parseJsonLoose(translatedText);
    }

    throw new Error('No translation provider configured');
  } catch (error) {
    console.error(`❌ Translation failed for ${languageName}:`, (error && error.message) ? error.message : error);
    throw error;
  }
}

/**
 * Process a single language file
 */
async function processLanguage(targetLang) {
  try {
    console.log(`\n🌍 Processing ${LANGUAGE_NAMES[targetLang]} (${targetLang})...`);
    
    // Read English source file
    const enPath = path.join(LOCALES_DIR, 'en.json');
    const enContent = await fs.readFile(enPath, 'utf8');
    const enData = JSON.parse(enContent);
    
    // Read target language file (if exists)
    const targetPath = path.join(LOCALES_DIR, `${targetLang}.json`);
    let targetData = {};
    try {
      const targetContent = await fs.readFile(targetPath, 'utf8');
      targetData = JSON.parse(targetContent);
    } catch (error) {
      console.log(`📄 Creating new file for ${targetLang}`);
    }
    
    // Find missing keys
    const missing = findMissingKeys(enData, targetData);
    const missingCount = Object.keys(missing).length;
    
    if (missingCount === 0) {
      console.log(`✅ ${LANGUAGE_NAMES[targetLang]} is up to date`);
      return { translated: 0, skipped: 0 };
    }
    
    console.log(`📝 Found ${missingCount} missing translations`);
    
    if (PROVIDER === 'none') {
      console.log(`🔍 Dry-run mode: Would translate ${missingCount} keys for ${LANGUAGE_NAMES[targetLang]}`);
      console.log('Missing keys:', Object.keys(missing).slice(0, 5).join(', '), missingCount > 5 ? '...' : '');
      return { translated: 0, skipped: 0 };
    }
    
    // Translate missing keys
    const translated = await translateText(missing, targetLang);
    
    // Merge with existing translations
    const merged = deepMerge(targetData, translated);
    
    // Write back to file
    await fs.writeFile(targetPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
    
    console.log(`✅ Translated ${missingCount} keys for ${LANGUAGE_NAMES[targetLang]} using ${PROVIDER}`);
    
    return { translated: missingCount, skipped: 0 };
    
  } catch (error) {
    console.error(`❌ Failed to process ${targetLang}:`, (error && error.message) ? error.message : error);
    return { translated: 0, skipped: 1 };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting translation sync...');
  console.log(`📝 Provider: ${PROVIDER}${PROVIDER==='deepseek' ? ' (DeepSeek)' : PROVIDER==='openai' ? ' (OpenAI)' : ''}`);
  console.log(`📂 Locales directory: ${LOCALES_DIR}`);
  console.log(`🌐 Supported languages: ${SUPPORTED_LANGUAGES.join(', ')}`);
  
  const results = {
    totalTranslated: 0,
    totalSkipped: 0,
    languages: {}
  };
  
  // Process each language
  for (const lang of SUPPORTED_LANGUAGES) {
    console.log(`\n🔄 Processing ${lang}...`);
    const result = await processLanguage(lang);
    results.languages[lang] = result;
    results.totalTranslated += result.translated;
    results.totalSkipped += result.skipped;
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Summary
  console.log('\n📊 Translation Summary:');
  console.log(`✅ Total translated: ${results.totalTranslated} keys`);
  console.log(`⚠️  Total skipped: ${results.totalSkipped} languages`);
  
  console.log('\n📋 Per-language breakdown:');
  for (const [lang, result] of Object.entries(results.languages)) {
    const status = result.skipped > 0 ? '❌' : result.translated > 0 ? '✅' : '➖';
    console.log(`  ${status} ${LANGUAGE_NAMES[lang]}: ${result.translated} translated, ${result.skipped} skipped`);
  }
  
  if (results.totalTranslated > 0) {
    console.log('\n🎉 Translation sync completed successfully!');
    console.log('💡 Run your development server to test the new translations.');
  } else {
    console.log('\n✨ All translations are up to date!');
  }
}

// Run the script
main().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});

export { main, processLanguage, findMissingKeys, deepMerge };
