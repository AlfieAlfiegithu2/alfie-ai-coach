import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Headphones, PenTool, Mic, Upload, Users, BarChart3, Settings, ArrowLeft, Plus, Edit3, Check, X } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminContent } from "@/hooks/useAdminContent";
import CSVImport from "@/components/CSVImport";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SKILLS } from "@/lib/skills";

const AdminIELTS = () => {
  const navigate = useNavigate();
  const { admin, loading, adminCheckComplete } = useAdminAuth();
  const { createContent } = useAdminContent();
  const [tests, setTests] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTestName, setNewTestName] = useState("");
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [editingTestName, setEditingTestName] = useState("");
  const [stats, setStats] = useState({
    totalTests: 0,
    activeStudents: 0,
    completionRate: 0,
    avgScore: 0
  });

  const loadTests = async () => {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .eq('test_type', 'IELTS')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTests(data || []);
      setStats(prev => ({ ...prev, totalTests: (data || []).length }));
    } catch (error) {
      console.error('Error loading tests:', error);
      toast.error('Failed to load tests');
    }
  };

  const createNewTest = async () => {
    if (!newTestName.trim()) {
      toast.error('Please enter a test name');
      return;
    }

    setIsCreating(true);
    try {
      await createContent('tests', {
        test_name: newTestName,
        test_type: 'IELTS',
        module: 'academic'
      });

      toast.success('Test created successfully');
      setNewTestName('');
      loadTests();
    } catch (error) {
      console.error('Error creating test:', error);
      toast.error('Failed to create test');
    } finally {
      setIsCreating(false);
    }
  };

  const startEditingTest = (test: any) => {
    setEditingTestId(test.id);
    setEditingTestName(test.test_name);
  };

  const cancelEditingTest = () => {
    setEditingTestId(null);
    setEditingTestName("");
  };

  const saveEditedTestName = async () => {
    if (!editingTestName.trim()) {
      toast.error('Test name cannot be empty');
      return;
    }

    try {
      const { error } = await supabase
        .from('tests')
        .update({ test_name: editingTestName })
        .eq('id', editingTestId);

      if (error) throw error;

      toast.success('Test name updated successfully');
      setEditingTestId(null);
      setEditingTestName("");
      loadTests();
    } catch (error) {
      console.error('Error updating test name:', error);
      toast.error('Failed to update test name');
    }
  };

  const createSpeakingTest = async () => {
    setIsCreating(true);
    try {
      const result = await createContent('tests', {
        test_name: `IELTS Speaking Test ${tests.length + 1}`,
        test_type: 'IELTS',
        module: 'Speaking'
      });

      if (result.data) {
        toast.success('Speaking test created successfully');
        navigate(`/admin/ielts/test/${result.data.id}/speaking`);
      }
    } catch (error) {
      console.error('Error creating speaking test:', error);
      toast.error('Failed to create speaking test');
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    console.log('🚀 AdminIELTS auth check:', { loading, admin: !!admin, adminCheckComplete });
    
    // Wait for admin check to be complete before making decisions
    if (!loading && adminCheckComplete) {
      if (!admin) {
        console.log('🔄 Redirecting to login - no admin access');
        // Add a small delay to prevent race conditions
        setTimeout(() => {
          navigate('/admin/login');
        }, 100);
      } else {
        console.log('✅ Admin access confirmed, loading tests');
        loadTests();
      }
    }
  }, [admin, loading, adminCheckComplete, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading IELTS Admin...</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  const sections = [
    {
      id: "reading",
      title: "Reading",
      icon: BookOpen,
      description: "Manage IELTS Reading passages and questions",
      path: "/admin/reading"
    },
    {
      id: "listening",
      title: "Listening", 
      icon: Headphones,
      description: "Manage IELTS Listening sections and audio",
      path: "/admin/listening"
    },
    {
      id: "writing",
      title: "Writing",
      icon: PenTool,
      description: "Manage IELTS Writing prompts and criteria",
      path: "/admin/writing"
    },
    {
      id: "speaking",
      title: "Speaking",
      icon: Mic,
      description: "Manage IELTS Speaking topics and assessments",
      path: "/admin/speaking",
      createTest: () => createSpeakingTest()
    }
  ];

  return (
    <AdminLayout title="IELTS Administration" showBackButton={true} backPath="/admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              IELTS Admin Portal
            </h1>
            <p className="text-muted-foreground">
              Manage IELTS content, tests, and student progress
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            IELTS Module
          </Badge>
        </div>

        {/* Quick Actions - removed as requested */}

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTests}</div>
              <p className="text-xs text-muted-foreground">
                IELTS practice tests
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeStudents}</div>
              <p className="text-xs text-muted-foreground">
                Currently enrolled
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completionRate}%</div>
              <p className="text-xs text-muted-foreground">
                Test completion
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgScore}</div>
              <p className="text-xs text-muted-foreground">
                Band score
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Skill Training Sections - unified with student portal */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Sharpen Your Skills</h3>
          <p className="text-muted-foreground">Manage 8 targeted skill drills. Changes appear instantly for students.</p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
            {SKILLS.map((s) => (
              <Card
                key={s.slug}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/admin/skills/${s.slug}`)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Add and manage questions for this skill</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Separator />

        {/* Main Content Tabs */}
        <Tabs defaultValue="content" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content">Content Management</TabsTrigger>
            <TabsTrigger value="upload">Upload Content</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">IELTS Tests</h3>
                  <p className="text-muted-foreground">
                    Manage your IELTS practice tests
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Test name"
                    value={newTestName}
                    onChange={(e) => setNewTestName(e.target.value)}
                    className="px-3 py-2 border rounded-md"
                    onKeyPress={(e) => e.key === 'Enter' && createNewTest()}
                  />
                  <Button 
                    onClick={createNewTest}
                    disabled={isCreating}
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Test
                  </Button>
                </div>
              </div>

              {tests.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {tests.map((test) => (
                    <Card 
                      key={test.id} 
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => !editingTestId && navigate(test.module === 'Speaking' ? `/admin/ielts/test/${test.id}/speaking` : `/admin/ielts/test/${test.id}`)}
                    >
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <BookOpen className="w-5 h-5 text-primary" />
                            {editingTestId === test.id ? (
                              <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                                <Input
                                  value={editingTestName}
                                  onChange={(e) => setEditingTestName(e.target.value)}
                                  className="text-lg font-semibold h-8"
                                  onKeyPress={(e) => e.key === 'Enter' && saveEditedTestName()}
                                />
                                <Button size="sm" variant="ghost" onClick={saveEditedTestName}>
                                  <Check className="w-4 h-4 text-green-600" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={cancelEditingTest}>
                                  <X className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            ) : (
                              <span>{test.test_name}</span>
                            )}
                          </div>
                          {editingTestId !== test.id && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditingTest(test);
                              }}
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                          )}
                        </CardTitle>
                        <CardDescription>
                          Created: {new Date(test.created_at).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Type: {test.test_type}</span>
                          <span>Module: {test.module}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No IELTS tests found</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first IELTS test to get started
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>Upload IELTS Content</span>
                </CardTitle>
                <CardDescription>
                  Import IELTS questions, passages, and audio content via CSV
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CSVImport 
                  onImport={() => {}} 
                  onQuestionsPreview={() => {}} 
                  type="reading"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>IELTS Analytics</span>
                </CardTitle>
                <CardDescription>
                  View performance metrics and student progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Analytics dashboard coming soon</p>
                  <p className="text-sm">Track student performance and test completion rates</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminIELTS;