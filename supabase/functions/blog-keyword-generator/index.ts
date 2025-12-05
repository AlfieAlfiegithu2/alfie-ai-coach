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
// TOP 30 LANGUAGES BY INTERNET USERS
// Each language will get NATIVE content (not translated)
// ============================================
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' }
];

// ============================================
// ACHIEVABLE LONG-TAIL KEYWORDS DATABASE
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
      "how to get 900+ on TOEIC",
      "how to improve TOEIC score from 600 to 800",
      "how to improve TOEIC listening score quickly",
      "how to improve TOEIC reading score",
      "TOEIC score requirements for jobs",
      "what TOEIC score do I need for international company",
      "how long to prepare for TOEIC 800",
      "how many hours to study for TOEIC",
      "can I prepare for TOEIC in one month",
      "best TOEIC study plan for beginners",
      "TOEIC preparation schedule for working professionals",
      "TOEIC listening part 1 photo description tips",
      "TOEIC listening part 2 question response strategies",
      "TOEIC listening part 3 and 4 techniques",
      "TOEIC reading part 5 grammar tips",
      "TOEIC reading part 6 text completion strategies",
      "TOEIC reading part 7 time management",
      "how to finish TOEIC reading section in time",
      "best TOEIC preparation books 2025",
      "free TOEIC practice tests online",
      "TOEIC vocabulary list for 800 score",
      "best apps for TOEIC preparation",
      "TOEIC practice questions with explanations",
      "most common TOEIC grammar points",
      "TOEIC business vocabulary list",
      "TOEIC phrasal verbs to memorize",
      "common TOEIC mistakes to avoid",
      "what to expect on TOEIC test day",
      "TOEIC test format explained",
      "how is TOEIC scored",
      "TOEIC certificate validity"
    ]
  },
  
  TOEFL: {
    category: 'TOEFL',
    keywords: [
      "how to get 100+ on TOEFL iBT",
      "how to improve TOEFL score from 80 to 100",
      "what TOEFL score do I need for Harvard",
      "what TOEFL score do I need for US universities",
      "minimum TOEFL score for graduate school",
      "how long to prepare for TOEFL 100",
      "can I prepare for TOEFL in 2 months",
      "TOEFL study plan for 3 months",
      "how many hours a day to study for TOEFL",
      "how to improve TOEFL speaking from 22 to 26",
      "TOEFL speaking independent task tips",
      "TOEFL speaking integrated task strategies",
      "TOEFL speaking templates that work",
      "how to reduce accent for TOEFL speaking",
      "how to write TOEFL integrated essay step by step",
      "TOEFL independent writing template",
      "how to improve TOEFL writing score",
      "TOEFL writing time management tips",
      "TOEFL academic discussion task tips",
      "how to improve TOEFL reading speed",
      "TOEFL reading inference questions tips",
      "TOEFL reading vocabulary in context strategies",
      "how to score 28+ in TOEFL reading",
      "how to improve TOEFL listening note taking",
      "TOEFL listening lecture tips",
      "TOEFL listening conversation strategies",
      "how to concentrate during TOEFL listening",
      "TOEFL iBT vs TOEFL Essentials differences",
      "TOEFL home edition vs test center",
      "best TOEFL preparation books 2025",
      "free TOEFL practice tests with answers"
    ]
  },
  
  PTE: {
    category: 'PTE',
    keywords: [
      "how to get 79+ in PTE Academic",
      "how to improve PTE score from 65 to 79",
      "PTE score for Australia PR 2025",
      "PTE to IELTS score conversion chart",
      "PTE score requirements for UK visa",
      "how long to prepare for PTE 79",
      "PTE preparation plan for 1 month",
      "can I crack PTE in 2 weeks",
      "best PTE study schedule",
      "PTE read aloud tips for 90 score",
      "PTE repeat sentence strategies",
      "PTE describe image template",
      "PTE retell lecture tips",
      "PTE answer short question list",
      "how to improve PTE speaking fluency",
      "PTE summarize written text template",
      "PTE write essay structure",
      "PTE writing tips for 79 score",
      "common PTE essay topics 2025",
      "PTE reading fill in the blanks tips",
      "PTE reorder paragraphs strategy",
      "PTE multiple choice strategies",
      "how to improve PTE reading score",
      "PTE summarize spoken text template",
      "PTE write from dictation tips",
      "PTE listening fill in the blanks strategies",
      "PTE highlight correct summary tips",
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
      "how to write professional emails in English",
      "business email examples for different situations",
      "how to end a professional email politely",
      "email phrases for requests in business English",
      "how to write follow up email professionally",
      "formal vs informal business email differences",
      "useful phrases for business meetings in English",
      "how to lead a meeting in English",
      "how to disagree politely in business meetings",
      "business English phrases for negotiations",
      "how to give opinion in meetings professionally",
      "how to start a presentation in English professionally",
      "business English phrases for presentations",
      "how to handle Q&A in English presentations",
      "transition phrases for business presentations",
      "common job interview questions and answers in English",
      "how to talk about weaknesses in English interview",
      "how to negotiate salary in English",
      "business English phrases for job interviews",
      "how to describe work experience in English interview",
      "business English phrases for phone calls",
      "how to make conference calls in English",
      "useful phrases for video meetings in English",
      "how to leave professional voicemail in English",
      "how to write resume summary in English",
      "action verbs for resume in English",
      "how to describe achievements in English CV",
      "business English vocabulary for LinkedIn profile",
      "how to give feedback professionally in English",
      "business English phrases for customer service",
      "how to apologize professionally at work in English",
      "how to make small talk at work in English",
      "how to write business report in English",
      "business English phrases for proposals",
      "how to write executive summary in English",
      "professional writing tips for non native speakers"
    ]
  },
  
  NCLEX: {
    category: 'NCLEX',
    keywords: [
      "how many hours a day should I study for NCLEX",
      "how long to study for NCLEX RN",
      "can I pass NCLEX in 2 months of studying",
      "best NCLEX study schedule working nurses",
      "NCLEX study plan for repeat test takers",
      "how to pass NCLEX RN on first try",
      "NCLEX CAT explained how it works",
      "why did my NCLEX shut off at 75 questions",
      "NCLEX trick does it really work",
      "what to do if NCLEX shuts off at 145 questions",
      "how to answer NCLEX select all that apply",
      "NCLEX priority questions strategies",
      "NCLEX delegation questions tips",
      "NCLEX pharmacology review simplified",
      "NCLEX lab values to memorize",
      "NCLEX infection control questions",
      "NCLEX safety and infection control tips",
      "NCLEX mental health questions strategies",
      "best NCLEX prep course 2025",
      "UWorld vs Kaplan for NCLEX which is better",
      "free NCLEX practice questions online",
      "best NCLEX review book 2025",
      "is Archer good for NCLEX prep",
      "what to expect on NCLEX test day",
      "what to bring to NCLEX exam",
      "NCLEX test anxiety tips",
      "how long are NCLEX results",
      "how to check NCLEX results quick results",
      "NCLEX requirements for international nurses",
      "how to apply for NCLEX from Philippines",
      "NCLEX for foreign educated nurses",
      "CGFNS requirements for NCLEX",
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
  
  const { data: slugMatch } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('slug', slug)
    .single();
  
  if (slugMatch) return true;
  
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

// ============================================
// GENERATE HIGH-QUALITY NATIVE CONTENT
// No markdown, human-like, SEO optimized
// ============================================
async function generateNativeContent(
  keyword: string, 
  subject: string, 
  languageCode: string,
  languageName: string,
  nativeName: string
): Promise<{
  title: string;
  content: string;
  excerpt: string;
  metaDescription: string;
  metaKeywords: string;
} | null> {
  try {
    const isEnglish = languageCode === 'en';
    
    const prompt = `You are a professional content writer who writes like a skilled human journalist, NOT like AI. You are writing for ${languageName} speakers in their native language (${nativeName}).

${isEnglish ? `TARGET KEYWORD: "${keyword}"` : `TOPIC (translate and adapt for ${languageName} audience): "${keyword}"`}

SUBJECT: ${subject}

CRITICAL WRITING RULES - FOLLOW EXACTLY:

1. WRITE 100% IN ${languageName.toUpperCase()} (${nativeName})
   - Do NOT mix languages
   - Use natural ${languageName} expressions and idioms
   - Adapt examples for ${languageName}-speaking countries/culture

2. WRITE LIKE A HUMAN, NOT AI:
   - NO hashtags (#) or markdown formatting
   - NO bullet points that start with asterisks (*)
   - NO phrases like "In this article" or "Let's dive in" or "In conclusion"
   - NO robotic transitions like "Furthermore" "Moreover" "Additionally"
   - Use natural conversational transitions instead
   - Vary sentence length - mix short punchy sentences with longer ones
   - Include personal touches like "I remember when..." or "Many of my students ask..."
   - Use contractions naturally (don't → don't, it's, you'll, etc.)

3. FORMAT AS CLEAN HTML ONLY:
   - Use <h2> and <h3> for headings (NOT # markdown)
   - Use <p> for paragraphs
   - Use <ul><li> or <ol><li> for lists (sparingly, not everything needs to be a list)
   - Use <strong> for emphasis (sparingly)
   - Use <blockquote> for tips or important notes

4. SEO OPTIMIZATION:
   - ${isEnglish ? `Include the exact keyword "${keyword}" in:` : 'Include the main topic naturally in:'}
     * The title
     * First paragraph (within 100 words)
     * At least one <h2> heading
     * 2-3 more times naturally throughout
   - Answer the question DIRECTLY in the first paragraph (for featured snippets)

5. STRUCTURE:
   - Engaging opening that hooks the reader (personal story, surprising fact, or direct answer)
   - 4-6 main sections with <h2> headings
   - Each section 150-250 words
   - Total: 1200-1800 words
   - End with practical next steps, not generic conclusions

6. QUALITY MARKERS:
   - Include specific numbers, statistics, timeframes
   - Add real examples and scenarios
   - Share practical tips that actually help
   - Reference credible sources where appropriate
   - Write with expertise and confidence

OUTPUT FORMAT (use these exact markers):

===TITLE===
[Compelling title in ${languageName}, 50-70 characters, includes main topic]

===CONTENT===
[Full HTML content - well-formatted, engaging, human-like]

===EXCERPT===
[Engaging 150-160 character summary in ${languageName}]

===META_DESCRIPTION===
[SEO meta description in ${languageName}, 150-155 characters with call-to-action]

===META_KEYWORDS===
[8-10 relevant keywords in ${languageName}, comma-separated]

Remember: Write as if you're a knowledgeable friend explaining something, not a robot generating content. The reader should feel like they're getting advice from an expert who genuinely wants to help them succeed.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://englishaidol.com',
        'X-Title': 'English AIdol Blog Generator',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8, // Slightly higher for more natural variation
        max_tokens: 6000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('API error:', error);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content returned');
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

    // Clean up any remaining markdown that slipped through
    let cleanContent = htmlContent
      .replace(/^#{1,6}\s+(.+)$/gm, '<h2>$1</h2>') // Convert any # headers to h2
      .replace(/^\*\s+(.+)$/gm, '<li>$1</li>') // Convert * bullets to li
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // Convert **bold** to strong
      .replace(/\*(.+?)\*/g, '<em>$1</em>'); // Convert *italic* to em

    // Validate
    if (!title || !cleanContent || cleanContent.length < 1000) {
      console.error('Content validation failed');
      return null;
    }

    return {
      title,
      content: cleanContent,
      excerpt: excerpt || cleanContent.replace(/<[^>]+>/g, '').slice(0, 160),
      metaDescription: metaDescription || excerpt || cleanContent.replace(/<[^>]+>/g, '').slice(0, 155),
      metaKeywords: metaKeywords || `${subject}, ${keyword}`
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

// Save blog post with multiple language versions
async function saveBlogPost(
  keyword: string,
  subject: string,
  languages: typeof SUPPORTED_LANGUAGES,
  publishImmediately: boolean = true
): Promise<{ success: boolean; postId?: string; languagesGenerated?: number; error?: string }> {
  try {
    // Generate English first (for the slug)
    console.log(`📝 Generating English content for: "${keyword}"`);
    const englishContent = await generateNativeContent(keyword, subject, 'en', 'English', 'English');
    
    if (!englishContent) {
      return { success: false, error: 'English content generation failed' };
    }

    const slug = slugify(englishContent.title);

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

    // Save English translation
    await supabase
      .from('blog_post_translations')
      .insert({
        blog_post_id: post.id,
        language_code: 'en',
        title: englishContent.title,
        content: englishContent.content,
        excerpt: englishContent.excerpt,
        meta_description: englishContent.metaDescription,
        meta_keywords: englishContent.metaKeywords
      });

    let languagesGenerated = 1;

    // Generate for other languages (in batches to avoid rate limits)
    const otherLanguages = languages.filter(l => l.code !== 'en');
    
    for (const lang of otherLanguages) {
      try {
        console.log(`🌍 Generating ${lang.name} (${lang.nativeName}) content...`);
        
        const nativeContent = await generateNativeContent(
          keyword, 
          subject, 
          lang.code, 
          lang.name,
          lang.nativeName
        );
        
        if (nativeContent) {
          await supabase
            .from('blog_post_translations')
            .insert({
              blog_post_id: post.id,
              language_code: lang.code,
              title: nativeContent.title,
              content: nativeContent.content,
              excerpt: nativeContent.excerpt,
              meta_description: nativeContent.metaDescription,
              meta_keywords: nativeContent.metaKeywords
            });
          
          languagesGenerated++;
          console.log(`✅ ${lang.name} content saved`);
        } else {
          console.log(`⚠️ ${lang.name} content generation failed, skipping`);
        }
        
        // Rate limit: wait 2 seconds between languages
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (langError) {
        console.error(`Error generating ${lang.name}:`, langError);
        // Continue with other languages
      }
    }

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

    console.log(`✅ Blog post created with ${languagesGenerated} language versions`);

    return { success: true, postId: post.id, languagesGenerated };
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
      keyword,
      languages = ['en', 'zh', 'es', 'ar', 'pt', 'vi', 'ko', 'ja', 'fr', 'de'] // Default: top 10 languages
    } = body;

    console.log(`🎯 Keyword Blog Generator: action=${action}`);

    // Get language configs for requested languages
    const selectedLanguages = SUPPORTED_LANGUAGES.filter(l => languages.includes(l.code));

    // ============================================
    // ACTION: generate_daily
    // ============================================
    if (action === 'generate_daily') {
      const subjects = Object.keys(KEYWORD_DATABASE);
      
      // Pick random subject
      const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
      
      console.log(`📚 Today's subject: ${randomSubject}`);

      // Get unused keywords
      const unusedKeywords = await getUnusedKeywords(randomSubject);
      
      if (unusedKeywords.length === 0) {
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
      
      console.log(`🎯 Generating multilingual post for: "${selectedKeyword}"`);

      const saveResult = await saveBlogPost(
        selectedKeyword, 
        randomSubject, 
        selectedLanguages,
        true
      );

      return new Response(JSON.stringify({
        success: saveResult.success,
        postId: saveResult.postId,
        keyword: selectedKeyword,
        subject: randomSubject,
        languagesGenerated: saveResult.languagesGenerated,
        unusedKeywordsRemaining: unusedKeywords.length - (saveResult.success ? 1 : 0),
        error: saveResult.error
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ============================================
    // ACTION: generate_specific
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

      console.log(`🎯 Generating multilingual post for: "${keyword}" (${subject})`);

      const saveResult = await saveBlogPost(
        keyword, 
        subject, 
        selectedLanguages,
        true
      );

      return new Response(JSON.stringify({
        success: saveResult.success,
        postId: saveResult.postId,
        languagesGenerated: saveResult.languagesGenerated,
        error: saveResult.error
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ============================================
    // ACTION: generate_single_language
    // Generate for ONE language only (faster)
    // ============================================
    if (action === 'generate_single_language') {
      if (!subject || !keyword) {
        throw new Error('Subject and keyword are required');
      }

      const langCode = body.languageCode || 'en';
      const lang = SUPPORTED_LANGUAGES.find(l => l.code === langCode);
      
      if (!lang) {
        throw new Error(`Unsupported language: ${langCode}`);
      }

      console.log(`🎯 Generating ${lang.name} content for: "${keyword}"`);

      const content = await generateNativeContent(keyword, subject, lang.code, lang.name, lang.nativeName);

      if (!content) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Content generation failed'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        language: lang.code,
        preview: {
          title: content.title,
          excerpt: content.excerpt,
          contentLength: content.content.length
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ============================================
    // ACTION: list_keywords
    // ============================================
    if (action === 'list_keywords') {
      const allKeywords: Array<{ subject: string; keyword: string; used: boolean }> = [];

      for (const [subjectName, config] of Object.entries(KEYWORD_DATABASE)) {
        for (const kw of config.keywords) {
          const isUsed = await isKeywordUsed(kw);
          allKeywords.push({ subject: subjectName, keyword: kw, used: isUsed });
        }
      }

      const totalKeywords = allKeywords.length;
      const usedKeywords = allKeywords.filter(k => k.used).length;

      const bySubject: Record<string, { total: number; used: number; unused: number }> = {};
      for (const k of allKeywords) {
        if (!bySubject[k.subject]) {
          bySubject[k.subject] = { total: 0, used: 0, unused: 0 };
        }
        bySubject[k.subject].total++;
        if (k.used) bySubject[k.subject].used++;
        else bySubject[k.subject].unused++;
      }

      return new Response(JSON.stringify({
        success: true,
        summary: {
          totalKeywords,
          usedKeywords,
          unusedKeywords: totalKeywords - usedKeywords,
          percentageComplete: Math.round((usedKeywords / totalKeywords) * 100)
        },
        bySubject,
        supportedLanguages: SUPPORTED_LANGUAGES.map(l => ({ code: l.code, name: l.name })),
        keywords: allKeywords
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ============================================
    // ACTION: get_unused
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

    // ============================================
    // ACTION: list_languages
    // ============================================
    if (action === 'list_languages') {
      return new Response(JSON.stringify({
        success: true,
        languages: SUPPORTED_LANGUAGES,
        totalLanguages: SUPPORTED_LANGUAGES.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error: any) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
