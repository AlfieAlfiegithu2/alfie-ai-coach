import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, BookOpen, Edit, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminContent } from "@/hooks/useAdminContent";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface IELTSTest {
  id: string;
  name: string;
  status: 'complete' | 'incomplete';
  partsCompleted: number;
  totalQuestions: number;
  created_at: string;
}

const AdminIELTSReadingDashboard = () => {
  const navigate = useNavigate();
  const { admin, loading } = useAdminAuth();
  const { listContent, createContent } = useAdminContent();
  
  const [tests, setTests] = useState<IELTSTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTestName, setNewTestName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!loading && !admin) {
      navigate('/admin/login');
    }
  }, [admin, loading, navigate]);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    setIsLoading(true);
    try {
      console.log('Loading IELTS Reading tests...');
      
      // Direct Supabase queries - more reliable than edge functions
      const { data: allTests, error: testsError } = await supabase
        .from('tests')
        .select('*')
        .eq('test_type', 'ielts')
        .eq('module', 'reading')
        .order('created_at', { ascending: false });

      if (testsError) {
        console.error('Error loading tests:', testsError);
        throw testsError;
      }

      const { data: allQuestions, error: questionsError } = await supabase
        .from('questions')
        .select('*');

      if (questionsError) {
        console.error('Error loading questions:', questionsError);
        throw questionsError;
      }

      console.log('Found tests:', allTests?.length || 0);
      console.log('Found questions:', allQuestions?.length || 0);

      // Filter for IELTS Reading tests
      const ieltsReadingTests = allTests || [];

      // Create test list from database
      const testList: IELTSTest[] = [];

      // Add saved tests from database
      ieltsReadingTests.forEach((test: any) => {
        const questionsForThisTest = allQuestions?.filter((q: any) => q.test_id === test.id).length || 0;
        
        testList.push({
          id: test.id,
          name: test.test_name,
          status: 'incomplete', // Status will be calculated based on questions
          partsCompleted: 0, // Will be calculated from questions
          totalQuestions: questionsForThisTest,
          created_at: test.created_at
        });
      });

      // Count questions per test from universal questions table
      allQuestions?.forEach((question: any) => {
        if (question.test_id) {
          // Find the test this question belongs to
          const testId = question.test_id;
          const testInList = testList.find((t: any) => t.id === testId);
          if (testInList) {
            testInList.partsCompleted = Math.max(testInList.partsCompleted, question.part_number || 0);
          }
        }
      });

      // Update status based on completion
      testList.forEach((test) => {
        test.status = (test.partsCompleted === 3 && test.totalQuestions >= 30) ? 'complete' : 'incomplete';
      });

      // Sort tests by creation date (newest first)
      setTests(testList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (error) {
      console.error('Error loading tests:', error);
      toast.error('Failed to load tests');
    } finally {
      setIsLoading(false);
    }
  };

  const createNewTest = async () => {
    if (!newTestName.trim()) {
      toast.error('Please enter a test name');
      return;
    }

    setCreating(true);
    try {
      console.log('Creating new test with name:', newTestName);
      
      // Create new test record in universal tests table
      const testData = {
        test_name: newTestName,
        test_type: 'ielts',
        module: 'reading'
      };

      const response = await createContent('tests', testData);
      const newTestId = response.data?.id;
      
      // Navigate to the management page for this test
      navigate(`/admin/ielts/test/${newTestId}/reading`);
      
      setShowCreateDialog(false);
      setNewTestName("");
      toast.success(`Created ${newTestName} successfully`);
      
      // Reload the tests list
      loadTests();
    } catch (error: any) {
      console.error('Error creating test:', error);
      toast.error(`Failed to create test: ${error.message || 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading IELTS Reading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!admin) return null;

  return (
    <AdminLayout title="IELTS Reading Tests" showBackButton={true} backPath="/admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              IELTS Reading Tests
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your IELTS Reading test content
            </p>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Add New IELTS Test
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New IELTS Test</DialogTitle>
                <DialogDescription>
                  Enter a name for your new IELTS reading test
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="testName">Test Name</Label>
                  <Input
                    id="testName"
                    placeholder="e.g., IELTS Test 11"
                    value={newTestName}
                    onChange={(e) => setNewTestName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createNewTest()}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={createNewTest}
                    disabled={creating}
                  >
                    {creating ? 'Creating...' : 'Create Test'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tests Grid */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading tests...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map((test) => (
              <Card key={test.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      {test.name}
                    </CardTitle>
                    <Badge 
                      variant={test.status === 'complete' ? 'default' : 'secondary'}
                      className="flex items-center gap-1"
                    >
                      {test.status === 'complete' ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      {test.status === 'complete' ? 'Complete' : 'Incomplete'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Parts</div>
                        <div className="font-semibold">{test.partsCompleted}/3</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Questions</div>
                        <div className="font-semibold">{test.totalQuestions}</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => navigate(`/admin/ielts/test/${test.id}/reading`)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Manage
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminIELTSReadingDashboard;