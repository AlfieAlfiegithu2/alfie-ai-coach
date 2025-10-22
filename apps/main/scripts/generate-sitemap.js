#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://englishaidol.com';

// Extract routes from App.tsx
const routes = [
  '/',
  '/hero',
  '/reading',
  '/listening',
  '/writing',
  '/writing-test',
  '/speaking',
  '/ielts-portal',
  '/ielts',
  '/general-portal',
  '/toefl-portal',
  '/pte-portal',
  '/dashboard',
  '/auth',
  '/signup',
  '/pricing',
  '/community',
  '/settings',
  '/pay',
  '/plan',
  '/practice',
  '/tests',
  '/vocabulary',
  '/vocabulary/levels',
  '/vocabulary/book',
  '/skills/vocabulary-builder',
  '/skills/grammar-fix-it',
  '/skills/paraphrasing-challenge',
  '/skills/sentence-structure-scramble',
  '/skills/listening-for-details',
  '/skills/pronunciation-repeat-after-me',
  '/admin/login',
  '/admin',
  '/admin/analytics',
  '/admin/reading',
  '/admin/listening',
  '/admin/writing',
  '/admin/speaking',
  '/admin/ielts',
  '/admin/pte',
  '/admin/toefl',
  '/admin/general',
  '/admin/skills',
  '/admin/vocab',
  '/admin/vocab-book',
  '/onboarding/assessment',
  '/results/writing/:submissionId',
  '/user-dashboard',
  '/personal-page',
  '/dashboard/writing-history',
  '/dashboard/my-word-book',
  '/reading/:testId',
  '/listening/:testId',
  '/writing/:book/:test',
  '/speaking/:book/:test',
  '/ielts/:skill',
  '/ielts-writing-test/:testId',
  '/ielts-writing-results',
  '/ielts-writing-pro-results',
  '/ielts-speaking-test/:testName',
  '/ielts-speaking-results',
  '/enhanced-reading-test/:testId',
  '/skills/:slug',
  '/vocabulary/deck/:deckId',
  '/vocabulary/test/:deckId',
  '/vocabulary/review/:deckId',
  '/admin/:testType/tests',
  '/admin/:testType/test/:testId',
  '/admin/:testType/test/:testId/:sectionId',
  '/admin/ielts/:skill',
  '/admin/skills/vocabulary/tests',
  '/admin/skills/vocabulary/tests/:id',
  '/admin/skills/grammar/tests',
  '/admin/skills/grammar/tests/:id',
  '/admin/skills/paraphrasing-challenge',
  '/admin/skills/paraphrasing-challenge/:id',
  '/admin/skills/sentence-scramble',
  '/admin/skills/sentence-scramble/:id',
  '/admin/skills/sentence-structure-scramble',
  '/admin/skills/sentence-structure-scramble/:id',
  '/admin/skills/listening-for-details',
  '/admin/skills/listening-for-details/:id',
  '/admin/skills/pronunciation-repeat-after-me',
  '/admin/skills/pronunciation-repeat-after-me/:id',
  '/admin/skills/:slug',
  '/skills/vocabulary-builder/map',
  '/skills/vocabulary-builder/test/:testId',
  '/skills/paraphrasing-challenge/test/:testId',
  '/skills/sentence-structure-scramble/test/:testId',
  '/skills/listening-for-details/test/:testId',
  '/reset-password',
  '/reading-results',
  '/listening-results',
  '/ielts-writing-results',
  '/ielts-speaking-results',
  '/ielts-writing-pro-results'
];

// Priority levels for different page types
const getPriority = (route) => {
  if (route === '/') return '1.0';
  if (route.startsWith('/ielts') || route.startsWith('/pricing') || route.startsWith('/auth')) return '0.9';
  if (route.startsWith('/admin')) return '0.3';
  if (route.includes('results') || route.includes('dashboard')) return '0.5';
  return '0.7';
};

// Change frequency for different page types
const getChangeFreq = (route) => {
  if (route === '/' || route.startsWith('/pricing')) return 'monthly';
  if (route.startsWith('/admin')) return 'never';
  if (route.includes('results') || route.includes('dashboard')) return 'daily';
  if (route.includes(':') || route.includes('test')) return 'weekly';
  return 'weekly';
};

// Generate sitemap XML
const generateSitemap = () => {
  const currentDate = new Date().toISOString();

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  // Add each route
  routes.forEach(route => {
    // Skip dynamic routes with parameters for now (we'll handle them separately)
    if (route.includes(':')) return;

    sitemap += `  <url>
    <loc>${BASE_URL}${route}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${getChangeFreq(route)}</changefreq>
    <priority>${getPriority(route)}</priority>
  </url>
`;
  });

  // Add important parameterized routes
  const importantParamRoutes = [
    '/ielts-writing-test/1',
    '/ielts-speaking-test/general-training',
    '/enhanced-reading-test/1',
    '/vocabulary/deck/1',
    '/vocabulary/test/1',
    '/vocabulary/review/1'
  ];

  importantParamRoutes.forEach(route => {
    sitemap += `  <url>
    <loc>${BASE_URL}${route}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
  });

  sitemap += `</urlset>`;

  return sitemap;
};

// Write sitemap to public directory
const sitemap = generateSitemap();
const sitemapPath = path.join(__dirname, '../public/sitemap.xml');

try {
  fs.writeFileSync(sitemapPath, sitemap, 'utf8');
  console.log(`✅ Sitemap generated successfully at ${sitemapPath}`);
  console.log(`📊 Added ${routes.filter(r => !r.includes(':')).length} static routes`);
  console.log(`📊 Added ${6} important parameterized routes`);
  console.log(`🌐 Sitemap URL: ${BASE_URL}/sitemap.xml`);
} catch (error) {
  console.error('❌ Error generating sitemap:', error.message);
  process.exit(1);
}
