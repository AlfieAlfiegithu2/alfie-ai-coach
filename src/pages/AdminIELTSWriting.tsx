import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PenTool, Plus, Calendar, Users } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminContent } from "@/hooks/useAdminContent";
import { useToast } from "@/hooks/use-toast";

const AdminIELTSWriting = () => {
  const navigate = useNavigate();
  const { createNewTest, listContent, loading } = useAdminContent();
  const { toast } = useToast();
  
  const [tests, setTests] = useState<any[]>([]);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      const result = await listContent('tests');
      const testsData = Array.isArray(result) ? result : (result?.data || []);
      
      // Filter for IELTS Writing tests
      const ieltsWritingTests = testsData.filter((test: any) => 
        test.test_type === 'IELTS' && test.module === 'Writing'
      );
      setTests(ieltsWritingTests);
    } catch (error) {
      console.error('Error loading tests:', error);
      toast({
        title: "Error",
        description: "Failed to load writing tests",
        variant: "destructive"
      });
    }
  };

  const handleCreateTest = async () => {
    try {
      const result = await createNewTest('IELTS', 'Writing');
      
      if (result?.id) {
        toast({
          title: "Success",
          description: "New IELTS Writing test created successfully"
        });
        
        // Navigate to the test management page
        navigate(`/admin/ielts/writing/test/${result.id}`);
      }
    } catch (error: any) {
      console.error('Error creating test:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create test",
        variant: "destructive"
      });
    }
  };

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
              onClick={() => navigate(`/admin/ielts/writing/test/${test.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-foreground">
                    {test.test_name}
                  </CardTitle>
                  <Badge variant="secondary">Writing</Badge>
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
                    navigate(`/admin/ielts/writing/test/${test.id}`);
                  }}
                >
                  Manage Test Content
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