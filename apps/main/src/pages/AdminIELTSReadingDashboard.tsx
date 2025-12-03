// Example for src/pages/AdminIELTSReadingDashboard.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, BookOpen, Edit3, Trash2, Check, X } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { toast } from 'sonner';

export default function AdminIELTSReadingDashboard() {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [editingTestName, setEditingTestName] = useState("");
  const navigate = useNavigate();
  const { admin, loading: authLoading } = useAdminAuth();

  const module = 'Reading';
  const testType = 'IELTS';

  useEffect(() => {
    if (!authLoading && !admin) {
      navigate('/admin/login');
    }
  }, [admin, authLoading, navigate]);

  useEffect(() => {
    const fetchTests = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .eq('test_type', 'IELTS')
        .eq('module', 'Reading')
        .order('created_at', { ascending: false });
      
      if (error) {
        setError(error.message);
      } else {
        setTests(data || []);
      }
      setLoading(false);
    };
    fetchTests();
  }, []);

  const handleCreateNewTest = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get count of existing tests for naming
      const { data: existingTests } = await supabase
        .from('tests')
        .select('test_name')
        .eq('test_type', testType)
        .eq('module', 'Reading')
        .order('created_at', { ascending: false });

      const newTestNumber = (existingTests?.length || 0) + 1;
      const newTestName = `IELTS Reading Test ${newTestNumber}`;

      console.log(`📝 Creating new Reading test: "${newTestName}"`);

      // Use the create-test edge function that bypasses RLS (same as AdminIELTSSkillManagement)
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';
      const supabaseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/create-test`;

      const insertData = {
        test_name: newTestName,
        test_type: 'IELTS',
        module: 'Reading',
        skill_category: 'Reading' // Set skill_category for proper filtering
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
      
      // Refresh the list and navigate to test management
      navigate(`/admin/ielts/test/${data.id}/reading`);
    } catch (err: any) {
      console.error('❌ Error creating test:', err);
      setError(err.message);
      toast.error(`Failed to create test: ${err.message}`);
    }
    
    setLoading(false);
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
      
      // Refresh tests
      const fetchTests = async () => {
        const { data, error } = await supabase
          .from('tests')
          .select('*')
          .eq('test_type', 'IELTS')
          .eq('module', 'Reading')
          .order('created_at', { ascending: false });
        
        if (error) {
          setError(error.message);
        } else {
          setTests(data || []);
        }
      };
      fetchTests();
    } catch (error: any) {
      console.error('Error updating test name:', error);
      toast.error('Failed to update test name');
    }
  };

  const deleteTest = async (testId: string, testName: string) => {
    try {
      console.log(`🗑️ Deleting test: ${testName} (${testId})`);

      // Use the delete-test edge function that bypasses RLS
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
      
      // Refresh tests
      const fetchTests = async () => {
        const { data, error } = await supabase
          .from('tests')
          .select('*')
          .eq('test_type', 'IELTS')
          .eq('module', 'Reading')
          .order('created_at', { ascending: false });
        
        if (error) {
          setError(error.message);
        } else {
          setTests(data || []);
        }
      };
      fetchTests();
    } catch (error: any) {
      console.error('❌ Error deleting test:', error);
      toast.error(`Failed to delete test: ${error.message}`);
    }
  };

  if (authLoading) return <div className="text-white">Loading...</div>;
  if (!admin) return null;

  if (loading && tests.length === 0) return (
    <AdminLayout title="IELTS Reading Tests" showBackButton={true} backPath="/admin">
      <p className="text-white">Loading tests...</p>
    </AdminLayout>
  );
  
  if (error) return (
    <AdminLayout title="IELTS Reading Tests" showBackButton={true} backPath="/admin">
      <p className="text-red-500">Error: {error}</p>
    </AdminLayout>
  );

  return (
    <AdminLayout title="IELTS Reading Tests" showBackButton={true} backPath="/admin">
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            IELTS Reading Tests
          </h1>
          <Button
            onClick={handleCreateNewTest}
            disabled={loading}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            {loading ? 'Creating...' : 'Create Reading Test'}
          </Button>
        </div>
        
        {tests.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Reading tests found</h3>
            <p className="text-muted-foreground mb-4">
              Create your first IELTS Reading test to get started
            </p>
            <Button onClick={handleCreateNewTest} disabled={loading}>
              <Plus className="w-4 h-4 mr-2" />
              {loading ? 'Creating...' : 'Create First Test'}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map((test) => (
              <Card key={test.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
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
                          <AlertDialogContent>
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
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Created: {new Date(test.created_at).toLocaleDateString()}
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => navigate(`/admin/ielts/test/${test.id}/reading`)}
                      disabled={editingTestId === test.id}
                    >
                      Manage Test Content
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}