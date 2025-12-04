import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Subject configurations for question discovery
const SUBJECTS = {
  IELTS: {
    keywords: ['IELTS', 'IELTS speaking', 'IELTS writing', 'IELTS reading', 'IELTS listening', 'IELTS preparation', 'IELTS band score', 'IELTS tips'],
    subreddits: ['IELTS', 'EnglishLearning', 'languagelearning'],
    category: 'IELTS'
  },
  TOEIC: {
    keywords: ['TOEIC', 'TOEIC test', 'TOEIC preparation', 'TOEIC listening', 'TOEIC reading', 'TOEIC score', 'TOEIC tips'],
    subreddits: ['EnglishLearning', 'languagelearning'],
    category: 'TOEIC'
  },
  TOEFL: {
    keywords: ['TOEFL', 'TOEFL iBT', 'TOEFL preparation', 'TOEFL speaking', 'TOEFL writing', 'TOEFL reading', 'TOEFL listening'],
    subreddits: ['ToesFL', 'EnglishLearning', 'languagelearning'],
    category: 'TOEFL'
  },
  PTE: {
    keywords: ['PTE Academic', 'PTE test', 'PTE preparation', 'PTE speaking', 'PTE writing', 'PTE score', 'Pearson test'],
    subreddits: ['PTE', 'EnglishLearning', 'languagelearning'],
    category: 'PTE'
  },
  'Business English': {
    keywords: ['business English', 'professional English', 'email writing English', 'business communication', 'workplace English', 'interview English'],
    subreddits: ['EnglishLearning', 'business', 'careerguidance'],
    category: 'Business English'
  },
  NCLEX: {
    keywords: ['NCLEX', 'NCLEX-RN', 'NCLEX preparation', 'nursing exam', 'NCLEX tips', 'NCLEX questions', 'NCLEX study'],
    subreddits: ['NCLEX', 'nursing', 'StudentNurse'],
    category: 'NCLEX'
  }
};

// Fetch questions from Google Autocomplete
async function fetchGoogleAutocomplete(keyword: string): Promise<string[]> {
  const questions: string[] = [];
  const prefixes = ['how to', 'what is', 'why', 'when', 'where', 'which', 'best', 'tips for', 'how can I', 'should I'];
  
  for (const prefix of prefixes) {
    try {
      const query = `${prefix} ${keyword}`;
      const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && Array.isArray(data[1])) {
          questions.push(...data[1].filter((q: string) => 
            q.length > 20 && 
            q.length < 150 &&
            (q.includes('?') || q.toLowerCase().startsWith('how') || q.toLowerCase().startsWith('what') || q.toLowerCase().startsWith('why'))
          ));
        }
      }
      
      // Rate limit: wait 200ms between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Error fetching autocomplete for "${keyword}":`, error);
    }
  }
  
  return [...new Set(questions)]; // Remove duplicates
}

// Fetch trending questions from Reddit (using public JSON API)
async function fetchRedditQuestions(subreddits: string[], keyword: string): Promise<string[]> {
  const questions: string[] = [];
  
  for (const subreddit of subreddits.slice(0, 2)) { // Limit to 2 subreddits
    try {
      const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(keyword)}&restrict_sr=1&sort=hot&limit=10`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'EnglishAIdol/1.0 (Educational content research)'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.data?.children) {
          for (const post of data.data.children) {
            const title = post.data?.title;
            if (title && title.length > 20 && title.length < 200) {
              // Check if it's a question or useful topic
              if (title.includes('?') || 
                  title.toLowerCase().includes('how') || 
                  title.toLowerCase().includes('what') ||
                  title.toLowerCase().includes('tips') ||
                  title.toLowerCase().includes('help') ||
                  title.toLowerCase().includes('advice')) {
                questions.push(title);
              }
            }
          }
        }
      }
      
      // Rate limit: wait 1 second between Reddit requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error fetching Reddit for r/${subreddit}:`, error);
    }
  }
  
  return [...new Set(questions)];
}

// Check if question/topic already exists in blog posts
async function checkDuplicates(questions: string[]): Promise<string[]> {
  const { data: existingPosts } = await supabase
    .from('blog_posts')
    .select('slug')
    .order('created_at', { ascending: false })
    .limit(200);
  
  const existingSlugs = new Set((existingPosts || []).map(p => p.slug.toLowerCase()));
  
  // Also get recent titles
  const { data: translations } = await supabase
    .from('blog_post_translations')
    .select('title')
    .eq('language_code', 'en')
    .limit(200);
  
  const existingTitles = new Set((translations || []).map(t => t.title.toLowerCase()));
  
  // Filter out questions that are too similar to existing content
  return questions.filter(q => {
    const qLower = q.toLowerCase();
    const qSlug = slugify(q);
    
    // Check slug similarity
    if (existingSlugs.has(qSlug)) return false;
    
    // Check title similarity (simple contains check)
    for (const title of existingTitles) {
      // If titles share more than 70% of words, consider duplicate
      const qWords = new Set(qLower.split(/\s+/).filter(w => w.length > 3));
      const titleWords = new Set(title.split(/\s+/).filter(w => w.length > 3));
      const intersection = [...qWords].filter(w => titleWords.has(w)).length;
      const similarity = intersection / Math.max(qWords.size, titleWords.size);
      if (similarity > 0.7) return false;
    }
    
    return true;
  });
}

// Generate blog content using DeepSeek V3.2
async function generateBlogContent(question: string, subject: string): Promise<{
  title: string;
  content: string;
  excerpt: string;
  metaDescription: string;
  metaKeywords: string;
  faqs: Array<{ question: string; answer: string }>;
} | null> {
  try {
    const prompt = `You are an expert content writer for English AIdol, an AI-powered language learning platform. Write a comprehensive, SEO-optimized blog post answering this question:

"${question}"

Subject Area: ${subject}

CRITICAL REQUIREMENTS:
1. Start with a DIRECT ANSWER in the first paragraph (this is crucial for AI/Google featured snippets)
2. Use clear H2 and H3 headings (## and ###)
3. Include practical, actionable advice
4. Add relevant statistics or facts where appropriate
5. Write 1200-1500 words minimum
6. Include a FAQ section at the end with 3-5 related questions

FORMAT YOUR RESPONSE EXACTLY LIKE THIS (use these exact markers):

===TITLE===
[SEO-optimized title, 50-65 characters, include primary keyword]

===CONTENT===
[Full HTML content with proper headings, paragraphs, lists where appropriate]

===EXCERPT===
[Compelling 1-2 sentence summary, max 160 characters]

===META_DESCRIPTION===
[SEO meta description, 120-155 characters, includes main benefit and keyword]

===META_KEYWORDS===
[5-8 relevant keywords, comma-separated]

===FAQ_JSON===
[JSON array of FAQ objects: [{"question": "...", "answer": "..."}, ...]]

IMPORTANT STYLE GUIDELINES:
- Write in a helpful, professional but friendly tone
- Use "you" to address the reader directly
- Include specific numbers, timeframes, and actionable steps
- Mention English AIdol naturally where relevant as a helpful resource
- Make content genuinely useful, not promotional
- Optimize for both search engines AND AI assistants (Perplexity, Claude, ChatGPT)`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://englishaidol.com',
        'X-Title': 'English AIdol Blog Generator',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-v3.2',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('DeepSeek API error:', error);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('No content returned from DeepSeek');
      return null;
    }

    // Parse the response
    const parseSection = (marker: string): string => {
      const regex = new RegExp(`===${marker}===\\s*([\\s\\S]*?)(?====|$)`, 'i');
      const match = content.match(regex);
      return match ? match[1].trim() : '';
    };

    const title = parseSection('TITLE');
    const htmlContent = parseSection('CONTENT');
    const excerpt = parseSection('EXCERPT');
    const metaDescription = parseSection('META_DESCRIPTION');
    const metaKeywords = parseSection('META_KEYWORDS');
    const faqJson = parseSection('FAQ_JSON');

    // Parse FAQs
    let faqs: Array<{ question: string; answer: string }> = [];
    try {
      const faqMatch = faqJson.match(/\[[\s\S]*\]/);
      if (faqMatch) {
        faqs = JSON.parse(faqMatch[0]);
      }
    } catch {
      console.warn('Failed to parse FAQs, continuing without them');
    }

    // Validate content
    if (!title || !htmlContent || htmlContent.length < 500) {
      console.error('Generated content failed validation:', { title, contentLength: htmlContent?.length });
      return null;
    }

    return {
      title,
      content: htmlContent,
      excerpt: excerpt || htmlContent.replace(/<[^>]+>/g, '').slice(0, 160),
      metaDescription: metaDescription || excerpt || htmlContent.replace(/<[^>]+>/g, '').slice(0, 155),
      metaKeywords: metaKeywords || `${subject}, English learning, AI tutor`,
      faqs
    };
  } catch (error) {
    console.error('Error generating blog content:', error);
    return null;
  }
}

// Helper: Convert text to URL slug
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

// Get or create category
async function getOrCreateCategory(categoryName: string): Promise<string | null> {
  // Check if category exists
  const { data: existing } = await supabase
    .from('blog_categories')
    .select('id')
    .eq('slug', slugify(categoryName))
    .single();

  if (existing) return existing.id;

  // Create new category
  const { data: newCategory, error } = await supabase
    .from('blog_categories')
    .insert({ 
      name: categoryName, 
      slug: slugify(categoryName),
      description: `${categoryName} preparation and learning resources`
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating category:', error);
    return null;
  }

  return newCategory?.id || null;
}

// Save blog post to database
async function saveBlogPost(
  content: {
    title: string;
    content: string;
    excerpt: string;
    metaDescription: string;
    metaKeywords: string;
    faqs: Array<{ question: string; answer: string }>;
  },
  subject: string,
  publishImmediately: boolean = false
): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    const slug = slugify(content.title);
    
    // Check if slug already exists
    const { data: existingSlug } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingSlug) {
      return { success: false, error: 'A post with this slug already exists' };
    }

    // Get category
    const categoryId = await getOrCreateCategory(subject);

    // Create blog post
    const { data: post, error: postError } = await supabase
      .from('blog_posts')
      .insert({
        slug,
        status: publishImmediately ? 'published' : 'draft',
        published_at: publishImmediately ? new Date().toISOString() : null,
        featured_image_url: null // Can be added later
      })
      .select('id')
      .single();

    if (postError) throw postError;

    // Create English translation
    const { error: transError } = await supabase
      .from('blog_post_translations')
      .insert({
        blog_post_id: post.id,
        language_code: 'en',
        title: content.title,
        content: content.content,
        excerpt: content.excerpt,
        meta_description: content.metaDescription,
        meta_keywords: content.metaKeywords
      });

    if (transError) throw transError;

    // Link to category if we have one
    if (categoryId) {
      await supabase
        .from('blog_post_categories')
        .insert({
          blog_post_id: post.id,
          category_id: categoryId
        });
    }

    console.log(`✅ Blog post created: "${content.title}" (${slug})`);

    return { success: true, postId: post.id };
  } catch (error: any) {
    console.error('Error saving blog post:', error);
    return { success: false, error: error.message };
  }
}

// Main handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const { 
      action = 'discover',
      subjects = ['IELTS', 'TOEIC', 'TOEFL', 'PTE', 'Business English', 'NCLEX'],
      count = 3,
      publishImmediately = false 
    } = await req.json();

    console.log(`📝 Blog Auto-Generator: action=${action}, subjects=${subjects.join(',')}, count=${count}`);

    if (action === 'discover') {
      // Discover questions only (for preview)
      const allQuestions: Array<{ question: string; subject: string; source: string }> = [];

      for (const subject of subjects) {
        const config = SUBJECTS[subject as keyof typeof SUBJECTS];
        if (!config) continue;

        // Get questions from Google Autocomplete
        for (const keyword of config.keywords.slice(0, 2)) {
          const googleQuestions = await fetchGoogleAutocomplete(keyword);
          allQuestions.push(...googleQuestions.map(q => ({ question: q, subject, source: 'google' })));
        }

        // Get questions from Reddit
        const redditQuestions = await fetchRedditQuestions(config.subreddits, config.keywords[0]);
        allQuestions.push(...redditQuestions.map(q => ({ question: q, subject, source: 'reddit' })));
      }

      // Filter duplicates against existing posts
      const uniqueQuestions = await checkDuplicates(allQuestions.map(q => q.question));
      const filteredQuestions = allQuestions.filter(q => uniqueQuestions.includes(q.question));

      // Deduplicate within results
      const seen = new Set<string>();
      const deduped = filteredQuestions.filter(q => {
        const key = q.question.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return new Response(JSON.stringify({
        success: true,
        questions: deduped.slice(0, count * 3), // Return more options than needed
        totalFound: deduped.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'generate') {
      // Generate and save blog posts
      const { questions } = await req.json();
      
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('No questions provided for generation');
      }

      const results: Array<{ question: string; success: boolean; postId?: string; error?: string }> = [];

      for (const item of questions.slice(0, count)) {
        console.log(`📝 Generating blog for: "${item.question}"`);
        
        const content = await generateBlogContent(item.question, item.subject);
        
        if (!content) {
          results.push({ question: item.question, success: false, error: 'Content generation failed' });
          continue;
        }

        const saveResult = await saveBlogPost(content, item.subject, publishImmediately);
        results.push({ 
          question: item.question, 
          success: saveResult.success, 
          postId: saveResult.postId,
          error: saveResult.error 
        });

        // Wait between posts to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`✅ Generated ${successCount}/${results.length} blog posts`);

      return new Response(JSON.stringify({
        success: true,
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: results.length - successCount
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'generate_single') {
      // Generate a single blog post from a specific question
      const { question, subject } = await req.json();
      
      if (!question || !subject) {
        throw new Error('Question and subject are required');
      }

      console.log(`📝 Generating single blog for: "${question}"`);
      
      const content = await generateBlogContent(question, subject);
      
      if (!content) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Content generation failed'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const saveResult = await saveBlogPost(content, subject, publishImmediately);

      return new Response(JSON.stringify({
        success: saveResult.success,
        postId: saveResult.postId,
        error: saveResult.error,
        preview: {
          title: content.title,
          excerpt: content.excerpt,
          wordCount: content.content.replace(/<[^>]+>/g, '').split(/\s+/).length
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error: any) {
    console.error('❌ Blog Auto-Generator error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

