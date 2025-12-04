import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, ArrowRight, Globe, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBlogLanguage, getBlogUrl, getLanguageName, SUPPORTED_LANGUAGES } from '@/lib/blogUtils';
import SEO from '@/components/SEO';
import Header from '@/components/Header';
import LanguageSelector from '@/components/LanguageSelector';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeStyles } from '@/hooks/useThemeStyles';

interface BlogPost {
  id: string;
  slug: string;
  featured_image_url: string | null;
  published_at: string | null;
  created_at: string;
  translation: {
    title: string;
    excerpt: string | null;
    language_code: string;
  } | null;
}

const BlogListing = () => {
  const navigate = useNavigate();
  const params = useParams<{ lang?: string }>();
  const { i18n } = useTranslation();
  const currentLang = useBlogLanguage();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { theme } = useTheme();
  const themeStyles = useThemeStyles();
  const isNoteTheme = theme === 'note';

  useEffect(() => {
    loadBlogPosts();
  }, [currentLang]);

  const loadBlogPosts = async () => {
    try {
      setLoading(true);
      
      // Fetch published blog posts with translations for current language
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          id,
          slug,
          featured_image_url,
          published_at,
          created_at,
          blog_post_translations!inner (
            title,
            excerpt,
            language_code
          )
        `)
        .eq('status', 'published')
        .eq('blog_post_translations.language_code', currentLang)
        .order('published_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading blog posts:', error);
        return;
      }

      // Transform data to include translation
      const transformedPosts = (data || []).map((post: any) => ({
        id: post.id,
        slug: post.slug,
        featured_image_url: post.featured_image_url,
        published_at: post.published_at,
        created_at: post.created_at,
        translation: Array.isArray(post.blog_post_translations) 
          ? post.blog_post_translations[0] 
          : post.blog_post_translations
      }));

      setPosts(transformedPosts);
    } catch (error) {
      console.error('Error loading blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(post => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      post.translation?.title.toLowerCase().includes(query) ||
      post.translation?.excerpt?.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(currentLang, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div 
      className={`min-h-screen ${isNoteTheme ? 'font-serif' : 'bg-gradient-to-br from-slate-50 to-blue-50/30'}`}
      style={{ backgroundColor: isNoteTheme ? themeStyles.theme.colors.background : undefined }}
    >
      <Header />
      
      <SEO
        title="Blog - English Learning Tips & IELTS Preparation"
        description="Discover expert tips, strategies, and insights for IELTS preparation and English learning. AI-powered guidance to help you achieve your language goals."
        keywords="IELTS blog, English learning tips, IELTS preparation, language learning blog"
        type="website"
        lang={currentLang}
        url={`https://englishaidol.com/${currentLang}/blog`}
      />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-7xl">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 
            className={`text-4xl sm:text-5xl font-bold mb-4 ${isNoteTheme ? 'font-serif' : 'text-gray-900'}`}
            style={isNoteTheme ? { color: themeStyles.textPrimary } : undefined}
          >
            English Learning Blog
          </h1>
          <p className={`text-xl max-w-2xl mx-auto ${!isNoteTheme ? 'text-gray-600' : ''}`} style={isNoteTheme ? { color: themeStyles.textSecondary } : undefined}>
            Expert tips, strategies, and insights for IELTS preparation and English mastery
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8 max-w-2xl mx-auto">
          <div className="relative">
            {!isNoteTheme && <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />}
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${isNoteTheme ? 'pl-4' : 'pl-10'} pr-4 py-3 rounded-lg focus:ring-2 focus:outline-none`}
              style={isNoteTheme ? {
                backgroundColor: themeStyles.cardBackground,
                borderColor: themeStyles.border,
                border: `1px solid ${themeStyles.border}`,
                color: themeStyles.textPrimary
              } : {
                border: '1px solid #d1d5db'
              }}
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div 
              className="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
              style={{ borderColor: isNoteTheme ? themeStyles.textPrimary : '#2563eb' }}
            />
            <p className="mt-4" style={{ color: themeStyles.textSecondary }}>Loading articles...</p>
          </div>
        )}

        {/* Blog Posts Grid */}
        {!loading && filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <p className={`text-lg ${!isNoteTheme ? 'text-gray-600' : ''}`} style={isNoteTheme ? { color: themeStyles.textSecondary } : undefined}>
              {searchQuery ? 'No articles found matching your search.' : 'No blog posts available yet. Check back soon!'}
            </p>
          </div>
        )}

        {!loading && filteredPosts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post) => (
              <Card
                key={post.id}
                className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden group"
                onClick={() => navigate(`/${currentLang}/blog/${post.slug}`)}
                style={isNoteTheme ? {
                  backgroundColor: themeStyles.cardBackground,
                  borderColor: themeStyles.border
                } : undefined}
              >
                {post.featured_image_url && (
                  <div className="aspect-video w-full overflow-hidden" style={{ backgroundColor: isNoteTheme ? themeStyles.border : '#e5e7eb' }}>
                    <img
                      src={post.featured_image_url}
                      alt={post.translation?.title || 'Blog post'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <CardContent className="p-6">
                  <div className={`flex items-center gap-2 text-sm mb-3 ${!isNoteTheme ? 'text-gray-500' : ''}`} style={isNoteTheme ? { color: themeStyles.textSecondary } : undefined}>
                    {!isNoteTheme && <Calendar className="w-4 h-4" />}
                    <span>{formatDate(post.published_at || post.created_at)}</span>
                  </div>
                  
                  <h2 
                    className={`text-xl font-bold mb-2 line-clamp-2 transition-colors ${isNoteTheme ? 'font-serif' : 'group-hover:text-blue-600 text-gray-900'}`}
                    style={isNoteTheme ? { color: themeStyles.textPrimary } : undefined}
                  >
                    {post.translation?.title || 'Untitled'}
                  </h2>
                  
                  {post.translation?.excerpt && (
                    <p className={`mb-4 line-clamp-3 ${!isNoteTheme ? 'text-gray-600' : ''}`} style={isNoteTheme ? { color: themeStyles.textSecondary } : undefined}>
                      {post.translation.excerpt}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={!isNoteTheme ? 'group-hover:text-blue-600' : ''}
                      style={isNoteTheme ? { color: themeStyles.textPrimary } : undefined}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/${currentLang}/blog/${post.slug}`);
                      }}
                    >
                      Read More
                      {!isNoteTheme && <ArrowRight className="ml-2 w-4 h-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Language Notice */}
        <div className="mt-12 text-center">
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm"
            style={isNoteTheme ? {
              backgroundColor: themeStyles.cardBackground,
              borderColor: themeStyles.border,
              border: `1px solid ${themeStyles.border}`
            } : {
              backgroundColor: 'white',
              border: '1px solid #e5e7eb'
            }}
          >
            {!isNoteTheme && <Globe className="w-4 h-4 text-gray-500" />}
            <span className={`text-sm ${!isNoteTheme ? 'text-gray-600' : ''}`} style={isNoteTheme ? { color: themeStyles.textSecondary } : undefined}>
              Viewing articles in {getLanguageName(currentLang)}
            </span>
            <LanguageSelector />
          </div>
        </div>
      </main>
    </div>
  );
};

export default BlogListing;










