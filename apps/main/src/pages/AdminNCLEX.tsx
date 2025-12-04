import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  Activity,
  Stethoscope,
  Baby,
  Heart,
  Brain,
  Pill,
  Shield,
  BookOpen,
  Clock,
  Users
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// NCLEX Categories
const NCLEX_CATEGORIES = [
  { value: 'Medical-Surgical', label: 'Medical-Surgical', icon: Stethoscope },
  { value: 'Pediatrics', label: 'Pediatrics', icon: Baby },
  { value: 'Maternity', label: 'Maternity', icon: Heart },
  { value: 'Mental Health', label: 'Mental Health', icon: Brain },
  { value: 'Pharmacology', label: 'Pharmacology', icon: Pill },
  { value: 'Fundamentals', label: 'Fundamentals', icon: Shield },
];

const DIFFICULTY_LEVELS = [
  { value: 'Easy', label: 'Easy' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Hard', label: 'Hard' },
];

interface NCLEXTest {
  id: string;
  title: string;
  description: string | null;
  category: string;
  difficulty_level: string;
  time_limit_minutes: number;
  is_published: boolean;
  question_count: number;
  created_at: string;
}

const AdminNCLEX = () => {
  const navigate = useNavigate();
  const { admin, loading } = useAdminAuth();
  const [tests, setTests] = useState<NCLEXTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTest, setEditingTest] = useState<NCLEXTest | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Medical-Surgical',
    difficulty_level: 'Medium',
    time_limit_minutes: 60
  });

  const [stats, setStats] = useState({
    totalTests: 0,
    publishedTests: 0,
    totalQuestions: 0,
    totalAttempts: 0
  });

  useEffect(() => {
    if (!loading && !admin) {
      navigate('/admin/login');
      return;
    }
    loadTests();
    loadStats();
  }, [admin, loading]);

  const loadTests = async () => {
    try {
      const { data, error } = await supabase
        .from('nclex_tests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTests((data as NCLEXTest[]) || []);
    } catch (error) {
      console.error('Error loading tests:', error);
      toast.error('Failed to load tests');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Get test counts
      const { data: testsData } = await supabase
        .from('nclex_tests')
        .select('id, is_published, question_count');

      const totalTests = (testsData || []).length;
      const publishedTests = (testsData || []).filter((t: any) => t.is_published).length;
      const totalQuestions = (testsData || []).reduce((sum: number, t: any) => sum + (t.question_count || 0), 0);

      // Get attempt count
      const { count: attemptCount } = await supabase
        .from('nclex_test_results')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalTests,
        publishedTests,
        totalQuestions,
        totalAttempts: attemptCount || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleCreateTest = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a test title');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('nclex_tests')
        .insert({
          title: formData.title,
          description: formData.description || null,
          category: formData.category,
          difficulty_level: formData.difficulty_level,
          time_limit_minutes: formData.time_limit_minutes,
          is_published: false,
          created_by: admin?.email || 'admin'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Test created successfully');
      setShowCreateDialog(false);
      resetForm();
      loadTests();
      loadStats();

      // Navigate to test detail page
      if (data) {
        navigate(`/admin/nclex/test/${data.id}`);
      }
    } catch (error) {
      console.error('Error creating test:', error);
      toast.error('Failed to create test');
    }
  };

  const handleUpdateTest = async () => {
    if (!editingTest || !formData.title.trim()) {
      toast.error('Please enter a test title');
      return;
    }

    try {
      const { error } = await supabase
        .from('nclex_tests')
        .update({
          title: formData.title,
          description: formData.description || null,
          category: formData.category,
          difficulty_level: formData.difficulty_level,
          time_limit_minutes: formData.time_limit_minutes
        })
        .eq('id', editingTest.id);

      if (error) throw error;

      toast.success('Test updated successfully');
      setEditingTest(null);
      resetForm();
      loadTests();
    } catch (error) {
      console.error('Error updating test:', error);
      toast.error('Failed to update test');
    }
  };

  const handleDeleteTest = async (testId: string) => {
    try {
      // Delete questions first (cascade should handle this, but being explicit)
      await supabase
        .from('nclex_questions')
        .delete()
        .eq('test_id', testId);

      // Delete test results
      await supabase
        .from('nclex_test_results')
        .delete()
        .eq('test_id', testId);

      // Delete the test
      const { error } = await supabase
        .from('nclex_tests')
        .delete()
        .eq('id', testId);

      if (error) throw error;

      toast.success('Test deleted successfully');
      loadTests();
      loadStats();
    } catch (error) {
      console.error('Error deleting test:', error);
      toast.error('Failed to delete test');
    }
  };

  const togglePublishStatus = async (test: NCLEXTest) => {
    try {
      const { error } = await supabase
        .from('nclex_tests')
        .update({ is_published: !test.is_published })
        .eq('id', test.id);

      if (error) throw error;

      toast.success(test.is_published ? 'Test unpublished' : 'Test published');
      loadTests();
      loadStats();
    } catch (error) {
      console.error('Error toggling publish status:', error);
      toast.error('Failed to update test');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'Medical-Surgical',
      difficulty_level: 'Medium',
      time_limit_minutes: 60
    });
  };

  const openEditDialog = (test: NCLEXTest) => {
    setEditingTest(test);
    setFormData({
      title: test.title,
      description: test.description || '',
      category: test.category,
      difficulty_level: test.difficulty_level,
      time_limit_minutes: test.time_limit_minutes
    });
  };

  const getCategoryIcon = (category: string) => {
    const cat = NCLEX_CATEGORIES.find(c => c.value === category);
    return cat?.icon || Activity;
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'Easy': return 'bg-green-100 text-green-700';
      case 'Medium': return 'bg-amber-100 text-amber-700';
      case 'Hard': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading || isLoading) {
    return (
      <AdminLayout title="NCLEX Admin" showBackButton>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="NCLEX Admin" showBackButton>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Activity className="h-8 w-8 text-teal-500" />
              NCLEX Test Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Create and manage NCLEX practice tests with SATA and MCQ questions
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create New Test
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New NCLEX Test</DialogTitle>
                <DialogDescription>
                  Set up a new practice test. You can add questions after creation.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Test Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Cardiovascular Nursing Quiz"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the test content..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NCLEX_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select
                      value={formData.difficulty_level}
                      onValueChange={(value) => setFormData({ ...formData, difficulty_level: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DIFFICULTY_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Time Limit (minutes)</Label>
                  <Input
                    type="number"
                    value={formData.time_limit_minutes}
                    onChange={(e) => setFormData({ ...formData, time_limit_minutes: parseInt(e.target.value) || 60 })}
                    min={5}
                    max={180}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTest} className="bg-teal-500 hover:bg-teal-600 text-white">
                  Create Test
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalTests}</p>
                  <p className="text-xs text-muted-foreground">Total Tests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.publishedTests}</p>
                  <p className="text-xs text-muted-foreground">Published</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalQuestions}</p>
                  <p className="text-xs text-muted-foreground">Questions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalAttempts}</p>
                  <p className="text-xs text-muted-foreground">Attempts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tests List */}
        <Card>
          <CardHeader>
            <CardTitle>All Tests</CardTitle>
            <CardDescription>
              Click on a test to manage its questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tests.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No tests created yet</p>
                <p className="text-sm text-muted-foreground mb-4">Create your first NCLEX practice test</p>
                <Button onClick={() => setShowCreateDialog(true)} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Test
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {tests.map((test) => {
                  const CategoryIcon = getCategoryIcon(test.category);
                  return (
                    <div
                      key={test.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div 
                        className="flex items-center gap-4 flex-1 cursor-pointer"
                        onClick={() => navigate(`/admin/nclex/test/${test.id}`)}
                      >
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                          <CategoryIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{test.title}</h3>
                            {test.is_published ? (
                              <Badge className="bg-green-100 text-green-700">Published</Badge>
                            ) : (
                              <Badge variant="secondary">Draft</Badge>
                            )}
                            <Badge className={getDifficultyColor(test.difficulty_level)}>
                              {test.difficulty_level}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{test.category}</span>
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              {test.question_count} questions
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {test.time_limit_minutes} min
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePublishStatus(test);
                          }}
                          title={test.is_published ? 'Unpublish' : 'Publish'}
                        >
                          {test.is_published ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(test);
                          }}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Test?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{test.title}" and all its questions. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteTest(test.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingTest} onOpenChange={(open) => !open && setEditingTest(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Test</DialogTitle>
              <DialogDescription>
                Update the test details below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Test Title *</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NCLEX_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select
                    value={formData.difficulty_level}
                    onValueChange={(value) => setFormData({ ...formData, difficulty_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTY_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Time Limit (minutes)</Label>
                <Input
                  type="number"
                  value={formData.time_limit_minutes}
                  onChange={(e) => setFormData({ ...formData, time_limit_minutes: parseInt(e.target.value) || 60 })}
                  min={5}
                  max={180}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTest(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateTest} className="bg-teal-500 hover:bg-teal-600 text-white">
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminNCLEX;

