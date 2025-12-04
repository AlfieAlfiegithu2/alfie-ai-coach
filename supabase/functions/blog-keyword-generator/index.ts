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

// ============================================
// ACHIEVABLE LONG-TAIL KEYWORDS DATABASE
// These are specific questions people search for
// that have lower competition but real search volume
// ============================================

const KEYWORD_DATABASE = {
  IELTS: {
    category: 'IELTS',
    keywords: [
      // Study Time & Planning
      "how many hours a day should I study for IELTS",
      "how long to prepare for IELTS from 5.5 to 7",
      "how long to prepare for IELTS from 6 to 7.5",
      "how many months to prepare for IELTS 7",
      "best IELTS study schedule for working professionals",
      "can I prepare for IELTS in 1 month",
      "can I prepare for IELTS in 2 weeks",
      "realistic IELTS preparation timeline",
      
      // Speaking Specific
      "how to improve IELTS speaking from 6 to 7",
      "IELTS speaking topics 2025 with answers",
      "how to speak fluently in IELTS speaking test",
      "IELTS speaking part 2 cue card tips",
      "how to avoid fillers in IELTS speaking",
      "best way to practice IELTS speaking alone at home",
      "IELTS speaking band descriptors explained simply",
      "common IELTS speaking mistakes to avoid",
      
      // Writing Specific
      "how to write IELTS Task 1 bar chart step by step",
      "how to write IELTS Task 2 essay in 40 minutes",
      "IELTS writing band 7 sample essays",
      "how to improve IELTS writing from 5.5 to 7",
      "IELTS writing task 2 opinion essay structure",
      "IELTS academic vs general writing differences",
      "how to paraphrase in IELTS writing",
      "common IELTS writing mistakes that lose marks",
      
      // Reading Specific
      "how to finish IELTS reading in time",
      "IELTS reading True False Not Given tips",
      "IELTS reading matching headings strategy",
      "how to improve IELTS reading speed",
      "IELTS reading skimming and scanning techniques",
      "how to score 8 in IELTS reading",
      
      // Listening Specific
      "how to improve IELTS listening from 6 to 7.5",
      "IELTS listening map labeling tips",
      "how to concentrate during IELTS listening test",
      "IELTS listening multiple choice strategies",
      "common IELTS listening spelling mistakes",
      
      // Score & Results
      "what IELTS score do I need for Canada PR",
      "what IELTS score do I need for UK visa",
      "what IELTS score do I need for Australia migration",
      "what IELTS score do I need for nursing in USA",
      "IELTS score validity for immigration",
      "how is IELTS score calculated overall band",
      "IELTS band score conversion chart explained",
      
      // Cost & Registration
      "how much does IELTS cost in 2025",
      "how to book IELTS test online step by step",
      "IELTS paper based vs computer based which is easier",
      "IELTS test day rules and what to expect",
      "what to bring to IELTS test center",
      
      // Self Study
      "best free IELTS preparation resources online",
      "can I get band 7 in IELTS with self study",
      "best IELTS books for self study 2025",
      "free IELTS practice tests with answers",
      "how to prepare for IELTS at home without coaching",
      
      // Comparison & Alternatives
      "IELTS vs PTE which is easier",
      "IELTS vs TOEFL for USA universities",
      "IELTS academic vs general which should I take",
      "online IELTS coaching vs offline which is better"
    ]
  },
  
  TOEIC: {
    category: 'TOEIC',
    keywords: [
      // Score Goals
      "how to get 900+ on TOEIC",
      "how to improve TOEIC score from 600 to 800",
      "how to improve TOEIC listening score quickly",
      "how to improve TOEIC reading score",
      "TOEIC score requirements for jobs",
      "what TOEIC score do I need for international company",
      
      // Study Time
      "how long to prepare for TOEIC 800",
      "how many hours to study for TOEIC",
      "can I prepare for TOEIC in one month",
      "best TOEIC study plan for beginners",
      "TOEIC preparation schedule for working professionals",
      
      // Test Sections
      "TOEIC listening part 1 photo description tips",
      "TOEIC listening part 2 question response strategies",
      "TOEIC listening part 3 and 4 techniques",
      "TOEIC reading part 5 grammar tips",
      "TOEIC reading part 6 text completion strategies",
      "TOEIC reading part 7 time management",
      "how to finish TOEIC reading section in time",
      
      // Resources
      "best TOEIC preparation books 2025",
      "free TOEIC practice tests online",
      "TOEIC vocabulary list for 800 score",
      "best apps for TOEIC preparation",
      "TOEIC practice questions with explanations",
      
      // Grammar & Vocabulary
      "most common TOEIC grammar points",
      "TOEIC business vocabulary list",
      "TOEIC phrasal verbs to memorize",
      "common TOEIC mistakes to avoid",
      
      // Test Day
      "what to expect on TOEIC test day",
      "TOEIC test format explained",
      "how is TOEIC scored",
      "TOEIC certificate validity"
    ]
  },
  
  TOEFL: {
    category: 'TOEFL',
    keywords: [
      // Score Goals
      "how to get 100+ on TOEFL iBT",
      "how to improve TOEFL score from 80 to 100",
      "what TOEFL score do I need for Harvard",
      "what TOEFL score do I need for US universities",
      "minimum TOEFL score for graduate school",
      
      // Study Time
      "how long to prepare for TOEFL 100",
      "can I prepare for TOEFL in 2 months",
      "TOEFL study plan for 3 months",
      "how many hours a day to study for TOEFL",
      
      // Speaking Section
      "how to improve TOEFL speaking from 22 to 26",
      "TOEFL speaking independent task tips",
      "TOEFL speaking integrated task strategies",
      "TOEFL speaking templates that work",
      "how to reduce accent for TOEFL speaking",
      
      // Writing Section
      "how to write TOEFL integrated essay step by step",
      "TOEFL independent writing template",
      "how to improve TOEFL writing score",
      "TOEFL writing time management tips",
      "TOEFL academic discussion task tips",
      
      // Reading Section
      "how to improve TOEFL reading speed",
      "TOEFL reading inference questions tips",
      "TOEFL reading vocabulary in context strategies",
      "how to score 28+ in TOEFL reading",
      
      // Listening Section
      "how to improve TOEFL listening note taking",
      "TOEFL listening lecture tips",
      "TOEFL listening conversation strategies",
      "how to concentrate during TOEFL listening",
      
      // Comparison & General
      "TOEFL iBT vs TOEFL Essentials differences",
      "TOEFL home edition vs test center",
      "best TOEFL preparation books 2025",
      "free TOEFL practice tests with answers"
    ]
  },
  
  PTE: {
    category: 'PTE',
    keywords: [
      // Score Goals
      "how to get 79+ in PTE Academic",
      "how to improve PTE score from 65 to 79",
      "PTE score for Australia PR 2025",
      "PTE to IELTS score conversion chart",
      "PTE score requirements for UK visa",
      
      // Study Time
      "how long to prepare for PTE 79",
      "PTE preparation plan for 1 month",
      "can I crack PTE in 2 weeks",
      "best PTE study schedule",
      
      // Speaking Section
      "PTE read aloud tips for 90 score",
      "PTE repeat sentence strategies",
      "PTE describe image template",
      "PTE retell lecture tips",
      "PTE answer short question list",
      "how to improve PTE speaking fluency",
      
      // Writing Section
      "PTE summarize written text template",
      "PTE write essay structure",
      "PTE writing tips for 79 score",
      "common PTE essay topics 2025",
      
      // Reading Section
      "PTE reading fill in the blanks tips",
      "PTE reorder paragraphs strategy",
      "PTE multiple choice strategies",
      "how to improve PTE reading score",
      
      // Listening Section
      "PTE summarize spoken text template",
      "PTE write from dictation tips",
      "PTE listening fill in the blanks strategies",
      "PTE highlight correct summary tips",
      
      // General
      "PTE vs IELTS which is easier",
      "best PTE preparation app 2025",
      "PTE practice tests free online",
      "PTE test format and duration",
      "PTE at home vs test center"
    ]
  },
  
  'Business English': {
    category: 'Business English',
    keywords: [
      // Email Writing
      "how to write professional emails in English",
      "business email examples for different situations",
      "how to end a professional email politely",
      "email phrases for requests in business English",
      "how to write follow up email professionally",
      "formal vs informal business email differences",
      
      // Meeting Skills
      "useful phrases for business meetings in English",
      "how to lead a meeting in English",
      "how to disagree politely in business meetings",
      "business English phrases for negotiations",
      "how to give opinion in meetings professionally",
      
      // Presentations
      "how to start a presentation in English professionally",
      "business English phrases for presentations",
      "how to handle Q&A in English presentations",
      "transition phrases for business presentations",
      
      // Job Interviews
      "common job interview questions and answers in English",
      "how to talk about weaknesses in English interview",
      "how to negotiate salary in English",
      "business English phrases for job interviews",
      "how to describe work experience in English interview",
      
      // Phone & Video Calls
      "business English phrases for phone calls",
      "how to make conference calls in English",
      "useful phrases for video meetings in English",
      "how to leave professional voicemail in English",
      
      // Resume & CV
      "how to write resume summary in English",
      "action verbs for resume in English",
      "how to describe achievements in English CV",
      "business English vocabulary for LinkedIn profile",
      
      // Workplace Communication
      "how to give feedback professionally in English",
      "business English phrases for customer service",
      "how to apologize professionally at work in English",
      "how to make small talk at work in English",
      
      // Reports & Documents
      "how to write business report in English",
      "business English phrases for proposals",
      "how to write executive summary in English",
      "professional writing tips for non native speakers"
    ]
  },
  
  NCLEX: {
    category: 'NCLEX',
    keywords: [
      // Study Planning
      "how many hours a day should I study for NCLEX",
      "how long to study for NCLEX RN",
      "can I pass NCLEX in 2 months of studying",
      "best NCLEX study schedule working nurses",
      "NCLEX study plan for repeat test takers",
      
      // Test Strategies
      "how to pass NCLEX RN on first try",
      "NCLEX CAT explained how it works",
      "why did my NCLEX shut off at 75 questions",
      "NCLEX trick does it really work",
      "what to do if NCLEX shuts off at 145 questions",
      "how to answer NCLEX select all that apply",
      
      // Content Areas
      "NCLEX priority questions strategies",
      "NCLEX delegation questions tips",
      "NCLEX pharmacology review simplified",
      "NCLEX lab values to memorize",
      "NCLEX infection control questions",
      "NCLEX safety and infection control tips",
      "NCLEX mental health questions strategies",
      
      // Resources
      "best NCLEX prep course 2025",
      "UWorld vs Kaplan for NCLEX which is better",
      "free NCLEX practice questions online",
      "best NCLEX review book 2025",
      "is Archer good for NCLEX prep",
      
      // Test Day
      "what to expect on NCLEX test day",
      "what to bring to NCLEX exam",
      "NCLEX test anxiety tips",
      "how long are NCLEX results",
      "how to check NCLEX results quick results",
      
      // International Nurses
      "NCLEX requirements for international nurses",
      "how to apply for NCLEX from Philippines",
      "NCLEX for foreign educated nurses",
      "CGFNS requirements for NCLEX",
      
      // Retake & Failure
      "how to pass NCLEX after failing",
      "NCLEX retake waiting period by state",
      "how to study differently for NCLEX retake",
      "NCLEX remediation plan after failing"
    ]
  }
};

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

// Check if keyword already has a blog post
async function isKeywordUsed(keyword: string): Promise<boolean> {
  const slug = slugify(keyword);
  
  // Check by slug
  const { data: slugMatch } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('slug', slug)
    .single();
  
  if (slugMatch) return true;
  
  // Check by similar title (normalized)
  const keywordWords = keyword.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  const { data: posts } = await supabase
    .from('blog_post_translations')
    .select('title')
    .eq('language_code', 'en')
    .limit(500);
  
  if (posts) {
    for (const post of posts) {
      const titleWords = post.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
      const intersection = keywordWords.filter(w => titleWords.includes(w)).length;
      const similarity = intersection / Math.max(keywordWords.length, titleWords.length);
      if (similarity > 0.7) return true;
    }
  }
  
  return false;
}

// Get unused keywords for a subject
async function getUnusedKeywords(subject: string): Promise<string[]> {
  const config = KEYWORD_DATABASE[subject as keyof typeof KEYWORD_DATABASE];
  if (!config) return [];
  
  const unused: string[] = [];
  
  for (const keyword of config.keywords) {
    const isUsed = await isKeywordUsed(keyword);
    if (!isUsed) {
      unused.push(keyword);
    }
  }
  
  return unused;
}

// Generate SEO-optimized blog content
async function generateBlogContent(keyword: string, subject: string): Promise<{
  title: string;
  content: string;
  excerpt: string;
  metaDescription: string;
  metaKeywords: string;
  faqs: Array<{ question: string; answer: string }>;
} | null> {
  try {
    const prompt = `You are an expert SEO content writer for English AIdol, an AI-powered language learning platform.

Write a comprehensive, SEO-optimized blog post targeting this EXACT keyword:
"${keyword}"

Subject: ${subject}

CRITICAL SEO REQUIREMENTS:
1. The EXACT keyword phrase "${keyword}" must appear:
   - In the title (naturally)
   - In the first paragraph (within first 100 words)
   - In at least one H2 heading
   - 2-3 more times throughout the content (naturally, not stuffed)

2. Start with a DIRECT, CONCISE ANSWER in the first paragraph - this is crucial for:
   - Google Featured Snippets
   - AI assistants (ChatGPT, Perplexity, Claude)
   - People Also Ask boxes

3. Structure for maximum SEO:
   - Use clear H2 (##) and H3 (###) headings
   - Include a numbered or bulleted list early in the article
   - Use short paragraphs (2-3 sentences max)
   - Include statistics, numbers, and specific timeframes

4. Content depth:
   - 1200-1800 words (comprehensive but focused)
   - Include practical, actionable steps
   - Add pro tips and common mistakes sections
   - Reference credible information

5. Internal linking opportunities:
   - Mention other related topics from ${subject} naturally
   - Reference English AIdol as a helpful tool (not promotional)

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

===TITLE===
[SEO title 50-65 characters, includes main keyword naturally]

===CONTENT===
[Full HTML content - use <h2>, <h3>, <p>, <ul>, <ol>, <strong>, <em> tags]

===EXCERPT===
[Compelling 150-160 character summary with keyword]

===META_DESCRIPTION===
[SEO meta description 150-155 characters with keyword and call-to-action]

===META_KEYWORDS===
[8-10 relevant keywords including long-tail variations, comma-separated]

===FAQ_JSON===
[JSON array with 4-5 related questions people also ask: [{"question": "...", "answer": "..."}]]

IMPORTANT STYLE GUIDELINES:
- Write in a helpful, expert but approachable tone
- Use "you" to address readers directly
- Include specific numbers, timeframes, and actionable steps
- Make it genuinely useful, not fluffy filler content
- Optimize for both search engines AND AI citation`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://englishaidol.com',
        'X-Title': 'English AIdol Keyword Blog Generator',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 5000,
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
      console.error('No content returned from API');
      return null;
    }

    // Parse sections
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
      console.warn('Failed to parse FAQs');
    }

    // Validate
    if (!title || !htmlContent || htmlContent.length < 1000) {
      console.error('Generated content failed validation');
      return null;
    }

    return {
      title,
      content: htmlContent,
      excerpt: excerpt || htmlContent.replace(/<[^>]+>/g, '').slice(0, 160),
      metaDescription: metaDescription || excerpt || htmlContent.replace(/<[^>]+>/g, '').slice(0, 155),
      metaKeywords: metaKeywords || `${subject}, ${keyword}`,
      faqs
    };
  } catch (error) {
    console.error('Error generating content:', error);
    return null;
  }
}

// Get or create category
async function getOrCreateCategory(categoryName: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from('blog_categories')
    .select('id')
    .eq('slug', slugify(categoryName))
    .single();

  if (existing) return existing.id;

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

// Save blog post
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
  keyword: string,
  publishImmediately: boolean = true
): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    const slug = slugify(content.title);

    // Check duplicate
    const { data: existingSlug } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingSlug) {
      return { success: false, error: 'Slug already exists' };
    }

    const categoryId = await getOrCreateCategory(subject);

    // Create post
    const { data: post, error: postError } = await supabase
      .from('blog_posts')
      .insert({
        slug,
        status: publishImmediately ? 'published' : 'draft',
        published_at: publishImmediately ? new Date().toISOString() : null,
      })
      .select('id')
      .single();

    if (postError) throw postError;

    // Create translation
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

    // Link category
    if (categoryId) {
      await supabase
        .from('blog_post_categories')
        .insert({
          blog_post_id: post.id,
          category_id: categoryId
        });
    }

    // Log the keyword used
    await supabase
      .from('blog_keyword_log')
      .insert({
        keyword,
        subject,
        blog_post_id: post.id,
        status: 'published'
      });

    console.log(`✅ Keyword blog created: "${content.title}" targeting "${keyword}"`);

    return { success: true, postId: post.id };
  } catch (error: any) {
    console.error('Error saving post:', error);
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

    const body = await req.json().catch(() => ({}));
    const {
      action = 'generate_daily',
      subject,
      keyword
    } = body;

    console.log(`🎯 Keyword Blog Generator: action=${action}`);

    // ============================================
    // ACTION: generate_daily
    // Generates 1 post per subject that hasn't been covered
    // ============================================
    if (action === 'generate_daily') {
      const subjects = Object.keys(KEYWORD_DATABASE);
      const results: Array<{
        subject: string;
        keyword: string;
        success: boolean;
        postId?: string;
        error?: string;
      }> = [];

      // Pick one random subject to generate for today
      const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
      
      console.log(`📚 Today's subject: ${randomSubject}`);

      // Get unused keywords
      const unusedKeywords = await getUnusedKeywords(randomSubject);
      
      if (unusedKeywords.length === 0) {
        console.log(`⚠️ All keywords used for ${randomSubject}`);
        return new Response(JSON.stringify({
          success: true,
          message: `All ${randomSubject} keywords have been covered!`,
          subject: randomSubject,
          unusedCount: 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Pick random unused keyword
      const selectedKeyword = unusedKeywords[Math.floor(Math.random() * unusedKeywords.length)];
      
      console.log(`🎯 Generating post for: "${selectedKeyword}"`);

      const content = await generateBlogContent(selectedKeyword, randomSubject);

      if (!content) {
        results.push({
          subject: randomSubject,
          keyword: selectedKeyword,
          success: false,
          error: 'Content generation failed'
        });
      } else {
        const saveResult = await saveBlogPost(content, randomSubject, selectedKeyword, true);
        results.push({
          subject: randomSubject,
          keyword: selectedKeyword,
          success: saveResult.success,
          postId: saveResult.postId,
          error: saveResult.error
        });
      }

      return new Response(JSON.stringify({
        success: results[0]?.success || false,
        results,
        unusedKeywordsRemaining: unusedKeywords.length - (results[0]?.success ? 1 : 0),
        subject: randomSubject
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ============================================
    // ACTION: generate_specific
    // Generate post for a specific keyword
    // ============================================
    if (action === 'generate_specific') {
      if (!subject || !keyword) {
        throw new Error('Subject and keyword are required');
      }

      const isUsed = await isKeywordUsed(keyword);
      if (isUsed) {
        return new Response(JSON.stringify({
          success: false,
          error: 'This keyword has already been covered'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`🎯 Generating specific post for: "${keyword}" (${subject})`);

      const content = await generateBlogContent(keyword, subject);

      if (!content) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Content generation failed'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const saveResult = await saveBlogPost(content, subject, keyword, true);

      return new Response(JSON.stringify({
        success: saveResult.success,
        postId: saveResult.postId,
        error: saveResult.error,
        preview: {
          title: content.title,
          excerpt: content.excerpt
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ============================================
    // ACTION: list_keywords
    // List all keywords and their status
    // ============================================
    if (action === 'list_keywords') {
      const allKeywords: Array<{
        subject: string;
        keyword: string;
        used: boolean;
      }> = [];

      for (const [subjectName, config] of Object.entries(KEYWORD_DATABASE)) {
        for (const kw of config.keywords) {
          const isUsed = await isKeywordUsed(kw);
          allKeywords.push({
            subject: subjectName,
            keyword: kw,
            used: isUsed
          });
        }
      }

      const totalKeywords = allKeywords.length;
      const usedKeywords = allKeywords.filter(k => k.used).length;
      const unusedKeywords = totalKeywords - usedKeywords;

      // Group by subject
      const bySubject: Record<string, { total: number; used: number; unused: number }> = {};
      for (const k of allKeywords) {
        if (!bySubject[k.subject]) {
          bySubject[k.subject] = { total: 0, used: 0, unused: 0 };
        }
        bySubject[k.subject].total++;
        if (k.used) {
          bySubject[k.subject].used++;
        } else {
          bySubject[k.subject].unused++;
        }
      }

      return new Response(JSON.stringify({
        success: true,
        summary: {
          totalKeywords,
          usedKeywords,
          unusedKeywords,
          percentageComplete: Math.round((usedKeywords / totalKeywords) * 100)
        },
        bySubject,
        keywords: allKeywords
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ============================================
    // ACTION: get_unused
    // Get unused keywords for a subject
    // ============================================
    if (action === 'get_unused') {
      if (!subject) {
        throw new Error('Subject is required');
      }

      const unused = await getUnusedKeywords(subject);

      return new Response(JSON.stringify({
        success: true,
        subject,
        unusedKeywords: unused,
        count: unused.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error: any) {
    console.error('❌ Keyword Blog Generator error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

