import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ArrowRight, Globe, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBlogLanguage, getLanguageName, SUPPORTED_LANGUAGES } from '@/lib/blogUtils';
import SEO from '@/components/SEO';
import LanguageSelector from '@/components/LanguageSelector';
import { useTranslation } from 'react-i18next';
import { themes } from '@/lib/themes';

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
  categories: string[];
}

interface Category {
  id: string;
  slug: string;
  name: string;
}

const BlogListing = () => {
  const navigate = useNavigate();
  const params = useParams<{ lang?: string }>();
  const { i18n } = useTranslation();
  const currentLang = useBlogLanguage();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Force Note Theme
  const themeStyles = themes.note.colors;

  useEffect(() => {
    loadContent();
  }, [currentLang]);

  const loadContent = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Categories
      const { data: catData } = await supabase
        .from('blog_categories')
        .select(`
          id,
          slug,
          blog_category_translations (
            name,
            language_code
          )
        `);

      const processedCategories = (catData || []).map((cat: any) => {
        const trans = cat.blog_category_translations.find(
          (t: any) => t.language_code === currentLang
        ) || cat.blog_category_translations.find(
          (t: any) => t.language_code === 'en'
        ) || cat.blog_category_translations[0];
        
        return {
          id: cat.id,
          slug: cat.slug,
          name: trans?.name || cat.slug
        };
      }).sort((a, b) => a.name.localeCompare(b.name));

      setCategories(processedCategories);

      // 2. Fetch Posts
      const { data: postsData, error } = await supabase
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
          ),
          blog_post_categories (
            blog_categories (
              slug
            )
          )
        `)
        .eq('status', 'published')
        .eq('blog_post_translations.language_code', currentLang)
        .order('published_at', { ascending: false });

      if (error) throw error;

      const transformedPosts = (postsData || []).map((post: any) => ({
        id: post.id,
        slug: post.slug,
        featured_image_url: post.featured_image_url,
        published_at: post.published_at,
        created_at: post.created_at,
        translation: Array.isArray(post.blog_post_translations) 
          ? post.blog_post_translations[0] 
          : post.blog_post_translations,
        categories: post.blog_post_categories.map((c: any) => c.blog_categories?.slug).filter(Boolean)
      }));

      setPosts(transformedPosts);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(post => {
    // Filter by Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        post.translation?.title.toLowerCase().includes(query) ||
        post.translation?.excerpt?.toLowerCase().includes(query)
      );
      if (!matchesSearch) return false;
    }

    // Filter by Category
    if (selectedCategory !== 'all') {
      return post.categories.includes(selectedCategory);
    }

    return true;
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
      className="min-h-screen font-serif"
      style={{ backgroundColor: themeStyles.background }}
    >
      <SEO
        title="Blog - English Learning Tips & IELTS Preparation"
        description="Discover expert tips, strategies, and insights for IELTS preparation and English learning."
        keywords="IELTS blog, English learning tips, IELTS preparation"
        type="website"
        lang={currentLang}
        url={`https://englishaidol.com/${currentLang}/blog`}
      />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-7xl">
        {/* Back to Home */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="pl-0 hover:bg-transparent font-serif"
            style={{ color: themeStyles.textSecondary }}
          >
            <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
            Back to Home
          </Button>
        </div>

        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 
            className="text-4xl sm:text-5xl font-bold mb-4 font-serif"
            style={{ color: themeStyles.textPrimary }}
          >
            English Learning Blog
          </h1>
          <p className="text-xl max-w-2xl mx-auto font-serif" style={{ color: themeStyles.textSecondary }}>
            Expert tips, strategies, and insights for IELTS preparation and English mastery
          </p>
        </div>

        {/* Search and Categories */}
        <div className="mb-12 space-y-6">
          {/* Search */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-4 py-3 rounded-lg focus:ring-2 focus:outline-none font-serif shadow-sm"
                style={{
                  backgroundColor: themeStyles.cardBackground,
                  borderColor: themeStyles.border,
                  border: `1px solid ${themeStyles.border}`,
                  color: themeStyles.textPrimary,
                  placeholderColor: themeStyles.textSecondary
                }}
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 opacity-50" style={{ color: themeStyles.textSecondary }} />
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setSelectedCategory('all')}
              className={`rounded-full px-6 transition-all ${selectedCategory === 'all' ? 'shadow-md scale-105' : ''}`}
              style={{
                backgroundColor: selectedCategory === 'all' ? themeStyles.buttonPrimary : 'transparent',
                color: selectedCategory === 'all' ? themeStyles.cardBackground : themeStyles.textSecondary,
                border: `1px solid ${selectedCategory === 'all' ? themeStyles.buttonPrimary : themeStyles.border}`
              }}
            >
              All
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant="ghost"
                onClick={() => setSelectedCategory(category.slug)}
                className={`rounded-full px-6 transition-all ${selectedCategory === category.slug ? 'shadow-md scale-105' : ''}`}
                style={{
                  backgroundColor: selectedCategory === category.slug ? themeStyles.buttonPrimary : 'transparent',
                  color: selectedCategory === category.slug ? themeStyles.cardBackground : themeStyles.textSecondary,
                  border: `1px solid ${selectedCategory === category.slug ? themeStyles.buttonPrimary : themeStyles.border}`
                }}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div 
              className="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
              style={{ borderColor: themeStyles.textPrimary }}
            />
            <p className="mt-4 font-serif" style={{ color: themeStyles.textSecondary }}>Loading articles...</p>
          </div>
        )}

        {/* Blog Posts Grid */}
        {!loading && filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg font-serif" style={{ color: themeStyles.textSecondary }}>
              {searchQuery || selectedCategory !== 'all' 
                ? 'No articles found matching your criteria.' 
                : 'No blog posts available yet. Check back soon!'}
            </p>
          </div>
        )}

        {!loading && filteredPosts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post) => (
              <Card
                key={post.id}
                className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden group border-0 shadow-sm"
                onClick={() => navigate(`/${currentLang}/blog/${post.slug}`)}
                style={{
                  backgroundColor: themeStyles.cardBackground,
                  border: `1px solid ${themeStyles.border}`
                }}
              >
                {post.featured_image_url && (
                  <div className="aspect-video w-full overflow-hidden" style={{ backgroundColor: themeStyles.border }}>
                    <img
                      src={post.featured_image_url}
                      alt={post.translation?.title || 'Blog post'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                    />
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-sm mb-3 font-serif" style={{ color: themeStyles.textSecondary }}>
                    <span>{formatDate(post.published_at || post.created_at)}</span>
                  </div>
                  
                  <h2 
                    className="text-xl font-bold mb-2 line-clamp-2 transition-colors font-serif"
                    style={{ color: themeStyles.textPrimary }}
                  >
                    {post.translation?.title || 'Untitled'}
                  </h2>
                  
                  {post.translation?.excerpt && (
                    <p className="mb-4 line-clamp-3 font-serif" style={{ color: themeStyles.textSecondary }}>
                      {post.translation.excerpt}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: themeStyles.border }}>
                    <span 
                      className="text-sm font-medium font-serif group-hover:underline"
                      style={{ color: themeStyles.buttonPrimary }}
                    >
                      Read Article
                    </span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" style={{ color: themeStyles.buttonPrimary }} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Language Notice */}
        <div className="mt-12 text-center">
          <div 
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg shadow-sm"
            style={{
              backgroundColor: themeStyles.cardBackground,
              border: `1px solid ${themeStyles.border}`
            }}
          >
            <Globe className="w-4 h-4" style={{ color: themeStyles.textSecondary }} />
            <span className="text-sm font-serif mr-2" style={{ color: themeStyles.textSecondary }}>
              Reading in {getLanguageName(currentLang)}
            </span>
            <LanguageSelector />
          </div>
        </div>
      </main>
    </div>
  );
};

export default BlogListing;
