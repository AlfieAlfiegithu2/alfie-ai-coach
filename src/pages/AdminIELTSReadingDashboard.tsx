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
import { toast } from "sonner";

interface IELTSTest {
  id: number;
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
      // First load from dedicated IELTS reading tests table
      const [testsResponse, passagesResponse, questionsResponse] = await Promise.all([
        listContent('ielts_reading_tests'),
        listContent('reading_passages'),
        listContent('reading_questions')
      ]);

      const savedTests = testsResponse?.data || [];
      const passages = passagesResponse?.data || [];
      const questions = questionsResponse?.data || [];

      // Group by test number to create test list
      const testMap = new Map<number, IELTSTest>();

      // Add saved tests from database
      savedTests.forEach((test: any) => {
        testMap.set(test.test_number, {
          id: test.test_number,
          name: test.test_name,
          status: test.status || 'incomplete',
          partsCompleted: test.parts_completed || 0,
          totalQuestions: test.total_questions || 0,
          created_at: test.created_at
        });
      });

      // Initialize default tests 1-10 if they don't exist
      for (let i = 1; i <= 10; i++) {
        if (!testMap.has(i)) {
          testMap.set(i, {
            id: i,
            name: `IELTS Test ${i}`,
            status: 'incomplete',
            partsCompleted: 0,
            totalQuestions: 0,
            created_at: new Date().toISOString()
          });
        }
      }

      // Update with actual passage and question data
      passages.forEach((passage: any) => {
        if (passage.cambridge_book && passage.cambridge_book.includes('IELTS Test')) {
          const testMatch = passage.cambridge_book.match(/IELTS Test (\d+)/);
          if (testMatch) {
            const testNumber = parseInt(testMatch[1]);
            const test = testMap.get(testNumber);
            if (test) {
              test.partsCompleted = Math.max(test.partsCompleted, passage.part_number || 0);
            }
          }
        }
      });

      questions.forEach((question: any) => {
        if (question.cambridge_book && question.cambridge_book.includes('IELTS Test')) {
          const testMatch = question.cambridge_book.match(/IELTS Test (\d+)/);
          if (testMatch) {
            const testNumber = parseInt(testMatch[1]);
            const test = testMap.get(testNumber);
            if (test) {
              test.totalQuestions++;
            }
          }
        }
      });

      // Update status based on completion
      testMap.forEach((test) => {
        test.status = (test.partsCompleted === 3 && test.totalQuestions >= 30) ? 'complete' : 'incomplete';
      });

      setTests(Array.from(testMap.values()).sort((a, b) => a.id - b.id));
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
      // Extract test number from name or find next available
      const testMatch = newTestName.match(/(\d+)/);
      const existingNumbers = tests.map(t => t.id);
      const nextNumber = testMatch ? parseInt(testMatch[1]) : Math.max(...existingNumbers, 0) + 1;
      
      // Create new test record in database
      const testData = {
        test_name: newTestName,
        test_number: nextNumber,
        status: 'incomplete',
        parts_completed: 0,
        total_questions: 0
      };

      await createContent('ielts_reading_tests', testData);
      
      // Navigate to the management page for this test
      navigate(`/admin/ielts/test/${nextNumber}/reading`);
      
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