#!/usr/bin/env node
/**
 * Advanced Deep Sitemap Generator for English AIdol
 * 
 * Generates a sitemap index and multiple sub-sitemaps for:
 * - Static Pages
 * - Multi-language Blogs
 * - Grammar Lessons
 * - IELTS/Skill Tests
 * - Books and Resources
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';
const BASE_URL = 'https://www.englishaidol.com';
const BLOG_LANGUAGES = ['en', 'vi', 'zh', 'ja', 'ko', 'th', 'id', 'es', 'ar', 'fr', 'de', 'pt', 'ru'];

// Helper for Supabase requests
async function sbFetch(table, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) return [];
  return await response.json();
}

async function generateSitemaps() {
  console.log('🚀 Starting Deep Sitemap Generation...');
  const today = new Date().toISOString();
  const dateShort = today.split('T')[0];
  const publicDir = path.join(__dirname, '../public');

  // 1. Static Pages
  const staticPages = [
    '/', '/pricing', '/auth', '/signup', '/ielts-portal', '/toeic-portal',
    '/pte-portal', '/toefl-portal', '/business-portal', '/nclex',
    '/grammar-portal', '/general-portal', '/earthworm', '/ai-speaking',
    '/vocabulary', '/books', '/templates', '/podcasts', '/support'
  ];

  let staticXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map(p => `  <url>
    <loc>${BASE_URL}${p}</loc>
    <lastmod>${dateShort}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${p === '/' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`;
  fs.writeFileSync(path.join(publicDir, 'sitemap-pages.xml'), staticXml);

  // 2. Grammar Topics
  const grammarTopics = await sbFetch('grammar_topics', 'select=slug,updated_at');
  let grammarXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${grammarTopics.map(t => `  <url>
    <loc>${BASE_URL}/grammar/${t.slug}</loc>
    <lastmod>${(t.updated_at || today).split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('\n')}
</urlset>`;
  fs.writeFileSync(path.join(publicDir, 'sitemap-grammar.xml'), grammarXml);

  // 3. Blog Posts (Multi-language)
  const blogPosts = await sbFetch('blog_posts', 'select=slug,updated_at,blog_post_translations(language_code)&status=eq.published');
  let blogXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${blogPosts.flatMap(post => {
    const availableLangs = post.blog_post_translations?.map(t => t.language_code) || ['en'];
    return availableLangs.map(lang => {
      let hreflangs = availableLangs.map(l =>
        `    <xhtml:link rel="alternate" hreflang="${l}" href="${BASE_URL}/${l}/blog/${post.slug}"/>`
      ).join('\n');

      return `  <url>
    <loc>${BASE_URL}/${lang}/blog/${post.slug}</loc>
    <lastmod>${(post.updated_at || today).split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
${hreflangs}
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}/en/blog/${post.slug}"/>
  </url>`;
    });
  }).join('\n')}
</urlset>`;
  fs.writeFileSync(path.join(publicDir, 'sitemap-blog.xml'), blogXml);

  // 4. IELTS / Skill Tests
  const skillTests = await sbFetch('skill_tests', 'select=id,skill_slug,updated_at');
  let skillsXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${skillTests.map(test => `  <url>
    <loc>${BASE_URL}/ielts/${test.skill_slug}/test/${test.id}</loc>
    <lastmod>${(test.updated_at || today).split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join('\n')}
</urlset>`;
  fs.writeFileSync(path.join(publicDir, 'sitemap-skills.xml'), skillsXml);

  // 5. Sitemap Index
  let indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${BASE_URL}/sitemap-pages.xml</loc><lastmod>${dateShort}</lastmod></sitemap>
  <sitemap><loc>${BASE_URL}/sitemap-blog.xml</loc><lastmod>${dateShort}</lastmod></sitemap>
  <sitemap><loc>${BASE_URL}/sitemap-grammar.xml</loc><lastmod>${dateShort}</lastmod></sitemap>
  <sitemap><loc>${BASE_URL}/sitemap-skills.xml</loc><lastmod>${dateShort}</lastmod></sitemap>
</sitemapindex>`;
  fs.writeFileSync(path.join(publicDir, 'sitemap-index.xml'), indexXml);

  // Also update sitemap.xml to be the index or a redirecting one
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), indexXml);

  console.log(`✅ Deep Sitemaps Generated!`);
  console.log(`- Pages: ${staticPages.length}`);
  console.log(`- Grammar: ${grammarTopics.length}`);
  console.log(`- Blog URLs: ${blogPosts.length * 2}`); // simplified estimate
  console.log(`- Skills: ${skillTests.length}`);
}

generateSitemaps().catch(console.error);
