import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminContent } from "@/hooks/useAdminContent";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Eye, FileText, HelpCircle, List, Calendar, BookOpen } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import QuestionForm from "@/components/QuestionForm";
import CSVImport from "@/components/CSVImport";

const AdminReading = () => {
  const { listContent, createContent, deleteContent, updateContent, loading } = useAdminContent();
  const { toast } = useToast();
  const [passages, setPassages] = useState([]);
  const [questionSets, setQuestionSets] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'passages' | 'questions'>('overview');
  const [selectedQuestionSet, setSelectedQuestionSet] = useState(null);
  const [editingQuestionSet, setEditingQuestionSet] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    difficulty_level: "academic",
    passage_type: "academic",
    cambridge_book: "",
    test_number: 1
  });
  const [questions, setQuestions] = useState([]);
  const [activeTab, setActiveTab] = useState("info");
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    loadPassages();
    loadQuestionSets();
  }, []);

  const loadPassages = async () => {
    try {
      const result = await listContent('reading_passages');
      setPassages(result.data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load reading passages",
        variant: "destructive"
      });
    }
  };

  const loadQuestionSets = async () => {
    try {
      const result = await listContent('reading_questions');
      
      // Group questions by passage_id or create standalone sets
      const grouped = result.data?.reduce((acc: any, question: any) => {
        const key = question.passage_id || 'standalone';
        if (!acc[key]) {
          acc[key] = {
            id: key,
            passage_id: question.passage_id,
            questions: [],
            created_at: question.created_at,
            question_types: new Set()
          };
        }
        acc[key].questions.push(question);
        acc[key].question_types.add(question.question_type);
        return acc;
      }, {});

      const sets = Object.values(grouped || {}).map((set: any) => ({
        ...set,
        title: set.passage_id ? `Passage Questions (${set.questions.length})` : `Standalone Questions (${set.questions.length})`,
        question_types: Array.from(set.question_types).join(', ')
      }));

      setQuestionSets(sets);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load question sets",
        variant: "destructive"
      });
    }
  };

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    console.log('=== SAVE BUTTON CLICKED ===');
    console.log('Form data:', formData);
    console.log('Questions count:', questions.length);
    console.log('Admin token:', localStorage.getItem('admin_token'));
    
    // Check if we have either passage content OR questions to save
    const hasPassageContent = formData.title && formData.content;
    const hasQuestions = questions.length > 0;
    
    if (!hasPassageContent && !hasQuestions) {
      console.error('Validation failed: No content to save');
      toast({
        title: "Validation Error", 
        description: "Please fill in passage content or add questions to save",
        variant: "destructive"
      });
      return;
    }
    
    try {
      let passageId = null;
      
      // Create passage only if we have passage content
      if (hasPassageContent) {
        console.log('Starting passage creation...');
        const passageResult = await createContent('reading_passages', formData);
        console.log('Passage creation result:', passageResult);
        
        if (!passageResult?.data?.id) {
          throw new Error('Failed to create passage - no ID returned');
        }
        
        passageId = passageResult.data.id;
        console.log('Passage created with ID:', passageId);
      }
      
      // Create questions if any
      if (questions.length > 0) {
        console.log(`Creating ${questions.length} questions...`);
        for (let i = 0; i < questions.length; i++) {
          const question = questions[i];
          
          // Validate question data before sending
          console.log(`Raw question ${i + 1} data:`, question);
          
          const questionData = {
            question_number: question.question_number || (i + 1),
            question_type: question.question_type || 'multiple_choice', // Database expects snake_case
            question_text: question.question_text || '',
            correct_answer: question.correct_answer || '',
            explanation: question.explanation || '',
            options: question.options || null,
            passage_id: passageId // This can be null for standalone questions
          };
          
          console.log(`Formatted question ${i + 1} data being sent:`, questionData);
          
          try {
            const questionResult = await createContent('reading_questions', questionData);
            console.log(`Question ${i + 1} created successfully:`, questionResult);
          } catch (questionError) {
            console.error(`Failed to create question ${i + 1}:`, questionError);
            throw new Error(`Failed to save question ${i + 1}: ${questionError.message}`);
          }
        }
      }
      
      const successMessage = hasPassageContent 
        ? `Reading passage created successfully with ${questions.length} questions`
        : `${questions.length} questions saved successfully`;
        
      toast({
        title: "Success!",
        description: successMessage,
      });
      
      console.log('=== SAVE COMPLETED SUCCESSFULLY ===');
      
      // Reset form
      setFormData({ 
        title: "", 
        content: "", 
        difficulty_level: "academic", 
        passage_type: "academic", 
        cambridge_book: "", 
        test_number: 1 
      });
      setQuestions([]);
      setShowCreateForm(false);
      setActiveTab("info");
      loadPassages();
      loadQuestionSets(); // Reload question sets after successful save
      setViewMode('questions'); // Switch to questions view to show new set
    } catch (error: any) {
      console.error('=== SAVE FAILED ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      toast({
        title: "Error",
        description: error.message || "Failed to create passage. Please check the console for details.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this passage?")) {
      try {
        await deleteContent('reading_passages', id);
        toast({
          title: "Success",
          description: "Passage deleted successfully"
        });
        loadPassages();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete passage",
          variant: "destructive"
        });
      }
    }
  };

  const handleDeleteQuestionSet = async (setId: string) => {
    if (confirm("Are you sure you want to delete this question set? This will delete all questions in this set.")) {
      try {
        const set = questionSets.find((s: any) => s.id === setId);
        if (set) {
          // Delete all questions in the set
          for (const question of set.questions) {
            await deleteContent('reading_questions', question.id);
          }
          toast({
            title: "Success",
            description: "Question set deleted successfully"
          });
          loadQuestionSets();
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete question set",
          variant: "destructive"
        });
      }
    }
  };

  const handleEditQuestion = async (questionId: string, updatedData: any) => {
    try {
      await updateContent('reading_questions', { id: questionId, ...updatedData });
      toast({
        title: "Success",
        description: "Question updated successfully"
      });
      loadQuestionSets();
      setEditingQuestionSet(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update question",
        variant: "destructive"
      });
    }
  };

  return (
    <AdminLayout title="Reading Management">
      <div className="max-w-6xl mx-auto">
        {/* Header with Navigation */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-georgia font-bold text-foreground mb-2">Reading Management</h1>
            <p className="text-warm-gray">Manage reading content, passages, and question sets</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setViewMode('overview')}
              variant={viewMode === 'overview' ? 'default' : 'outline'}
              className="rounded-xl"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Overview
            </Button>
            <Button
              onClick={() => setViewMode('questions')}
              variant={viewMode === 'questions' ? 'default' : 'outline'}
              className="rounded-xl"
            >
              <List className="w-4 h-4 mr-2" />
              Question Sets
            </Button>
            <Button
              onClick={() => setViewMode('passages')}
              variant={viewMode === 'passages' ? 'default' : 'outline'}
              className="rounded-xl"
            >
              <FileText className="w-4 h-4 mr-2" />
              Passages
            </Button>
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="rounded-xl"
              style={{ background: 'var(--gradient-button)', border: 'none' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              {showCreateForm ? 'Cancel' : 'Create New'}
            </Button>
          </div>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <Card 
            className="mb-8 rounded-2xl border-light-border shadow-soft"
            style={{ background: 'var(--gradient-card)' }}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-georgia text-foreground">Create New Reading Test</CardTitle>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPreviewMode(!previewMode)}
                    className="rounded-xl border-light-border"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {previewMode ? 'Edit' : 'Preview'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {previewMode ? (
                // Preview Mode
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Passage Preview */}
                    <Card className="rounded-2xl border-light-border" style={{ background: 'white' }}>
                      <CardHeader>
                        <CardTitle className="font-georgia text-foreground flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          {formData.title || 'Untitled Passage'}
                        </CardTitle>
                        <div className="flex gap-2">
                          {formData.cambridge_book && <Badge variant="outline">{formData.cambridge_book}</Badge>}
                          {formData.test_number && <Badge variant="outline">Test {formData.test_number}</Badge>}
                          <Badge variant="outline">{formData.difficulty_level}</Badge>
                          <Badge variant="outline">{formData.passage_type}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="prose max-w-none text-sm leading-relaxed text-foreground">
                          {formData.content ? (
                            formData.content.split('\n\n').map((paragraph, index) => (
                              <p key={index} className="mb-4">{paragraph}</p>
                            ))
                          ) : (
                            <p className="text-warm-gray italic">No passage content yet...</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Questions Preview */}
                    <Card className="rounded-2xl border-light-border" style={{ background: 'white' }}>
                      <CardHeader>
                        <CardTitle className="font-georgia text-foreground flex items-center gap-2">
                          <HelpCircle className="w-5 h-5" />
                          Questions ({questions.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {questions.length > 0 ? (
                          <div className="space-y-4">
                            {questions.map((question: any, index) => (
                              <div key={index} className="border-b border-light-border pb-4 last:border-b-0">
                                <p className="font-medium text-foreground mb-2">
                                  {question.question_number}. {question.question_text}
                                </p>
                                {question.question_type === 'multiple_choice' && question.options ? (
                                  <div className="space-y-1">
                                    {question.options.map((option: string, optionIndex: number) => (
                                      <div key={optionIndex} className={`text-sm p-2 rounded ${option === question.correct_answer ? 'bg-green-50 text-green-800 font-medium' : 'text-foreground'}`}>
                                        {String.fromCharCode(65 + optionIndex)}. {option}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-sm p-2 bg-green-50 text-green-800 font-medium rounded">
                                    Answer: {question.correct_answer}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-warm-gray italic">No questions added yet...</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button 
                      onClick={handleCreate} 
                      disabled={loading || !formData.title || !formData.content}
                      className="rounded-xl"
                      style={{ background: 'var(--gradient-button)', border: 'none' }}
                    >
                      Publish Test
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowCreateForm(false)}
                      className="rounded-xl border-light-border hover:bg-gentle-blue/10"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                // Edit Mode
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 rounded-xl">
                    <TabsTrigger value="info" className="rounded-xl">Test Info</TabsTrigger>
                    <TabsTrigger value="passage" className="rounded-xl">Passage</TabsTrigger>
                    <TabsTrigger value="questions" className="rounded-xl">Questions</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="info" className="space-y-6 mt-6">
                    <Input
                      placeholder="Test Title (e.g., 'Academic Reading - Climate Change')"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      required
                      className="rounded-xl border-light-border"
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Select value={formData.cambridge_book} onValueChange={(value) => setFormData({...formData, cambridge_book: value})}>
                        <SelectTrigger className="rounded-xl border-light-border">
                          <SelectValue placeholder="Select Cambridge Book" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-light-border bg-card">
                          {Array.from({length: 20}, (_, i) => 20 - i).map(num => (
                            <SelectItem key={num} value={`C${num}`}>Cambridge {num}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select value={formData.test_number.toString()} onValueChange={(value) => setFormData({...formData, test_number: parseInt(value)})}>
                        <SelectTrigger className="rounded-xl border-light-border">
                          <SelectValue placeholder="Select Test Number" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-light-border bg-card">
                          {Array.from({length: 4}, (_, i) => i + 1).map(num => (
                            <SelectItem key={num} value={num.toString()}>Test {num}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Select value={formData.difficulty_level} onValueChange={(value) => setFormData({...formData, difficulty_level: value, passage_type: value})}>
                      <SelectTrigger className="rounded-xl border-light-border">
                        <SelectValue placeholder="Select test type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-light-border bg-card">
                        <SelectItem value="academic">Academic</SelectItem>
                        <SelectItem value="general">General Training</SelectItem>
                      </SelectContent>
                    </Select>
                  </TabsContent>
                  
                  <TabsContent value="passage" className="space-y-6 mt-6">
                    <Textarea
                      placeholder="Paste the reading passage content here..."
                      value={formData.content}
                      onChange={(e) => setFormData({...formData, content: e.target.value})}
                      rows={15}
                      required
                      className="rounded-xl border-light-border"
                    />
                  </TabsContent>
                  
                  <TabsContent value="questions" className="mt-6">
                    <div className="space-y-6">
                      <CSVImport 
                        onImport={(importedQuestions) => {
                          // Merge with existing questions and renumber
                          const allQuestions = [...questions, ...importedQuestions];
                          allQuestions.forEach((q, i) => {
                            q.question_number = i + 1;
                          });
                          setQuestions(allQuestions);
                        }}
                        type="reading"
                      />
                      
                      <QuestionForm 
                        questions={questions}
                        onQuestionsChange={setQuestions}
                        type="reading"
                      />
                      
                      <div className="flex gap-3 pt-6 border-t border-light-border">
                        <Button 
                          onClick={() => handleCreate()}
                          disabled={loading || (!formData.title && !formData.content && questions.length === 0)}
                          className="rounded-xl"
                          style={{ background: 'var(--gradient-button)', border: 'none' }}
                        >
                          {questions.length > 0 && (!formData.title || !formData.content) ? 'Save Questions' : 'Save Test'}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowCreateForm(false)}
                          className="rounded-xl border-light-border hover:bg-gentle-blue/10"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        )}

        {/* Main Content Area */}
        {viewMode === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Quick Stats */}
            <Card className="rounded-2xl border-light-border shadow-soft" style={{ background: 'var(--gradient-card)' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Content Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-white rounded-xl">
                  <span className="font-medium">Reading Passages</span>
                  <Badge variant="outline">{passages.length}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded-xl">
                  <span className="font-medium">Question Sets</span>
                  <Badge variant="outline">{questionSets.length}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded-xl">
                  <span className="font-medium">Total Questions</span>
                  <Badge variant="outline">{questionSets.reduce((sum: number, set: any) => sum + set.questions.length, 0)}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="rounded-2xl border-light-border shadow-soft" style={{ background: 'var(--gradient-card)' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {questionSets.length > 0 ? (
                  <div className="space-y-3">
                    {questionSets.slice(0, 3).map((set: any) => (
                      <div key={set.id} className="flex justify-between items-center p-3 bg-white rounded-xl">
                        <div>
                          <p className="font-medium text-sm">{set.title}</p>
                          <p className="text-xs text-warm-gray">{set.question_types}</p>
                        </div>
                        <Badge variant="outline">{set.questions.length} Q</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-warm-gray italic">No content yet. Create your first question set!</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {viewMode === 'questions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-georgia font-bold">Question Sets</h2>
              <Button 
                onClick={() => setShowCreateForm(true)}
                className="rounded-xl"
                style={{ background: 'var(--gradient-button)', border: 'none' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Questions
              </Button>
            </div>

            {questionSets.length > 0 ? (
              <div className="grid gap-4">
                {questionSets.map((set: any) => (
                  <Card key={set.id} className="rounded-2xl border-light-border shadow-soft" style={{ background: 'var(--gradient-card)' }}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{set.title}</CardTitle>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{set.questions.length} Questions</Badge>
                            <Badge variant="outline">{set.question_types}</Badge>
                            <Badge variant="outline">
                              {new Date(set.created_at).toLocaleDateString()}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="rounded-xl">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>{set.title}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                {set.questions.map((question: any, index: number) => (
                                  <Card key={question.id} className="p-4">
                                    <div className="space-y-2">
                                      <div className="flex items-start gap-2">
                                        <Badge variant="outline" className="mt-1">{question.question_number}</Badge>
                                        <div className="flex-1">
                                          <p className="font-medium">{question.question_text}</p>
                                          <p className="text-sm text-warm-gray mt-1">Type: {question.question_type?.replace(/_/g, ' ')}</p>
                                        </div>
                                      </div>
                                      {question.options && (
                                        <div className="pl-8">
                                          <p className="text-sm font-medium">Options:</p>
                                          <div className="text-sm text-warm-gray">
                                            {Array.isArray(question.options) ? question.options.join(' | ') : JSON.stringify(question.options)}
                                          </div>
                                        </div>
                                      )}
                                      <div className="pl-8 space-y-1">
                                        <p className="text-sm"><span className="font-medium text-green-700">Answer:</span> {question.correct_answer}</p>
                                        <p className="text-sm"><span className="font-medium">Explanation:</span> {question.explanation}</p>
                                      </div>
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setEditingQuestionSet(set)}
                            className="rounded-xl"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => handleDeleteQuestionSet(set.id)}
                            className="rounded-xl"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="rounded-2xl border-light-border text-center p-8" style={{ background: 'var(--gradient-card)' }}>
                <HelpCircle className="w-12 h-12 mx-auto text-warm-gray mb-4" />
                <h3 className="text-lg font-medium mb-2">No Question Sets Yet</h3>
                <p className="text-warm-gray mb-4">Upload a CSV file or create questions manually to get started.</p>
                <Button 
                  onClick={() => setShowCreateForm(true)}
                  className="rounded-xl"
                  style={{ background: 'var(--gradient-button)', border: 'none' }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Question Set
                </Button>
              </Card>
            )}
          </div>
        )}

        {viewMode === 'passages' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-georgia font-bold">Reading Passages</h2>
              <Button 
                onClick={() => setShowCreateForm(true)}
                className="rounded-xl"
                style={{ background: 'var(--gradient-button)', border: 'none' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Passage
              </Button>
            </div>

            {passages.length > 0 ? (
              <div className="grid gap-6">
                {passages.map((passage: any) => (
                  <Card 
                    key={passage.id}
                    className="rounded-2xl border-light-border shadow-soft hover:shadow-medium transition-all duration-300"
                    style={{ background: 'var(--gradient-card)' }}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-georgia text-foreground">{passage.title}</CardTitle>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="rounded-xl border-light-border hover:bg-gentle-blue/10"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => handleDelete(passage.id)}
                            className="rounded-xl"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4 text-sm text-warm-gray mb-4">
                        {passage.cambridge_book && <span className="font-medium">Book: {passage.cambridge_book}</span>}
                        {passage.test_number && <span className="font-medium">Test: {passage.test_number}</span>}
                        <span>Level: {passage.difficulty_level}</span>
                        <span>Type: {passage.passage_type}</span>
                      </div>
                      <p className="text-foreground line-clamp-3 leading-relaxed">{passage.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="rounded-2xl border-light-border text-center p-8" style={{ background: 'var(--gradient-card)' }}>
                <FileText className="w-12 h-12 mx-auto text-warm-gray mb-4" />
                <h3 className="text-lg font-medium mb-2">No Passages Yet</h3>
                <p className="text-warm-gray mb-4">Create reading passages with questions for your tests.</p>
                <Button 
                  onClick={() => setShowCreateForm(true)}
                  className="rounded-xl"
                  style={{ background: 'var(--gradient-button)', border: 'none' }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Passage
                </Button>
              </Card>
            )}
          </div>
        )}

        {/* Question Set Editor Dialog */}
        {editingQuestionSet && (
          <Dialog open={!!editingQuestionSet} onOpenChange={() => setEditingQuestionSet(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Question Set: {editingQuestionSet.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {editingQuestionSet.questions.map((question: any, index: number) => (
                  <Card key={question.id} className="p-4">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Question Text</label>
                          <Textarea 
                            value={question.question_text}
                            onChange={(e) => {
                              const updated = { ...editingQuestionSet };
                              updated.questions[index].question_text = e.target.value;
                              setEditingQuestionSet(updated);
                            }}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Correct Answer</label>
                          <Input 
                            value={question.correct_answer}
                            onChange={(e) => {
                              const updated = { ...editingQuestionSet };
                              updated.questions[index].correct_answer = e.target.value;
                              setEditingQuestionSet(updated);
                            }}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Explanation</label>
                        <Textarea 
                          value={question.explanation}
                          onChange={(e) => {
                            const updated = { ...editingQuestionSet };
                            updated.questions[index].explanation = e.target.value;
                            setEditingQuestionSet(updated);
                          }}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </Card>
                ))}
                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={() => {
                      editingQuestionSet.questions.forEach((question: any) => {
                        handleEditQuestion(question.id, {
                          question_text: question.question_text,
                          correct_answer: question.correct_answer,
                          explanation: question.explanation
                        });
                      });
                    }}
                    className="rounded-xl"
                    style={{ background: 'var(--gradient-button)', border: 'none' }}
                  >
                    Save Changes
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setEditingQuestionSet(null)}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminReading;