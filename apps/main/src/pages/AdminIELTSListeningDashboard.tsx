import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Headphones, Edit, CheckCircle, AlertCircle } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminContent } from "@/hooks/useAdminContent";
import { toast } from "sonner";

interface IELTSListeningTest {
  id: number;
  name: string;
  status: 'complete' | 'incomplete';
  partsCompleted: number;
  totalQuestions: number;
  created_at: string;
}

const AdminIELTSListeningDashboard = () => {
  const navigate = useNavigate();
  const { admin, loading } = useAdminAuth();
  const { listContent, createContent } = useAdminContent();
  
  const [tests, setTests] = useState<IELTSListeningTest[]>([]);
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
      // Load from universal tests table
      const [testsResponse, questionsResponse] = await Promise.all([
        listContent('tests'),
        listContent('listening_questions')
      ]);

      const allTests = testsResponse?.data || [];
      const allQuestions = questionsResponse?.data || [];

      // Filter for IELTS Listening tests (individual skill tests only)
      const ieltsListeningTests = allTests.filter((test: any) =>
        test.test_type === 'IELTS' && test.module === 'Listening'
      );

      // Group by test number to create test list
      const testMap = new Map<number, IELTSListeningTest>();

      // Add saved tests from database
      ieltsListeningTests.forEach((test: any) => {
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
            name: `IELTS Listening Test ${i}`,
            status: 'incomplete',
            partsCompleted: 0,
            totalQuestions: 0,
            created_at: new Date().toISOString()
          });
        }
      }

      // Count questions per test from listening_questions table
      allQuestions.forEach((question: any) => {
        if (question.test_id) {
          // Find the test this question belongs to
          const testId = question.test_id;
          const test = ieltsListeningTests.find((t: any) => t.id === testId);
          if (test) {
            const testInMap = testMap.get(test.test_number);
            if (testInMap) {
              testInMap.totalQuestions++;
              testInMap.partsCompleted = Math.max(testInMap.partsCompleted, question.part_number || 0);
            }
          }
        }
      });

      // Update status based on completion
      testMap.forEach((test) => {
        test.status = (test.partsCompleted === 4 && test.totalQuestions >= 30) ? 'complete' : 'incomplete';
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
      console.log(`📝 Creating new Listening test: "${newTestName}"`);

      // Use the create-test edge function that bypasses RLS
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';
      const supabaseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/create-test`;

      const insertData = {
        test_name: newTestName,
        test_type: 'IELTS',
        module: 'Listening',
        skill_category: 'Listening' // Set skill_category for proper filtering
      };

      console.log(`💾 Creating test via edge function:`, insertData);

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
      toast.success('Test created successfully');
      setNewTestName('');

      // Navigate to the management page for this test
      navigate(`/admin/ielts/test/${data.id}/listening`);

      setShowCreateDialog(false);
    } catch (error: any) {
      console.error('❌ Error creating test:', error);
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
          <p className="mt-2 text-sm text-muted-foreground">Loading IELTS Listening Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!admin) return null;

  return (
    <AdminLayout title="IELTS Listening Tests" showBackButton={true} backPath="/admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              IELTS Listening Tests
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your IELTS Listening test content
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
                <DialogTitle>Create New IELTS Listening Test</DialogTitle>
                <DialogDescription>
                  Enter a name for your new IELTS listening test
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="testName">Test Name</Label>
                  <Input
                    id="testName"
                    placeholder="e.g., IELTS Listening Test 11"
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
                      <Headphones className="w-5 h-5" />
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
                        <div className="font-semibold">{test.partsCompleted}/4</div>
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
                        onClick={() => navigate(`/admin/ielts/test/${test.id}/listening`)}
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

export default AdminIELTSListeningDashboard;