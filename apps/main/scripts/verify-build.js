#!/usr/bin/env node

/**
 * Build Verification Script
 * 
 * Checks that production build will match dev server behavior:
 * - Verifies font loading strategy
 * - Checks base path configuration
 * - Validates asset paths
 * - Ensures critical files exist
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const checks = [];
let hasErrors = false;

function check(name, condition, errorMsg) {
  checks.push({ name, passed: condition, error: errorMsg });
  if (!condition) {
    hasErrors = true;
    console.error(`❌ ${name}: ${errorMsg}`);
  } else {
    console.log(`✅ ${name}`);
  }
}

console.log('🔍 Verifying build configuration...\n');

// Check 1: Font loading in index.html
const indexHtmlPath = join(rootDir, 'index.html');
if (existsSync(indexHtmlPath)) {
  const indexHtml = readFileSync(indexHtmlPath, 'utf-8');
  check(
    'Font stylesheet link exists',
    indexHtml.includes('rel="stylesheet"') && indexHtml.includes('fonts.googleapis.com'),
    'Missing direct font stylesheet link in index.html'
  );
  check(
    'Font preload exists',
    indexHtml.includes('rel="preload"') && indexHtml.includes('fonts.googleapis.com'),
    'Missing font preload in index.html'
  );
} else {
  check('index.html exists', false, 'index.html not found');
}

// Check 2: Vite config base path
const viteConfigPath = join(rootDir, 'vite.config.ts');
if (existsSync(viteConfigPath)) {
  const viteConfig = readFileSync(viteConfigPath, 'utf-8');
  check(
    'Base path is set to /',
    viteConfig.includes("base: '/'") || viteConfig.includes('base: "/"'),
    'Base path not set to / in vite.config.ts'
  );
} else {
  check('vite.config.ts exists', false, 'vite.config.ts not found');
}

// Check 3: i18n configuration
const i18nPath = join(rootDir, 'src', 'lib', 'i18n.ts');
if (existsSync(i18nPath)) {
  const i18n = readFileSync(i18nPath, 'utf-8');
  check(
    'i18n uses BASE_URL',
    i18n.includes('import.meta.env.BASE_URL') || i18n.includes('BASE_URL'),
    'i18n config should use BASE_URL for consistent paths'
  );
  check(
    'Language normalization exists',
    i18n.includes('normalizeLanguageCode'),
    'Language normalization function missing'
  );
} else {
  check('i18n.ts exists', false, 'i18n.ts not found');
}

// Check 4: Todo list placeholder
const todoListPath = join(rootDir, 'src', 'components', 'StudyPlanTodoList.tsx');
if (existsSync(todoListPath)) {
  const todoList = readFileSync(todoListPath, 'utf-8');
  check(
    'Todo input has placeholder',
    todoList.includes('placeholder') && !todoList.includes('placeholder=""'),
    'Todo input missing placeholder text'
  );
  check(
    'Font fallbacks exist',
    todoList.includes('-apple-system') || todoList.includes('BlinkMacSystemFont'),
    'Todo list missing system font fallbacks'
  );
} else {
  check('StudyPlanTodoList.tsx exists', false, 'StudyPlanTodoList.tsx not found');
}

// Check 5: Locale files exist
const localesDir = join(rootDir, 'public', 'locales');
if (existsSync(localesDir)) {
  const enJsonPath = join(localesDir, 'en.json');
  check(
    'English locale file exists',
    existsSync(enJsonPath),
    'en.json locale file missing'
  );
} else {
  check('Locales directory exists', false, 'public/locales directory not found');
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.error('\n❌ Build verification FAILED');
  console.error('Please fix the issues above before deploying.\n');
  process.exit(1);
} else {
  console.log('\n✅ Build verification PASSED');
  console.log('Production build should match dev server behavior.\n');
  process.exit(0);
}

