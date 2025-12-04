import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, ArrowLeft, Globe, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { 
  useBlogLanguage, 
  getBlogUrl, 
  generateHreflangUrls,
  getLanguageName,
  getLanguageFlag,
  SUPPORTED_LANGUAGES 
} from '@/lib/blogUtils';
import SEO from '@/components/SEO';
import Header from '@/components/Header';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeStyles } from '@/hooks/useThemeStyles';

interface BlogPostTranslation {
  title: string;
  content: string;
  excerpt: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  language_code: string;
}

interface BlogPost {
  id: string;
  slug: string;
  featured_image_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  translation: BlogPostTranslation | null;
  availableLanguages: string[];
}

const BlogDetail = () => {
  const navigate = useNavigate();
  const params = useParams<{ slug: string; lang?: string }>();
  const { i18n } = useTranslation();
  const currentLang = useBlogLanguage();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const { theme } = useTheme();
  const themeStyles = useThemeStyles();
  const isNoteTheme = theme === 'note';

  useEffect(() => {
    if (params.slug) {
      loadBlogPost();
    }
  }, [params.slug, currentLang]);

  const loadBlogPost = async () => {
    try {
      setLoading(true);
      
      // First, get the blog post by slug
      const { data: postData, error: postError } = await supabase
        .from('blog_posts')
        .select('id, slug, featured_image_url, published_at, created_at, updated_at')
        .eq('slug', params.slug)
        .eq('status', 'published')
        .single();

      if (postError || !postData) {
        console.error('Error loading blog post:', postError);
        setLoading(false);
        return;
      }

      // Get all available translations for this post
      const { data: translations, error: transError } = await supabase
        .from('blog_post_translations')
        .select('title, content, excerpt, meta_description, meta_keywords, language_code')
        .eq('blog_post_id', postData.id);

      if (transError) {
        console.error('Error loading translations:', transError);
        setLoading(false);
        return;
      }

      // Find translation for current language, fallback to English
      const currentTranslation = translations?.find(t => t.language_code === currentLang) 
        || translations?.find(t => t.language_code === 'en')
        || translations?.[0];

      const availableLanguages = translations?.map(t => t.language_code) || [];

      setPost({
        ...postData,
        translation: currentTranslation || null,
        availableLanguages
      });
    } catch (error) {
      console.error('Error loading blog post:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (langCode: string) => {
    if (params.slug) {
      navigate(`/${langCode}/blog/${params.slug}`);
      setLanguageDropdownOpen(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(currentLang, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Generate hreflang URLs for SEO
  const hreflangUrls = post?.availableLanguages 
    ? generateHreflangUrls(params.slug || '', post.availableLanguages)
    : [];

  if (loading) {
    return (
      <div 
        className={`min-h-screen ${isNoteTheme ? 'font-serif' : 'bg-gradient-to-br from-slate-50 to-blue-50/30'}`}
        style={{ backgroundColor: isNoteTheme ? themeStyles.theme.colors.background : undefined }}
      >
        <Header />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
          <div className="text-center py-12">
            <div 
              className="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
              style={{ borderColor: isNoteTheme ? themeStyles.textPrimary : '#2563eb' }}
            />
            <p className="mt-4" style={{ color: themeStyles.textSecondary }}>Loading article...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!post || !post.translation) {
    return (
      <div 
        className={`min-h-screen ${isNoteTheme ? 'font-serif' : 'bg-gradient-to-br from-slate-50 to-blue-50/30'}`}
        style={{ backgroundColor: isNoteTheme ? themeStyles.theme.colors.background : undefined }}
      >
        <Header />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
          <Card style={isNoteTheme ? { backgroundColor: themeStyles.cardBackground, borderColor: themeStyles.border } : undefined}>
            <CardContent className="p-12 text-center">
              <h1 className={`text-2xl font-bold mb-4 ${isNoteTheme ? 'font-serif' : ''}`} style={{ color: themeStyles.textPrimary }}>
                Article Not Found
              </h1>
              <p className="mb-6" style={{ color: themeStyles.textSecondary }}>
                The article you're looking for doesn't exist or isn't available in your selected language.
              </p>
              <Button 
                onClick={() => navigate(`/${currentLang}/blog`)}
                style={isNoteTheme ? { backgroundColor: themeStyles.textPrimary, color: themeStyles.cardBackground } : undefined}
              >
                <ArrowLeft className="mr-2 w-4 h-4" />
                Back to Blog
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen ${isNoteTheme ? 'font-serif' : 'bg-gradient-to-br from-slate-50 to-blue-50/30'}`}
      style={{ backgroundColor: isNoteTheme ? themeStyles.theme.colors.background : undefined }}
    >
      <Header />
      
      <SEO
        title={post.translation.title}
        description={post.translation.meta_description || post.translation.excerpt || ''}
        keywords={post.translation.meta_keywords || ''}
        image={post.featured_image_url || undefined}
        type="article"
        lang={currentLang}
        url={getBlogUrl(post.slug, currentLang)}
        published={post.published_at || undefined}
        modified={post.updated_at || undefined}
        hreflang={hreflangUrls}
        schemaType="article"
      />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(`/${currentLang}/blog`)}
          className="mb-6"
          style={isNoteTheme ? { color: themeStyles.textPrimary } : undefined}
        >
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back to Blog
        </Button>

        {/* Language Switcher */}
        {post.availableLanguages.length > 1 && (
          <div className="mb-6">
            <div className="relative inline-block">
              <Button
                variant="outline"
                onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                className="flex items-center gap-2"
                style={isNoteTheme ? { borderColor: themeStyles.border, color: themeStyles.textPrimary } : undefined}
              >
                <Globe className="w-4 h-4" />
                <span>{getLanguageFlag(currentLang)} {getLanguageName(currentLang)}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${languageDropdownOpen ? 'rotate-180' : ''}`} />
              </Button>

              {languageDropdownOpen && (
                <div 
                  className="absolute top-full left-0 mt-2 rounded-lg shadow-lg z-50 min-w-[200px] max-h-64 overflow-y-auto"
                  style={{ 
                    backgroundColor: isNoteTheme ? themeStyles.cardBackground : 'white',
                    borderColor: themeStyles.border,
                    border: `1px solid ${themeStyles.border}`
                  }}
                >
                  {post.availableLanguages.map((langCode) => (
                    <button
                      key={langCode}
                      onClick={() => handleLanguageChange(langCode)}
                      className="w-full text-left px-4 py-2 transition-colors flex items-center gap-2"
                      style={{ 
                        backgroundColor: langCode === currentLang ? (isNoteTheme ? themeStyles.hoverBg : '#eff6ff') : 'transparent',
                        color: themeStyles.textPrimary
                      }}
                    >
                      <span>{getLanguageFlag(langCode)}</span>
                      <span>{getLanguageName(langCode)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Article Header */}
        <article 
          className="rounded-lg shadow-sm overflow-hidden"
          style={{ 
            backgroundColor: isNoteTheme ? themeStyles.cardBackground : 'white',
            border: isNoteTheme ? `1px solid ${themeStyles.border}` : undefined
          }}
        >
          {post.featured_image_url && (
            <div className="aspect-video w-full overflow-hidden" style={{ backgroundColor: themeStyles.border }}>
              <img
                src={post.featured_image_url}
                alt={post.translation.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <CardContent className="p-8">
            {/* Metadata */}
            <div className="flex items-center gap-4 text-sm mb-6" style={{ color: themeStyles.textSecondary }}>
              {!isNoteTheme && (
                <>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(post.published_at || post.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{Math.ceil(post.translation.content.split(' ').length / 200)} min read</span>
                  </div>
                </>
              )}
              {isNoteTheme && (
                <>
                  <span>{formatDate(post.published_at || post.created_at)}</span>
                  <span>·</span>
                  <span>{Math.ceil(post.translation.content.split(' ').length / 200)} min read</span>
                </>
              )}
            </div>

            {/* Title */}
            <h1 
              className={`text-4xl sm:text-5xl font-bold mb-4 ${isNoteTheme ? 'font-serif' : ''}`}
              style={{ color: themeStyles.textPrimary }}
            >
              {post.translation.title}
            </h1>

            {/* Excerpt */}
            {post.translation.excerpt && (
              <p 
                className={`text-xl mb-8 leading-relaxed ${isNoteTheme ? 'font-serif italic' : ''}`}
                style={{ color: themeStyles.textSecondary }}
              >
                {post.translation.excerpt}
              </p>
            )}

            {/* Content */}
            <div 
              className={`prose prose-lg max-w-none ${isNoteTheme ? 'prose-stone font-serif' : ''}`}
              style={isNoteTheme ? {
                '--tw-prose-body': themeStyles.textPrimary,
                '--tw-prose-headings': themeStyles.textPrimary,
                '--tw-prose-links': themeStyles.textPrimary,
                '--tw-prose-bold': themeStyles.textPrimary,
                '--tw-prose-bullets': themeStyles.textSecondary,
                '--tw-prose-quotes': themeStyles.textSecondary,
                color: themeStyles.textPrimary
              } as React.CSSProperties : undefined}
              dangerouslySetInnerHTML={{ __html: post.translation.content }}
            />
          </CardContent>
        </article>

        {/* Call to Action */}
        <Card 
          className="mt-8"
          style={isNoteTheme ? { 
            backgroundColor: themeStyles.cardBackground, 
            borderColor: themeStyles.border 
          } : undefined}
        >
          <CardContent className="p-6 text-center">
            <h2 
              className={`text-2xl font-bold mb-2 ${isNoteTheme ? 'font-serif' : ''}`}
              style={{ color: themeStyles.textPrimary }}
            >
              Ready to Improve Your English?
            </h2>
            <p className="mb-4" style={{ color: themeStyles.textSecondary }}>
              Start practicing with our AI-powered learning platform
            </p>
            <Button
              onClick={() => navigate('/ielts-portal')}
              style={isNoteTheme ? { 
                backgroundColor: themeStyles.textPrimary, 
                color: themeStyles.cardBackground 
              } : undefined}
              className={!isNoteTheme ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              Start Learning Now
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default BlogDetail;










