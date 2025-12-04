import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  Activity,
  BookOpen,
  Wand2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Copy,
  RefreshCw,
  Save,
  FileText
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import NCLEXQuestionParser from "@/components/NCLEXQuestionParser";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface NCLEXTest {
  id: string;
  title: string;
  description: string | null;
  category: string;
  difficulty_level: string;
  time_limit_minutes: number;
  is_published: boolean;
  question_count: number;
}

interface NCLEXQuestion {
  id: string;
  question_number: number;
  question_text: string;
  question_type: 'SATA' | 'MCQ';
  options: string[];
  correct_answers: number[];
  rationale: string | null;
  original_text: string | null;
  is_modified: boolean;
}

const AdminNCLEXTestDetail = () => {
  const navigate = useNavigate();
  const { testId } = useParams<{ testId: string }>();
  const { admin, loading } = useAdminAuth();
  
  const [test, setTest] = useState<NCLEXTest | null>(null);
  const [questions, setQuestions] = useState<NCLEXQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState<NCLEXQuestion | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  // Form state for manual add/edit
  const [formData, setFormData] = useState({
    question_text: '',
    question_type: 'MCQ' as 'SATA' | 'MCQ',
    options: ['', '', '', ''],
    correct_answers: [] as number[],
    rationale: ''
  });

  useEffect(() => {
    if (!loading && !admin) {
      navigate('/admin/login');
      return;
    }
    if (testId) {
      loadTestAndQuestions();
    }
  }, [admin, loading, testId]);

  const loadTestAndQuestions = async () => {
    try {
      // Load test details
      const { data: testData, error: testError } = await supabase
        .from('nclex_tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (testError || !testData) {
        toast.error('Test not found');
        navigate('/admin/nclex');
        return;
      }

      setTest(testData as NCLEXTest);

      // Load questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('nclex_questions')
        .select('*')
        .eq('test_id', testId)
        .order('question_number', { ascending: true });

      if (questionsError) {
        console.error('Error loading questions:', questionsError);
      } else {
        setQuestions((questionsData as NCLEXQuestion[]) || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionsImported = (importedQuestions: any[]) => {
    loadTestAndQuestions();
    toast.success(`${importedQuestions.length} questions imported successfully`);
  };

  const handleAddQuestion = async () => {
    if (!formData.question_text.trim()) {
      toast.error('Please enter question text');
      return;
    }
    if (formData.options.filter(o => o.trim()).length < 2) {
      toast.error('Please enter at least 2 options');
      return;
    }
    if (formData.correct_answers.length === 0) {
      toast.error('Please select at least one correct answer');
      return;
    }

    try {
      const nextNumber = questions.length > 0 
        ? Math.max(...questions.map(q => q.question_number)) + 1 
        : 1;

      const { error } = await supabase
        .from('nclex_questions')
        .insert({
          test_id: testId,
          question_number: nextNumber,
          question_text: formData.question_text,
          question_type: formData.question_type,
          options: formData.options.filter(o => o.trim()),
          correct_answers: formData.correct_answers,
          rationale: formData.rationale || null
        });

      if (error) throw error;

      toast.success('Question added successfully');
      setShowAddDialog(false);
      resetForm();
      loadTestAndQuestions();
    } catch (error) {
      console.error('Error adding question:', error);
      toast.error('Failed to add question');
    }
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion) return;

    try {
      const { error } = await supabase
        .from('nclex_questions')
        .update({
          question_text: formData.question_text,
          question_type: formData.question_type,
          options: formData.options.filter(o => o.trim()),
          correct_answers: formData.correct_answers,
          rationale: formData.rationale || null
        })
        .eq('id', editingQuestion.id);

      if (error) throw error;

      toast.success('Question updated successfully');
      setEditingQuestion(null);
      resetForm();
      loadTestAndQuestions();
    } catch (error) {
      console.error('Error updating question:', error);
      toast.error('Failed to update question');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      const { error } = await supabase
        .from('nclex_questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      toast.success('Question deleted');
      loadTestAndQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question');
    }
  };

  const resetForm = () => {
    setFormData({
      question_text: '',
      question_type: 'MCQ',
      options: ['', '', '', ''],
      correct_answers: [],
      rationale: ''
    });
  };

  const openEditDialog = (question: NCLEXQuestion) => {
    setEditingQuestion(question);
    setFormData({
      question_text: question.question_text,
      question_type: question.question_type,
      options: [...question.options, '', '', '', ''].slice(0, 4),
      correct_answers: [...question.correct_answers],
      rationale: question.rationale || ''
    });
  };

  const toggleCorrectAnswer = (index: number) => {
    if (formData.question_type === 'MCQ') {
      // Single selection for MCQ
      setFormData({ ...formData, correct_answers: [index] });
    } else {
      // Multiple selection for SATA
      const current = formData.correct_answers;
      if (current.includes(index)) {
        setFormData({ ...formData, correct_answers: current.filter(i => i !== index) });
      } else {
        setFormData({ ...formData, correct_answers: [...current, index] });
      }
    }
  };

  const addOptionField = () => {
    if (formData.options.length < 8) {
      setFormData({ ...formData, options: [...formData.options, ''] });
    }
  };

  const removeOptionField = (index: number) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options.filter((_, i) => i !== index);
      const newCorrect = formData.correct_answers
        .filter(i => i !== index)
        .map(i => i > index ? i - 1 : i);
      setFormData({ ...formData, options: newOptions, correct_answers: newCorrect });
    }
  };

  if (loading || isLoading) {
    return (
      <AdminLayout title="NCLEX Test" showBackButton>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!test) {
    return (
      <AdminLayout title="NCLEX Test" showBackButton>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Test not found</p>
          <Button onClick={() => navigate('/admin/nclex')} className="mt-4">
            Back to NCLEX Admin
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={test.title} showBackButton>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Test Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                  <Activity className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{test.title}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{test.category}</Badge>
                    <Badge className={
                      test.difficulty_level === 'Easy' ? 'bg-green-100 text-green-700' :
                      test.difficulty_level === 'Hard' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }>
                      {test.difficulty_level}
                    </Badge>
                    {test.is_published ? (
                      <Badge className="bg-green-100 text-green-700">Published</Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-teal-500">{questions.length}</p>
                <p className="text-sm text-muted-foreground">Questions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different management sections */}
        <Tabs defaultValue="import" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="import">
              <Copy className="h-4 w-4 mr-2" />
              Import Questions
            </TabsTrigger>
            <TabsTrigger value="questions">
              <FileText className="h-4 w-4 mr-2" />
              Manage Questions ({questions.length})
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>

          {/* Import Tab */}
          <TabsContent value="import">
            <NCLEXQuestionParser 
              testId={testId!}
              onQuestionsImported={handleQuestionsImported}
            />
          </TabsContent>

          {/* Questions Management Tab */}
          <TabsContent value="questions">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Questions</CardTitle>
                  <CardDescription>
                    Add, edit, or remove questions from this test
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </CardHeader>
              <CardContent>
                {questions.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No questions yet</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Use the Import tab to paste questions, or add them manually
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questions.map((question, index) => (
                      <div
                        key={question.id}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-sm">Q{question.question_number}.</span>
                              <Badge variant={question.question_type === 'SATA' ? 'default' : 'secondary'}>
                                {question.question_type}
                              </Badge>
                              {question.is_modified && (
                                <Badge variant="outline" className="text-purple-600 border-purple-200">
                                  <Wand2 className="h-3 w-3 mr-1" />
                                  AI Modified
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm mb-3">{question.question_text}</p>
                            <div className="space-y-1">
                              {question.options.map((option, optIndex) => (
                                <div 
                                  key={optIndex}
                                  className={`text-xs px-2 py-1 rounded ${
                                    question.correct_answers.includes(optIndex)
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                      : 'bg-muted'
                                  }`}
                                >
                                  {question.correct_answers.includes(optIndex) && (
                                    <CheckCircle2 className="h-3 w-3 inline mr-1" />
                                  )}
                                  {option}
                                </div>
                              ))}
                            </div>
                            {question.rationale && (
                              <p className="text-xs text-muted-foreground mt-2 italic">
                                Rationale: {question.rationale.substring(0, 100)}...
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(question)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Question?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this question.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteQuestion(question.id)}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>Student Preview</CardTitle>
                <CardDescription>
                  See how questions will appear to students
                </CardDescription>
              </CardHeader>
              <CardContent>
                {questions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No questions to preview
                  </p>
                ) : (
                  <div className="space-y-6">
                    {questions.slice(0, 5).map((question) => (
                      <div key={question.id} className="border rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm text-muted-foreground">
                            Question {question.question_number}
                          </span>
                          <Badge variant={question.question_type === 'SATA' ? 'default' : 'secondary'}>
                            {question.question_type === 'SATA' ? 'Select All That Apply' : 'Multiple Choice'}
                          </Badge>
                        </div>
                        <p className="text-lg mb-4">{question.question_text}</p>
                        <div className="space-y-2">
                          {question.options.map((option, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                            >
                              {question.question_type === 'SATA' ? (
                                <div className="w-5 h-5 border-2 rounded" />
                              ) : (
                                <div className="w-5 h-5 border-2 rounded-full" />
                              )}
                              <span>{option}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {questions.length > 5 && (
                      <p className="text-center text-muted-foreground">
                        + {questions.length - 5} more questions
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Question Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Question</DialogTitle>
              <DialogDescription>
                Create a new NCLEX question manually
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select
                  value={formData.question_type}
                  onValueChange={(value: 'SATA' | 'MCQ') => {
                    setFormData({ 
                      ...formData, 
                      question_type: value,
                      correct_answers: value === 'MCQ' ? formData.correct_answers.slice(0, 1) : formData.correct_answers
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MCQ">Multiple Choice (Single Answer)</SelectItem>
                    <SelectItem value="SATA">Select All That Apply</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Question Text *</Label>
                <Textarea
                  value={formData.question_text}
                  onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                  placeholder="Enter the question text..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Options (click to mark as correct)</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={addOptionField}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </Button>
                </div>
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={formData.correct_answers.includes(index) ? 'default' : 'outline'}
                      size="sm"
                      className={formData.correct_answers.includes(index) ? 'bg-green-500 hover:bg-green-600' : ''}
                      onClick={() => toggleCorrectAnswer(index)}
                    >
                      {formData.correct_answers.includes(index) ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <span className="w-4 text-center">{index + 1}</span>
                      )}
                    </Button>
                    <Input
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...formData.options];
                        newOptions[index] = e.target.value;
                        setFormData({ ...formData, options: newOptions });
                      }}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1"
                    />
                    {formData.options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOptionField(index)}
                        className="text-red-500"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  {formData.question_type === 'SATA' 
                    ? 'Select ALL correct answers' 
                    : 'Select ONE correct answer'}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Rationale</Label>
                <Textarea
                  value={formData.rationale}
                  onChange={(e) => setFormData({ ...formData, rationale: e.target.value })}
                  placeholder="Explain why the answer(s) are correct..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleAddQuestion} className="bg-teal-500 hover:bg-teal-600 text-white">
                <Save className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Question Dialog */}
        <Dialog open={!!editingQuestion} onOpenChange={(open) => !open && setEditingQuestion(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Question</DialogTitle>
              <DialogDescription>
                Update question details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select
                  value={formData.question_type}
                  onValueChange={(value: 'SATA' | 'MCQ') => {
                    setFormData({ 
                      ...formData, 
                      question_type: value,
                      correct_answers: value === 'MCQ' ? formData.correct_answers.slice(0, 1) : formData.correct_answers
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MCQ">Multiple Choice (Single Answer)</SelectItem>
                    <SelectItem value="SATA">Select All That Apply</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Question Text *</Label>
                <Textarea
                  value={formData.question_text}
                  onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Options (click to mark as correct)</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={addOptionField}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </Button>
                </div>
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={formData.correct_answers.includes(index) ? 'default' : 'outline'}
                      size="sm"
                      className={formData.correct_answers.includes(index) ? 'bg-green-500 hover:bg-green-600' : ''}
                      onClick={() => toggleCorrectAnswer(index)}
                    >
                      {formData.correct_answers.includes(index) ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <span className="w-4 text-center">{index + 1}</span>
                      )}
                    </Button>
                    <Input
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...formData.options];
                        newOptions[index] = e.target.value;
                        setFormData({ ...formData, options: newOptions });
                      }}
                      className="flex-1"
                    />
                    {formData.options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOptionField(index)}
                        className="text-red-500"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label>Rationale</Label>
                <Textarea
                  value={formData.rationale}
                  onChange={(e) => setFormData({ ...formData, rationale: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditingQuestion(null); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleUpdateQuestion} className="bg-teal-500 hover:bg-teal-600 text-white">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminNCLEXTestDetail;

