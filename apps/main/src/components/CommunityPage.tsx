import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  MessageSquare, 
  Heart, 
  Reply, 
  Share2, 
  Plus,
  Users,
  TrendingUp,
  BookOpen,
  Volume2,
  PenTool,
  Globe,
  Pin,
  Award,
  Clock,
  CheckCircle
} from 'lucide-react';
import StudentLayout from '@/components/StudentLayout';
import { useToast } from '@/components/ui/use-toast';

interface Post {
  id: string;
  author: {
    name: string;
    avatar: string;
    level: string;
    badge?: string;
  };
  title: string;
  content: string;
  category: 'IELTS' | 'PTE' | 'TOEFL' | 'General';
  tags: string[];
  timestamp: string;
  likes: number;
  replies: number;
  isPinned?: boolean;
  isAnswered?: boolean;
}

interface CommunityStats {
  totalMembers: number;
  activeToday: number;
  totalPosts: number;
  questionsAnswered: number;
}

const CommunityPage: React.FC = () => {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<'IELTS' | 'PTE' | 'TOEFL' | 'General' | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState<'IELTS' | 'PTE' | 'TOEFL' | 'General'>('IELTS');
  const [showNewPostDialog, setShowNewPostDialog] = useState(false);

  const stats: CommunityStats = {
    totalMembers: 12847,
    activeToday: 3294,
    totalPosts: 8923,
    questionsAnswered: 6751
  };

  const mockPosts: Post[] = [
    {
      id: '1',
      author: {
        name: 'Sarah Chen',
        avatar: '/api/placeholder/40/40',
        level: 'Advanced',
        badge: 'Top Contributor'
      },
      title: 'How to improve IELTS Writing Task 2 coherence and cohesion?',
      content: 'I\'ve been struggling with getting a good score on coherence and cohesion in Writing Task 2. My grammar and vocabulary are decent, but I keep losing marks on organization. Any tips from those who have scored 7+ on this criterion?',
      category: 'IELTS',
      tags: ['writing', 'task-2', 'coherence', 'tips'],
      timestamp: '2 hours ago',
      likes: 23,
      replies: 8,
      isPinned: true
    },
    {
      id: '2',
      author: {
        name: 'Mike Rodriguez',
        avatar: '/api/placeholder/40/40',
        level: 'Intermediate'
      },
      title: 'PTE Speaking: How to handle "Describe Image" questions effectively?',
      content: 'The describe image section in PTE Speaking is challenging for me. I often run out of things to say or don\'t know how to structure my response. What\'s your strategy?',
      category: 'PTE',
      tags: ['speaking', 'describe-image', 'strategy'],
      timestamp: '4 hours ago',
      likes: 15,
      replies: 12,
      isAnswered: true
    },
    {
      id: '3',
      author: {
        name: 'Anna Schmidt',
        avatar: '/api/placeholder/40/40',
        level: 'Beginner'
      },
      title: 'TOEFL vs IELTS: Which one should I choose for university admission?',
      content: 'I need to take an English proficiency test for my university application. Both TOEFL and IELTS are accepted. Which one is generally easier or more suitable for non-native speakers? What are the main differences?',
      category: 'General',
      tags: ['toefl', 'ielts', 'comparison', 'university'],
      timestamp: '6 hours ago',
      likes: 31,
      replies: 18
    },
    {
      id: '4',
      author: {
        name: 'David Kim',
        avatar: '/api/placeholder/40/40',
        level: 'Expert',
        badge: 'Verified Teacher'
      },
      title: 'Common TOEFL Integrated Writing mistakes to avoid',
      content: 'As a TOEFL instructor, I\'ve noticed students repeatedly making these mistakes in Integrated Writing tasks. Here\'s what you should watch out for...',
      category: 'TOEFL',
      tags: ['writing', 'integrated', 'mistakes', 'teacher-tips'],
      timestamp: '8 hours ago',
      likes: 45,
      replies: 6
    },
    {
      id: '5',
      author: {
        name: 'Lisa Park',
        avatar: '/api/placeholder/40/40',
        level: 'Intermediate'
      },
      title: 'Daily English conversation practice - anyone interested?',
      content: 'Looking for people to practice English conversation with daily. We could create a small group and have 30-minute sessions every evening. Intermediate to advanced level preferred.',
      category: 'General',
      tags: ['speaking', 'practice', 'conversation', 'group'],
      timestamp: '1 day ago',
      likes: 28,
      replies: 25
    }
  ];

  const categories = [
    { id: 'All', name: 'All Posts', icon: Globe, color: 'text-text-primary', count: mockPosts.length },
    { id: 'IELTS', name: 'IELTS', icon: BookOpen, color: 'text-brand-blue', count: mockPosts.filter(p => p.category === 'IELTS').length },
    { id: 'PTE', name: 'PTE', icon: Volume2, color: 'text-brand-green', count: mockPosts.filter(p => p.category === 'PTE').length },
    { id: 'TOEFL', name: 'TOEFL', icon: PenTool, color: 'text-brand-orange', count: mockPosts.filter(p => p.category === 'TOEFL').length },
    { id: 'General', name: 'General English', icon: MessageSquare, color: 'text-brand-purple', count: mockPosts.filter(p => p.category === 'General').length }
  ];

  const filteredPosts = mockPosts.filter(post => {
    const matchesCategory = activeCategory === 'All' || post.category === activeCategory;
    const matchesSearch = searchQuery === '' || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  const handleCreatePost = () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in both title and content for your post.",
        variant: "destructive"
      });
      return;
    }

    // In a real app, this would make an API call
    toast({
      title: "Post Created!",
      description: "Your post has been published to the community.",
    });

    setNewPostTitle('');
    setNewPostContent('');
    setShowNewPostDialog(false);
  };

  const handleLikePost = (postId: string) => {
    toast({
      title: "Post Liked!",
      description: "Thanks for engaging with the community.",
    });
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'IELTS': return 'bg-brand-blue/10 text-brand-blue border-brand-blue/20';
      case 'PTE': return 'bg-brand-green/10 text-brand-green border-brand-green/20';
      case 'TOEFL': return 'bg-brand-orange/10 text-brand-orange border-brand-orange/20';
      case 'General': return 'bg-brand-purple/10 text-brand-purple border-brand-purple/20';
      default: return 'bg-surface-3 text-text-secondary';
    }
  };

  return (
    <StudentLayout title="Community" showBackButton>
      <div className="space-y-6">
        {/* Community Header */}
        <div className="text-center">
          <h1 className="text-heading-2 mb-4">English Learning Community</h1>
          <p className="text-body-large max-w-3xl mx-auto">
            Connect with fellow learners, ask questions, share tips, and get help from teachers and experienced students.
          </p>
        </div>

        {/* Community Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="card-modern text-center">
            <CardContent className="py-4">
              <Users className="w-8 h-8 mx-auto mb-2 text-brand-blue" />
              <div className="text-2xl font-bold text-text-primary">{stats.totalMembers.toLocaleString()}</div>
              <div className="text-sm text-text-secondary">Total Members</div>
            </CardContent>
          </Card>
          
          <Card className="card-modern text-center">
            <CardContent className="py-4">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-brand-green" />
              <div className="text-2xl font-bold text-text-primary">{stats.activeToday.toLocaleString()}</div>
              <div className="text-sm text-text-secondary">Active Today</div>
            </CardContent>
          </Card>
          
          <Card className="card-modern text-center">
            <CardContent className="py-4">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-brand-orange" />
              <div className="text-2xl font-bold text-text-primary">{stats.totalPosts.toLocaleString()}</div>
              <div className="text-sm text-text-secondary">Total Posts</div>
            </CardContent>
          </Card>
          
          <Card className="card-modern text-center">
            <CardContent className="py-4">
              <Award className="w-8 h-8 mx-auto mb-2 text-brand-purple" />
              <div className="text-2xl font-bold text-text-primary">{stats.questionsAnswered.toLocaleString()}</div>
              <div className="text-sm text-text-secondary">Questions Answered</div>
            </CardContent>
          </Card>
        </div>

        {/* Categories and Search */}
        <Card className="card-modern">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <Button
                      key={category.id}
                      variant={activeCategory === category.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveCategory(category.id as any)}
                      className="flex items-center gap-2"
                    >
                      <Icon className={`w-4 h-4 ${category.color}`} />
                      {category.name}
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {category.count}
                      </Badge>
                    </Button>
                  );
                })}
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64"
                />
                
                <Dialog open={showNewPostDialog} onOpenChange={setShowNewPostDialog}>
                  <DialogTrigger asChild>
                    <Button className="btn-primary">
                      <Plus className="w-4 h-4 mr-2" />
                      New Post
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New Post</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Category</label>
                        <select 
                          value={newPostCategory}
                          onChange={(e) => setNewPostCategory(e.target.value as any)}
                          className="w-full mt-1 p-2 border rounded-lg"
                        >
                          <option value="IELTS">IELTS</option>
                          <option value="PTE">PTE</option>
                          <option value="TOEFL">TOEFL</option>
                          <option value="General">General English</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Title</label>
                        <Input
                          value={newPostTitle}
                          onChange={(e) => setNewPostTitle(e.target.value)}
                          placeholder="What's your question or topic?"
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Content</label>
                        <Textarea
                          value={newPostContent}
                          onChange={(e) => setNewPostContent(e.target.value)}
                          placeholder="Share your thoughts, questions, or tips..."
                          className="mt-1 min-h-[100px]"
                        />
                      </div>
                      
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setShowNewPostDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreatePost} className="btn-primary">
                          Create Post
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Posts Feed */}
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <Card key={post.id} className={`card-modern hover-lift ${post.isPinned ? 'border-brand-blue/20 bg-brand-blue/5' : ''}`}>
              <CardContent className="py-4">
                <div className="space-y-4">
                  {/* Post Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={post.author.avatar} />
                        <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text-primary">{post.author.name}</span>
                          <Badge variant="secondary" className="text-xs">{post.author.level}</Badge>
                          {post.author.badge && (
                            <Badge className="text-xs bg-brand-orange/10 text-brand-orange border-brand-orange/20">
                              {post.author.badge}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                          <Clock className="w-3 h-3" />
                          {post.timestamp}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {post.isPinned && <Pin className="w-4 h-4 text-brand-blue" />}
                      {post.isAnswered && <CheckCircle className="w-4 h-4 text-brand-green" />}
                      <Badge className={getCategoryBadgeColor(post.category)}>
                        {post.category}
                      </Badge>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div>
                    <h3 className="font-semibold text-lg mb-2 text-text-primary">{post.title}</h3>
                    <p className="text-text-secondary line-clamp-3">{post.content}</p>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Post Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLikePost(post.id)}
                        className="flex items-center gap-2 text-text-secondary hover:text-brand-red"
                      >
                        <Heart className="w-4 h-4" />
                        {post.likes}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-2 text-text-secondary hover:text-brand-blue"
                      >
                        <Reply className="w-4 h-4" />
                        {post.replies}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-2 text-text-secondary hover:text-brand-green"
                      >
                        <Share2 className="w-4 h-4" />
                        Share
                      </Button>
                    </div>
                    
                    <Button variant="outline" size="sm">
                      Read More
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* No posts found */}
        {filteredPosts.length === 0 && (
          <Card className="card-modern">
            <CardContent className="text-center py-12">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-text-secondary opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No posts found</h3>
              <p className="text-text-secondary mb-4">
                {searchQuery ? 'Try adjusting your search terms' : 'Be the first to post in this category!'}
              </p>
              <Button onClick={() => setShowNewPostDialog(true)} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Create the First Post
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </StudentLayout>
  );
};

export default CommunityPage;