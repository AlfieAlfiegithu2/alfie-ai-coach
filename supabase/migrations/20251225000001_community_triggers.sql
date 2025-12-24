-- Create community post likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.community_post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Function to update post like counts automatically
CREATE OR REPLACE FUNCTION public.handle_post_like_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.community_posts 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.community_posts 
    SET likes_count = GREATEST(0, likes_count - 1) 
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for like sync
DROP TRIGGER IF EXISTS on_post_like_changed ON public.community_post_likes;
CREATE TRIGGER on_post_like_changed
AFTER INSERT OR DELETE ON public.community_post_likes
FOR EACH ROW EXECUTE FUNCTION public.handle_post_like_sync();

-- Function to update post comment counts automatically
CREATE OR REPLACE FUNCTION public.handle_post_comment_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.community_posts 
    SET comments_count = comments_count + 1 
    WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.community_posts 
    SET comments_count = GREATEST(0, comments_count - 1) 
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for comment sync
DROP TRIGGER IF EXISTS on_post_comment_changed ON public.community_comments;
CREATE TRIGGER on_post_comment_changed
AFTER INSERT OR DELETE ON public.community_comments
FOR EACH ROW EXECUTE FUNCTION public.handle_post_comment_sync();

-- Enable RLS for likes
ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;

-- Policies for likes
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.community_post_likes;
CREATE POLICY "Likes are viewable by everyone" ON public.community_post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can toggle their own likes" ON public.community_post_likes;
CREATE POLICY "Users can toggle their own likes" ON public.community_post_likes FOR ALL USING (auth.uid() = user_id);
