import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Headphones, PenTool, Mic, Clock, Users, Info, Plus } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminContent } from "@/hooks/useAdminContent";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminTestManagement = () => {
  const navigate = useNavigate();
  const { testType } = useParams<{ testType: string }>();
  const { admin, loading } = useAdminAuth();
  const { createContent, listContent } = useAdminContent();
  
  const [tests, setTests] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTestName, setNewTestName] = useState("");
  const [trainingType, setTrainingType] = useState<'Academic' | 'General' | ''>('');

  useEffect(() => {
    if (!loading && !admin) {
      navigate('/admin/login');
    }
  }, [admin, loading, navigate]);

  useEffect(() => {
    loadTests();
  }, [testType]);

  const loadTests = async () => {
    try {
      console.log('Loading tests for type:', testType);
      
      // Direct Supabase query
      const { data: allTests, error } = await supabase
        .from('tests')
        .select('*')
        .eq('test_type', testType)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading tests:', error);
        throw error;
      }

      console.log('Found tests:', allTests?.length || 0);
      setTests(allTests || []);
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

    // Require training type selection for writing tests
    if (testType === 'writing' && !trainingType) {
      toast.error('Please select Academic or General training type for writing tests');
      return;
    }

    setIsCreating(true);
    try {
      console.log('Creating test:', { newTestName, testType, trainingType });

      const testData: any = {
        test_name: newTestName,
        test_type: testType,
        module: testType === 'ielts' ? 'reading' : testType // Default module
      };

      // Add training type for writing tests
      if (testType === 'writing' && trainingType) {
        testData.training_type = trainingType;
      }

      const response = await createContent('tests', testData);
      console.log('Test created:', response);

      toast.success('Test created successfully');
      setIsCreating(false);
      setNewTestName('');
      setTrainingType('');
      loadTests();
    } catch (error: any) {
      console.error('Error creating test:', error);
      toast.error(`Failed to create test: ${error.message || 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading Test Management...</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  const getTestTypeConfig = () => {
    switch (testType) {
      case 'ielts':
        return {
          title: 'IELTS Mock Tests',
          description: 'IELTS Academic and General Training Tests',
          color: 'from-blue-500 to-purple-600'
        };
      case 'pte':
        return {
          title: 'PTE Mock Tests',
          description: 'PTE Academic Test Preparation',
          color: 'from-green-500 to-blue-600'
        };
      case 'toefl':
        return {
          title: 'TOEFL Mock Tests',
          description: 'TOEFL iBT Test Preparation',
          color: 'from-orange-500 to-red-600'
        };
      case 'general':
        return {
          title: 'General English Tests',
          description: 'English Proficiency Development',
          color: 'from-purple-500 to-pink-600'
        };
      default:
        return {
          title: 'Mock Tests',
          description: 'Test Preparation',
          color: 'from-blue-500 to-purple-600'
        };
    }
  };

  const config = getTestTypeConfig();

  return (
    <AdminLayout 
      title={config.title} 
      showBackButton={true} 
      backPath={`/admin/${testType}`}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold tracking-tight bg-gradient-to-r ${config.color} bg-clip-text text-transparent`}>
              {config.title}
            </h1>
            <p className="text-muted-foreground mt-1">
              {config.description}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Dialog open={isCreating} onOpenChange={setIsCreating}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Test
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New {testType?.toUpperCase()} Test</DialogTitle>
                  <DialogDescription>
                    Enter a name for the new test. You can manage its content after creation.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="testName">Test Name</Label>
                    <Input
                      id="testName"
                      value={newTestName}
                      onChange={(e) => setNewTestName(e.target.value)}
                      placeholder={`e.g., ${testType?.toUpperCase()} Practice Test 1`}
                    />
                  </div>
                  {testType === 'writing' && (
                    <div className="space-y-2">
                      <Label htmlFor="trainingType">Training Type</Label>
                      <Select value={trainingType} onValueChange={(value: 'Academic' | 'General' | '') => setTrainingType(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select training type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Academic">Academic Training</SelectItem>
                          <SelectItem value="General">General Training</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Choose the IELTS training type for this writing test
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={createNewTest} className="flex-1">
                      Create Test
                    </Button>
                    <Button variant="outline" onClick={() => setIsCreating(false)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Badge variant="secondary" className="text-sm">
              {testType?.toUpperCase()} Module
            </Badge>
          </div>
        </div>

        {/* Test Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tests.map((test) => (
            <Card 
              key={test.id} 
              className="hover:shadow-lg transition-all duration-200 cursor-pointer border-border/40 bg-card/50 backdrop-blur-sm"
              onClick={() => navigate(`/admin/${testType}/test/${test.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-foreground">
                    {test.test_name}
                  </CardTitle>
                  <Info className="w-4 h-4 text-primary" />
                </div>
                <CardDescription className="text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Users className="w-3 h-3" />
                    <span>{test.module?.charAt(0).toUpperCase()}{test.module?.slice(1)} Module</span>
                  </div>
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>2h 45m</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <BookOpen className="w-3 h-3" />
                    <span>4 sections</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/admin/${testType}/test/${test.id}`);
                  }}
                >
                  Manage Test Content
                </Button>
              </CardContent>
            </Card>
          ))}
          
          {tests.length === 0 && (
            <div className="col-span-full text-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tests created yet</h3>
              <p className="text-muted-foreground mb-4">Create your first test to get started</p>
              <Button onClick={() => setIsCreating(true)}>
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

export default AdminTestManagement;