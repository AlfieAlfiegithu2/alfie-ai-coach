-- Blog System Tables for Multilingual Content

-- Main blog posts table
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  featured_image_url text,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Blog post translations table (one row per language per post)
CREATE TABLE IF NOT EXISTS public.blog_post_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  language_code text NOT NULL CHECK (language_code IN ('en', 'es', 'fr', 'de', 'ko', 'zh', 'ja', 'vi', 'pt', 'ru', 'ar', 'hi', 'bn', 'ur', 'id', 'tr', 'fa', 'ta', 'ne', 'th', 'yue', 'ms', 'kk')),
  title text NOT NULL,
  content text NOT NULL,
  excerpt text,
  meta_description text,
  meta_keywords text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(blog_post_id, language_code)
);

-- Blog categories table
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Blog category translations
CREATE TABLE IF NOT EXISTS public.blog_category_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.blog_categories(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  name text NOT NULL,
  description text,
  UNIQUE(category_id, language_code)
);

-- Blog post categories junction table
CREATE TABLE IF NOT EXISTS public.blog_post_categories (
  blog_post_id uuid REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.blog_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (blog_post_id, category_id)
);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_category_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Blog posts - public can read published, admins can do everything
CREATE POLICY "blog_posts_select_published" ON public.blog_posts
  FOR SELECT USING (status = 'published' OR is_admin());

CREATE POLICY "blog_posts_insert_admin" ON public.blog_posts
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "blog_posts_update_admin" ON public.blog_posts
  FOR UPDATE USING (is_admin());

CREATE POLICY "blog_posts_delete_admin" ON public.blog_posts
  FOR DELETE USING (is_admin());

-- RLS Policies: Blog post translations - public can read if post is published
CREATE POLICY "blog_post_translations_select_published" ON public.blog_post_translations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.blog_posts 
      WHERE id = blog_post_translations.blog_post_id 
      AND (status = 'published' OR is_admin())
    )
  );

CREATE POLICY "blog_post_translations_insert_admin" ON public.blog_post_translations
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "blog_post_translations_update_admin" ON public.blog_post_translations
  FOR UPDATE USING (is_admin());

CREATE POLICY "blog_post_translations_delete_admin" ON public.blog_post_translations
  FOR DELETE USING (is_admin());

-- RLS Policies: Categories - public read, admin write
CREATE POLICY "blog_categories_select_public" ON public.blog_categories
  FOR SELECT USING (true);

CREATE POLICY "blog_categories_insert_admin" ON public.blog_categories
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "blog_categories_update_admin" ON public.blog_categories
  FOR UPDATE USING (is_admin());

CREATE POLICY "blog_categories_delete_admin" ON public.blog_categories
  FOR DELETE USING (is_admin());

-- RLS Policies: Category translations - public read, admin write
CREATE POLICY "blog_category_translations_select_public" ON public.blog_category_translations
  FOR SELECT USING (true);

CREATE POLICY "blog_category_translations_insert_admin" ON public.blog_category_translations
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "blog_category_translations_update_admin" ON public.blog_category_translations
  FOR UPDATE USING (is_admin());

CREATE POLICY "blog_category_translations_delete_admin" ON public.blog_category_translations
  FOR DELETE USING (is_admin());

-- RLS Policies: Post categories junction - public read, admin write
CREATE POLICY "blog_post_categories_select_public" ON public.blog_post_categories
  FOR SELECT USING (true);

CREATE POLICY "blog_post_categories_insert_admin" ON public.blog_post_categories
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "blog_post_categories_delete_admin" ON public.blog_post_categories
  FOR DELETE USING (is_admin());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON public.blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_post_translations_post_id ON public.blog_post_translations(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_translations_language ON public.blog_post_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_blog_post_translations_post_lang ON public.blog_post_translations(blog_post_id, language_code);
CREATE INDEX IF NOT EXISTS idx_blog_post_categories_post_id ON public.blog_post_categories(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_categories_category_id ON public.blog_post_categories(category_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_post_translations_updated_at
  BEFORE UPDATE ON public.blog_post_translations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();









