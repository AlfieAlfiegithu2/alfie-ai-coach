import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Users, MessageSquare, ThumbsUp, Star, Send, Search, Filter, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '@/components/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { logUserAction, logPageVisit } from '@/utils/analytics';
import { useTranslation } from 'react-i18next';
const CommunityPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [newPost, setNewPost] = useState('');
  const [posts, setPosts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  // Load analytics on page visit
  useEffect(() => {
    logPageVisit('community');
  }, []);

  // Load posts from Supabase
  useEffect(() => {
    loadPosts();
  }, []);
  const loadPosts = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('community_posts').select('*').order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
      // Fallback to mock data
      setPosts([{
        id: 1,
        username: 'Sarah Chen',
        content: 'Just achieved Band 7 in Reading! The key was practicing with Cambridge 19 daily. Any tips for improving Writing Task 2?',
        likes_count: 12,
        comments_count: 5,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        category: 'reading'
      }, {
        id: 2,
        username: 'Mike Johnson',
        content: 'Looking for a study group for IELTS preparation. I\'m aiming for Band 7.5 by March. Anyone interested?',
        likes_count: 8,
        comments_count: 12,
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        category: 'general'
      }]);
    } finally {
      setLoading(false);
    }
  };
  const handleCreatePost = async () => {
    if (!newPost.trim()) return;
    if (!user) {
      toast({
        title: "Please sign in to post",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        error
      } = await supabase.from('community_posts').insert({
        user_id: user.id,
        username: user.email?.split('@')[0] || 'User',
        title: newPost.substring(0, 100),
        content: newPost,
        category: selectedCategory === 'all' ? 'general' : selectedCategory
      });
      if (error) throw error;
      setNewPost('');
      toast({
        title: "Post created successfully!"
      });
      loadPosts();

      // Log analytics
      logUserAction('community_post_created', undefined, {
        content_length: newPost.length,
        category: selectedCategory
      });
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Failed to create post",
        variant: "destructive"
      });
    }
  };
  const handleLikePost = async (postId: string) => {
    if (!user) {
      toast({
        title: "Please sign in to like posts",
        variant: "destructive"
      });
      return;
    }

    // Log analytics
    logUserAction('community_post_liked', postId.toString());

    // Update local state optimistically
    setPosts(prev => prev.map(post => post.id === postId ? {
      ...post,
      likes_count: (post.likes_count || 0) + 1
    } : post));
  };
  const filteredPosts = posts.filter(post => {
    if (searchQuery && !post.content.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedCategory !== 'all' && post.category !== selectedCategory) {
      return false;
    }
    return true;
  });
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    return `${Math.floor(diffInHours / 24)} days ago`;
  };
  return <div className="min-h-full lg:py-10 lg:px-6 pt-6 pr-4 pb-6 pl-4">
      {/* Background Image */}
      <div className="fixed top-0 w-full h-screen bg-cover bg-center -z-10" style={{
      backgroundImage: "url('/lovable-uploads/e2289d4e-02bd-49a2-be13-299500e8fa69.png')"
    }} />
      
      {/* Header */}
      <header className="flex sm:px-6 lg:px-12 lg:py-5 pt-4 pr-4 pb-4 pl-4 items-center justify-between border-b border-white/20">
        <h1 className="text-3xl font-semibold text-slate-800" style={{
        fontFamily: 'Bricolage Grotesque, sans-serif'
      }}>
          {t('community.studyCommunity')}
        </h1>
        <Button onClick={() => navigate('/')} variant="ghost" style={{
        fontFamily: 'Inter, sans-serif'
      }} className="hover:bg-white/10 flex items-center gap-2 text-slate-950">
          <Home className="w-4 h-4" />
          {t('navigation.home')}
        </Button>
      </header>

        {/* Main Content */}
        <main className="relative sm:px-6 lg:px-12 pr-4 pb-8 pl-4">
          <div className="max-w-4xl mx-auto space-y-6 pt-6">
            
            {/* Header */}
            <div className="text-center mb-8">
              <p style={{
            fontFamily: 'Inter, sans-serif'
          }} className="text-slate-950 font-light">Connect with fellow students, share tips, and get support on your English learning journey</p>
            </div>

            {/* Create Post */}
            <div className="relative lg:p-6 bg-white/10 border-white/20 rounded-2xl pt-4 pr-4 pb-4 pl-4 backdrop-blur-xl">
              <h3 className="flex items-center gap-2 text-lg font-semibold mb-4 text-slate-800" style={{
            fontFamily: 'Inter, sans-serif'
          }}>
                <MessageSquare className="w-5 h-5 text-slate-600" />
                Share with the Community
              </h3>
              <div className="space-y-4">
                <Textarea value={newPost} onChange={e => setNewPost(e.target.value)} placeholder="Ask a question, share a tip, or start a discussion..." className="min-h-[100px] bg-white/10 border-white/20 text-slate-800 placeholder:text-slate-500" />
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <Badge variant={selectedCategory === 'general' ? 'default' : 'outline'} className="cursor-pointer hover:bg-white/20 bg-white/10 border-white/20 text-slate-700" onClick={() => setSelectedCategory('general')}>
                      Question
                    </Badge>
                    <Badge variant={selectedCategory === 'tip' ? 'default' : 'outline'} className="cursor-pointer hover:bg-white/20 bg-white/10 border-white/20 text-slate-700" onClick={() => setSelectedCategory('tip')}>
                      Study Tip
                    </Badge>
                    <Badge variant={selectedCategory === 'success' ? 'default' : 'outline'} className="cursor-pointer hover:bg-white/20 bg-white/10 border-white/20 text-slate-700" onClick={() => setSelectedCategory('success')}>
                      Success Story
                    </Badge>
                  </div>
                  <Button onClick={handleCreatePost} disabled={!newPost.trim()} className="bg-slate-800/80 backdrop-blur-sm text-white hover:bg-slate-700/80 border border-white/20">
                    <Send className="w-4 h-4 mr-2" />
                    Post
                  </Button>
                </div>
              </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input placeholder="Search posts..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-white/10 border-white/20 text-slate-800 placeholder:text-slate-500" />
              </div>
              <div className="flex gap-2">
                <Button variant={selectedCategory === 'all' ? 'default' : 'outline'} onClick={() => setSelectedCategory('all')} size="sm" className="bg-white/10 border-white/20 text-slate-700 hover:bg-white/20">
                  All
                </Button>
                <Button variant={selectedCategory === 'general' ? 'default' : 'outline'} onClick={() => setSelectedCategory('general')} size="sm" className="bg-white/10 border-white/20 text-slate-700 hover:bg-white/20">
                  Question
                </Button>
                <Button variant={selectedCategory === 'tip' ? 'default' : 'outline'} onClick={() => setSelectedCategory('tip')} size="sm" className="bg-white/10 border-white/20 text-slate-700 hover:bg-white/20">
                  Study Tip
                </Button>
                <Button variant={selectedCategory === 'success' ? 'default' : 'outline'} onClick={() => setSelectedCategory('success')} size="sm" className="bg-white/10 border-white/20 text-slate-700 hover:bg-white/20">
                  Success Story
                </Button>
              </div>
            </div>

            {/* Posts */}
            <div className="space-y-4">
              {loading ? <div className="relative lg:p-6 bg-white/10 border-white/20 rounded-2xl pt-4 pr-4 pb-4 pl-4 backdrop-blur-xl text-center">
                  <p className="text-slate-600">Loading posts...</p>
                </div> : filteredPosts.length === 0 ? <div className="relative lg:p-6 bg-white/10 border-white/20 rounded-2xl pt-4 pr-4 pb-4 pl-4 backdrop-blur-xl text-center">
                  <p className="text-slate-600">No posts found. Be the first to start a discussion!</p>
                </div> : filteredPosts.map(post => <div key={post.id} className="relative lg:p-6 bg-white/10 border-white/20 rounded-2xl pt-4 pr-4 pb-4 pl-4 backdrop-blur-xl">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                          <Users className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p style={{
                        fontFamily: 'Inter, sans-serif'
                      }} className="font-semibold text-slate-950">{post.username}</p>
                          </div>
                          <p style={{
                      fontFamily: 'Inter, sans-serif'
                    }} className="text-sm text-slate-950">{getTimeAgo(post.created_at)}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs bg-white/10 border-white/20 text-slate-700">
                        {post.category}
                      </Badge>
                    </div>
                    
                    <p style={{
                fontFamily: 'Inter, sans-serif'
              }} className="leading-relaxed text-slate-950">{post.content}</p>
                    
                    <div className="flex items-center gap-4">
                      <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-800 hover:bg-white/10" onClick={() => handleLikePost(post.id)}>
                        <ThumbsUp className="w-4 h-4 mr-1" />
                        {post.likes_count || 0}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-800 hover:bg-white/10">
                        <MessageSquare className="w-4 h-4 mr-1" />
                        {post.comments_count || 0} replies
                      </Button>
                    </div>
                  </div>
                </div>)}
            </div>

            {/* Coming Soon Features */}
            <div className="relative lg:p-6 bg-white/10 border-white/20 rounded-2xl pt-4 pr-4 pb-4 pl-4 backdrop-blur-xl">
              <h3 className="text-lg font-semibold mb-4 text-slate-800" style={{
            fontFamily: 'Inter, sans-serif'
          }}>Coming Soon</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4">
                  <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <h4 className="font-semibold mb-1 text-slate-800" style={{
                fontFamily: 'Inter, sans-serif'
              }}>Study Groups</h4>
                  <p className="text-sm text-slate-600" style={{
                fontFamily: 'Inter, sans-serif'
              }}>Join or create study groups with students at your level</p>
                </div>
                <div className="text-center p-4">
                  <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <h4 className="font-semibold mb-1 text-slate-800" style={{
                fontFamily: 'Inter, sans-serif'
              }}>Live Q&A</h4>
                  <p className="text-sm text-slate-600" style={{
                fontFamily: 'Inter, sans-serif'
              }}>Weekly live sessions with English teachers and experts</p>
                </div>
                <div className="text-center p-4">
                  <Star className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <h4 className="font-semibold mb-1 text-slate-800" style={{
                fontFamily: 'Inter, sans-serif'
              }}>Peer Reviews</h4>
                  <p className="text-sm text-slate-600" style={{
                fontFamily: 'Inter, sans-serif'
              }}>Get feedback on your writing from other students</p>
                </div>
              </div>
            </div>
          </div>
        </main>
    </div>;
};
export default CommunityPage;