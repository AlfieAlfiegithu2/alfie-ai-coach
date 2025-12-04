import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Eye, Save, X, Globe, Calendar, Languages, CheckCircle, AlertCircle, Loader2, HelpCircle, Sparkles, Wand2 } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { slugify, SUPPORTED_LANGUAGES, getLanguageName, getLanguageFlag } from '@/lib/blogUtils';
import SEO from '@/components/SEO';

interface BlogPost {
  id: string;
  slug: string;
  featured_image_url: string | null;
  status: 'draft' | 'published' | 'archived';
  published_at: string | null;
  created_at: string;
  translations: BlogTranslation[];
}

interface BlogTranslation {
  id?: string;
  language_code: string;
  title: string;
  content: string;
  excerpt: string;
  meta_description: string;
  meta_keywords: string;
}

const AdminBlogManagement = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [currentTab, setCurrentTab] = useState<string>('list');

  // Form states
  const [slug, setSlug] = useState('');
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft');
  const [scheduledAt, setScheduledAt] = useState<string>(''); // For scheduled publishing
  const [translations, setTranslations] = useState<Record<string, BlogTranslation>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatingLanguages, setTranslatingLanguages] = useState<Set<string>>(new Set());
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');

  useEffect(() => {
    loadBlogPosts();
  }, []);

  const loadBlogPosts = async () => {
    try {
      setLoading(true);
      const { data: postsData, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          blog_post_translations (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedPosts = (postsData || []).map((post: any) => ({
        ...post,
        translations: post.blog_post_translations || []
      }));

      setPosts(transformedPosts);
    } catch (error) {
      console.error('Error loading blog posts:', error);
      toast.error('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  };

  const startCreating = () => {
    setIsCreating(true);
    setEditingPost(null);
    setSlug('');
    setFeaturedImageUrl('');
    setStatus('draft');
    setScheduledAt('');
    setTranslations({});
    setCurrentTab('edit');
  };

  const startEditing = (post: BlogPost) => {
    setEditingPost(post);
    setIsCreating(false);
    setSlug(post.slug);
    setFeaturedImageUrl(post.featured_image_url || '');
    setStatus(post.status);
    
    // Check if post has a future publish date (scheduled)
    if (post.published_at && new Date(post.published_at) > new Date()) {
      setScheduledAt(post.published_at.slice(0, 16)); // Format for datetime-local input
    } else {
      setScheduledAt('');
    }
    
    // Convert translations array to object
    const translationsObj: Record<string, BlogTranslation> = {};
    post.translations.forEach((trans: any) => {
      translationsObj[trans.language_code] = {
        id: trans.id,
        language_code: trans.language_code,
        title: trans.title,
        content: trans.content,
        excerpt: trans.excerpt || '',
        meta_description: trans.meta_description || '',
        meta_keywords: trans.meta_keywords || ''
      };
    });
    setTranslations(translationsObj);
    setCurrentTab('edit');
  };

  const cancelEditing = () => {
    setEditingPost(null);
    setIsCreating(false);
    setSlug('');
    setFeaturedImageUrl('');
    setStatus('draft');
    setScheduledAt('');
    setTranslations({});
    setTranslatingLanguages(new Set());
    setSelectedLanguage('en');
    setCurrentTab('list');
  };

  const updateTranslation = (langCode: string, field: keyof BlogTranslation, value: string) => {
    setTranslations(prev => ({
      ...prev,
      [langCode]: {
        ...prev[langCode],
        language_code: langCode,
        [field]: value
      }
    }));
  };

  const generateSlugFromTitle = (title: string, langCode: string = 'en') => {
    if (!title.trim()) return '';
    const baseSlug = slugify(title);
    // If editing existing post, keep original slug
    if (editingPost && editingPost.slug) {
      return editingPost.slug;
    }
    // For new posts, check if slug exists, add timestamp if needed
    return baseSlug;
  };

  const handleTitleChange = (langCode: string, title: string) => {
    updateTranslation(langCode, 'title', title);
    // Auto-generate slug from English title if slug is empty
    if (langCode === 'en' && !slug) {
      const newSlug = generateSlugFromTitle(title);
      if (newSlug) {
        setSlug(newSlug);
      }
    }
  };

  const checkTranslationCache = async (
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<string | null> => {
    // Only cache short phrases/sentences (not full articles)
    if (text.length > 200 || text.split(' ').length > 10) {
      return null;
    }

    try {
      const { data } = await supabase
        .from('translation_cache')
        .select('translation')
        .eq('word', text.toLowerCase().trim())
        .eq('source_lang', sourceLang)
        .eq('target_lang', targetLang)
        .gt('expires_at', new Date().toISOString())
        .single();

      return data?.translation || null;
    } catch {
      return null;
    }
  };

  const saveToTranslationCache = async (
    originalText: string,
    translatedText: string,
    sourceLang: string,
    targetLang: string
  ) => {
    // Only cache short phrases/sentences
    if (originalText.length > 200 || originalText.split(' ').length > 10) {
      return;
    }

    try {
      await supabase
        .from('translation_cache')
        .upsert({
          word: originalText.toLowerCase().trim(),
          source_lang: sourceLang,
          target_lang: targetLang,
          translation: translatedText,
          hit_count: 1,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }, { onConflict: 'word,source_lang,target_lang' });
    } catch (error) {
      // Silently fail - caching is not critical
      console.debug('Failed to cache translation:', error);
    }
  };

  const generateExcerpt = async (title: string, content: string): Promise<string> => {
    try {
      const response = await supabase.functions.invoke('translation-service', {
        body: {
          text: `Generate a compelling 1-2 sentence excerpt (max 160 characters) for a blog post with title: "${title}". Content summary: ${content.substring(0, 500)}${content.length > 500 ? '...' : ''}`,
          sourceLang: 'en',
          targetLang: 'en',
          includeContext: false
        }
      });

      if (response.data?.success && response.data.result?.translation) {
        return response.data.result.translation.trim();
      }

      // Fallback: generate from content
      const plainContent = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return plainContent.substring(0, 160);
    } catch (error) {
      console.error('Failed to generate excerpt:', error);
      // Fallback: generate from content
      const plainContent = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return plainContent.substring(0, 160);
    }
  };

  const generateMetaDescription = async (title: string, content: string): Promise<string> => {
    try {
      const response = await supabase.functions.invoke('translation-service', {
        body: {
          text: `Create an SEO-optimized meta description (max 155 characters) for a blog post titled: "${title}". Focus on the main benefit or key insight. Content: ${content.substring(0, 300)}${content.length > 300 ? '...' : ''}`,
          sourceLang: 'en',
          targetLang: 'en',
          includeContext: false
        }
      });

      if (response.data?.success && response.data.result?.translation) {
        return response.data.result.translation.trim();
      }

      // Fallback
      const plainContent = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return `${title}. ${plainContent.substring(0, 120)}`.substring(0, 155);
    } catch (error) {
      console.error('Failed to generate meta description:', error);
      // Fallback
      const plainContent = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return `${title}. ${plainContent.substring(0, 120)}`.substring(0, 155);
    }
  };

  const generateMetaKeywords = async (title: string, content: string): Promise<string> => {
    try {
      const response = await supabase.functions.invoke('translation-service', {
        body: {
          text: `Generate 5-8 relevant SEO keywords (comma-separated) for a blog post titled: "${title}". Include main topic, related terms, and long-tail keywords. Content preview: ${content.substring(0, 400)}${content.length > 400 ? '...' : ''}`,
          sourceLang: 'en',
          targetLang: 'en',
          includeContext: false
        }
      });

      if (response.data?.success && response.data.result?.translation) {
        return response.data.result.translation.trim();
      }

      // Fallback keywords
      return 'IELTS, English learning, AI tutor, IELTS Speaking, IELTS Writing';
    } catch (error) {
      console.error('Failed to generate meta keywords:', error);
      // Fallback keywords
      return 'IELTS, English learning, AI tutor, IELTS Speaking, IELTS Writing';
    }
  };

  const generateImageSuggestion = async (title: string, content: string): Promise<string> => {
    try {
      const response = await supabase.functions.invoke('translation-service', {
        body: {
          text: `Suggest a descriptive filename for a featured image for a blog post titled: "${title}". Content summary: ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}. Return just the filename without extension (e.g., "ielts-speaking-practice-guide").`,
          sourceLang: 'en',
          targetLang: 'en',
          includeContext: false
        }
      });

      if (response.data?.success && response.data.result?.translation) {
        const filename = response.data.result.translation.trim().toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-+/g, '-') // Replace multiple hyphens
          .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

        return `https://storage.googleapis.com/gpt-engineer-file-uploads/${filename}`;
      }

      // Fallback
      return `https://storage.googleapis.com/gpt-engineer-file-uploads/${slugify(title)}-featured-image`;
    } catch (error) {
      console.error('Failed to generate image suggestion:', error);
      // Fallback
      return `https://storage.googleapis.com/gpt-engineer-file-uploads/${slugify(title)}-featured-image`;
    }
  };

  const generateSEOOptimizedTitle = async (content: string, targetKeywords: string = '', niche: string = 'IELTS'): Promise<string> => {
    try {
      const prompt = `Generate an SEO-optimized blog post title for content about: "${content.substring(0, 500)}${content.length > 500 ? '...' : ''}"

SEO REQUIREMENTS:
- Length: 50-65 characters (ideal for Google)
- Include primary keyword naturally
- Add power words (Best, Ultimate, Complete, Essential, Proven, etc.)
- Create curiosity or solve a problem
- Target search intent
${targetKeywords ? `- Include these target keywords: ${targetKeywords}` : ''}
- Niche: ${niche} preparation and learning

Return ONLY the title, no quotes or explanation.`;

      const response = await supabase.functions.invoke('translation-service', {
        body: {
          text: prompt,
          sourceLang: 'en',
          targetLang: 'en',
          includeContext: false
        }
      });

      if (response.data?.success && response.data.result?.translation) {
        return response.data.result.translation.trim();
      }

      // Fallback: generate a basic title
      const firstSentence = content.split('.')[0].substring(0, 60);
      return `${firstSentence} - ${niche} Guide`;
    } catch (error) {
      console.error('Failed to generate SEO title:', error);
      // Fallback
      const firstSentence = content.split('.')[0].substring(0, 60);
      return `${firstSentence} - ${niche} Guide`;
    }
  };

  const generateComprehensiveSEOContent = async (content: string, niche: string = 'IELTS'): Promise<{
    title: string;
    excerpt: string;
    metaDescription: string;
    metaKeywords: string;
  }> => {
    try {
      const prompt = `Analyze this blog content and create comprehensive SEO content:

CONTENT TO ANALYZE:
"${content.substring(0, 800)}${content.length > 800 ? '...' : ''}"

NICHE: ${niche} preparation and learning

REQUIREMENTS:
1. TITLE (50-65 chars): SEO-optimized with primary keyword, power words, solves search intent
2. EXCERPT (1-2 sentences, max 160 chars): Compelling summary that hooks readers
3. META DESCRIPTION (120-155 chars): Includes main benefit, call-to-action, and keywords
4. META KEYWORDS (5-8 keywords): Primary + related + long-tail keywords for ${niche}

Format your response exactly like this:
TITLE: [Your SEO title here]
EXCERPT: [Your compelling excerpt]
META_DESC: [Your meta description]
KEYWORDS: [keyword1, keyword2, keyword3, keyword4, keyword5]`;

      const response = await supabase.functions.invoke('translation-service', {
        body: {
          text: prompt,
          sourceLang: 'en',
          targetLang: 'en',
          includeContext: false
        }
      });

      if (response.data?.success && response.data.result?.translation) {
        const result = response.data.result.translation.trim();
        const lines = result.split('\n');

        const parseLine = (prefix: string) => {
          const line = lines.find(l => l.startsWith(prefix));
          return line ? line.replace(prefix, '').trim() : '';
        };

        return {
          title: parseLine('TITLE:'),
          excerpt: parseLine('EXCERPT:'),
          metaDescription: parseLine('META_DESC:'),
          metaKeywords: parseLine('KEYWORDS:')
        };
      }

      // Fallback: generate individual components
      const title = await generateSEOOptimizedTitle(content, '', niche);
      const excerpt = await generateExcerpt(title, content);
      const metaDescription = await generateMetaDescription(title, content);
      const metaKeywords = await generateMetaKeywords(title, content);

      return {
        title,
        excerpt,
        metaDescription,
        metaKeywords
      };
    } catch (error) {
      console.error('Failed to generate comprehensive SEO content:', error);
      // Fallback
      const title = await generateSEOOptimizedTitle(content, '', niche);
      const excerpt = await generateExcerpt(title, content);
      const metaDescription = await generateMetaDescription(title, content);
      const metaKeywords = await generateMetaKeywords(title, content);

      return {
        title,
        excerpt,
        metaDescription,
        metaKeywords
      };
    }
  };

  const translateWithRetry = async (
    text: string,
    sourceLang: string,
    targetLang: string,
    maxRetries: number = 2
  ): Promise<string | null> => {
    // Check cache first
    const cached = await checkTranslationCache(text, sourceLang, targetLang);
    if (cached) {
      console.log(`Cache hit for "${text.substring(0, 30)}..." → "${cached.substring(0, 30)}..."`);
      return cached;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await supabase.functions.invoke('translation-service', {
          body: {
            text,
            sourceLang,
            targetLang,
            includeContext: false
          }
        });

        if (response.error || !response.data?.success || !response.data.result?.translation) {
          console.warn(`Translation attempt ${attempt} failed for ${targetLang}:`, response.error || response.data);
          if (attempt === maxRetries) {
            return null; // All retries failed
          }
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          continue;
        }

        const translatedText = String(response.data.result.translation).trim();

        // Cache the successful translation
        await saveToTranslationCache(text, translatedText, sourceLang, targetLang);

        return translatedText;
      } catch (error) {
        console.error(`Translation attempt ${attempt} error for ${targetLang}:`, error);
        if (attempt === maxRetries) {
          return null; // All retries failed
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
    return null;
  };

  const autoTranslateOnPublish = async (postId: string) => {
    try {
      const base = translations['en'];
      if (!base || !base.title?.trim() || !base.content?.trim()) {
        return; // Should not happen as we check this earlier
      }

      // Determine target languages (all except English)
      const targetLangs = SUPPORTED_LANGUAGES
        .map(l => l.code)
        .filter(code => code !== 'en');

      // Check which translations already exist in database
      const { data: existingTranslations } = await supabase
        .from('blog_post_translations')
        .select('language_code')
        .eq('blog_post_id', postId);

      const existingLangCodes = existingTranslations?.map(t => t.language_code) || [];
      const languagesToTranslate = targetLangs.filter(code => !existingLangCodes.includes(code));

      if (languagesToTranslate.length === 0) {
        return; // All languages already have translations
      }

      console.log(`Auto-translating ${languagesToTranslate.length} languages for published post...`);

      // Show progress indicator
      let completed = 0;
      const total = languagesToTranslate.length;
      toast.loading(`Auto-translating languages (0/${total})...`, { id: 'auto-translate' });

      // Translate each missing language with parallel processing but controlled concurrency
      const concurrency = 3; // Process 3 languages at a time
      const results: (string | null)[] = [];

      for (let i = 0; i < languagesToTranslate.length; i += concurrency) {
        const batch = languagesToTranslate.slice(i, i + concurrency);
        const batchPromises = batch.map(async (langCode) => {
          try {
            // Update progress
            toast.loading(`Auto-translating languages (${completed}/${total})...`, { id: 'auto-translate' });

            // Translate title and content in parallel for each language
            const [titleTranslated, contentTranslated] = await Promise.all([
              translateWithRetry(base.title, 'en', langCode),
              translateWithRetry(base.content, 'en', langCode)
            ]);

            if (!titleTranslated || !contentTranslated) {
              console.warn(`Failed to translate ${langCode} after retries`);
              results.push(null);
              return null;
            }

            // Generate excerpt and meta from translated content
            const plain = contentTranslated
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();

            const excerpt = plain.slice(0, 160);
            const metaDescription = plain.slice(0, 155);
            const metaKeywords = base.meta_keywords?.trim()
              ? base.meta_keywords
              : 'IELTS, English learning, AI tutor, IELTS Speaking, IELTS Writing';

            // Save translation to database
            const { error: insertError } = await supabase
              .from('blog_post_translations')
              .insert({
                blog_post_id: postId,
                language_code: langCode,
                title: titleTranslated,
                content: contentTranslated,
                excerpt,
                meta_description: metaDescription,
                meta_keywords: metaKeywords
              });

            if (insertError) {
              console.error(`Failed to save translation for ${langCode}:`, insertError);
              results.push(null);
              return null;
            }

            results.push(langCode);
            completed++;
            return langCode;
          } catch (error) {
            console.error(`Error translating to ${langCode}:`, error);
            results.push(null);
            return null;
          }
        });

        await Promise.all(batchPromises);
      }

      const successfulTranslations = results.filter(result => result !== null);

      // Dismiss progress toast
      toast.dismiss('auto-translate');

      if (successfulTranslations.length > 0) {
        console.log(`Successfully auto-translated ${successfulTranslations.length} languages: ${successfulTranslations.join(', ')}`);
        toast.success(`Auto-published in ${successfulTranslations.length} additional languages using Gemini 2.5 Flash Lite.`);
      }

      if (successfulTranslations.length < languagesToTranslate.length) {
        const failedCount = languagesToTranslate.length - successfulTranslations.length;
        toast.warning(`${failedCount} translations failed. You can translate them manually later.`);
      }

    } catch (error) {
      console.error('Error in auto-translate on publish:', error);
      toast.dismiss('auto-translate');
      // Don't throw error here - we don't want to block publishing
      toast.warning('Post published, but some translations may have failed. Check the post and translate manually if needed.');
    }
  };

  const handleAutoTranslateAll = async () => {
    try {
      // Ensure base English content exists
      const base = translations['en'];
      if (!base || !base.title?.trim() || !base.content?.trim()) {
        toast.error('Add English title and content first, then auto-translate.');
        return;
      }

      setIsTranslating(true);

      // Determine target languages (all except English)
      const targetLangs = SUPPORTED_LANGUAGES
        .map(l => l.code)
        .filter(code => code !== 'en');

      const newTranslations = { ...translations };
      let successCount = 0;
      let skipCount = 0;
      let errorCount = 0;

      // Process translations with controlled concurrency and retry logic
      const concurrency = 3; // Process 3 languages at a time

      for (let i = 0; i < targetLangs.length; i += concurrency) {
        const batch = targetLangs.slice(i, i + concurrency);
        const batchPromises = batch.map(async (langCode) => {
          const existing = translations[langCode];

          // Skip if translation already has both title and content (manual override)
          if (existing?.title?.trim() && existing?.content?.trim()) {
            skipCount++;
            return;
          }

          try {
            // Mark language as being translated
            setTranslatingLanguages(prev => new Set([...prev, langCode]));

            // Translate title and content in parallel with retry logic
            const [titleTranslated, contentTranslated] = await Promise.all([
              translateWithRetry(base.title, 'en', langCode),
              translateWithRetry(base.content, 'en', langCode)
            ]);

            if (!titleTranslated || !contentTranslated) {
              console.warn(`Failed to translate ${langCode} after retries`);
              errorCount++;
              return;
            }

            // Generate excerpt and meta from translated content
            const plain = contentTranslated
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();

            const excerpt = plain.slice(0, 160);
            const metaDescription = plain.slice(0, 155);

            // Use English meta_keywords if available, otherwise default
            const metaKeywords = base.meta_keywords?.trim()
              ? base.meta_keywords
              : 'IELTS, English learning, AI tutor, IELTS Speaking, IELTS Writing';

            // Update translation
            newTranslations[langCode] = {
              id: existing?.id,
              language_code: langCode,
              title: titleTranslated,
              content: contentTranslated,
              excerpt,
              meta_description: metaDescription,
              meta_keywords: metaKeywords
            };

            successCount++;

          } catch (error) {
            console.error(`Error translating to ${langCode}:`, error);
            errorCount++;
          } finally {
            // Always remove from translating set
            setTranslatingLanguages(prev => {
              const newSet = new Set(prev);
              newSet.delete(langCode);
              return newSet;
            });
          }
        });

        await Promise.all(batchPromises);
      }

      setTranslations(newTranslations);

      // Dismiss progress toast and show result
      toast.dismiss('translating');

      // Show summary toast
      if (successCount > 0) {
        toast.success(
          `Auto-translated ${successCount} language${successCount > 1 ? 's' : ''} using Gemini 2.5 Flash Lite.` +
          (skipCount > 0 ? ` ${skipCount} skipped (already translated).` : '') +
          (errorCount > 0 ? ` ${errorCount} failed.` : '')
        );
      } else if (skipCount > 0) {
        toast.info(`All languages already have translations. ${skipCount} skipped.`);
      } else {
        toast.error('Failed to translate. Please try again.');
      }
    } catch (error: any) {
      console.error('Error in auto-translate:', error);
      toast.dismiss('translating');
      toast.error(error.message || 'Failed to auto-translate. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const savePost = async () => {
    try {
      if (!slug.trim()) {
        toast.error('Slug is required');
        return;
      }

      // Check if at least English translation exists
      if (!translations['en'] || !translations['en'].title.trim() || !translations['en'].content.trim()) {
        toast.error('English title and content are required');
        return;
      }

      let postId: string;

      // Determine publish date (scheduled or immediate)
      const getPublishDate = () => {
        if (status !== 'published') return null;
        if (scheduledAt) {
          return new Date(scheduledAt).toISOString();
        }
        return new Date().toISOString();
      };

      if (isCreating) {
        // Create new post
        const { data: newPost, error: postError } = await supabase
          .from('blog_posts')
          .insert({
            slug,
            featured_image_url: featuredImageUrl || null,
            status,
            published_at: getPublishDate()
          })
          .select()
          .single();

        if (postError) throw postError;
        postId = newPost.id;
      } else if (editingPost) {
        // Update existing post
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update({
            slug,
            featured_image_url: featuredImageUrl || null,
            status,
            published_at: status === 'published' 
              ? (scheduledAt ? new Date(scheduledAt).toISOString() : (editingPost.published_at || new Date().toISOString()))
              : null
          })
          .eq('id', editingPost.id);

        if (updateError) throw updateError;
        postId = editingPost.id;
      } else {
        toast.error('Invalid state');
        return;
      }

      // Auto-translate missing languages if publishing and only English exists
      if (status === 'published') {
        await autoTranslateOnPublish(postId);
      }

      // Save/update translations
      for (const langCode of Object.keys(translations)) {
        const trans = translations[langCode];

        if (trans.id) {
          // Update existing translation
          const { error: updateError } = await supabase
            .from('blog_post_translations')
            .update({
              title: trans.title,
              content: trans.content,
              excerpt: trans.excerpt || null,
              meta_description: trans.meta_description || null,
              meta_keywords: trans.meta_keywords || null
            })
            .eq('id', trans.id);

          if (updateError) throw updateError;
        } else {
          // Create new translation
          const { error: insertError } = await supabase
            .from('blog_post_translations')
            .insert({
              blog_post_id: postId,
              language_code: langCode,
              title: trans.title,
              content: trans.content,
              excerpt: trans.excerpt || null,
              meta_description: trans.meta_description || null,
              meta_keywords: trans.meta_keywords || null
            });

          if (insertError) throw insertError;
        }
      }

      toast.success(isCreating ? 'Blog post created successfully' : 'Blog post updated successfully');
      cancelEditing();
      loadBlogPosts();
    } catch (error: any) {
      console.error('Error saving blog post:', error);
      toast.error(error.message || 'Failed to save blog post');
    }
  };

  const deletePost = async (postId: string) => {
    try {
      // Translations will be deleted automatically due to CASCADE
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast.success('Blog post deleted successfully');
      loadBlogPosts();
    } catch (error: any) {
      console.error('Error deleting blog post:', error);
      toast.error(error.message || 'Failed to delete blog post');
    }
  };

  return (
    <TooltipProvider>
      <AdminLayout title="Blog Management" showBackButton>
        <SEO
          title="Blog Management - Admin"
          description="Manage blog posts and translations"
          lang="en"
        />

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Blog Posts</TabsTrigger>
          <TabsTrigger value="edit">
            {isCreating ? 'Create New Post' : editingPost ? 'Edit Post' : 'New Post'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">All Blog Posts</h2>
            <Button onClick={startCreating}>
              <Plus className="w-4 h-4 mr-2" />
              Create New Post
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-600 mb-4">No blog posts yet.</p>
                <Button onClick={startCreating}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Post
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {posts.map((post) => (
                <Card key={post.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold">{post.slug}</h3>
                          <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                            {post.status}
                          </Badge>
                          {post.status === 'published' && post.published_at && new Date(post.published_at) > new Date() && (
                            <Badge variant="outline" className="text-blue-600 border-blue-600">
                              <Calendar className="w-3 h-3 mr-1" />
                              Scheduled
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                          <span className="flex items-center gap-1">
                            <Globe className="w-4 h-4" />
                            {post.translations.length} language{post.translations.length !== 1 ? 's' : ''} published
                          </span>
                          {post.published_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(post.published_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {post.translations.slice(0, 5).map((trans: any) => (
                            <Badge key={trans.language_code} variant="outline" className="text-xs">
                              {getLanguageFlag(trans.language_code)} {trans.language_code === 'en' ? 'English' : getLanguageName(trans.language_code)}
                            </Badge>
                          ))}
                          {post.translations.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{post.translations.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/${post.translations[0]?.language_code || 'en'}/blog/${post.slug}`, '_blank')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(post)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Blog Post</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{post.slug}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deletePost(post.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="edit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {isCreating ? 'Create New Blog Post' : 'Edit Blog Post'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-medium">Slug (URL)</label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Slug (URL)</p>
                          <p className="text-xs text-gray-600">
                            The URL-friendly version of your post title that appears in the web address.
                          </p>
                          <div className="bg-blue-50 p-2 rounded text-xs">
                            <strong>Example:</strong><br/>
                            Title: "IELTS Speaking Practice Guide"<br/>
                            URL: yoursite.com/blog/ielts-speaking-practice-guide
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    placeholder="blog-post-slug"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <label className="block text-sm font-medium">Featured Image URL</label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Featured Image URL</p>
                            <p className="text-xs text-gray-600">
                              Main image for your blog post used in social media sharing and blog listings.
                            </p>
                            <div className="border-t pt-2 mt-2">
                              <p className="text-xs font-medium text-blue-600">🤖 AI Suggestion:</p>
                              <p className="text-xs text-gray-600">
                                Uses your <strong>title + content preview</strong> to suggest a descriptive filename for your image.
                              </p>
                              <div className="bg-blue-50 p-2 rounded text-xs mt-1">
                                <strong>Example:</strong><br/>
                                Title: "IELTS Speaking Practice Guide"<br/>
                                Generated: "ielts-speaking-practice-guide"<br/>
                                Full URL: "https://storage.googleapis.com/.../ielts-speaking-practice-guide"
                              </div>
                            </div>
                            <div className="bg-green-50 p-2 rounded text-xs">
                              <strong>Recommended size:</strong> 1200x630px<br/>
                              <strong>Formats:</strong> JPG, PNG, WebP
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const englishContent = translations['en'];
                        if (!englishContent?.title?.trim() || !englishContent?.content?.trim()) {
                          toast.error('Add English title and content first');
                          return;
                        }
                        try {
                          const suggestion = await generateImageSuggestion(englishContent.title, englishContent.content);
                          setFeaturedImageUrl(suggestion);
                          toast.success('Image URL suggestion generated!');
                        } catch (error) {
                          toast.error('Failed to generate image suggestion');
                        }
                      }}
                      className="flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      AI Suggest
                    </Button>
                  </div>
                  <Input
                    value={featuredImageUrl}
                    onChange={(e) => setFeaturedImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="block text-sm font-medium">Status</label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Post Status</p>
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                                <strong>Draft:</strong> Private - only visible to admins
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                <strong>Published:</strong> Live on website + auto-translated to all languages
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                                <strong>Archived:</strong> Hidden but accessible via direct link
                              </div>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as 'draft' | 'published' | 'archived')}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  {/* Schedule Publishing */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="block text-sm font-medium">Schedule Publishing</label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Schedule Publishing</p>
                            <p className="text-xs text-gray-600">
                              Set a future date and time to automatically publish this post. Leave empty to publish immediately when status is set to "Published".
                            </p>
                            <div className="bg-blue-50 p-2 rounded text-xs">
                              <strong>Note:</strong> The post will only be visible to readers after this date/time. Great for planning content ahead!
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                      min={new Date().toISOString().slice(0, 16)}
                    />
                    {scheduledAt && new Date(scheduledAt) > new Date() && (
                      <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Scheduled for {new Date(scheduledAt).toLocaleString()}
                      </p>
                    )}
                    {scheduledAt && new Date(scheduledAt) <= new Date() && (
                      <p className="text-xs text-orange-600 mt-1">
                        This date is in the past - post will be published immediately
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* AI SEO Content Generator */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    AI SEO Content Generator
                  </h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">AI SEO Content Generator</p>
                        <p className="text-xs text-gray-600">
                          Generate comprehensive SEO-optimized content including title, excerpt, meta description, and keywords. Uses advanced AI to analyze your content and create search-engine friendly elements.
                        </p>
                        <div className="border-t pt-2 mt-2">
                          <p className="text-xs font-medium text-blue-600">🤖 AI Features:</p>
                          <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
                            <li>SEO-optimized titles (50-65 chars)</li>
                            <li>Compelling excerpts (max 160 chars)</li>
                            <li>Meta descriptions (120-155 chars)</li>
                            <li>Relevant keywords (5-8 terms)</li>
                          </ul>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <Card className="border-gray-200">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Generate Complete SEO Package</h4>
                          <p className="text-sm text-gray-600">AI analyzes your content and creates SEO-optimized title, excerpt, meta description, and keywords</p>
                        </div>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={async () => {
                            const englishContent = translations['en'];
                            if (!englishContent?.content?.trim()) {
                              toast.error('Add English content first');
                              return;
                            }

                            try {
                              toast.loading('Generating comprehensive SEO content...', { id: 'seo-generate' });

                              const seoContent = await generateComprehensiveSEOContent(englishContent.content, 'IELTS');

                              // Update all fields
                              updateTranslation('en', 'title', seoContent.title);
                              updateTranslation('en', 'excerpt', seoContent.excerpt);
                              updateTranslation('en', 'meta_description', seoContent.metaDescription);
                              updateTranslation('en', 'meta_keywords', seoContent.metaKeywords);

                              // Auto-generate slug from new title
                              const newSlug = generateSlugFromTitle(seoContent.title);
                              if (newSlug) {
                                setSlug(newSlug);
                              }

                              // Also generate featured image suggestion
                              const imageSuggestion = await generateImageSuggestion(seoContent.title, englishContent.content);
                              setFeaturedImageUrl(imageSuggestion);

                              toast.dismiss('seo-generate');
                              toast.success('Complete SEO package generated! Title, excerpt, meta description, keywords, slug, and image URL updated.');
                            } catch (error) {
                              toast.dismiss('seo-generate');
                              toast.error('Failed to generate SEO content');
                            }
                          }}
                          disabled={!translations['en']?.content?.trim()}
                          className="flex items-center gap-2"
                        >
                          <Wand2 className="w-4 h-4" />
                          Generate SEO Package
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                        <div>
                          <h5 className="font-medium text-sm mb-2">Individual Generators</h5>
                          <div className="space-y-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const englishContent = translations['en'];
                                if (!englishContent?.content?.trim()) {
                                  toast.error('Add English content first');
                                  return;
                                }

                                try {
                                  const seoTitle = await generateSEOOptimizedTitle(englishContent.content, englishContent.meta_keywords, 'IELTS');
                                  updateTranslation('en', 'title', seoTitle);

                                  // Auto-generate slug from new title
                                  const newSlug = generateSlugFromTitle(seoTitle);
                                  if (newSlug) {
                                    setSlug(newSlug);
                                  }

                                  toast.success('SEO-optimized title and slug generated!');
                                } catch (error) {
                                  toast.error('Failed to generate SEO title');
                                }
                              }}
                              disabled={!translations['en']?.content?.trim()}
                              className="w-full justify-start text-xs"
                            >
                              <Wand2 className="w-3 h-3 mr-2" />
                              Generate SEO Title
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const englishContent = translations['en'];
                                if (!englishContent?.title?.trim() || !englishContent?.content?.trim()) {
                                  toast.error('Add title and content first');
                                  return;
                                }

                                try {
                                  const excerpt = await generateExcerpt(englishContent.title, englishContent.content);
                                  updateTranslation('en', 'excerpt', excerpt);
                                  toast.success('Excerpt generated!');
                                } catch (error) {
                                  toast.error('Failed to generate excerpt');
                                }
                              }}
                              disabled={!translations['en']?.title?.trim() || !translations['en']?.content?.trim()}
                              className="w-full justify-start text-xs"
                            >
                              <Wand2 className="w-3 h-3 mr-2" />
                              Generate Excerpt
                            </Button>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium text-sm mb-2">Meta Generators</h5>
                          <div className="space-y-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const englishContent = translations['en'];
                                if (!englishContent?.title?.trim() || !englishContent?.content?.trim()) {
                                  toast.error('Add title and content first');
                                  return;
                                }

                                try {
                                  const metaDesc = await generateMetaDescription(englishContent.title, englishContent.content);
                                  updateTranslation('en', 'meta_description', metaDesc);
                                  toast.success('Meta description generated!');
                                } catch (error) {
                                  toast.error('Failed to generate meta description');
                                }
                              }}
                              disabled={!translations['en']?.title?.trim() || !translations['en']?.content?.trim()}
                              className="w-full justify-start text-xs"
                            >
                              <Wand2 className="w-3 h-3 mr-2" />
                              Generate Meta Description
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const englishContent = translations['en'];
                                if (!englishContent?.title?.trim() || !englishContent?.content?.trim()) {
                                  toast.error('Add title and content first');
                                  return;
                                }

                                try {
                                  const keywords = await generateMetaKeywords(englishContent.title, englishContent.content);
                                  updateTranslation('en', 'meta_keywords', keywords);
                                  toast.success('Meta keywords generated!');
                                } catch (error) {
                                  toast.error('Failed to generate meta keywords');
                                }
                              }}
                              disabled={!translations['en']?.title?.trim() || !translations['en']?.content?.trim()}
                              className="w-full justify-start text-xs"
                            >
                              <Wand2 className="w-3 h-3 mr-2" />
                              Generate Keywords
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-start gap-2">
                          <HelpCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-blue-800">
                            <strong>Pro Tip:</strong> Start with content, then use "Generate SEO Package" for a complete optimized setup. Individual generators are useful for fine-tuning specific elements.
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Translations */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Content Editor</h3>
                  <div className="flex items-center gap-4">
                    {/* Language Selector */}
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-600" />
                      <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORTED_LANGUAGES.map(lang => {
                            const trans = translations[lang.code];
                            const isTranslated = trans?.title?.trim() && trans?.content?.trim();
                            const isTranslating = translatingLanguages.has(lang.code);

                            return (
                              <SelectItem key={lang.code} value={lang.code} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span>{lang.flag}</span>
                                  <span>{lang.nativeName} ({lang.name})</span>
                                  {lang.code === 'en' && <Badge variant="default" className="text-xs ml-2">Primary</Badge>}
                                </div>
                                <div className="flex items-center gap-1 ml-2">
                                  {isTranslating && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                                  {!isTranslating && isTranslated && <CheckCircle className="w-3 h-3 text-green-500" />}
                                  {!isTranslating && !isTranslated && lang.code !== 'en' && <AlertCircle className="w-3 h-3 text-orange-500" />}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Add selected language if it doesn't exist
                          if (!translations[selectedLanguage]) {
                            setTranslations({
                              ...translations,
                              [selectedLanguage]: {
                                language_code: selectedLanguage,
                                title: '',
                                content: '',
                                excerpt: '',
                                meta_description: '',
                                meta_keywords: ''
                              }
                            });
                          }
                        }}
                        disabled={!!translations[selectedLanguage]}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Language
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAutoTranslateAll}
                        disabled={isTranslating || !translations['en']?.title?.trim() || !translations['en']?.content?.trim()}
                      >
                        {isTranslating ? (
                          <>
                            <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Translating...
                          </>
                        ) : (
                          <>
                            <Languages className="w-4 h-4 mr-2" />
                            Auto-Translate All
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Single Language Editor */}
                {(() => {
                  const lang = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)!;
                  const trans = translations[selectedLanguage];
                  const isTranslating = translatingLanguages.has(selectedLanguage);
                  const isTranslated = trans?.title?.trim() && trans?.content?.trim();

                  const displayTrans = trans || {
                    language_code: selectedLanguage,
                    title: '',
                    content: '',
                    excerpt: '',
                    meta_description: '',
                    meta_keywords: ''
                  };

                  return (
                    <Card key={selectedLanguage} className={`transition-all duration-200 ${isTranslating ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''}`}>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {lang.flag} {lang.nativeName} ({lang.name})
                            {selectedLanguage === 'en' && <Badge variant="default" className="text-xs ml-2">Primary</Badge>}
                            {selectedLanguage !== 'en' && !trans && <Badge variant="outline" className="text-xs ml-2">Not Added</Badge>}
                            {selectedLanguage !== 'en' && trans && isTranslated && <Badge variant="default" className="text-xs ml-2 text-green-700 bg-green-100">Translated</Badge>}
                          </div>
                          <div className="flex items-center gap-2">
                            {isTranslating && (
                              <div className="flex items-center gap-1 text-blue-600">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-xs">Translating...</span>
                              </div>
                            )}
                            {!isTranslating && isTranslated && (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-xs">Complete</span>
                              </div>
                            )}
                            {!isTranslating && !isTranslated && selectedLanguage === 'en' && (
                              <div className="flex items-center gap-1 text-red-600">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-xs">Required</span>
                              </div>
                            )}
                            {!isTranslating && !isTranslated && selectedLanguage !== 'en' && (
                              <div className="flex items-center gap-1 text-orange-600">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-xs">Not Translated</span>
                              </div>
                            )}
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <label className="block text-sm font-medium">Title</label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">
                                <div className="space-y-2">
                                  <p className="text-sm font-medium">Title</p>
                                  <p className="text-xs text-gray-600">
                                    The main headline of your blog post that appears at the top of the article.
                                  </p>
                                  <div className="border-t pt-2 mt-2">
                                    <p className="text-xs text-orange-600">
                                      📝 {selectedLanguage === 'en' ? 'Primary content - write your main article title here' : 'Translated from English. Edit as needed for this language.'}
                                    </p>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Input
                            value={displayTrans.title}
                            onChange={(e) => handleTitleChange(selectedLanguage, e.target.value)}
                            placeholder="Blog post title"
                            disabled={isTranslating}
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <label className="block text-sm font-medium">Content (HTML supported)</label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">
                                <div className="space-y-2">
                                  <p className="text-sm font-medium">Content</p>
                                  <p className="text-xs text-gray-600">
                                    The main body of your blog post. HTML formatting is supported for rich text.
                                  </p>
                                  <div className="border-t pt-2 mt-2">
                                    <p className="text-xs text-orange-600">
                                      📝 {selectedLanguage === 'en' ? 'Primary content - write your full article here' : 'Auto-translated from English. Edit as needed for this language.'}
                                    </p>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Textarea
                            value={displayTrans.content}
                            onChange={(e) => updateTranslation(selectedLanguage, 'content', e.target.value)}
                            placeholder="Blog post content..."
                            rows={10}
                            className="font-mono text-sm"
                            disabled={isTranslating}
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <label className="block text-sm font-medium">Excerpt</label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm">
                                  <div className="space-y-2">
                                    <p className="text-sm font-medium">Excerpt</p>
                                    <p className="text-xs text-gray-600">
                                      A short summary of your post (max 160 characters) that appears in blog listings and social media previews.
                                    </p>
                                    <div className="border-t pt-2 mt-2">
                                      <p className="text-xs font-medium text-blue-600">🤖 AI Generation:</p>
                                      <p className="text-xs text-gray-600">
                                        Uses your <strong>title + first 500 characters of content</strong> to create a compelling 1-2 sentence summary.
                                      </p>
                                      <div className="bg-blue-50 p-2 rounded text-xs mt-1">
                                        <strong>Example:</strong><br/>
                                        Title: "IELTS Speaking Practice Guide"<br/>
                                        Content: "Master IELTS speaking with..."<br/>
                                        Generated: "Learn effective IELTS speaking strategies with personalized AI feedback and practice tests designed for band 9 success."
                                      </div>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                if (!displayTrans.title?.trim() || !displayTrans.content?.trim()) {
                                  toast.error('Add title and content first');
                                  return;
                                }
                                try {
                                  const excerpt = await generateExcerpt(displayTrans.title, displayTrans.content);
                                  updateTranslation(selectedLanguage, 'excerpt', excerpt);
                                  toast.success('Excerpt generated!');
                                } catch (error) {
                                  toast.error('Failed to generate excerpt');
                                }
                              }}
                              disabled={isTranslating}
                              className="flex items-center gap-1"
                            >
                              <Wand2 className="w-3 h-3" />
                              AI Generate
                            </Button>
                          </div>
                          <Textarea
                            value={displayTrans.excerpt}
                            onChange={(e) => updateTranslation(selectedLanguage, 'excerpt', e.target.value)}
                            placeholder="Short excerpt..."
                            rows={3}
                            disabled={isTranslating}
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <label className="block text-sm font-medium">Meta Description</label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm">
                                  <div className="space-y-2">
                                    <p className="text-sm font-medium">Meta Description</p>
                                    <p className="text-xs text-gray-600">
                                      SEO description (max 155 characters) that appears in Google search results under your title.
                                    </p>
                                    <div className="border-t pt-2 mt-2">
                                      <p className="text-xs font-medium text-blue-600">🤖 AI Generation:</p>
                                      <p className="text-xs text-gray-600">
                                        Uses your <strong>title + first 300 characters of content</strong> to create SEO-optimized copy that includes keywords and compelling benefits.
                                      </p>
                                      <div className="bg-blue-50 p-2 rounded text-xs mt-1">
                                        <strong>Example:</strong><br/>
                                        Title: "IELTS Speaking Practice Guide"<br/>
                                        Generated: "Improve your IELTS Speaking score with AI-powered practice tests, instant feedback, and personalized coaching. Join 50,000+ students achieving band 9 success."
                                      </div>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                if (!displayTrans.title?.trim() || !displayTrans.content?.trim()) {
                                  toast.error('Add title and content first');
                                  return;
                                }
                                try {
                                  const metaDesc = await generateMetaDescription(displayTrans.title, displayTrans.content);
                                  updateTranslation(selectedLanguage, 'meta_description', metaDesc);
                                  toast.success('Meta description generated!');
                                } catch (error) {
                                  toast.error('Failed to generate meta description');
                                }
                              }}
                              disabled={isTranslating}
                              className="flex items-center gap-1"
                            >
                              <Wand2 className="w-3 h-3" />
                              AI Generate
                            </Button>
                          </div>
                          <Textarea
                            value={displayTrans.meta_description}
                            onChange={(e) => updateTranslation(selectedLanguage, 'meta_description', e.target.value)}
                            placeholder="SEO meta description..."
                            rows={2}
                            disabled={isTranslating}
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <label className="block text-sm font-medium">Meta Keywords</label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm">
                                  <div className="space-y-2">
                                    <p className="text-sm font-medium">Meta Keywords</p>
                                    <p className="text-xs text-gray-600">
                                      Comma-separated keywords (5-8 total) that help search engines understand your content topic.
                                    </p>
                                    <div className="border-t pt-2 mt-2">
                                      <p className="text-xs font-medium text-blue-600">🤖 AI Generation:</p>
                                      <p className="text-xs text-gray-600">
                                        Uses your <strong>title + first 400 characters of content</strong> to generate relevant keywords including main topic, related terms, and long-tail phrases.
                                      </p>
                                      <div className="bg-blue-50 p-2 rounded text-xs mt-1">
                                        <strong>Example:</strong><br/>
                                        Title: "IELTS Speaking Practice Guide"<br/>
                                        Generated: "IELTS Speaking, speaking practice, AI tutor, IELTS preparation, band score improvement, English fluency, speaking test tips, IELTS coaching"
                                      </div>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                if (!displayTrans.title?.trim() || !displayTrans.content?.trim()) {
                                  toast.error('Add title and content first');
                                  return;
                                }
                                try {
                                  const keywords = await generateMetaKeywords(displayTrans.title, displayTrans.content);
                                  updateTranslation(selectedLanguage, 'meta_keywords', keywords);
                                  toast.success('Meta keywords generated!');
                                } catch (error) {
                                  toast.error('Failed to generate meta keywords');
                                }
                              }}
                              disabled={isTranslating}
                              className="flex items-center gap-1"
                            >
                              <Wand2 className="w-3 h-3" />
                              AI Generate
                            </Button>
                          </div>
                          <Input
                            value={displayTrans.meta_keywords}
                            onChange={(e) => updateTranslation(selectedLanguage, 'meta_keywords', e.target.value)}
                            placeholder="keyword1, keyword2, keyword3"
                            disabled={isTranslating}
                          />
                        </div>

                        {/* Remove language button for non-English languages */}
                        {selectedLanguage !== 'en' && trans && (
                          <div className="pt-4 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newTranslations = { ...translations };
                                delete newTranslations[selectedLanguage];
                                setTranslations(newTranslations);
                                setSelectedLanguage('en'); // Switch back to English
                              }}
                              disabled={isTranslating}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Remove {lang.nativeName} Translation
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Show message about auto-translation for other languages */}
                {selectedLanguage === 'en' && Object.keys(translations).length === 1 && translations['en']?.title?.trim() && translations['en']?.content?.trim() && (
                  <Card className="border-dashed border-2 border-gray-300">
                    <CardContent className="p-8 text-center">
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <Globe className="w-8 h-8 text-gray-400" />
                        <Languages className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Ready for Global Publishing</h3>
                      <p className="text-gray-600 mb-4">
                        Your English content is complete! When you publish this post, it will be automatically translated to all {SUPPORTED_LANGUAGES.length - 1} supported languages using Gemini 2.5 Flash Lite.
                      </p>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {SUPPORTED_LANGUAGES.filter(l => l.code !== 'en').slice(0, 12).map(lang => (
                          <Badge key={lang.code} variant="outline" className="text-xs">
                            {lang.flag} {lang.nativeName}
                          </Badge>
                        ))}
                        {SUPPORTED_LANGUAGES.length > 13 && (
                          <Badge variant="outline" className="text-xs">
                            +{SUPPORTED_LANGUAGES.length - 13} more
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Show summary of translated languages */}
                {Object.keys(translations).length > 1 && (
                  <Card className="bg-gray-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Languages className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium">Translation Summary</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {SUPPORTED_LANGUAGES.filter(lang => translations[lang.code]?.title?.trim() && translations[lang.code]?.content?.trim()).map(lang => (
                            <Badge key={lang.code} variant="default" className="text-xs bg-green-100 text-green-800">
                              {lang.flag} {lang.nativeName}
                            </Badge>
                          ))}
                          {SUPPORTED_LANGUAGES.filter(lang => !translations[lang.code]?.title?.trim() || !translations[lang.code]?.content?.trim()).filter(lang => lang.code !== 'en').slice(0, 3).map(lang => (
                            <Badge key={lang.code} variant="outline" className="text-xs">
                              {lang.flag} {lang.nativeName}
                            </Badge>
                          ))}
                          {SUPPORTED_LANGUAGES.filter(lang => !translations[lang.code]?.title?.trim() || !translations[lang.code]?.content?.trim()).filter(lang => lang.code !== 'en').length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{SUPPORTED_LANGUAGES.filter(lang => !translations[lang.code]?.title?.trim() || !translations[lang.code]?.content?.trim()).filter(lang => lang.code !== 'en').length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={cancelEditing}>
                  Cancel
                </Button>
                <Button onClick={savePost}>
                  <Save className="w-4 h-4 mr-2" />
                  {isCreating ? 'Create Post' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
    </TooltipProvider>
  );
};

export default AdminBlogManagement;




