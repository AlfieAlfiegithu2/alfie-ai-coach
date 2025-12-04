#!/usr/bin/env node
/**
 * Dynamic Sitemap Generator for English AIdol
 * 
 * This script fetches all published blog posts from Supabase
 * and generates a complete sitemap.xml with all pages.
 * 
 * Run: node scripts/generate-dynamic-sitemap.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase connection (uses REST API directly)
const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

const BASE_URL = 'https://www.englishaidol.com';
const BLOG_LANGUAGES = ['en', 'vi', 'zh', 'ja', 'ko', 'th', 'id', 'es', 'ar', 'fr', 'de', 'pt', 'ru'];

// Static pages configuration
const STATIC_PAGES = [
  // Main Pages
  { loc: '/', priority: '1.0', changefreq: 'weekly' },
  { loc: '/pricing', priority: '0.95', changefreq: 'weekly' },
  { loc: '/auth', priority: '0.8', changefreq: 'monthly' },
  { loc: '/signup', priority: '0.8', changefreq: 'monthly' },
  
  // Learning Portals
  { loc: '/ielts-portal', priority: '0.95', changefreq: 'weekly' },
  { loc: '/ielts', priority: '0.9', changefreq: 'weekly' },
  { loc: '/ielts/reading', priority: '0.85', changefreq: 'weekly' },
  { loc: '/ielts/writing', priority: '0.85', changefreq: 'weekly' },
  { loc: '/ielts/speaking', priority: '0.85', changefreq: 'weekly' },
  { loc: '/ielts/listening', priority: '0.85', changefreq: 'weekly' },
  { loc: '/ielts-writing-test', priority: '0.8', changefreq: 'weekly' },
  { loc: '/ielts-speaking-test', priority: '0.8', changefreq: 'weekly' },
  { loc: '/toeic-portal', priority: '0.9', changefreq: 'weekly' },
  { loc: '/toeic', priority: '0.85', changefreq: 'weekly' },
  { loc: '/pte-portal', priority: '0.9', changefreq: 'weekly' },
  { loc: '/toefl-portal', priority: '0.9', changefreq: 'weekly' },
  { loc: '/business-portal', priority: '0.9', changefreq: 'weekly' },
  { loc: '/business/resume', priority: '0.8', changefreq: 'weekly' },
  { loc: '/business/email', priority: '0.8', changefreq: 'weekly' },
  { loc: '/business/interview', priority: '0.8', changefreq: 'weekly' },
  { loc: '/nclex', priority: '0.9', changefreq: 'weekly' },
  { loc: '/general-portal', priority: '0.85', changefreq: 'weekly' },
  { loc: '/grammar-portal', priority: '0.85', changefreq: 'weekly' },
  { loc: '/grammar', priority: '0.8', changefreq: 'weekly' },
  
  // Test Modules
  { loc: '/reading', priority: '0.8', changefreq: 'weekly' },
  { loc: '/listening', priority: '0.8', changefreq: 'weekly' },
  { loc: '/writing', priority: '0.8', changefreq: 'weekly' },
  { loc: '/speaking', priority: '0.8', changefreq: 'weekly' },
  { loc: '/practice', priority: '0.75', changefreq: 'weekly' },
  { loc: '/tests', priority: '0.75', changefreq: 'weekly' },
  
  // AI Speaking Tutor
  { loc: '/earthworm', priority: '0.9', changefreq: 'weekly' },
  { loc: '/ai-speaking', priority: '0.85', changefreq: 'weekly' },
  
  // Skills Practice
  { loc: '/skills/vocabulary-builder', priority: '0.8', changefreq: 'weekly' },
  { loc: '/skills/vocabulary-builder/map', priority: '0.75', changefreq: 'weekly' },
  { loc: '/skills/grammar-fix-it', priority: '0.8', changefreq: 'weekly' },
  { loc: '/skills/paraphrasing-challenge', priority: '0.8', changefreq: 'weekly' },
  { loc: '/skills/sentence-structure-scramble', priority: '0.8', changefreq: 'weekly' },
  { loc: '/skills/listening-for-details', priority: '0.8', changefreq: 'weekly' },
  { loc: '/skills/pronunciation-repeat-after-me', priority: '0.8', changefreq: 'weekly' },
  
  // Vocabulary
  { loc: '/vocabulary', priority: '0.85', changefreq: 'weekly' },
  { loc: '/vocabulary/levels', priority: '0.8', changefreq: 'weekly' },
  { loc: '/vocabulary/book', priority: '0.8', changefreq: 'weekly' },
  
  // Resources
  { loc: '/books', priority: '0.75', changefreq: 'weekly' },
  { loc: '/templates', priority: '0.75', changefreq: 'weekly' },
  { loc: '/podcasts', priority: '0.75', changefreq: 'weekly' },
  
  // User Pages
  { loc: '/dashboard', priority: '0.7', changefreq: 'daily' },
  { loc: '/community', priority: '0.7', changefreq: 'weekly' },
  { loc: '/plan', priority: '0.7', changefreq: 'monthly' },
  { loc: '/support', priority: '0.6', changefreq: 'monthly' },
  
  // Legal
  { loc: '/privacy-policy', priority: '0.3', changefreq: 'yearly' },
  { loc: '/terms-of-service', priority: '0.3', changefreq: 'yearly' },
  { loc: '/refund-policy', priority: '0.3', changefreq: 'yearly' },
];

async function fetchBlogPosts() {
  try {
    // Use Supabase REST API directly with PostgREST syntax
    const now = new Date().toISOString();
    const url = `${SUPABASE_URL}/rest/v1/blog_posts?select=slug,published_at,updated_at,blog_post_translations(language_code)&status=eq.published&published_at=lte.${encodeURIComponent(now)}&order=published_at.desc`;
    
    console.log('🔍 Fetching from Supabase...');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('⚠️  Supabase error:', errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('⚠️  Failed to fetch blog posts:', err.message);
    return [];
  }
}

async function generateSitemap() {
  console.log('🗺️  Generating dynamic sitemap...');
  
  const today = new Date().toISOString().split('T')[0];
  
  // Fetch all published blog posts
  const blogPosts = await fetchBlogPosts();
  console.log(`📝 Found ${blogPosts.length} published blog posts`);

  // Start building sitemap XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">

  <!-- ============================================ -->
  <!-- AUTO-GENERATED SITEMAP - ${today} -->
  <!-- Total: ${STATIC_PAGES.length} static + ${blogPosts.length} blog posts -->
  <!-- ============================================ -->

  <!-- STATIC PAGES -->
`;

  // Add static pages
  for (const page of STATIC_PAGES) {
    xml += `  <url>
    <loc>${BASE_URL}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  }

  // Add blog listing pages for all languages
  xml += `
  <!-- BLOG PAGES - Multi-language -->
`;
  
  // Main English blog with hreflang
  xml += `  <url>
    <loc>${BASE_URL}/en/blog</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
`;
  for (const lang of BLOG_LANGUAGES) {
    xml += `    <xhtml:link rel="alternate" hreflang="${lang}" href="${BASE_URL}/${lang}/blog"/>
`;
  }
  xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}/en/blog"/>
  </url>
`;

  // Other language blog pages
  for (const lang of BLOG_LANGUAGES.filter(l => l !== 'en')) {
    xml += `  <url>
    <loc>${BASE_URL}/${lang}/blog</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>
`;
  }

  // Add blog posts
  if (blogPosts.length > 0) {
    xml += `
  <!-- BLOG POSTS (${blogPosts.length} total) -->
`;
    
    for (const post of blogPosts) {
      const postDate = post.updated_at 
        ? new Date(post.updated_at).toISOString().split('T')[0]
        : post.published_at 
          ? new Date(post.published_at).toISOString().split('T')[0]
          : today;
      
      // Get available languages for this post
      const availableLanguages = post.blog_post_translations
        ?.map(t => t.language_code)
        .filter(lang => BLOG_LANGUAGES.includes(lang)) || ['en'];

      // Main English URL with hreflang if translated
      xml += `  <url>
    <loc>${BASE_URL}/en/blog/${post.slug}</loc>
    <lastmod>${postDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
`;
      
      if (availableLanguages.length > 1) {
        for (const lang of availableLanguages) {
          xml += `    <xhtml:link rel="alternate" hreflang="${lang}" href="${BASE_URL}/${lang}/blog/${post.slug}"/>
`;
        }
        xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}/en/blog/${post.slug}"/>
`;
      }
      xml += `  </url>
`;

      // Add other language versions
      for (const lang of availableLanguages.filter(l => l !== 'en')) {
        xml += `  <url>
    <loc>${BASE_URL}/${lang}/blog/${post.slug}</loc>
    <lastmod>${postDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.85</priority>
  </url>
`;
      }
    }
  }

  xml += `
</urlset>`;

  // Write to public directory
  const sitemapPath = path.join(__dirname, '../public/sitemap.xml');
  fs.writeFileSync(sitemapPath, xml, 'utf8');
  
  console.log(`✅ Sitemap generated successfully!`);
  console.log(`📊 Total URLs: ${STATIC_PAGES.length + blogPosts.length * 2 + BLOG_LANGUAGES.length}`);
  console.log(`📁 Saved to: ${sitemapPath}`);
}

// Run the generator
generateSitemap().catch(console.error);
