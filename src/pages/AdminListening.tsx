import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAdminContent } from '@/hooks/useAdminContent';
import CSVImport from "@/components/CSVImport";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Upload, Eye, FileText, HelpCircle, Volume2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import QuestionForm from "@/components/QuestionForm";

const AdminListening = () => {
  const { listContent, createContent, deleteContent, uploadAudio, loading } = useAdminContent();
  const { toast } = useToast();
  const [sections, setSections] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: "",
    section_number: 1,
    difficulty_level: "academic",
    instructions: "",
    transcript: "",
    audio_url: "",
    cambridge_book: "",
    test_number: 1
  });
  const [questions, setQuestions] = useState([]);
  const [activeTab, setActiveTab] = useState("info");
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    try {
      const result = await listContent('listening_sections');
      setSections(result.data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load listening sections",
        variant: "destructive"
      });
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAudio(true);
    try {
      const result = await uploadAudio(file);
      setFormData({...formData, audio_url: result.url});
      toast({
        title: "Success",
        description: "Audio uploaded successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload audio",
        variant: "destructive"
      });
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Create the section first
      const sectionResult = await createContent('listening_sections', formData);
      const sectionId = sectionResult.data.id;
      
      // Create questions if any
      if (questions.length > 0) {
        for (const question of questions) {
          await createContent('listening_questions', {
            ...question,
            section_id: sectionId
          });
        }
      }
      
      toast({
        title: "Success",
        description: `Listening section created with ${questions.length} questions`
      });
      
      // Reset form
      setFormData({
        title: "",
        section_number: 1,
        difficulty_level: "academic",
        instructions: "",
        transcript: "",
        audio_url: "",
        cambridge_book: "",
        test_number: 1
      });
      setQuestions([]);
      setShowCreateForm(false);
      setActiveTab("info");
      loadSections();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create section",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this section?")) {
      try {
        await deleteContent('listening_sections', id);
        toast({
          title: "Success",
          description: "Section deleted successfully"
        });
        loadSections();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete section",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <AdminLayout title="Listening Sections">
      <div className="max-w-6xl mx-auto">
        {/* Header with Create Button */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-georgia font-bold text-foreground mb-2">Listening Sections</h1>
            <p className="text-warm-gray">Manage listening sections from Cambridge books C20 to C1</p>
          </div>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="rounded-xl"
            style={{ background: 'var(--gradient-button)', border: 'none' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            {showCreateForm ? 'Cancel' : 'Create New Section'}
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
                <CardTitle className="text-2xl font-georgia text-foreground">Create New Listening Test</CardTitle>
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
                    {/* Audio & Instructions Preview */}
                    <Card className="rounded-2xl border-light-border" style={{ background: 'white' }}>
                      <CardHeader>
                        <CardTitle className="font-georgia text-foreground flex items-center gap-2">
                          <Volume2 className="w-5 h-5" />
                          {formData.title || 'Untitled Section'}
                        </CardTitle>
                        <div className="flex gap-2">
                          {formData.cambridge_book && <Badge variant="outline">{formData.cambridge_book}</Badge>}
                          {formData.test_number && <Badge variant="outline">Test {formData.test_number}</Badge>}
                          <Badge variant="outline">Section {formData.section_number}</Badge>
                          <Badge variant="outline">{formData.difficulty_level}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {formData.audio_url && (
                          <div className="mb-4">
                            <audio controls className="w-full mb-2">
                              <source src={formData.audio_url} type="audio/mpeg" />
                            </audio>
                          </div>
                        )}
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium text-foreground mb-2">Instructions</h4>
                            <p className="text-sm text-foreground leading-relaxed">
                              {formData.instructions || 'No instructions provided...'}
                            </p>
                          </div>
                          {formData.transcript && (
                            <div>
                              <h4 className="font-medium text-foreground mb-2">Transcript</h4>
                              <div className="text-sm text-foreground leading-relaxed max-h-40 overflow-y-auto p-3 bg-background/50 rounded-lg">
                                {formData.transcript}
                              </div>
                            </div>
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
                          <div className="space-y-4 max-h-96 overflow-y-auto">
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
                      disabled={loading || !formData.title || !formData.audio_url}
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
                    <TabsTrigger value="audio" className="rounded-xl">Audio & Content</TabsTrigger>
                    <TabsTrigger value="questions" className="rounded-xl">Questions</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="info" className="space-y-6 mt-6">
                    <Input
                      placeholder="Section Title (e.g., 'Academic Listening - University Lectures')"
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
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        type="number"
                        placeholder="Section Number (1-4)"
                        value={formData.section_number}
                        onChange={(e) => setFormData({...formData, section_number: parseInt(e.target.value)})}
                        min="1"
                        max="4"
                        required
                        className="rounded-xl border-light-border"
                      />
                      
                      <Select value={formData.difficulty_level} onValueChange={(value) => setFormData({...formData, difficulty_level: value})}>
                        <SelectTrigger className="rounded-xl border-light-border">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-light-border bg-card">
                          <SelectItem value="academic">Academic</SelectItem>
                          <SelectItem value="general">General Training</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="audio" className="space-y-6 mt-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Audio File</label>
                        <div className="flex gap-3 items-center">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="audio/*"
                            onChange={handleAudioUpload}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingAudio}
                            className="rounded-xl border-light-border"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {uploadingAudio ? "Uploading..." : "Upload Audio"}
                          </Button>
                          {formData.audio_url && (
                            <span className="text-sm text-green-600 font-medium">Audio uploaded ✓</span>
                          )}
                        </div>
                        {formData.audio_url && (
                          <audio controls className="w-full mt-2">
                            <source src={formData.audio_url} type="audio/mpeg" />
                          </audio>
                        )}
                      </div>
                      
                      <Textarea
                        placeholder="Instructions for students (e.g., 'Listen to the conversation and answer questions 1-10')"
                        value={formData.instructions}
                        onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                        rows={4}
                        className="rounded-xl border-light-border"
                      />
                      
                      <Textarea
                        placeholder="Audio transcript (optional, for admin reference)"
                        value={formData.transcript}
                        onChange={(e) => setFormData({...formData, transcript: e.target.value})}
                        rows={8}
                        className="rounded-xl border-light-border"
                      />
                    </div>
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
                        type="listening"
                      />
                      
                      <QuestionForm 
                        questions={questions}
                        onQuestionsChange={setQuestions}
                        type="listening"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sections List */}
        <div className="grid gap-6">
          {sections.map((section: any) => (
            <Card 
              key={section.id}
              className="rounded-2xl border-light-border shadow-soft hover:shadow-medium transition-all duration-300"
              style={{ background: 'var(--gradient-card)' }}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-georgia text-foreground">{section.title}</CardTitle>
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
                      onClick={() => handleDelete(section.id)}
                      className="rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm text-warm-gray mb-4 flex-wrap">
                  {section.cambridge_book && <span className="font-medium">Book: {section.cambridge_book}</span>}
                  {section.test_number && <span className="font-medium">Test: {section.test_number}</span>}
                  <span>Section: {section.section_number}</span>
                  <span>Type: {section.difficulty_level}</span>
                  {section.audio_url && <span className="text-green-600 font-medium">Has Audio ✓</span>}
                </div>
                <p className="text-foreground line-clamp-2 leading-relaxed">{section.instructions}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminListening;