import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Users, MessageSquare, ThumbsUp, Star, Send, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '@/components/StudentLayout';

const CommunityPage = () => {
  const navigate = useNavigate();
  const [newPost, setNewPost] = useState('');

  const mockPosts = [
    {
      id: 1,
      author: 'Sarah Chen',
      content: 'Just achieved Band 7 in Reading! The key was practicing with Cambridge 19 daily. Any tips for improving Writing Task 2?',
      likes: 12,
      replies: 5,
      timeAgo: '2 hours ago',
      topic: 'Reading Success'
    },
    {
      id: 2,
      author: 'Mike Johnson',
      content: 'Looking for a study group for IELTS preparation. I\'m aiming for Band 7.5 by March. Anyone interested?',
      likes: 8,
      replies: 12,
      timeAgo: '4 hours ago',
      topic: 'Study Groups'
    },
    {
      id: 3,
      author: 'Dr. Emily Watson',
      content: 'Pro tip: For Task 1 Writing, always start with the overview paragraph. Describe the main trends before getting into specific details.',
      likes: 25,
      replies: 8,
      timeAgo: '1 day ago',
      topic: 'Writing Tips',
      isExpert: true
    }
  ];

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
              <Button className="btn-primary">
                <Send className="w-4 h-4 mr-2" />
                Post
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filter Bar */}
        <div className="flex gap-4">
          <Button variant="outline" className="glass-button">
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
          <Button variant="outline" className="glass-button">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" className="glass-button">
            Reading
          </Button>
          <Button variant="outline" className="glass-button">
            Writing
          </Button>
          <Button variant="outline" className="glass-button">
            Speaking
          </Button>
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {mockPosts.map((post) => (
            <Card key={post.id} className="card-interactive">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-brand-blue" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{post.author}</p>
                          {post.isExpert && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="w-3 h-3 mr-1" />
                              Expert
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-text-secondary">{post.timeAgo}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {post.topic}
                    </Badge>
                  </div>
                  
                  <p className="text-text-primary leading-relaxed">{post.content}</p>
                  
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="text-text-secondary hover:text-brand-blue">
                      <ThumbsUp className="w-4 h-4 mr-1" />
                      {post.likes}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-text-secondary hover:text-brand-blue">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      {post.replies} replies
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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