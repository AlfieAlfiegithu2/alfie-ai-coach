import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PenTool, Plus, Calendar, Users, Edit3, Trash2, Check, X } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminIELTSWriting = () => {
  const navigate = useNavigate();
  const { admin, loading: authLoading } = useAdminAuth();
  
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [editingTestName, setEditingTestName] = useState("");

  const loadTests = async () => {
    try {
      setLoading(true);
      console.log('📝 Loading writing tests...');
      console.log('🔗 Using Supabase URL:', supabase.supabaseUrl);
      
      // Try fetching via REST API directly to bypass client library issues
      const url = `${supabase.supabaseUrl}/rest/v1/tests?test_type=eq.IELTS`;
      const headers = {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI`,
        'Content-Type': 'application/json'
      };
      
      console.log('🔄 Fetching from REST API:', url);
      const response = await fetch(url, { headers });
      
      console.log('📊 REST API Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`REST API error: ${response.status} ${response.statusText}`);
      }
      
      const allData = await response.json();
      console.log('✅ REST API returned', allData?.length || 0, 'tests');
      
      // Filter for writing tests on client side
      const writingTests = allData?.filter((test: any) => 
        test.module === 'Writing' || test.skill_category === 'Writing' || 
        test.test_name?.includes('Writing')
      ) || [];

      console.log(`✅ Found ${writingTests.length} writing tests:`, writingTests);
      setTests(writingTests);
    } catch (error: any) {
      console.error('❌ Error loading tests:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack
      });
      toast.error(`Failed to load writing tests: ${error?.message || 'Unknown error'}`);
      setTests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      if (!authLoading) {
        if (!admin) {
          console.log('❌ No admin - redirecting to login');
          navigate('/admin/login');
        } else {
          console.log('✅ Admin authenticated - loading tests');
          await loadTests();
        }
      }
    };
    
    checkAuthAndLoad();
  }, [admin, authLoading, navigate]);

  const handleCreateTest = async () => {
    try {
      setLoading(true);
      console.log('📝 Creating new writing test...');
      
      // First, fetch existing tests to calculate next test number
      const url = `${supabase.supabaseUrl}/rest/v1/tests?test_type=eq.IELTS`;
      const headers = {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI`,
        'Content-Type': 'application/json'
      };
      
      console.log('🔄 Fetching existing tests for numbering...');
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tests: ${response.status}`);
      }
      
      const allTests = await response.json();
      const writingTests = allTests?.filter((t: any) => 
        t.module === 'Writing' || t.skill_category === 'Writing' || t.test_name?.includes('Writing')
      ) || [];
      
      const maxTestNumber = writingTests.length > 0 
        ? Math.max(...writingTests.map((t: any) => t.test_number || 1))
        : 0;
      
      const nextTestNumber = maxTestNumber + 1;
      
      console.log(`📊 Current writing tests: ${writingTests.length}, Next test_number: ${nextTestNumber}`);
      
      const insertData = {
        test_name: `IELTS Writing Test ${nextTestNumber}`,
        test_type: 'IELTS',
        module: 'Writing'
      };
      
      console.log('Creating test via edge function:', insertData);
      
      // Call the create-test edge function which uses service role to bypass RLS
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';
      const edgeFunctionUrl = `${supabase.supabaseUrl}/functions/v1/create-test`;
      const insertResponse = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify(insertData)
      });
      
      console.log('Edge function response status:', insertResponse.status);
      
      if (!insertResponse.ok) {
        const errorData = await insertResponse.text();
        console.error('Create function error response:', errorData);
        throw new Error(`Failed to create test: ${insertResponse.status} - ${errorData}`);
      }
      
      const responseJson = await insertResponse.json();
      const createdTest = responseJson.data;
      console.log('Test created successfully:', createdTest);
      
      toast.success('Test created successfully');
      
      // Reload tests list to reflect new test
      await loadTests();
      
      // Navigate to test management page
      navigate(`/admin/ielts/test/${createdTest.id}/writing`);
    } catch (error: any) {
      console.error('❌ Create test error:', error);
      toast.error(`Failed to create test: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
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

  const deleteTest = async (testId: string, testName: string) => {
    try {
      console.log('🗑️ Deleting test via edge function:', testId);
      
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';
      const edgeFunctionUrl = `${supabase.supabaseUrl}/functions/v1/delete-test`;
      console.log('🔗 Edge Function URL:', edgeFunctionUrl);
      console.log('📤 Sending testId:', testId);
      
      const deleteResponse = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({ testId })
      });
      
      console.log('📊 Delete response status:', deleteResponse.status);
      console.log('📊 Delete response ok:', deleteResponse.ok);
      
      const responseText = await deleteResponse.text();
      console.log('📄 Delete response body:', responseText);
      
      if (!deleteResponse.ok) {
        console.error('❌ Delete function returned error status:', deleteResponse.status);
        throw new Error(`Failed to delete test: ${deleteResponse.status} - ${responseText}`);
      }
      
      const responseJson = JSON.parse(responseText);
      console.log('✅ Test deleted successfully:', responseJson);
      
      toast.success(`Test "${testName}" deleted successfully`);
      await loadTests();
    } catch (error: any) {
      console.error('❌ Delete test error:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack
      });
      toast.error(`Failed to delete test: ${error?.message || 'Unknown error'}`);
    }
  };

  if (authLoading || loading) {
    return (
      <AdminLayout title="IELTS Writing" showBackButton={true} backPath="/admin/ielts">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading Writing tests...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <AdminLayout title="IELTS Writing" showBackButton={true} backPath="/admin/ielts">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              IELTS Writing Tests
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage IELTS Writing test content with Task 1 and Task 2
            </p>
          </div>
          <Button 
            onClick={handleCreateTest}
            disabled={loading}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Writing Test
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
              <PenTool className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tests.length}</div>
              <p className="text-xs text-muted-foreground">
                IELTS Writing tests created
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tests</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tests.length}</div>
              <p className="text-xs text-muted-foreground">
                Available for students
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">85%</div>
              <p className="text-xs text-muted-foreground">
                Student completion rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tests Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tests.map((test) => (
            <Card 
              key={test.id} 
              className="hover:shadow-lg transition-all duration-200 cursor-pointer border-border/40 bg-card/50 backdrop-blur-sm"
              onClick={() => !editingTestId && navigate(`/admin/ielts/test/${test.id}/writing`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1 mr-2">
                    {editingTestId === test.id ? (
                      <div className="flex items-center space-x-2 flex-1" onClick={(e) => e.stopPropagation()}>
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
                      <CardTitle className="text-lg font-semibold text-foreground">
                        {test.test_name}
                      </CardTitle>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary">Writing</Badge>
                    {editingTestId !== test.id && (
                      <div className="flex items-center gap-1 ml-2">
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteTest(test.id, test.test_name);
                                }}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Task 1 & Task 2 • 60 minutes total
                </p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>Created {new Date(test.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <PenTool className="w-3 h-3" />
                    <span>2 tasks</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/admin/ielts/test/${test.id}/writing`);
                  }}
                  disabled={editingTestId === test.id}
                >
                  Manage Writing Content
                </Button>
              </CardContent>
            </Card>
          ))}
          
          {tests.length === 0 && (
            <div className="col-span-full text-center py-12">
              <PenTool className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No writing tests created yet</h3>
              <p className="text-muted-foreground mb-4">Create your first IELTS Writing test to get started</p>
              <Button onClick={handleCreateTest} disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Test
              </Button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminIELTSWriting;
