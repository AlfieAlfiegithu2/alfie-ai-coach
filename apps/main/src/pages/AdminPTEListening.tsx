import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Save, 
  Trash2, 
  Upload, 
  Headphones,
  Play,
  Pause,
  Edit3,
  X,
  FileText,
  CheckSquare,
  Type,
  Highlighter,
  AlertCircle,
  PenTool,
  Sparkles
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { ImageQuestionExtractor } from "@/components/ImageQuestionExtractor";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// PTE Listening question types
const LISTENING_TYPES = [
  { 
    id: 'summarize_spoken_text', 
    name: 'Summarize Spoken Text', 
    icon: FileText,
    description: 'Write a 50-70 word summary'
  },
  { 
    id: 'listening_mcq_multiple', 
    name: 'MCQ Multiple Answers', 
    icon: CheckSquare,
    description: 'Select all correct answers'
  },
  { 
    id: 'fill_blanks_type_in', 
    name: 'Fill in Blanks', 
    icon: Type,
    description: 'Type the missing words'
  },
  { 
    id: 'highlight_correct_summary', 
    name: 'Highlight Correct Summary', 
    icon: Highlighter,
    description: 'Select best summary'
  },
  { 
    id: 'listening_mcq_single', 
    name: 'MCQ Single Answer', 
    icon: CheckSquare,
    description: 'Select one correct answer'
  },
  { 
    id: 'select_missing_word', 
    name: 'Select Missing Word', 
    icon: AlertCircle,
    description: 'Select word that completes audio'
  },
  { 
    id: 'highlight_incorrect_words', 
    name: 'Highlight Incorrect Words', 
    icon: Highlighter,
    description: 'Click words that differ'
  },
  { 
    id: 'write_from_dictation', 
    name: 'Write from Dictation', 
    icon: PenTool,
    description: 'Type the sentence you hear'
  }
];

interface ListeningTest {
  id: string;
  test_name: string;
  audio_url: string | null;
  transcript: string | null;
  duration_seconds: number | null;
  created_at: string;
}

interface ListeningItem {
  id: string;
  listening_test_id: string;
  pte_section_type: string;
  question_number: number;
  prompt_text: string | null;
  passage_text: string | null;
  options: string[] | null;
  correct_answer: string | null;
  blanks: any[] | null;
  highlight_words: string[] | null;
  audio_start_time: number | null;
  audio_end_time: number | null;
  explanation: string | null;
  created_at: string;
}

const AdminPTEListening = () => {
  const navigate = useNavigate();
  const { testId } = useParams<{ testId: string }>();
  const { admin, loading: authLoading } = useAdminAuth();
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const [test, setTest] = useState<ListeningTest | null>(null);
  const [items, setItems] = useState<ListeningItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeTab, setActiveTab] = useState("summarize_spoken_text");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    prompt_text: '',
    passage_text: '',
    correct_answer: '',
    explanation: '',
    audio_start_time: '',
    audio_end_time: ''
  });
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [highlightWords, setHighlightWords] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !admin) {
      navigate('/admin/login');
    }
  }, [admin, authLoading, navigate]);

  useEffect(() => {
    if (testId && admin) {
      loadTest();
      loadItems();
    }
  }, [testId, admin]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [test?.audio_url]);

  const loadTest = async () => {
    if (!testId) return;
    
    try {
      const { data, error } = await supabase
        .from('pte_listening_tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (error) throw error;
      setTest(data);
    } catch (error) {
      console.error('Error loading test:', error);
      toast.error('Failed to load test');
    }
  };

  const loadItems = async () => {
    if (!testId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pte_listening_items')
        .select('*')
        .eq('listening_test_id', testId)
        .order('question_number', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading items:', error);
      toast.error('Failed to load items');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudioUpload = async (file: File) => {
    if (!testId) return;

    try {
      const fileName = `pte/listening/${testId}/${Date.now()}_${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('audio')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('audio')
        .getPublicUrl(fileName);

      // Update test with audio URL
      const { error: updateError } = await supabase
        .from('pte_listening_tests')
        .update({ audio_url: publicUrl })
        .eq('id', testId);

      if (updateError) throw updateError;

      toast.success('Audio uploaded successfully');
      loadTest();
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast.error('Failed to upload audio');
    }
  };

  const updateTranscript = async (transcript: string) => {
    if (!testId) return;

    try {
      const { error } = await supabase
        .from('pte_listening_tests')
        .update({ transcript })
        .eq('id', testId);

      if (error) throw error;
      toast.success('Transcript saved');
      loadTest();
    } catch (error) {
      console.error('Error saving transcript:', error);
      toast.error('Failed to save transcript');
    }
  };

  const saveItem = async () => {
    if (!testId) return;

    setIsSaving(true);
    try {
      const typeConfig = LISTENING_TYPES.find(t => t.id === activeTab);
      
      const itemData: any = {
        listening_test_id: testId,
        pte_section_type: activeTab,
        question_number: items.filter(i => i.pte_section_type === activeTab).length + 1,
        prompt_text: formData.prompt_text || null,
        passage_text: formData.passage_text || null,
        correct_answer: formData.correct_answer || null,
        explanation: formData.explanation || null,
        audio_start_time: formData.audio_start_time ? parseInt(formData.audio_start_time) : null,
        audio_end_time: formData.audio_end_time ? parseInt(formData.audio_end_time) : null
      };

      // Add type-specific data
      if (['listening_mcq_multiple', 'listening_mcq_single', 'highlight_correct_summary', 'select_missing_word'].includes(activeTab)) {
        itemData.options = options.filter(o => o.trim());
      }

      if (activeTab === 'highlight_incorrect_words') {
        itemData.highlight_words = highlightWords;
      }

      if (editingId) {
        const { error } = await supabase
          .from('pte_listening_items')
          .update(itemData)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Item updated');
      } else {
        const { error } = await supabase
          .from('pte_listening_items')
          .insert(itemData);

        if (error) throw error;
        toast.success('Item created');
      }

      resetForm();
      loadItems();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Failed to save item');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pte_listening_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Item deleted');
      loadItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const startEditing = (item: ListeningItem) => {
    setEditingId(item.id);
    setActiveTab(item.pte_section_type);
    setFormData({
      prompt_text: item.prompt_text || '',
      passage_text: item.passage_text || '',
      correct_answer: item.correct_answer || '',
      explanation: item.explanation || '',
      audio_start_time: item.audio_start_time?.toString() || '',
      audio_end_time: item.audio_end_time?.toString() || ''
    });
    if (item.options) {
      setOptions(item.options.length >= 4 ? item.options : [...item.options, '', '', '', ''].slice(0, 4));
    }
    if (item.highlight_words) {
      setHighlightWords(item.highlight_words);
    }
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      prompt_text: '',
      passage_text: '',
      correct_answer: '',
      explanation: '',
      audio_start_time: '',
      audio_end_time: ''
    });
    setOptions(['', '', '', '']);
    setHighlightWords([]);
    setEditingId(null);
    setShowAddForm(false);
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleQuestionsExtracted = async (questions: any[]) => {
    console.log('Extracted questions:', questions);
    
    for (const q of questions) {
      const itemData: any = {
        listening_test_id: testId,
        pte_section_type: activeTab,
        question_number: items.filter(i => i.pte_section_type === activeTab).length + 1,
        prompt_text: q.question_text,
        correct_answer: q.correct_answer || null,
        explanation: q.explanation || null
      };

      if (q.options) {
        itemData.options = q.options;
      }

      try {
        const { error } = await supabase
          .from('pte_listening_items')
          .insert(itemData);

        if (error) throw error;
      } catch (error) {
        console.error('Error saving extracted question:', error);
      }
    }

    toast.success(`${questions.length} questions extracted and saved`);
    loadItems();
  };

  const getItemsByType = (typeId: string) => {
    return items.filter(i => i.pte_section_type === typeId);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!test) {
    return (
      <AdminLayout title="PTE Listening" showBackButton={true} backPath="/admin/pte">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Test not found</p>
          <Button onClick={() => navigate('/admin/pte')} className="mt-4">
            Back to PTE Admin
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`PTE Listening: ${test.test_name}`} showBackButton={true} backPath="/admin/pte">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{test.test_name}</h1>
            <p className="text-muted-foreground">Manage listening audio and questions</p>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            {items.length} questions
          </Badge>
        </div>

        {/* Audio Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Headphones className="w-5 h-5" />
              Audio File
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {test.audio_url ? (
              <div className="space-y-4">
                <audio ref={audioRef} src={test.audio_url} className="hidden" />
                
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={togglePlay}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  
                  <div className="flex-1 space-y-1">
                    <Progress value={(currentTime / duration) * 100} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTest(prev => prev ? { ...prev, audio_url: null } : null);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                </div>

                {/* Transcript */}
                <div className="space-y-2">
                  <Label>Transcript (Optional)</Label>
                  <Textarea
                    value={test.transcript || ''}
                    onChange={(e) => setTest(prev => prev ? { ...prev, transcript: e.target.value } : null)}
                    placeholder="Enter the audio transcript..."
                    rows={4}
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => updateTranscript(test.transcript || '')}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save Transcript
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  Upload audio file for this listening test
                </p>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAudioUpload(file);
                  }}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => audioInputRef.current?.click()}
                >
                  Choose Audio File
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Question Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Question Types Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {LISTENING_TYPES.map((type) => {
                const typeItems = getItemsByType(type.id);
                const Icon = type.icon;
                return (
                  <div 
                    key={type.id} 
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      activeTab === type.id ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'hover:border-green-300'
                    }`}
                    onClick={() => setActiveTab(type.id)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium">{type.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {typeItems.length} items
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Question Management Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            {LISTENING_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <TabsTrigger 
                  key={type.id} 
                  value={type.id}
                  className="flex items-center gap-1 text-xs"
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden md:inline">{type.name}</span>
                  <span className="md:hidden">{type.name.split(' ')[0]}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {LISTENING_TYPES.map((type) => {
            const typeItems = getItemsByType(type.id);
            const Icon = type.icon;

            return (
              <TabsContent key={type.id} value={type.id} className="space-y-4 mt-4">
                {/* Type Header */}
                <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <Icon className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{type.name}</h3>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Add/Edit Form */}
                {showAddForm && activeTab === type.id ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>{editingId ? 'Edit Question' : 'Add New Question'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Tabs defaultValue="manual">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                          <TabsTrigger value="ai">AI Extract</TabsTrigger>
                        </TabsList>

                        <TabsContent value="manual" className="space-y-4 pt-4">
                          {/* Question Text */}
                          <div className="space-y-2">
                            <Label>Question / Prompt</Label>
                            <Textarea
                              value={formData.prompt_text}
                              onChange={(e) => setFormData(prev => ({ ...prev, prompt_text: e.target.value }))}
                              placeholder="Enter the question or instructions"
                              rows={2}
                            />
                          </div>

                          {/* Passage/Transcript for this question */}
                          {['fill_blanks_type_in', 'highlight_incorrect_words'].includes(type.id) && (
                            <div className="space-y-2">
                              <Label>
                                {type.id === 'fill_blanks_type_in' 
                                  ? 'Passage (use [BLANK] for blanks)' 
                                  : 'Transcript (words to highlight)'}
                              </Label>
                              <Textarea
                                value={formData.passage_text}
                                onChange={(e) => setFormData(prev => ({ ...prev, passage_text: e.target.value }))}
                                placeholder={type.id === 'fill_blanks_type_in' 
                                  ? "The speaker mentioned that [BLANK] was important..."
                                  : "Enter the transcript text"}
                                rows={4}
                              />
                            </div>
                          )}

                          {/* Options for MCQ/Selection types */}
                          {['listening_mcq_multiple', 'listening_mcq_single', 'highlight_correct_summary', 'select_missing_word'].includes(type.id) && (
                            <div className="space-y-3">
                              <Label>Answer Options</Label>
                              {options.map((option, index) => (
                                <div key={index} className="flex gap-2 items-center">
                                  <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                                    {String.fromCharCode(65 + index)}
                                  </Badge>
                                  <Input
                                    value={option}
                                    onChange={(e) => {
                                      const newOptions = [...options];
                                      newOptions[index] = e.target.value;
                                      setOptions(newOptions);
                                    }}
                                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                                    className="flex-1"
                                  />
                                  {options.length > 2 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setOptions(options.filter((_, i) => i !== index))}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setOptions([...options, ''])}
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Add Option
                              </Button>
                            </div>
                          )}

                          {/* Correct Answer */}
                          <div className="space-y-2">
                            <Label>
                              Correct Answer
                              {type.id === 'listening_mcq_multiple' && ' (comma-separated)'}
                              {type.id === 'fill_blanks_type_in' && ' (comma-separated in blank order)'}
                              {type.id === 'highlight_incorrect_words' && ' (comma-separated incorrect words)'}
                            </Label>
                            <Input
                              value={formData.correct_answer}
                              onChange={(e) => setFormData(prev => ({ ...prev, correct_answer: e.target.value }))}
                              placeholder={
                                type.id === 'listening_mcq_multiple' ? "A, C, D" :
                                type.id === 'fill_blanks_type_in' ? "word1, word2" :
                                type.id === 'highlight_incorrect_words' ? "wrong1, wrong2" :
                                type.id === 'write_from_dictation' ? "The complete sentence" :
                                "A"
                              }
                            />
                          </div>

                          {/* Audio Timestamps */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Audio Start (seconds)</Label>
                              <Input
                                type="number"
                                value={formData.audio_start_time}
                                onChange={(e) => setFormData(prev => ({ ...prev, audio_start_time: e.target.value }))}
                                placeholder="0"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Audio End (seconds)</Label>
                              <Input
                                type="number"
                                value={formData.audio_end_time}
                                onChange={(e) => setFormData(prev => ({ ...prev, audio_end_time: e.target.value }))}
                                placeholder="60"
                              />
                            </div>
                          </div>

                          {/* Explanation */}
                          <div className="space-y-2">
                            <Label>Explanation (Optional)</Label>
                            <Textarea
                              value={formData.explanation}
                              onChange={(e) => setFormData(prev => ({ ...prev, explanation: e.target.value }))}
                              placeholder="Why is this the correct answer?"
                              rows={2}
                            />
                          </div>

                          {/* Actions */}
                          <div className="flex gap-3 justify-end">
                            <Button variant="outline" onClick={resetForm}>
                              Cancel
                            </Button>
                            <Button 
                              onClick={saveItem} 
                              disabled={isSaving}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Save className="w-4 h-4 mr-2" />
                              {isSaving ? 'Saving...' : editingId ? 'Update' : 'Save'}
                            </Button>
                          </div>
                        </TabsContent>

                        <TabsContent value="ai" className="pt-4">
                          <ImageQuestionExtractor
                            testId={testId || ''}
                            testType="PTE"
                            onQuestionsExtracted={handleQuestionsExtracted}
                          />
                          <div className="flex justify-end mt-4">
                            <Button variant="outline" onClick={resetForm}>
                              Close
                            </Button>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                ) : (
                  <Button 
                    onClick={() => setShowAddForm(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add {type.name} Question
                  </Button>
                )}

                {/* Questions List */}
                <div className="space-y-4">
                  <h4 className="font-medium">Questions ({typeItems.length})</h4>
                  
                  {typeItems.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-8">
                        <p className="text-muted-foreground">No questions for this type yet</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-3">
                      {typeItems.map((item, index) => (
                        <Card key={item.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">Q{index + 1}</Badge>
                                  {item.audio_start_time && (
                                    <span className="text-xs text-muted-foreground">
                                      {formatTime(item.audio_start_time)} - {formatTime(item.audio_end_time || 0)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm line-clamp-2">{item.prompt_text}</p>
                                {item.correct_answer && (
                                  <p className="text-xs">
                                    <span className="font-medium text-green-600">Answer: </span>
                                    {item.correct_answer}
                                  </p>
                                )}
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => startEditing(item)}
                                >
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Question</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteItem(item.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminPTEListening;

