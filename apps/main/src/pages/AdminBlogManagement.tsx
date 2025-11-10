import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Eye, Save, X, Globe, Calendar } from 'lucide-react';
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
  const [translations, setTranslations] = useState<Record<string, BlogTranslation>>({});

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
    setTranslations({});
    setCurrentTab('edit');
  };

  const startEditing = (post: BlogPost) => {
    setEditingPost(post);
    setIsCreating(false);
    setSlug(post.slug);
    setFeaturedImageUrl(post.featured_image_url || '');
    setStatus(post.status);
    
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
    setTranslations({});
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
      setSlug(newSlug);
    }
  };

  const savePost = async () => {
    try {
      if (!slug.trim()) {
        toast.error('Slug is required');
        return;
      }

      // Check if at least one translation exists
      const translationKeys = Object.keys(translations);
      if (translationKeys.length === 0) {
        toast.error('At least one language translation is required');
        return;
      }

      // Validate translations
      for (const langCode of translationKeys) {
        const trans = translations[langCode];
        if (!trans.title.trim() || !trans.content.trim()) {
          toast.error(`Title and content are required for ${getLanguageName(langCode)}`);
          return;
        }
      }

      let postId: string;

      if (isCreating) {
        // Create new post
        const { data: newPost, error: postError } = await supabase
          .from('blog_posts')
          .insert({
            slug,
            featured_image_url: featuredImageUrl || null,
            status,
            published_at: status === 'published' ? new Date().toISOString() : null
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
            published_at: status === 'published' && !editingPost.published_at 
              ? new Date().toISOString() 
              : editingPost.published_at
          })
          .eq('id', editingPost.id);

        if (updateError) throw updateError;
        postId = editingPost.id;
      } else {
        toast.error('Invalid state');
        return;
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
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                          <span className="flex items-center gap-1">
                            <Globe className="w-4 h-4" />
                            {post.translations.length} languages
                          </span>
                          {post.published_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(post.published_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {post.translations.map((trans: any) => (
                            <Badge key={trans.language_code} variant="outline">
                              {getLanguageFlag(trans.language_code)} {trans.title}
                            </Badge>
                          ))}
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
                  <label className="block text-sm font-medium mb-2">Slug (URL)</label>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    placeholder="blog-post-slug"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Featured Image URL</label>
                  <Input
                    value={featuredImageUrl}
                    onChange={(e) => setFeaturedImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
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
              </div>

              {/* Translations */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Translations</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Add all languages as empty translations
                      const newTranslations: Record<string, BlogTranslation> = {};
                      SUPPORTED_LANGUAGES.forEach(lang => {
                        if (!translations[lang.code]) {
                          newTranslations[lang.code] = {
                            language_code: lang.code,
                            title: '',
                            content: '',
                            excerpt: '',
                            meta_description: '',
                            meta_keywords: ''
                          };
                        }
                      });
                      setTranslations({ ...translations, ...newTranslations });
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add All Languages
                  </Button>
                </div>

                {SUPPORTED_LANGUAGES.map((lang) => {
                  const trans = translations[lang.code];
                  if (!trans) return null;

                  return (
                    <Card key={lang.code}>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          {lang.flag} {lang.nativeName} ({lang.name})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Title</label>
                          <Input
                            value={trans.title}
                            onChange={(e) => handleTitleChange(lang.code, e.target.value)}
                            placeholder="Blog post title"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Content (HTML supported)</label>
                          <Textarea
                            value={trans.content}
                            onChange={(e) => updateTranslation(lang.code, 'content', e.target.value)}
                            placeholder="Blog post content..."
                            rows={10}
                            className="font-mono text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Excerpt</label>
                          <Textarea
                            value={trans.excerpt}
                            onChange={(e) => updateTranslation(lang.code, 'excerpt', e.target.value)}
                            placeholder="Short excerpt..."
                            rows={3}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Meta Description</label>
                          <Textarea
                            value={trans.meta_description}
                            onChange={(e) => updateTranslation(lang.code, 'meta_description', e.target.value)}
                            placeholder="SEO meta description..."
                            rows={2}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Meta Keywords</label>
                          <Input
                            value={trans.meta_keywords}
                            onChange={(e) => updateTranslation(lang.code, 'meta_keywords', e.target.value)}
                            placeholder="keyword1, keyword2, keyword3"
                          />
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newTranslations = { ...translations };
                            delete newTranslations[lang.code];
                            setTranslations(newTranslations);
                          }}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove {lang.nativeName}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}

                {Object.keys(translations).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No translations added yet. Click "Add All Languages" to get started.</p>
                  </div>
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
  );
};

export default AdminBlogManagement;




