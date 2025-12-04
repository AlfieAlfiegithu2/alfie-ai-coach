import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
};

// Static pages that don't change
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

// Supported blog languages
const BLOG_LANGUAGES = ['en', 'vi', 'zh', 'ja', 'ko', 'th', 'id', 'es', 'ar', 'fr', 'de', 'pt', 'ru'];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const baseUrl = 'https://www.englishaidol.com';
    
    // Fetch all published blog posts
    const { data: blogPosts, error } = await supabase
      .from('blog_posts')
      .select(`
        slug,
        published_at,
        updated_at,
        blog_post_translations (
          language_code
        )
      `)
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error fetching blog posts:', error);
    }

    // Start building sitemap XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">

  <!-- ============================================ -->
  <!-- STATIC PAGES - Generated ${today} -->
  <!-- ============================================ -->
`;

    // Add static pages
    for (const page of STATIC_PAGES) {
      xml += `  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    }

    // Add blog listing pages for all languages
    xml += `
  <!-- ============================================ -->
  <!-- BLOG PAGES - Multi-language -->
  <!-- ============================================ -->
`;
    
    // Main English blog with hreflang
    xml += `  <url>
    <loc>${baseUrl}/en/blog</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
`;
    for (const lang of BLOG_LANGUAGES) {
      xml += `    <xhtml:link rel="alternate" hreflang="${lang}" href="${baseUrl}/${lang}/blog"/>
`;
    }
    xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/en/blog"/>
  </url>
`;

    // Other language blog pages
    for (const lang of BLOG_LANGUAGES.filter(l => l !== 'en')) {
      xml += `  <url>
    <loc>${baseUrl}/${lang}/blog</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>
`;
    }

    // Add blog posts
    if (blogPosts && blogPosts.length > 0) {
      xml += `
  <!-- ============================================ -->
  <!-- BLOG POSTS - ${blogPosts.length} posts -->
  <!-- ============================================ -->
`;
      
      for (const post of blogPosts) {
        const postDate = post.updated_at 
          ? new Date(post.updated_at).toISOString().split('T')[0]
          : post.published_at 
            ? new Date(post.published_at).toISOString().split('T')[0]
            : today;
        
        // Get available languages for this post
        const availableLanguages = post.blog_post_translations
          ?.map((t: any) => t.language_code)
          .filter((lang: string) => BLOG_LANGUAGES.includes(lang)) || ['en'];

        // Main English URL with hreflang if translated
        xml += `  <url>
    <loc>${baseUrl}/en/blog/${post.slug}</loc>
    <lastmod>${postDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
`;
        
        if (availableLanguages.length > 1) {
          for (const lang of availableLanguages) {
            xml += `    <xhtml:link rel="alternate" hreflang="${lang}" href="${baseUrl}/${lang}/blog/${post.slug}"/>
`;
          }
          xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/en/blog/${post.slug}"/>
`;
        }
        xml += `  </url>
`;

        // Add other language versions
        for (const lang of availableLanguages.filter((l: string) => l !== 'en')) {
          xml += `  <url>
    <loc>${baseUrl}/${lang}/blog/${post.slug}</loc>
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

    return new Response(xml, {
      headers: corsHeaders,
      status: 200,
    });

  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.englishaidol.com/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>1.0</priority>
  </url>
</urlset>`,
      { headers: corsHeaders, status: 200 }
    );
  }
});

