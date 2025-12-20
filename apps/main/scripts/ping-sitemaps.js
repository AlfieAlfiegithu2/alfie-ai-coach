#!/usr/bin/env node
/**
 * Sitemap Ping Script
 * 
 * Notifies search engines about sitemap updates.
 */

const SITEMAP_URL = 'https://www.englishaidol.com/sitemap.xml';

async function pingSearchEngines() {
    console.log(`📣 Pinging search engines for ${SITEMAP_URL}...`);

    const bingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`;
    const indexNowUrl = `https://api.indexnow.org/IndexNow?url=${encodeURIComponent(SITEMAP_URL)}&key=f76d9e8b4c2a4b1e8d7c6b5a4a3b2c1d`; // Example key, should be real

    try {
        const bingRes = await fetch(bingUrl);
        console.log(`✅ Bing ping sent: ${bingRes.status}`);
    } catch (err) {
        console.error(`❌ Bing ping failed: ${err.message}`);
    }

    console.log('\n💡 Note: Google sitemap ping is deprecated. Use Search Console UI for manual submission.');
}

pingSearchEngines().catch(console.error);
