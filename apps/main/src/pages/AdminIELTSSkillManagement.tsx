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
      const skillCapitalized = skill.charAt(0).toUpperCase() + skill.slice(1);

      // Use REST API with timeout instead of adminSupabase client (which hangs)
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';
      const baseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(
          `${baseUrl}/rest/v1/tests?test_type=eq.IELTS&order=created_at.asc`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Failed to fetch tests: ${response.status}`);
        }

        const data = await response.json();

        // Filter on client side to find tests matching this skill
        const filteredTests = data?.filter((test: any) => 
          test.module === skillCapitalized || 
          test.skill_category === skillCapitalized
        ) || [];

        console.log(`✅ Found ${filteredTests.length} ${skillName} tests:`, filteredTests);
        setTests(filteredTests);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('❌ Fetch error:', fetchError);
        throw fetchError;
      }
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
      console.log(`📝 Creating new ${skillName} test: "${newTestName}"`);
      const skillCapitalized = skill ? skill.charAt(0).toUpperCase() + skill.slice(1) : '';

      // Prepare data - NO need to fetch existing tests, edge function handles everything
      let insertData: any = {
        test_name: newTestName,
        test_type: 'IELTS',
        module: skillCapitalized,
        skill_category: skillCapitalized // Set skill_category for ALL skills
      };

      if (skill === 'writing') {
        insertData.module = 'Writing';
        insertData.skill_category = 'Writing';
      } else if (skill === 'speaking') {
        insertData.module = 'Speaking';
        insertData.skill_category = 'Speaking';
      } else if (skill === 'reading') {
        insertData.module = 'Reading';
        insertData.skill_category = 'Reading';
      } else if (skill === 'listening') {
        insertData.module = 'Listening';
        insertData.skill_category = 'Listening';
      }

      console.log(`💾 Creating test via edge function:`, insertData);

      // Call the create-test edge function - SIMPLE AND FAST!
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';
      const supabaseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/create-test`;

      const createResponse = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify(insertData)
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.text();
        console.error('Create function error response:', errorData);
        throw new Error(`Failed to create test: ${createResponse.status} - ${errorData}`);
      }

      const responseJson = await createResponse.json();
      const data = responseJson.data;
      console.log(`✅ Test created successfully:`, data);
      toast.success(`${skillName} test created successfully`);
      setNewTestName('');
      await loadSkillTests();
      
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
    } catch (error: any) {
      console.error('❌ Full error:', error);
      toast.error(`Failed to create ${skillName} test: ${error?.message || 'Unknown error'}`);
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

  const deleteTest = async (testId: string, testName: string) => {
    try {
      console.log(`🗑️ Deleting test: ${testName} (${testId})`);

      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';
      const supabaseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/delete-test`;

      const deleteResponse = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({ testId })
      });

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.text();
        console.error('Delete function error response:', errorData);
        throw new Error(`Failed to delete test: ${deleteResponse.status} - ${errorData}`);
      }

      const responseJson = await deleteResponse.json();
      console.log(`✅ Test deleted successfully:`, responseJson);
      toast.success(`Test "${testName}" deleted successfully`);
      loadSkillTests(); // Refresh the test list
    } catch (error: any) {
      console.error('❌ Full error:', error);
      toast.error(`Failed to delete test: ${error?.message || 'Unknown error'}`);
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
                          <span>{test.test_name}</span>
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
                            <AlertDialogContent className="z-50">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Test</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{test.test_name}"? This will also delete all questions associated with this test. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteTest(test.id, test.test_name)}
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