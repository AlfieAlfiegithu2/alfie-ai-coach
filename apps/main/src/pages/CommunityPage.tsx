import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { ThumbsUp, MessageSquare, Share2, Flag, Send } from 'lucide-react';
import StudentLayout from '@/components/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { logUserAction, logPageVisit } from '@/utils/analytics';
import { useTranslation } from 'react-i18next';

const testCategories = [
  { id: 'all', label: 'GLOBAL FEED' },
  { id: 'ielts', label: 'IELTS' },
  { id: 'toeic', label: 'TOEIC' },
  { id: 'pte', label: 'PTE' },
  { id: 'toefl', label: 'TOEFL' },
  { id: 'nclex', label: 'NCLEX' },
  { id: 'general', label: 'GENERAL' },
  { id: 'business', label: 'BUSINESS' }
];

const postTypes = [
  { id: 'progress', label: 'PROGRESS' },
  { id: 'question', label: 'QUESTION' },
  { id: 'tip', label: 'TIP' },
  { id: 'bug', label: 'BUG REPORT' }
];

const communityRules = [
  "Be supportive and encouraging to fellow learners.",
  "No spam or self-promotion.",
  "Post study-related content only.",
  "Do not share personal contact details (Auto-filtered).",
  "No social media IDs (Instagram, Telegram, etc.).",
  "Respect different learning paces.",
  "Use English where possible to practice!"
];

const CommunityPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [posts, setPosts] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentsMap, setCommentsMap] = useState<Record<string, any[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPostType, setSelectedPostType] = useState('progress');
  const [sortBy, setSortBy] = useState<'new' | 'top-all' | 'top-monthly'>('new');
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);

  useEffect(() => {
    logPageVisit('community_v6_persistence_fix');
    loadPosts();
  }, []);

  useEffect(() => {
    if (user) {
      loadUserLikes();
    } else {
      setLikedPosts(new Set());
    }
  }, [user]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUserLikes = async () => {
    if (!user) return;
    try {
      const { data, error } = await (supabase as any)
        .from('community_post_likes')
        .select('post_id')
        .eq('user_id', user.id);

      if (!error && data) {
        setLikedPosts(new Set(data.map((l: any) => l.post_id)));
      }
    } catch (e) { }
  };

  const loadComments = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('community_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (!error) {
        setCommentsMap(prev => ({ ...prev, [postId]: data || [] }));
      }
    } catch (e) { }
  };

  const toggleComments = (postId: string) => {
    const next = new Set(expandedComments);
    if (next.has(postId)) {
      next.delete(postId);
    } else {
      next.add(postId);
      if (!commentsMap[postId]) {
        loadComments(postId);
      }
    }
    setExpandedComments(next);
  };

  const redactPII = (text: string) => {
    let filtered = text;
    filtered = filtered.replace(/@[\w.]+/g, '[REDACTED HANDLE]');
    filtered = filtered.replace(/(\+?\d[\d\-\s]{7,}\d)/g, (match) => {
      if (match.length <= 4 && /^\d+$/.test(match)) return match;
      return '[REDACTED CONTACT]';
    });
    filtered = filtered.replace(/(ig|tg|tele|insta|line|wa|whatsapp|kakao|vx|viber|signal|messenger)[\s:]+[\w.]+/gi, '$1: [REDACTED]');
    return filtered;
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !newPostTitle.trim() || selectedCategory === 'all') {
      toast({ title: "Please add a title and select a section", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Please sign in to post", variant: "destructive" });
      return;
    }

    const filteredTitle = redactPII(newPostTitle);
    const filteredContent = redactPII(newPostContent);

    try {
      const { error } = await (supabase as any).from('community_posts').insert({
        user_id: user.id,
        username: user.email?.split('@')[0] || 'Member',
        title: filteredTitle,
        content: filteredContent,
        category: selectedCategory,
        tags: [selectedPostType]
      });

      if (error) throw error;
      setNewPostTitle('');
      setNewPostContent('');
      setShowCreatePost(false);
      toast({ title: "Post published!" });
      loadPosts();
    } catch (error) {
      toast({ title: "Failed to publish post", variant: "destructive" });
    }
  };

  const handleLike = async (postId: string, currentLikes: number) => {
    if (!user) return;

    const isLiked = likedPosts.has(postId);
    const newLikesCount = isLiked ? Math.max(0, (currentLikes || 0) - 1) : (currentLikes || 0) + 1;

    // Optimistic UI update
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (isLiked) next.delete(postId);
      else next.add(postId);
      return next;
    });
    setPosts(prevPosts => prevPosts.map(p =>
      p.id === postId ? { ...p, likes_count: newLikesCount } : p
    ));

    // Persist likes_count to database
    const { error: updateError } = await supabase
      .from('community_posts')
      .update({ likes_count: newLikesCount })
      .eq('id', postId);

    if (updateError) {
      console.error('Failed to update likes_count:', updateError);
    }

    // Try to track individual likes (may fail if table doesn't exist yet)
    try {
      if (isLiked) {
        await (supabase as any)
          .from('community_post_likes')
          .delete()
          .match({ user_id: user.id, post_id: postId });
      } else {
        await (supabase as any)
          .from('community_post_likes')
          .insert({ user_id: user.id, post_id: postId });
      }
    } catch (error) {
      // Table may not exist yet, that's ok
    }
  };

  const handleSubmitComment = async (postId: string) => {
    const content = commentInput[postId];
    if (!content?.trim() || !user) return;

    const filteredContent = redactPII(content);

    // Get current post and calculate new count BEFORE the insert
    const currentPost = posts.find(p => p.id === postId);
    const newCount = (currentPost?.comments_count || 0) + 1;

    const { error } = await supabase.from('community_comments').insert({
      post_id: postId,
      user_id: user.id,
      username: user.email?.split('@')[0] || 'Member',
      content: filteredContent
    });

    if (!error) {
      setCommentInput(prev => ({ ...prev, [postId]: '' }));
      loadComments(postId);

      // Update local state
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: newCount } : p));

      // Persist to database
      const { error: updateError } = await supabase
        .from('community_posts')
        .update({ comments_count: newCount })
        .eq('id', postId);

      if (updateError) {
        console.error('Failed to update comments_count:', updateError);
      }
    } else {
      console.error('Failed to insert comment:', error);
    }
  };

  const handleShare = (postId: string) => {
    const url = window.location.origin + '/community?post=' + postId;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard!" });
  };

  const handleReport = (postId: string) => {
    toast({ title: "Post reported for review.", variant: "destructive" });
  };

  const getSortedPosts = () => {
    let result = [...posts];

    // Calculate 30 days ago WITHOUT mutating the original date
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (sortBy === 'top-all') {
      // All-time best: Sort all posts by likes count (descending)
      result.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    } else if (sortBy === 'top-monthly') {
      // Monthly best: Filter to last 30 days, then sort by likes
      const recentPosts = result.filter(p => new Date(p.created_at) >= thirtyDaysAgo);
      recentPosts.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
      result = recentPosts;
    } else {
      // New: Sort by creation date (newest first)
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result.filter(post => {
      const contentMatch = (post.content || '').toLowerCase().includes(searchQuery.toLowerCase());
      const titleMatch = (post.title || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSearch = contentMatch || titleMatch;
      const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  };

  const getExactDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateString));
  };

  return (
    <div className="min-h-screen bg-[#FFFAF0] pb-32">
      <style>{`
        body { background-color: #FFFAF0 !important; }
        
        input:focus, textarea:focus {
          outline: none !important;
          box-shadow: none !important;
          border-color: #8B6914 !important;
        }

        .outlined-btn {
          border: 1px solid #E8D5A3;
          background: transparent;
          color: #5D4E37;
          border-radius: 4px;
          transition: all 0.2s;
        }
        .outlined-btn:hover {
          border-color: #8B6914;
          background: #FFFDF5;
        }
        .outlined-btn-active {
          border-color: #8B6914 !important;
          background: #8B6914 !important;
          color: white !important;
        }
        
        .board-link-active {
          color: #8B6914 !important;
          font-weight: 800 !important;
          background: #FFFDF5;
          border-bottom: 2px solid #8B6914;
        }
      `}</style>

      <header className="sticky top-0 z-50 bg-[#FFFAF0]/95 backdrop-blur-md border-b border-[#E8D5A3] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-12 text-sm font-medium">
            <button onClick={() => navigate('/dashboard')} className="text-[10px] font-bold tracking-widest text-[#5D4E37]/60 hover:text-[#8B6914] transition-colors">HOME</button>
            <h1 className="text-xl font-black text-[#5D4E37] tracking-tighter uppercase">Community</h1>
          </div>

          <div className="flex items-center gap-6">
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search posts..."
              className="hidden md:block w-48 h-8 bg-transparent border-none border-b border-[#E8D5A3] rounded-none focus:ring-0 placeholder:text-[#5D4E37]/30 text-xs font-medium text-[#5D4E37]"
            />
            <button onClick={() => setShowCreatePost(!showCreatePost)} className="outlined-btn text-[10px] font-black tracking-widest px-6 py-2 uppercase">Create a Post</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          <aside className="lg:col-span-2 space-y-8">
            <div>
              <p className="text-[10px] font-black text-[#5D4E37]/40 uppercase tracking-[0.2em] mb-6">Boards</p>
              <nav className="flex flex-col gap-1">
                {testCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`text-[11px] text-left tracking-widest py-3 px-2 transition-all ${selectedCategory === cat.id ? 'board-link-active' : 'text-[#5D4E37]/60 hover:text-[#5D4E37]'}`}
                  >
                    {cat.label}
                  </button>
                ))}

                <div className="pt-8 mt-4 border-t border-[#E8D5A3]/30">
                  <button onClick={() => { setSelectedCategory('general'); setShowCreatePost(true); }} className="outlined-btn w-full text-[10px] font-black tracking-widest px-4 py-2 uppercase">Report a Bug</button>
                </div>
              </nav>
            </div>
          </aside>

          <div className="lg:col-span-7 space-y-8">
            <div className="flex items-center gap-1 pb-4 border-b border-[#E8D5A3]/30">
              <button onClick={() => setSortBy('new')} className={`outlined-btn text-[9px] font-black tracking-widest px-4 py-1.5 ${sortBy === 'new' ? 'outlined-btn-active' : ''}`}>NEW</button>
              <button onClick={() => setSortBy('top-monthly')} className={`outlined-btn text-[9px] font-black tracking-widest px-4 py-1.5 ${sortBy === 'top-monthly' ? 'outlined-btn-active' : ''}`}>BEST (MONTHLY)</button>
              <button onClick={() => setSortBy('top-all')} className={`outlined-btn text-[9px] font-black tracking-widest px-4 py-1.5 ${sortBy === 'top-all' ? 'outlined-btn-active' : ''}`}>BEST (ALL TIME)</button>
            </div>

            {showCreatePost && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200 space-y-6">
                <p className="text-[10px] font-black tracking-widest text-[#8B6914] uppercase">Post to {selectedCategory === 'all' ? 'GENERAL' : selectedCategory}</p>

                <div className="space-y-4">
                  <Input
                    value={newPostTitle}
                    onChange={e => setNewPostTitle(e.target.value)}
                    placeholder="Enter a descriptive title..."
                    className="h-12 bg-[#FFFDF5] border-[#E8D5A3] font-bold text-lg text-[#5D4E37] placeholder:text-[#5D4E37]/20"
                  />
                  <Textarea
                    value={newPostContent}
                    onChange={e => setNewPostContent(e.target.value)}
                    placeholder="Describe your progress..."
                    className="min-h-[160px] w-full bg-[#FFFDF5] border border-[#E8D5A3] rounded-sm text-sm p-6 text-[#5D4E37] placeholder:text-[#5D4E37]/20"
                  />
                </div>

                <div className="flex justify-end gap-4">
                  <button onClick={() => setShowCreatePost(false)} className="text-[10px] font-black tracking-widest text-[#5D4E37]/40 hover:text-[#5D4E37]">DISCARD</button>
                  <button onClick={handleCreatePost} className="outlined-btn text-[10px] font-black tracking-widest px-8 py-2.5 uppercase">Publish</button>
                </div>
              </div>
            )}

            <div className="space-y-12">
              {loading ? (
                <div className="text-[10px] font-bold tracking-widest text-[#5D4E37]/20 uppercase">Refreshing Boards...</div>
              ) : getSortedPosts().length === 0 ? (
                <div className="py-20 text-center italic text-[#5D4E37]/30 text-xs tracking-widest uppercase">No posts found</div>
              ) : getSortedPosts().map(post => {
                const isLiked = likedPosts.has(post.id);
                const isExpanded = expandedComments.has(post.id);
                const comments = commentsMap[post.id] || [];

                return (
                  <div key={post.id} className="group pb-12 border-b border-[#E8D5A3]/40 last:border-none">
                    <div className="flex items-center gap-4 mb-3">
                      <p className="text-[11px] font-black text-[#5D4E37] tracking-tight">{post.username?.toUpperCase()}</p>
                      <span className="w-1 h-1 bg-[#E8D5A3] rounded-full" />
                      <p className="text-[9px] font-black text-[#5D4E37]/30 tracking-widest">{getExactDate(post.created_at)}</p>
                      <div className="ml-auto flex gap-2">
                        <span className="text-[8px] font-black border border-[#E8D5A3] px-2 py-0.5 text-[#8B6914] tracking-widest uppercase">{post.category}</span>
                        {post.tags?.[0] && (
                          <span className="text-[8px] font-black bg-[#5D4E37]/5 px-2 py-0.5 text-[#5D4E37] tracking-widest uppercase">{post.tags[0]}</span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-lg font-black text-[#5D4E37] mb-2 leading-tight uppercase tracking-tight">{post.title}</h3>
                    <p className="text-[#5D4E37]/90 leading-relaxed text-[15px] font-medium whitespace-pre-wrap mb-8">{post.content}</p>

                    <div className="flex items-center gap-10">
                      <button onClick={() => handleLike(post.id, post.likes_count)} className={`text-[9px] font-black tracking-widest flex items-center gap-2 transition-all ${isLiked ? 'text-amber-800' : 'text-[#5D4E37]/40 hover:text-amber-800'}`}>
                        <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} /> {post.likes_count || 0}
                      </button>
                      <button onClick={() => toggleComments(post.id)} className={`text-[9px] font-black tracking-widest flex items-center gap-2 transition-all ${isExpanded ? 'text-[#8B6914]' : 'text-[#5D4E37]/40 hover:text-[#8B6914]'}`}>
                        <MessageSquare className="w-3.5 h-3.5" /> {post.comments_count || 0}
                      </button>
                      <button onClick={() => handleShare(post.id)} className="text-[9px] font-black text-[#5D4E37]/40 hover:text-[#5D4E37] transition-all flex items-center gap-2">
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleReport(post.id)} className="text-[9px] font-black text-[#5D4E37]/40 hover:text-red-800 transition-all flex items-center gap-2 ml-auto">
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="border-l-2 border-[#E8D5A3]/30 ml-2 pl-6 space-y-4">
                          {comments.map((comment, ci) => (
                            <div key={ci} className="space-y-1">
                              <p className="text-[9px] font-black text-[#5D4E37]/60">{comment.username?.toUpperCase()} • {getExactDate(comment.created_at)}</p>
                              <p className="text-xs text-[#5D4E37]/80 leading-relaxed">{comment.content}</p>
                            </div>
                          ))}

                          <div className="pt-4 flex gap-3">
                            <Input
                              value={commentInput[post.id] || ''}
                              onChange={(e) => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                              placeholder="Join the discussion..."
                              className="h-10 text-xs bg-[#FFFDF5] border-[#E8D5A3] text-[#5D4E37]"
                              onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment(post.id)}
                            />
                            <button onClick={() => handleSubmitComment(post.id)} className="outlined-btn p-2 hover:bg-[#8B6914] hover:text-white border-[#E8D5A3]">
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="lg:col-span-3 space-y-10">
            <div className="bg-[#FFFDF5] border border-[#E8D5A3] p-6 rounded-sm">
              <p className="text-[10px] font-black text-[#5D4E37]/90 uppercase tracking-[0.2em] mb-6 underline underline-offset-8">COMMUNITY RULES</p>
              <ul className="space-y-4">
                {communityRules.map((rule, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="text-[10px] font-bold text-[#8B6914]">{idx + 1}.</span>
                    <p className="text-[11px] text-[#5D4E37]/80 font-medium leading-relaxed">{rule}</p>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

        </div>
      </main>
    </div>
  );
};

export default CommunityPage;