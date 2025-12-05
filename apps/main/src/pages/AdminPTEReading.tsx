import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Image as ImageIcon,
  Sparkles,
  Edit3,
  X,
  GripVertical,
  Check
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { ImageQuestionExtractor } from "@/components/ImageQuestionExtractor";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// PTE Reading type configurations
const TYPE_CONFIG: Record<string, {
  name: string;
  description: string;
  hasPassage: boolean;
  hasOptions: boolean;
  isMultipleAnswer: boolean;
  isReorder: boolean;
  isDragDrop: boolean;
  isDropdown: boolean;
  instructions: string;
}> = {
  'fill_blanks_dropdown': {
    name: 'Fill in the Blanks (Dropdown)',
    description: 'Select the correct word from dropdown options',
    hasPassage: true,
    hasOptions: true,
    isMultipleAnswer: false,
    isReorder: false,
    isDragDrop: false,
    isDropdown: true,
    instructions: 'In the text below some words are missing. From each drop-down list, choose the option that best completes the text.'
  },
  'mcq_multiple_answers': {
    name: 'Multiple Choice, Multiple Answers',
    description: 'Select all correct answers from the options',
    hasPassage: true,
    hasOptions: true,
    isMultipleAnswer: true,
    isReorder: false,
    isDragDrop: false,
    isDropdown: false,
    instructions: 'Read the text and answer the question by selecting all the correct responses. More than one response is correct.'
  },
  'reorder_paragraph': {
    name: 'Reorder Paragraph',
    description: 'Arrange text boxes in the correct order',
    hasPassage: false,
    hasOptions: false,
    isMultipleAnswer: false,
    isReorder: true,
    isDragDrop: false,
    isDropdown: false,
    instructions: 'The text boxes in the left panel have been placed in a random order. Restore the original order by dragging the text boxes to the right panel.'
  },
  'fill_blanks_drag_drop': {
    name: 'Fill in the Blanks (Drag and Drop)',
    description: 'Drag words to fill in the blanks',
    hasPassage: true,
    hasOptions: true,
    isMultipleAnswer: false,
    isReorder: false,
    isDragDrop: true,
    isDropdown: false,
    instructions: 'In the text below some words are missing. Drag words from the box below to the appropriate place in the text. There are more words than you need to fill the gaps.'
  },
  'mcq_single_answer': {
    name: 'Multiple Choice, Single Answer',
    description: 'Select the single correct answer',
    hasPassage: true,
    hasOptions: true,
    isMultipleAnswer: false,
    isReorder: false,
    isDragDrop: false,
    isDropdown: false,
    instructions: 'Read the text and answer the multiple-choice question by selecting the correct response. Only one response is correct.'
  }
};

interface PTEReadingItem {
  id: string;
  title: string;
  prompt_text: string;
  passage_text?: string;
  options?: string[];
  correct_answer?: string;
  paragraphs?: { id: string; text: string }[];
  blanks?: { position: number; options: string[]; correct: string }[];
  explanation?: string;
  difficulty: string;
  created_at: string;
}

const AdminPTEReading = () => {
  const navigate = useNavigate();
  const { type } = useParams<{ type: string }>();
  const { admin, loading: authLoading } = useAdminAuth();

  const [items, setItems] = useState<PTEReadingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("manual");

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    prompt_text: '',
    passage_text: '',
    correct_answer: '',
    explanation: '',
    difficulty: 'medium'
  });
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [paragraphs, setParagraphs] = useState<{ id: string; text: string }[]>([
    { id: '1', text: '' },
    { id: '2', text: '' },
    { id: '3', text: '' },
    { id: '4', text: '' }
  ]);
  const [blanks, setBlanks] = useState<{ position: number; options: string[]; correct: string }[]>([]);

  const config = type ? TYPE_CONFIG[type] : null;

  useEffect(() => {
    if (!authLoading && !admin) {
      navigate('/admin/login');
    }
  }, [admin, authLoading, navigate]);

  useEffect(() => {
    if (type && admin) {
      loadItems();
    }
  }, [type, admin]);

  const loadItems = async () => {
    if (!type) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pte_items')
        .select('*')
        .eq('pte_section_type', type)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading items:', error);
      toast.error('Failed to load items');
    } finally {
      setIsLoading(false);
    }
  };

  const saveItem = async () => {
    if (!type) {
      toast.error('Invalid question type');
      return;
    }

    // Validation based on type
    if (config?.isReorder) {
      const validParagraphs = paragraphs.filter(p => p.text.trim());
      if (validParagraphs.length < 2) {
        toast.error('Please add at least 2 paragraphs');
        return;
      }
    } else if (!formData.prompt_text.trim()) {
      toast.error('Please enter a question/prompt');
      return;
    }

    setIsSaving(true);
    try {
      const itemData: any = {
        pte_skill: 'reading',
        pte_section_type: type,
        title: formData.title || `${config?.name} - ${new Date().toLocaleDateString()}`,
        prompt_text: formData.prompt_text,
        passage_text: formData.passage_text || null,
        correct_answer: formData.correct_answer || null,
        explanation: formData.explanation || null,
        difficulty: formData.difficulty
      };

      // Add type-specific data
      if (config?.hasOptions && !config?.isDropdown && !config?.isDragDrop) {
        itemData.options = options.filter(o => o.trim());
      }

      if (config?.isReorder) {
        itemData.paragraphs = paragraphs.filter(p => p.text.trim());
      }

      if (config?.isDropdown || config?.isDragDrop) {
        itemData.blanks = blanks;
        itemData.options = options.filter(o => o.trim());
      }

      if (editingId) {
        const { error } = await supabase
          .from('pte_items')
          .update(itemData)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Item updated successfully');
      } else {
        const { error } = await supabase
          .from('pte_items')
          .insert(itemData);

        if (error) throw error;
        toast.success('Item created successfully');
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
        .from('pte_items')
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

  const startEditing = (item: PTEReadingItem) => {
    setEditingId(item.id);
    setFormData({
      title: item.title || '',
      prompt_text: item.prompt_text,
      passage_text: item.passage_text || '',
      correct_answer: item.correct_answer || '',
      explanation: item.explanation || '',
      difficulty: item.difficulty || 'medium'
    });
    
    if (item.options) {
      setOptions(item.options.length >= 4 ? item.options : [...item.options, '', '', '', ''].slice(0, 4));
    }
    
    if (item.paragraphs) {
      setParagraphs(item.paragraphs);
    }
    
    if (item.blanks) {
      setBlanks(item.blanks);
    }
    
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      prompt_text: '',
      passage_text: '',
      correct_answer: '',
      explanation: '',
      difficulty: 'medium'
    });
    setOptions(['', '', '', '']);
    setParagraphs([
      { id: '1', text: '' },
      { id: '2', text: '' },
      { id: '3', text: '' },
      { id: '4', text: '' }
    ]);
    setBlanks([]);
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleQuestionsExtracted = (questions: any[]) => {
    console.log('Extracted questions:', questions);
    
    // Process extracted questions
    questions.forEach(async (q) => {
      const itemData: any = {
        pte_skill: 'reading',
        pte_section_type: type,
        title: `Extracted - ${new Date().toLocaleDateString()}`,
        prompt_text: q.question_text,
        passage_text: q.passage_context || null,
        correct_answer: q.correct_answer || null,
        explanation: q.explanation || null,
        difficulty: 'medium'
      };

      if (q.options) {
        itemData.options = q.options;
      }

      try {
        const { error } = await supabase
          .from('pte_items')
          .insert(itemData);

        if (error) throw error;
      } catch (error) {
        console.error('Error saving extracted question:', error);
      }
    });

    toast.success(`${questions.length} questions extracted and saved`);
    loadItems();
  };

  const addOption = () => {
    setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addParagraph = () => {
    setParagraphs([...paragraphs, { id: String(paragraphs.length + 1), text: '' }]);
  };

  const removeParagraph = (index: number) => {
    setParagraphs(paragraphs.filter((_, i) => i !== index));
  };

  const updateParagraph = (index: number, text: string) => {
    const newParagraphs = [...paragraphs];
    newParagraphs[index] = { ...newParagraphs[index], text };
    setParagraphs(newParagraphs);
  };

  const addBlank = () => {
    setBlanks([...blanks, { position: blanks.length, options: ['', '', '', ''], correct: '' }]);
  };

  const updateBlank = (index: number, field: string, value: any) => {
    const newBlanks = [...blanks];
    if (field === 'options') {
      newBlanks[index].options = value;
    } else if (field === 'correct') {
      newBlanks[index].correct = value;
    }
    setBlanks(newBlanks);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <AdminLayout title="PTE Admin" showBackButton={true} backPath="/admin/pte">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Invalid question type</p>
          <Button onClick={() => navigate('/admin/pte')} className="mt-4">
            Back to PTE Admin
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`PTE: ${config.name}`} showBackButton={true} backPath="/admin/pte">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{config.name}</h1>
            <p className="text-muted-foreground">{config.description}</p>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            {items.length} items
          </Badge>
        </div>

        {/* Instructions Card */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Instructions:</strong> {config.instructions}
            </p>
          </CardContent>
        </Card>

        {/* Add/Edit Form with Tabs */}
        {showAddForm ? (
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? 'Edit Item' : 'Add New Item'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                  <TabsTrigger value="ai">AI Extract from Screenshot</TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Title (Optional)</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Item title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Difficulty</Label>
                      <select
                        value={formData.difficulty}
                        onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>

                  {/* Reorder Paragraph specific UI */}
                  {config.isReorder ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Paragraphs (in correct order)</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addParagraph}>
                          <Plus className="w-4 h-4 mr-1" />
                          Add Paragraph
                        </Button>
                      </div>
                      {paragraphs.map((para, index) => (
                        <div key={para.id} className="flex gap-2 items-start">
                          <div className="flex items-center justify-center w-8 h-8 bg-muted rounded text-sm font-medium">
                            {index + 1}
                          </div>
                          <Textarea
                            value={para.text}
                            onChange={(e) => updateParagraph(index, e.target.value)}
                            placeholder={`Paragraph ${index + 1}`}
                            rows={2}
                            className="flex-1"
                          />
                          {paragraphs.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeParagraph(index)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {/* Standard question/passage input */}
                      <div className="space-y-2">
                        <Label>Question / Prompt *</Label>
                        <Textarea
                          value={formData.prompt_text}
                          onChange={(e) => setFormData(prev => ({ ...prev, prompt_text: e.target.value }))}
                          placeholder="Enter the question or prompt"
                          rows={2}
                        />
                      </div>

                      {config.hasPassage && (
                        <div className="space-y-2">
                          <Label>Passage Text {config.isDropdown || config.isDragDrop ? '(Use [BLANK] to mark blanks)' : ''}</Label>
                          <Textarea
                            value={formData.passage_text}
                            onChange={(e) => setFormData(prev => ({ ...prev, passage_text: e.target.value }))}
                            placeholder={config.isDropdown || config.isDragDrop 
                              ? "Enter passage with [BLANK] markers where answers go..."
                              : "Enter the reading passage"
                            }
                            rows={6}
                          />
                        </div>
                      )}

                      {/* Options for MCQ types */}
                      {config.hasOptions && !config.isDropdown && !config.isDragDrop && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>Answer Options</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addOption}>
                              <Plus className="w-4 h-4 mr-1" />
                              Add Option
                            </Button>
                          </div>
                          {options.map((option, index) => (
                            <div key={index} className="flex gap-2 items-center">
                              <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                                {String.fromCharCode(65 + index)}
                              </Badge>
                              <Input
                                value={option}
                                onChange={(e) => updateOption(index, e.target.value)}
                                placeholder={`Option ${String.fromCharCode(65 + index)}`}
                                className="flex-1"
                              />
                              {options.length > 2 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeOption(index)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Dropdown/Drag-Drop word bank */}
                      {(config.isDropdown || config.isDragDrop) && (
                        <div className="space-y-3">
                          <Label>Word Bank (available options)</Label>
                          <div className="flex flex-wrap gap-2">
                            {options.map((option, index) => (
                              <div key={index} className="flex items-center gap-1">
                                <Input
                                  value={option}
                                  onChange={(e) => updateOption(index, e.target.value)}
                                  placeholder={`Word ${index + 1}`}
                                  className="w-32"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => removeOption(index)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={addOption}>
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Correct Answer */}
                      <div className="space-y-2">
                        <Label>
                          Correct Answer(s) 
                          {config.isMultipleAnswer && ' (comma-separated for multiple)'}
                          {(config.isDropdown || config.isDragDrop) && ' (comma-separated in order of blanks)'}
                        </Label>
                        <Input
                          value={formData.correct_answer}
                          onChange={(e) => setFormData(prev => ({ ...prev, correct_answer: e.target.value }))}
                          placeholder={config.isMultipleAnswer ? "A, C" : config.isDropdown ? "word1, word2, word3" : "A"}
                        />
                      </div>
                    </>
                  )}

                  {/* Explanation */}
                  <div className="space-y-2">
                    <Label>Explanation (Optional)</Label>
                    <Textarea
                      value={formData.explanation}
                      onChange={(e) => setFormData(prev => ({ ...prev, explanation: e.target.value }))}
                      placeholder="Explain why the answer is correct"
                      rows={3}
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
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? 'Saving...' : editingId ? 'Update' : 'Save'}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="ai" className="pt-4">
                  <ImageQuestionExtractor
                    testId=""
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
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New {config.name} Item
          </Button>
        )}

        {/* Items List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Existing Items ({items.length})</h3>
          
          {items.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">No {config?.name || 'Reading'} items created yet</p>
                <Button onClick={() => setShowAddForm(true)} className="bg-violet-600 hover:bg-violet-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First {config?.name || 'Reading'} Item
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {items.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{item.title || 'Untitled'}</h4>
                          <Badge variant="outline" className="text-xs">
                            {item.difficulty}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.prompt_text}
                        </p>
                        {item.passage_text && (
                          <p className="text-xs text-muted-foreground italic line-clamp-1">
                            Passage: {item.passage_text.substring(0, 100)}...
                          </p>
                        )}
                        {item.correct_answer && (
                          <p className="text-xs">
                            <span className="font-medium text-green-600">Answer: </span>
                            {item.correct_answer}
                          </p>
                        )}
                        {item.paragraphs && (
                          <p className="text-xs text-muted-foreground">
                            {item.paragraphs.length} paragraphs to reorder
                          </p>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Created: {new Date(item.created_at).toLocaleDateString()}
                        </span>
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
                              <AlertDialogTitle>Delete Item</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this item? This action cannot be undone.
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
      </div>
    </AdminLayout>
  );
};

export default AdminPTEReading;

