import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  BookOpen,
  Target,
  GraduationCap,
  Search,
  ArrowUpDown,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface GrammarTopic {
  id: string;
  slug: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  topic_order: number;
  icon: string;
  color: string;
  is_published: boolean;
  created_at: string;
  translations: {
    language_code: string;
    title: string;
    description: string;
  }[];
  exercise_count?: number;
  lesson_count?: number;
}

const levelColors = {
  beginner: 'bg-emerald-100 text-emerald-700',
  intermediate: 'bg-blue-100 text-blue-700',
  advanced: 'bg-purple-100 text-purple-700',
};

const AdminGrammarDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [topics, setTopics] = useState<GrammarTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTopic, setEditingTopic] = useState<GrammarTopic | null>(null);
  
  // Form state for create/edit
  const [formData, setFormData] = useState({
    slug: '',
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    topic_order: 1,
    icon: 'book',
    color: 'blue',
    is_published: false,
    title_en: '',
    description_en: '',
  });

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    setIsLoading(true);
    try {
      // Load topics with translations
      const { data: topicsData, error } = await supabase
        .from('grammar_topics')
        .select(`
          *,
          grammar_topic_translations(language_code, title, description)
        `)
        .order('level')
        .order('topic_order');

      if (error) throw error;

      // Load counts
      const topicsWithCounts = await Promise.all(
        (topicsData || []).map(async (topic) => {
          const [exerciseResult, lessonResult] = await Promise.all([
            supabase
              .from('grammar_exercises')
              .select('id', { count: 'exact', head: true })
              .eq('topic_id', topic.id),
            supabase
              .from('grammar_lessons')
              .select('id', { count: 'exact', head: true })
              .eq('topic_id', topic.id),
          ]);

          return {
            ...topic,
            translations: topic.grammar_topic_translations || [],
            exercise_count: exerciseResult.count || 0,
            lesson_count: lessonResult.count || 0,
          };
        })
      );

      setTopics(topicsWithCounts as GrammarTopic[]);
    } catch (error) {
      console.error('Error loading topics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load grammar topics',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTopic = async () => {
    try {
      // Create topic
      const { data: newTopic, error: topicError } = await supabase
        .from('grammar_topics')
        .insert({
          slug: formData.slug,
          level: formData.level,
          topic_order: formData.topic_order,
          icon: formData.icon,
          color: formData.color,
          is_published: formData.is_published,
        })
        .select()
        .single();

      if (topicError) throw topicError;

      // Create English translation
      const { error: transError } = await supabase
        .from('grammar_topic_translations')
        .insert({
          topic_id: newTopic.id,
          language_code: 'en',
          title: formData.title_en,
          description: formData.description_en,
        });

      if (transError) throw transError;

      toast({
        title: 'Success',
        description: 'Grammar topic created successfully',
      });

      setShowCreateDialog(false);
      resetForm();
      loadTopics();
    } catch (error: any) {
      console.error('Error creating topic:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create topic',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateTopic = async () => {
    if (!editingTopic) return;

    try {
      // Update topic
      const { error: topicError } = await supabase
        .from('grammar_topics')
        .update({
          slug: formData.slug,
          level: formData.level,
          topic_order: formData.topic_order,
          icon: formData.icon,
          color: formData.color,
          is_published: formData.is_published,
        })
        .eq('id', editingTopic.id);

      if (topicError) throw topicError;

      // Upsert English translation
      const { error: transError } = await supabase
        .from('grammar_topic_translations')
        .upsert({
          topic_id: editingTopic.id,
          language_code: 'en',
          title: formData.title_en,
          description: formData.description_en,
        }, { onConflict: 'topic_id,language_code' });

      if (transError) throw transError;

      toast({
        title: 'Success',
        description: 'Grammar topic updated successfully',
      });

      setEditingTopic(null);
      resetForm();
      loadTopics();
    } catch (error: any) {
      console.error('Error updating topic:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update topic',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!confirm('Are you sure you want to delete this topic? This will also delete all lessons and exercises.')) return;

    try {
      const { error } = await supabase
        .from('grammar_topics')
        .delete()
        .eq('id', topicId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Grammar topic deleted successfully',
      });

      loadTopics();
    } catch (error: any) {
      console.error('Error deleting topic:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete topic',
        variant: 'destructive',
      });
    }
  };

  const handleTogglePublish = async (topic: GrammarTopic) => {
    try {
      const { error } = await supabase
        .from('grammar_topics')
        .update({ is_published: !topic.is_published })
        .eq('id', topic.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Topic ${topic.is_published ? 'unpublished' : 'published'} successfully`,
      });

      loadTopics();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update topic',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      slug: '',
      level: 'beginner',
      topic_order: 1,
      icon: 'book',
      color: 'blue',
      is_published: false,
      title_en: '',
      description_en: '',
    });
  };

  const openEditDialog = (topic: GrammarTopic) => {
    const enTranslation = topic.translations.find(t => t.language_code === 'en');
    setFormData({
      slug: topic.slug,
      level: topic.level,
      topic_order: topic.topic_order,
      icon: topic.icon,
      color: topic.color,
      is_published: topic.is_published,
      title_en: enTranslation?.title || '',
      description_en: enTranslation?.description || '',
    });
    setEditingTopic(topic);
  };

  // Filter topics
  const filteredTopics = topics.filter(topic => {
    const matchesSearch = 
      topic.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.translations.some(t => 
        t.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    const matchesLevel = filterLevel === 'all' || topic.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  // Group by level
  const groupedTopics = {
    beginner: filteredTopics.filter(t => t.level === 'beginner'),
    intermediate: filteredTopics.filter(t => t.level === 'intermediate'),
    advanced: filteredTopics.filter(t => t.level === 'advanced'),
  };

  const getTitle = (topic: GrammarTopic) => {
    const enTrans = topic.translations.find(t => t.language_code === 'en');
    return enTrans?.title || topic.slug.replace(/-/g, ' ');
  };

  return (
    <AdminLayout title="Grammar Management" showBackButton>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search topics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Topic
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{topics.length}</p>
                  <p className="text-sm text-muted-foreground">Total Topics</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{groupedTopics.beginner.length}</p>
                  <p className="text-sm text-muted-foreground">Beginner</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{groupedTopics.intermediate.length}</p>
                  <p className="text-sm text-muted-foreground">Intermediate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{groupedTopics.advanced.length}</p>
                  <p className="text-sm text-muted-foreground">Advanced</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Topics List */}
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({filteredTopics.length})</TabsTrigger>
            <TabsTrigger value="beginner">Beginner ({groupedTopics.beginner.length})</TabsTrigger>
            <TabsTrigger value="intermediate">Intermediate ({groupedTopics.intermediate.length})</TabsTrigger>
            <TabsTrigger value="advanced">Advanced ({groupedTopics.advanced.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <TopicsList 
              topics={filteredTopics}
              getTitle={getTitle}
              onEdit={openEditDialog}
              onDelete={handleDeleteTopic}
              onTogglePublish={handleTogglePublish}
              onManage={(topic) => navigate(`/admin/grammar/${topic.id}`)}
            />
          </TabsContent>

          {(['beginner', 'intermediate', 'advanced'] as const).map(level => (
            <TabsContent key={level} value={level} className="mt-4">
              <TopicsList 
                topics={groupedTopics[level]}
                getTitle={getTitle}
                onEdit={openEditDialog}
                onDelete={handleDeleteTopic}
                onTogglePublish={handleTogglePublish}
                onManage={(topic) => navigate(`/admin/grammar/${topic.id}`)}
              />
            </TabsContent>
          ))}
        </Tabs>

        {/* Create/Edit Dialog */}
        <Dialog open={showCreateDialog || !!editingTopic} onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingTopic(null);
            resetForm();
          }
        }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTopic ? 'Edit Topic' : 'Create New Topic'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title (English)</Label>
                  <Input
                    id="title"
                    value={formData.title_en}
                    onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                    placeholder="Present Simple"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    placeholder="present-simple"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (English)</Label>
                <Textarea
                  id="description"
                  value={formData.description_en}
                  onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                  placeholder="Learn how to use present simple tense..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="level">Level</Label>
                  <Select value={formData.level} onValueChange={(v: any) => setFormData({ ...formData, level: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="order">Order</Label>
                  <Input
                    id="order"
                    type="number"
                    min={1}
                    value={formData.topic_order}
                    onChange={(e) => setFormData({ ...formData, topic_order: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="published">Published</Label>
                <Switch
                  id="published"
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowCreateDialog(false);
                setEditingTopic(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={editingTopic ? handleUpdateTopic : handleCreateTopic}>
                {editingTopic ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

// Topics List Component
interface TopicsListProps {
  topics: GrammarTopic[];
  getTitle: (topic: GrammarTopic) => string;
  onEdit: (topic: GrammarTopic) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (topic: GrammarTopic) => void;
  onManage: (topic: GrammarTopic) => void;
}

const TopicsList = ({ topics, getTitle, onEdit, onDelete, onTogglePublish, onManage }: TopicsListProps) => {
  if (topics.length === 0) {
    return (
      <Card className="p-8 text-center">
        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Topics Found</h3>
        <p className="text-muted-foreground">Create your first grammar topic to get started.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {topics.map((topic) => (
        <Card key={topic.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  topic.level === 'beginner' ? 'bg-emerald-100' :
                  topic.level === 'intermediate' ? 'bg-blue-100' : 'bg-purple-100'
                }`}>
                  <BookOpen className={`w-5 h-5 ${
                    topic.level === 'beginner' ? 'text-emerald-600' :
                    topic.level === 'intermediate' ? 'text-blue-600' : 'text-purple-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{getTitle(topic)}</h3>
                    <Badge className={levelColors[topic.level]} variant="secondary">
                      {topic.level}
                    </Badge>
                    {topic.is_published ? (
                      <Badge className="bg-emerald-100 text-emerald-700">Published</Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {topic.lesson_count} lesson(s) · {topic.exercise_count} exercise(s)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => onManage(topic)}>
                  Manage
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(topic)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onTogglePublish(topic)}>
                      {topic.is_published ? (
                        <>
                          <EyeOff className="w-4 h-4 mr-2" />
                          Unpublish
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          Publish
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(topic.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminGrammarDashboard;

