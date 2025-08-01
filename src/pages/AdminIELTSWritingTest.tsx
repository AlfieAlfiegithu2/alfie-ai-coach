import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PenTool, Save, Image, FileText, Upload, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "@/components/AdminLayout";
import { useAdminContent } from "@/hooks/useAdminContent";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AdminIELTSWritingTest = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { createContent, updateContent, loading } = useAdminContent();
  const { toast } = useToast();

  const [test, setTest] = useState<any>(null);
  const [task1, setTask1] = useState({
    id: null,
    title: "",
    instructions: "",
    imageUrl: "",
    imageContext: ""
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [task2, setTask2] = useState({
    id: null,
    title: "",
    instructions: ""
  });
  const [isLocked, setIsLocked] = useState(false);
  const [isModifying, setIsModifying] = useState(false);

  useEffect(() => {
    if (testId) {
      loadTestData();
    }
  }, [testId]);

  const loadTestData = async () => {
    try {
      // Load test details
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (testError) throw testError;
      setTest(testData);

      // Load existing questions for this test (only IELTS Writing tasks)
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .in('question_type', ['Task 1', 'Task 2'])
        .order('part_number, created_at DESC');

      if (questionsError) throw questionsError;

      console.log('Admin portal - loaded questions:', questions);

      // Separate Task 1 and Task 2 questions (get most recent if duplicates exist)
      const task1Question = questions.find(q => q.part_number === 1);
      const task2Question = questions.find(q => q.part_number === 2);

      if (task1Question) {
        setTask1({
          id: task1Question.id,
          title: task1Question.question_text || "",
          instructions: task1Question.passage_text || "",
          imageUrl: task1Question.image_url || "",
          imageContext: task1Question.explanation || ""
        });
      }

      if (task2Question) {
        setTask2({
          id: task2Question.id,
          title: task2Question.question_text || "",
          instructions: task2Question.passage_text || ""
        });
      }

      // Check if test is locked (both tasks have content)
      const hasCompleteContent = task1Question && task2Question && 
                                 task1Question.question_text && task2Question.question_text;
      setIsLocked(Boolean(hasCompleteContent));
    } catch (error) {
      console.error('Error loading test data:', error);
      toast({
        title: "Error",
        description: "Failed to load test data",
        variant: "destructive"
      });
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
      const questionData = {
        test_id: testId,
        part_number: taskNumber,
        question_number_in_part: 1,
        question_text: taskData.title,
        passage_text: taskData.instructions,
        question_type: `Task ${taskNumber}`,
        correct_answer: "N/A", // Required field
        ...(taskNumber === 1 && {
          image_url: task1.imageUrl,
          explanation: task1.imageContext
        })
      };

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

      // Reload test data to check if both tasks are completed
      await loadTestData();
      
      // If both tasks are now completed, lock the content
      const { data: questionsCheck } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .in('question_type', ['Task 1', 'Task 2']);
      
      if (questionsCheck && questionsCheck.length === 2) {
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

  if (!test) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading test data...</p>
        </div>
      </div>
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

        {/* Task 1 Section */}
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-5 h-5" />
              Task 1 - Data Description
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Task 1 requires students to describe visual information (graphs, charts, tables, etc.)
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="task1-title">Prompt Title</Label>
              <Input
                id="task1-title"
                value={task1.title}
                onChange={(e) => setTask1(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., The chart below shows the number of visitors to a museum..."
                disabled={isLocked && !isModifying}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task1-instructions">Instructions</Label>
              <Textarea
                id="task1-instructions"
                rows={4}
                value={task1.instructions}
                onChange={(e) => setTask1(prev => ({ ...prev, instructions: e.target.value }))}
                placeholder="Write the complete task instructions here..."
                disabled={isLocked && !isModifying}
              />
            </div>

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
              />
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
              <Label htmlFor="task2-title">Prompt Title</Label>
              <Input
                id="task2-title"
                value={task2.title}
                onChange={(e) => setTask2(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Some people think that..."
                disabled={isLocked && !isModifying}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task2-instructions">Instructions (Essay Question)</Label>
              <Textarea
                id="task2-instructions"
                rows={6}
                value={task2.instructions}
                onChange={(e) => setTask2(prev => ({ ...prev, instructions: e.target.value }))}
                placeholder="Write the complete essay question and instructions here..."
                disabled={isLocked && !isModifying}
              />
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