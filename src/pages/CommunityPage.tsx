import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Users, MessageSquare, ThumbsUp, Star, Send, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '@/components/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { logUserAction, logPageVisit } from '@/utils/analytics';

const CommunityPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
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
      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
      // Fallback to mock data
      setPosts([
        {
          id: 1,
          username: 'Sarah Chen',
          content: 'Just achieved Band 7 in Reading! The key was practicing with Cambridge 19 daily. Any tips for improving Writing Task 2?',
          likes_count: 12,
          comments_count: 5,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          category: 'reading'
        },
        {
          id: 2,
          username: 'Mike Johnson',
          content: 'Looking for a study group for IELTS preparation. I\'m aiming for Band 7.5 by March. Anyone interested?',
          likes_count: 8,
          comments_count: 12,
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          category: 'general'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.trim()) return;
    if (!user) {
      toast({ title: "Please sign in to post", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from('community_posts')
        .insert({
          user_id: user.id,
          username: user.email?.split('@')[0] || 'User',
          title: newPost.substring(0, 100),
          content: newPost,
          category: selectedCategory === 'all' ? 'general' : selectedCategory
        });

      if (error) throw error;

      setNewPost('');
      toast({ title: "Post created successfully!" });
      loadPosts();
      
      // Log analytics
      logUserAction('community_post_created', undefined, { 
        content_length: newPost.length,
        category: selectedCategory 
      });
    } catch (error) {
      console.error('Error creating post:', error);
      toast({ title: "Failed to create post", variant: "destructive" });
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user) {
      toast({ title: "Please sign in to like posts", variant: "destructive" });
      return;
    }

    // Log analytics
    logUserAction('community_post_liked', postId.toString());
    
    // Update local state optimistically
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, likes_count: (post.likes_count || 0) + 1 }
        : post
    ));
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

  return (
    <StudentLayout title="Study Community" showBackButton={true}>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-heading-1 mb-4">Study Community</h1>
          <p className="text-body">Connect with fellow students, share tips, and get support on your English learning journey</p>
        </div>

        {/* Create Post */}
        <Card className="card-modern">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-brand-blue" />
              Share with the Community
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Ask a question, share a tip, or start a discussion..."
              className="min-h-[100px] input-modern"
            />
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Badge variant="outline">Question</Badge>
                <Badge variant="outline">Study Tip</Badge>
                <Badge variant="outline">Success Story</Badge>
              </div>
              <Button onClick={handleCreatePost} disabled={!newPost.trim()} className="bg-blue-500 hover:bg-blue-600 text-white">
                <Send className="w-4 h-4 mr-2" />
                Post
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('all')}
              size="sm"
            >
              All
            </Button>
            <Button 
              variant={selectedCategory === 'reading' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('reading')}
              size="sm"
            >
              Reading
            </Button>
            <Button 
              variant={selectedCategory === 'writing' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('writing')}
              size="sm"
            >
              Writing
            </Button>
            <Button 
              variant={selectedCategory === 'speaking' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('speaking')}
              size="sm"
            >
              Speaking
            </Button>
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {loading ? (
            <Card className="p-6 text-center">
              <p>Loading posts...</p>
            </Card>
          ) : filteredPosts.length === 0 ? (
            <Card className="p-6 text-center">
              <p>No posts found. Be the first to start a discussion!</p>
            </Card>
          ) : (
            filteredPosts.map((post) => (
            <Card key={post.id} className="card-interactive">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{post.username}</p>
                        </div>
                        <p className="text-sm text-gray-500">{getTimeAgo(post.created_at)}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {post.category}
                    </Badge>
                  </div>
                  
                  <p className="text-text-primary leading-relaxed">{post.content}</p>
                  
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-gray-500 hover:text-blue-500"
                      onClick={() => handleLikePost(post.id)}
                    >
                      <ThumbsUp className="w-4 h-4 mr-1" />
                      {post.likes_count || 0}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-blue-500">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      {post.comments_count || 0} replies
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            ))
          )}
        </div>

        {/* Coming Soon Features */}
        <Card className="card-modern">
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4">
                <Users className="w-8 h-8 text-brand-blue mx-auto mb-2" />
                <h4 className="font-semibold mb-1">Study Groups</h4>
                <p className="text-sm text-text-secondary">Join or create study groups with students at your level</p>
              </div>
              <div className="text-center p-4">
                <MessageSquare className="w-8 h-8 text-brand-green mx-auto mb-2" />
                <h4 className="font-semibold mb-1">Live Q&A</h4>
                <p className="text-sm text-text-secondary">Weekly live sessions with English teachers and experts</p>
              </div>
              <div className="text-center p-4">
                <Star className="w-8 h-8 text-brand-purple mx-auto mb-2" />
                <h4 className="font-semibold mb-1">Peer Reviews</h4>
                <p className="text-sm text-text-secondary">Get feedback on your writing from other students</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
};

export default CommunityPage;