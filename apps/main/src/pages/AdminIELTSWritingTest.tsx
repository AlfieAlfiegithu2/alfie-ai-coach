import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PenTool, Save, Image, FileText, Upload, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "@/components/AdminLayout";
import { useAdminContent } from "@/hooks/useAdminContent";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cuumxmfzhwljylbdlflj.supabase.co';

const AdminIELTSWritingTest = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { createContent, updateContent, loading } = useAdminContent();
  const { toast } = useToast();

  const [test, setTest] = useState<any>(null);
  const [trainingType, setTrainingType] = useState<'Academic' | 'General'>('Academic');
  const [task1, setTask1] = useState({
    id: null,
    instructions: "",
    imageUrl: "",
    imageContext: "",
    modelAnswer: ""
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [task2, setTask2] = useState({
    id: null,
    instructions: "",
    modelAnswer: ""
  });
  const [isLocked, setIsLocked] = useState(false);
  const [isModifying, setIsModifying] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (testId) {
      loadTestData();
    }
  }, [testId]);

  // Sync trainingType when test data changes
  useEffect(() => {
    if (test) {
      // Use test_subtype (database column) or fallback to training_type
      const testSubtype = test.test_subtype || test.training_type;
      if (testSubtype) {
        const newTrainingType = testSubtype === 'General' ? 'General' : 'Academic';
        console.log('🔄 Syncing trainingType from test data:', newTrainingType, 'Current:', trainingType);
        setTrainingType(newTrainingType);
      }
    }
  }, [test?.test_subtype, test?.training_type]);

  const loadTestData = async () => {
    try {
      console.log('📝 Loading test data for testId:', testId);
      if (!testId) {
        console.error('❌ No testId provided!');
        setPageLoading(false);
        return;
      }
      
      setPageLoading(true);
      
      // Use REST API directly with timeout instead of Supabase client
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';
      const baseUrl = SUPABASE_URL;
      
      // Set a 5 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        // Fetch test details
        console.log('📝 Fetching test details via REST API...');
        const testResponse = await fetch(
          `${baseUrl}/rest/v1/tests?id=eq.${testId}&select=*`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          }
        );

        if (!testResponse.ok) {
          throw new Error(`Test fetch failed: ${testResponse.status}`);
        }

        const testResults = await testResponse.json();
        const testData = testResults?.[0];

        if (!testData) {
          console.error('❌ Test not found:', testId);
          setPageLoading(false);
          setTest({});
          return;
        }

        console.log('✅ Test loaded:', testData);
        console.log('📋 Test subtype from test data:', testData.test_subtype, 'Training type:', testData.training_type);
        setTest(testData);
        // Use test_subtype (database column) or fallback to training_type for backward compatibility
        // Handle empty strings properly - if either field explicitly says 'General', use General, otherwise Academic
        const loadedTrainingType = (testData.test_subtype === 'General' || testData.training_type === 'General') ? 'General' : 'Academic';
        console.log('🎯 Setting training type to:', loadedTrainingType);
        setTrainingType(loadedTrainingType);

        // Fetch questions
        console.log('📝 Fetching questions via REST API...');
        const questionsResponse = await fetch(
          `${baseUrl}/rest/v1/questions?test_id=eq.${testId}&question_type=in.("Task 1","Task 2")&order=part_number.asc`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          }
        );

        if (questionsResponse.ok) {
          const questions = await questionsResponse.json();
          console.log('✅ Questions loaded:', questions?.length || 0);

          if (questions && questions.length > 0) {
            const task1Question = questions.find((q: any) => q.part_number === 1);
            const task2Question = questions.find((q: any) => q.part_number === 2);

            if (task1Question) {
              setTask1({
                id: task1Question.id,
                instructions: task1Question.passage_text || "",
                imageUrl: task1Question.image_url || "",
                imageContext: task1Question.explanation || "",
                modelAnswer: task1Question.transcription || ""
              });
            }

            if (task2Question) {
              setTask2({
                id: task2Question.id,
                instructions: task2Question.passage_text || "",
                modelAnswer: task2Question.transcription || ""
              });
            }

            const hasCompleteContent = task1Question && task2Question && 
                                       task1Question.question_text && task2Question.question_text;
            setIsLocked(Boolean(hasCompleteContent));
          }
        }

        console.log('✅ Test data loading complete');
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('❌ Error loading test data:', error);
    } finally {
      setPageLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `ielts-writing/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(filePath);

      setTask1(prev => ({ ...prev, imageUrl: publicUrl }));
      setSelectedFile(null);
      
      toast({
        title: "Success",
        description: "Image uploaded successfully"
      });
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    try {
      if (task1.imageUrl) {
        // Extract file path from URL for deletion
        const urlParts = task1.imageUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `ielts-writing/${fileName}`;

        const { error: deleteError } = await supabase.storage
          .from('audio-files')
          .remove([filePath]);

        if (deleteError) {
          console.warn('Error deleting file from storage:', deleteError);
        }

        // Clear the image URL from state regardless of storage deletion result
        setTask1(prev => ({ ...prev, imageUrl: "" }));
        
        toast({
          title: "Success",
          description: "Image deleted successfully"
        });
      }
    } catch (error: any) {
      console.error('Error deleting image:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete image",
        variant: "destructive"
      });
    }
  };

  const saveTask = async (taskNumber: 1 | 2) => {
    try {
      const taskData = taskNumber === 1 ? task1 : task2;
      const questionData: any = {
        test_id: testId,
        part_number: taskNumber,
        question_number_in_part: 1,
        question_text: `Task ${taskNumber}`, // Use generic task title
        passage_text: taskData.instructions,
        question_type: `Task ${taskNumber}`,
        correct_answer: "N/A", // Required field
        transcription: taskData.modelAnswer, // Store model answer in transcription field
      };

      // For Task 1, handle differently based on training type
      if (taskNumber === 1) {
        if (trainingType === 'Academic') {
          // Academic: include image_url and explanation (image context)
          questionData.image_url = task1.imageUrl || null;
          questionData.explanation = task1.imageContext || null;
        } else {
          // General: no image_url or explanation needed (simplified interface)
          questionData.image_url = null;
          questionData.explanation = null;
        }
      }

      if (taskData.id) {
        // Update existing question
        const { error } = await supabase
          .from('questions')
          .update(questionData)
          .eq('id', taskData.id);

        if (error) throw error;
      } else {
        // Create new question
        const { data, error } = await supabase
          .from('questions')
          .insert(questionData)
          .select()
          .single();

        if (error) throw error;

        // Update the task with the new ID
        if (taskNumber === 1) {
          setTask1(prev => ({ ...prev, id: data.id }));
        } else {
          setTask2(prev => ({ ...prev, id: data.id }));
        }
      }

      // Check if both tasks are now completed to lock the content
      const { data: questionsCheck } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .in('question_type', ['Task 1', 'Task 2']);
      
      if (questionsCheck && questionsCheck.length === 2) {
        setIsLocked(true);
        setIsModifying(false);
      }
      
      toast({
        title: "Success",
        description: `Task ${taskNumber} saved successfully`
      });
    } catch (error: any) {
      console.error(`Error saving Task ${taskNumber}:`, error);
      toast({
        title: "Error",
        description: error.message || `Failed to save Task ${taskNumber}`,
        variant: "destructive"
      });
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading test data...</p>
        </div>
      </div>
    );
  }

  if (!test || Object.keys(test).length === 0) {
    return (
      <AdminLayout title="Writing Test" showBackButton={true} backPath="/admin/ielts/writing">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Error Loading Test</h2>
            <p className="text-muted-foreground mb-4">Could not load the test data. Please try again.</p>
            <Button onClick={() => navigate('/admin/ielts/writing')}>
              Back to Tests
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title={`Writing Test - ${test.test_name}`} 
      showBackButton={true} 
      backPath="/admin/ielts/writing"
    >
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              {test.test_name}
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage Task 1 and Task 2 content for this IELTS Writing test
            </p>
            {isLocked && !isModifying && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="default" className="bg-green-600">Locked & Complete</Badge>
                <Button
                  onClick={() => setIsModifying(true)}
                  variant="outline"
                  size="sm"
                >
                  Modify Content
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Training Type Selector - Add this to fix existing tests */}
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Training Type</h3>
                <p className="text-sm text-muted-foreground">Choose the training type for this test</p>
              </div>
              <Select value={trainingType} onValueChange={(value: 'Academic' | 'General') => {
                console.log('Training type manually changed to:', value);
                setTrainingType(value);
              }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Academic">Academic Training</SelectItem>
                  <SelectItem value="General">General Training</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Debug Info - Remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 text-xs rounded">
            Debug: Current trainingType = "{trainingType}" | Test test_subtype = "{test?.test_subtype}" | Test training_type = "{test?.training_type}"
          </div>
        )}

        {/* Task 1 Section */}
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {trainingType === 'Academic' ? <Image className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
              Task 1 - {trainingType === 'Academic' ? 'Data Description' : 'Task Instructions'}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {trainingType === 'Academic'
                ? 'Task 1 requires students to describe visual information (graphs, charts, tables, etc.)'
                : 'Task 1 requires students to follow the given instructions to complete the writing task'
              }
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* DEBUG: What trainingType value? */}
            <div style={{background: 'red', color: 'white', padding: '10px', margin: '10px 0'}}>
              DEBUG: trainingType = "{trainingType}" | test.test_subtype = "{test?.test_subtype}" | test.training_type = "{test?.training_type}"
            </div>

            {/* Academic Training - Show Task Instructions */}
            {trainingType === 'Academic' && (
              <div style={{background: 'green', color: 'white', padding: '10px', margin: '10px 0'}}>
                ACADEMIC MODE ACTIVE
                <div className="space-y-2">
                  <Label htmlFor="task1-instructions">Task Instructions</Label>
                  <Textarea
                    id="task1-instructions"
                    rows={6}
                    value={task1.instructions}
                    onChange={(e) => setTask1(prev => ({ ...prev, instructions: e.target.value }))}
                    placeholder="Write the complete task instructions here..."
                    disabled={isLocked && !isModifying}
                    className="text-black"
                  />
                </div>
              </div>
            )}

            {/* Academic Training - Show Image Upload */}
            {trainingType === 'Academic' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="task1-image">Upload Image</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="task1-image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          handleFileUpload(file);
                        }
                      }}
                      disabled={uploading || (isLocked && !isModifying)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploading || (isLocked && !isModifying)}
                      onClick={() => document.getElementById('task1-image')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Choose File'}
                    </Button>
                  </div>
                  {task1.imageUrl && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-muted-foreground">Current image:</p>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={handleDeleteImage}
                          disabled={isLocked && !isModifying}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Image
                        </Button>
                      </div>
                      <img
                        src={task1.imageUrl}
                        alt="Task 1 chart/graph"
                        className="max-w-full h-48 object-contain border rounded-md"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task1-context">Image Context Description</Label>
                  <Textarea
                    id="task1-context"
                    rows={4}
                    value={task1.imageContext}
                    onChange={(e) => setTask1(prev => ({ ...prev, imageContext: e.target.value }))}
                    placeholder="Detailed description of the image/chart for accessibility and context..."
                    disabled={isLocked && !isModifying}
                    className="text-black"
                  />
                </div>
              </>
            )}

            {/* General Training - Show Task Instructions (Same as Task 2) */}
            {trainingType === 'General' && (
              <div style={{background: 'blue', color: 'white', padding: '10px', margin: '10px 0'}}>
                GENERAL MODE ACTIVE
                <div className="space-y-2">
                  <Label htmlFor="task1-instructions-general">Task Instructions</Label>
                  <Textarea
                    id="task1-instructions-general"
                    rows={8}
                    value={task1.instructions}
                    onChange={(e) => setTask1(prev => ({ ...prev, instructions: e.target.value }))}
                    placeholder="Write the complete task instructions here..."
                    disabled={isLocked && !isModifying}
                    className="text-black"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="task1-model-answer">Model Answer (Optional)</Label>
              <Textarea
                id="task1-model-answer"
                rows={6}
                value={task1.modelAnswer}
                onChange={(e) => setTask1(prev => ({ ...prev, modelAnswer: e.target.value }))}
                placeholder="Provide a high-band sample answer for Task 1 that students can view after completing the test..."
                disabled={isLocked && !isModifying}
                className="text-black"
              />
              <p className="text-xs text-muted-foreground">
                This model answer will be shown to students after they complete the test
              </p>
            </div>

            <Button 
              onClick={() => saveTask(1)}
              disabled={loading || (isLocked && !isModifying)}
              className="w-full"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Task 1
            </Button>
          </CardContent>
        </Card>

        <Separator />

        {/* Task 2 Section */}
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Task 2 - Essay Writing
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Task 2 requires students to write an argumentative essay on a given topic
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="task2-instructions">Essay Question & Instructions</Label>
              <Textarea
                id="task2-instructions"
                rows={8}
                value={task2.instructions}
                onChange={(e) => setTask2(prev => ({ ...prev, instructions: e.target.value }))}
                placeholder="Write the complete essay question and instructions here..."
                disabled={isLocked && !isModifying}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task2-model-answer">Model Answer (Optional)</Label>
              <Textarea
                id="task2-model-answer"
                rows={8}
                value={task2.modelAnswer}
                onChange={(e) => setTask2(prev => ({ ...prev, modelAnswer: e.target.value }))}
                placeholder="Provide a high-band sample essay for Task 2 that students can view after completing the test..."
                disabled={isLocked && !isModifying}
              />
              <p className="text-xs text-muted-foreground">
                This model answer will be shown to students after they complete the test
              </p>
            </div>

            <Button 
              onClick={() => saveTask(2)}
              disabled={loading || (isLocked && !isModifying)}
              className="w-full"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Task 2
            </Button>
          </CardContent>
        </Card>

        {/* Test Info */}
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Time</p>
                <p className="font-medium">60 minutes</p>
              </div>
              <div>
                <p className="text-muted-foreground">Task 1 Time</p>
                <p className="font-medium">20 minutes</p>
              </div>
              <div>
                <p className="text-muted-foreground">Task 2 Time</p>
                <p className="font-medium">40 minutes</p>
              </div>
              <div>
                <p className="text-muted-foreground">Test Type</p>
                <p className="font-medium">IELTS Writing</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminIELTSWritingTest;