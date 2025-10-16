import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { BookOpen, Headphones, PenTool, Mic, Plus, Edit3, Check, X, Trash2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { toast } from "sonner";
import { adminSupabase } from "@/integrations/supabase/client";

const skillIcons = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenTool,
  speaking: Mic
};

const AdminIELTSSkillManagement = () => {
  const { skill } = useParams<{ skill: string }>();
  const navigate = useNavigate();
  const { admin, loading } = useAdminAuth();
  const [tests, setTests] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTestName, setNewTestName] = useState("");
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [editingTestName, setEditingTestName] = useState("");

  // Validate skill parameter and redirect if invalid
  const validSkills = ['listening', 'reading', 'writing', 'speaking'];
  
  useEffect(() => {
    if (!skill || !validSkills.includes(skill.toLowerCase())) {
      console.log('Invalid or missing skill parameter:', skill, 'Redirecting to /admin/ielts');
      navigate('/admin/ielts');
      return;
    }
  }, [skill, navigate]);

  // Don't render if skill is invalid
  if (!skill || !validSkills.includes(skill.toLowerCase())) {
    return null;
  }

  const skillName = skill ? skill.charAt(0).toUpperCase() + skill.slice(1) : "";
  const normalizedSkill = skill?.toLowerCase();
  const SkillIcon = (normalizedSkill && skillIcons[normalizedSkill as keyof typeof skillIcons]) || BookOpen;

  useEffect(() => {
    if (!loading) {
      if (!admin) {
        navigate('/admin/login');
      } else {
        loadSkillTests();
      }
    }
  }, [admin, loading, navigate, skill]);

  const loadSkillTests = async () => {
    if (!skill) return;

    try {
      console.log(`🔍 Loading ${skillName} tests...`);
      console.log(`Module: ${skill.charAt(0).toUpperCase() + skill.slice(1)}`);

      // First, let's check if there are any speaking prompts to understand the test structure
      if (skill === 'speaking') {
        const { data: prompts, error: promptsError } = await adminSupabase
          .from('speaking_prompts')
          .select('*')
          .limit(5);

        console.log('Speaking prompts in database:', prompts?.length || 0, promptsError ? 'Error:' + promptsError.message : '');
      }

      const { data, error } = await adminSupabase
        .from('tests')
        .select('*')
        .eq('test_type', 'IELTS')
        .eq('module', skill.charAt(0).toUpperCase() + skill.slice(1))
        .order('test_number', { ascending: true });

      if (error) {
        console.error('❌ Database error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log(`✅ Found ${data?.length || 0} ${skillName} tests:`, data);
      setTests(data || []);
    } catch (error) {
      console.error('❌ Error loading skill tests:', error);
      toast.error(`Failed to load ${skillName} tests`);
    }
  };

  const createNewTest = async () => {
    if (!newTestName.trim()) {
      toast.error('Please enter a test name');
      return;
    }

    setIsCreating(true);
    try {
      // Get the next test number for this skill
      const { data: maxTest } = await adminSupabase
        .from('tests')
        .select('test_number')
        .eq('test_type', 'IELTS')
        .eq('module', skillName)
        .order('test_number', { ascending: false })
        .limit(1)
        .single();

      const newTestNumber = (maxTest?.test_number || 0) + 1;

      const { data, error } = await adminSupabase
        .from('tests')
        .insert({
          test_name: newTestName,
          test_type: 'IELTS',
          module: skillName,
          test_number: newTestNumber,
          status: 'incomplete',
          parts_completed: 0,
          total_questions: 0
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`${skillName} test created successfully`);
      setNewTestName('');
      loadSkillTests();
      
      // Navigate to skill-specific test management pages for individual tests
      switch(skill) {
        case 'speaking':
          navigate(`/admin/ielts/test/${data.id}/speaking`);
          break;
        case 'writing':
          navigate(`/admin/ielts/test/${data.id}/writing`);
          break;
        case 'reading':
          navigate(`/admin/ielts/test/${data.id}/reading`);
          break;
        case 'listening':
          navigate(`/admin/ielts/test/${data.id}/listening`);
          break;
        default:
          navigate(`/admin/ielts/test/${data.id}`);
      }
    } catch (error) {
      console.error('Error creating test:', error);
      toast.error(`Failed to create ${skillName} test`);
    } finally {
      setIsCreating(false);
    }
  };

  const startEditingTest = (test: any) => {
    setEditingTestId(test.id);
    setEditingTestName(`${skillName} Test ${test.test_number}`);
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
      const { error } = await adminSupabase
        .from('tests')
        .update({ test_name: editingTestName })
        .eq('id', editingTestId);

      if (error) throw error;

      toast.success('Test name updated successfully');
      setEditingTestId(null);
      setEditingTestName("");
      loadSkillTests();
    } catch (error) {
      console.error('Error updating test name:', error);
      toast.error('Failed to update test name');
    }
  };

  const handleTestClick = (test: any) => {
    if (editingTestId) return;
    
    // Navigate to skill-specific test management pages for individual tests
    switch(skill) {
      case 'speaking':
        navigate(`/admin/ielts/test/${test.id}/speaking`);
        break;
      case 'writing':
        navigate(`/admin/ielts/test/${test.id}/writing`);
        break;
      case 'reading':
        navigate(`/admin/ielts/test/${test.id}/reading`);
        break;
      case 'listening':
        navigate(`/admin/ielts/test/${test.id}/listening`);
        break;
      default:
        navigate(`/admin/ielts/test/${test.id}`);
    }
  };

  const deleteTest = async (testId: string, testNumber: number) => {
    try {
      // First, delete any questions associated with this test
      const { error: questionsError } = await adminSupabase
        .from('questions')
        .delete()
        .eq('test_id', testId);

      if (questionsError) {
        console.error('Error deleting questions:', questionsError);
        // Continue with test deletion even if questions deletion fails
      }

      // Then delete the test itself
      const { error } = await adminSupabase
        .from('tests')
        .delete()
        .eq('id', testId);

      if (error) throw error;

      toast.success(`Test "${skillName} Test ${testNumber}" deleted successfully`);
      loadSkillTests(); // Refresh the test list
    } catch (error) {
      console.error('Error deleting test:', error);
      toast.error('Failed to delete test');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading {skillName} Admin...</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <AdminLayout title={`IELTS ${skillName} Tests`} showBackButton backPath="/admin/ielts">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <SkillIcon className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                IELTS {skillName} Tests
              </h1>
              <p className="text-muted-foreground">
                Manage {skillName.toLowerCase()} test content and questions
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            {skillName} Management
          </Badge>
        </div>

        {/* Create New Test Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Create New {skillName} Test</span>
            </CardTitle>
            <CardDescription>
              Add a new IELTS {skillName.toLowerCase()} test to your collection
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                placeholder={`Test name (e.g., ${skillName} Test 1)`}
                value={newTestName}
                onChange={(e) => setNewTestName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createNewTest()}
              />
            </div>
            <Button 
              onClick={createNewTest}
              disabled={isCreating}
            >
              {isCreating ? "Creating..." : "Create Test"}
            </Button>
          </CardContent>
        </Card>

        {/* Tests Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Existing {skillName} Tests</h3>
            <Badge variant="outline">{tests.length} tests</Badge>
          </div>

          {tests.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tests.map((test) => (
                <Card 
                  key={test.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleTestClick(test)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <SkillIcon className="w-5 h-5 text-primary" />
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
                          <span>{skillName} Test {test.test_number}</span>
                        )}
                      </div>
                      {editingTestId !== test.id && (
                        <div className="flex items-center gap-1">
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
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Test</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{skillName} Test {test.test_number}"? This will also delete all questions associated with this test. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteTest(test.id, test.test_number)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Created: {new Date(test.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Type: {test.test_type}</span>
                      <span>Skill: {test.module}</span>
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full mt-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTestClick(test);
                      }}
                      disabled={editingTestId === test.id}
                    >
                      Manage {skillName} Content
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <SkillIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No {skillName} tests found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first {skillName.toLowerCase()} test to get started
              </p>
              <Button onClick={() => setNewTestName(`${skillName} Test 1`)}>
                Create First Test
              </Button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminIELTSSkillManagement;