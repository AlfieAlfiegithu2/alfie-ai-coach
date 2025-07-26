import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminContent } from "@/hooks/useAdminContent";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Eye, FileText, HelpCircle } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import QuestionForm from "@/components/QuestionForm";
import CSVImport from "@/components/CSVImport";

const AdminReading = () => {
  const { listContent, createContent, deleteContent, loading } = useAdminContent();
  const { toast } = useToast();
  const [passages, setPassages] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Create the passage first
      const passageResult = await createContent('reading_passages', formData);
      const passageId = passageResult.data.id;
      
      // Create questions if any
      if (questions.length > 0) {
        for (const question of questions) {
          await createContent('reading_questions', {
            ...question,
            passage_id: passageId
          });
        }
      }
      
      toast({
        title: "Success",
        description: `Reading passage created with ${questions.length} questions`
      });
      
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
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create passage",
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

  return (
    <AdminLayout title="Reading Passages">
      <div className="max-w-6xl mx-auto">
        {/* Header with Create Button */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-georgia font-bold text-foreground mb-2">Reading Passages</h1>
            <p className="text-warm-gray">Manage reading passages from Cambridge books C20 to C1</p>
          </div>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="rounded-xl"
            style={{ background: 'var(--gradient-button)', border: 'none' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            {showCreateForm ? 'Cancel' : 'Create New Passage'}
          </Button>
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
                          onClick={handleCreate} 
                          disabled={loading || !formData.title || !formData.content}
                          className="rounded-xl"
                          style={{ background: 'var(--gradient-button)', border: 'none' }}
                        >
                          Save Test
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

        {/* Passages List */}
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
      </div>
    </AdminLayout>
  );
};

export default AdminReading;