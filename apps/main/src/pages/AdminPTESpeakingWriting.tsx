import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Volume2,
  Play,
  Pause,
  Edit3,
  Check,
  X,
  ArrowLeft
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// PTE Speaking/Writing type configurations
const TYPE_CONFIG: Record<string, {
  name: string;
  description: string;
  hasImage: boolean;
  hasAudio: boolean;
  hasPassage: boolean;
  timeLimit: number;
  wordLimit?: number;
  instructions: string;
}> = {
  'read_aloud': {
    name: 'Read Aloud',
    description: 'Read a text aloud with correct pronunciation and intonation',
    hasImage: false,
    hasAudio: false,
    hasPassage: true,
    timeLimit: 40,
    instructions: 'Look at the text below. In 30-40 seconds, you must read this text aloud as naturally and clearly as possible.'
  },
  'repeat_sentence': {
    name: 'Repeat Sentence',
    description: 'Listen and repeat the sentence exactly',
    hasImage: false,
    hasAudio: true,
    hasPassage: false,
    timeLimit: 15,
    instructions: 'You will hear a sentence. Please repeat the sentence exactly as you hear it.'
  },
  'describe_image': {
    name: 'Describe Image',
    description: 'Describe an image in detail',
    hasImage: true,
    hasAudio: false,
    hasPassage: false,
    timeLimit: 40,
    instructions: 'Look at the image below. In 25 seconds, please speak into the microphone and describe in detail what the image is showing.'
  },
  'retell_lecture': {
    name: 'Retell Lecture',
    description: 'Listen to a lecture and retell it in your own words',
    hasImage: true,
    hasAudio: true,
    hasPassage: false,
    timeLimit: 40,
    instructions: 'You will hear a lecture. After listening to the lecture, in 10 seconds, please speak into the microphone and retell what you have just heard.'
  },
  'answer_short_question': {
    name: 'Answer Short Question',
    description: 'Answer a question with one or a few words',
    hasImage: false,
    hasAudio: true,
    hasPassage: false,
    timeLimit: 10,
    instructions: 'You will hear a question. Please give a simple and short answer. Often just one or a few words is enough.'
  },
  'summarize_group_discussion': {
    name: 'Summarize Group Discussion',
    description: 'Summarize the main points of a group discussion',
    hasImage: false,
    hasAudio: true,
    hasPassage: false,
    timeLimit: 70,
    instructions: 'You will hear a group discussion. You will have 10 seconds to prepare, then summarize the main points of the discussion in 70 seconds.'
  },
  'respond_to_situation': {
    name: 'Respond to a Situation',
    description: 'Respond appropriately to a given situation',
    hasImage: false,
    hasAudio: false,
    hasPassage: true,
    timeLimit: 40,
    instructions: 'You will see a scenario. In 20 seconds prepare time, think about what you would say in this situation. Then speak for up to 40 seconds.'
  },
  'summarize_written_text': {
    name: 'Summarize Written Text',
    description: 'Write a one-sentence summary of a passage',
    hasImage: false,
    hasAudio: false,
    hasPassage: true,
    timeLimit: 600,
    wordLimit: 75,
    instructions: 'Read the passage below. Write a one-sentence summary of the passage. Your summary should be between 5 and 75 words.'
  },
  'write_essay': {
    name: 'Write Essay',
    description: 'Write a 200-300 word argumentative essay',
    hasImage: false,
    hasAudio: false,
    hasPassage: false,
    timeLimit: 1200,
    wordLimit: 300,
    instructions: 'You will have 20 minutes to plan, write and revise an essay about the topic below. Your response will be judged on how well you develop a position, organize your ideas, present supporting details, and control the elements of standard written English.'
  }
};

interface PTEItem {
  id: string;
  title: string;
  prompt_text: string;
  passage_text?: string;
  image_url?: string;
  audio_url?: string;
  sample_answer?: string;
  time_limit: number;
  word_limit?: number;
  difficulty: string;
  created_at: string;
}

const AdminPTESpeakingWriting = () => {
  const navigate = useNavigate();
  const { type } = useParams<{ type: string }>();
  const { admin, loading: authLoading } = useAdminAuth();
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<PTEItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    prompt_text: '',
    passage_text: '',
    sample_answer: '',
    difficulty: 'medium'
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

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

  const handleImageUpload = async (file: File): Promise<string | null> => {
    try {
      const fileName = `pte/${type}/${Date.now()}_${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('images')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      return null;
    }
  };

  const handleAudioUpload = async (file: File): Promise<string | null> => {
    try {
      const fileName = `pte/${type}/${Date.now()}_${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('audio')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('audio')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast.error('Failed to upload audio');
      return null;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'audio') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileType === 'image') {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setAudioFile(file);
    }
  };

  const saveItem = async () => {
    if (!type || !formData.prompt_text.trim()) {
      toast.error('Please fill in the required fields');
      return;
    }

    setIsSaving(true);
    try {
      let imageUrl = null;
      let audioUrl = null;

      // Upload files if present
      if (imageFile) {
        imageUrl = await handleImageUpload(imageFile);
      }
      if (audioFile) {
        audioUrl = await handleAudioUpload(audioFile);
      }

      const itemData = {
        pte_skill: 'speaking_writing',
        pte_section_type: type,
        title: formData.title || `${config?.name} - ${new Date().toLocaleDateString()}`,
        prompt_text: formData.prompt_text,
        passage_text: formData.passage_text || null,
        sample_answer: formData.sample_answer || null,
        time_limit: config?.timeLimit || 60,
        word_limit: config?.wordLimit || null,
        difficulty: formData.difficulty,
        ...(imageUrl && { image_url: imageUrl }),
        ...(audioUrl && { audio_url: audioUrl })
      };

      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from('pte_items')
          .update(itemData)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Item updated successfully');
      } else {
        // Create new
        const { error } = await supabase
          .from('pte_items')
          .insert(itemData);

        if (error) throw error;
        toast.success('Item created successfully');
      }

      // Reset form
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

  const startEditing = (item: PTEItem) => {
    setEditingId(item.id);
    setFormData({
      title: item.title || '',
      prompt_text: item.prompt_text,
      passage_text: item.passage_text || '',
      sample_answer: item.sample_answer || '',
      difficulty: item.difficulty || 'medium'
    });
    if (item.image_url) {
      setImagePreview(item.image_url);
    }
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      prompt_text: '',
      passage_text: '',
      sample_answer: '',
      difficulty: 'medium'
    });
    setImageFile(null);
    setImagePreview(null);
    setAudioFile(null);
    setEditingId(null);
    setShowAddForm(false);
  };

  const toggleAudio = (id: string, url: string) => {
    if (isPlaying === id) {
      audioRef.current?.pause();
      setIsPlaying(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setIsPlaying(id);
      }
    }
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
      <audio ref={audioRef} onEnded={() => setIsPlaying(null)} className="hidden" />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{config.name}</h1>
            <p className="text-muted-foreground">{config.description}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="bg-violet-100 text-violet-700">
              {items.length} items
            </Badge>
            <Badge variant="outline">
              Time: {config.timeLimit >= 60 ? `${Math.floor(config.timeLimit / 60)} min` : `${config.timeLimit} sec`}
            </Badge>
            {config.wordLimit && (
              <Badge variant="outline">
                Words: {config.wordLimit}
              </Badge>
            )}
          </div>
        </div>

        {/* Instructions Card */}
        <Card className="bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800">
          <CardContent className="pt-4">
            <p className="text-sm text-violet-700 dark:text-violet-300">
              <strong>Instructions:</strong> {config.instructions}
            </p>
          </CardContent>
        </Card>

        {/* Add/Edit Form */}
        {showAddForm ? (
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? 'Edit Item' : 'Add New Item'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title (Optional)</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder={`${config.name} prompt title`}
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

              {/* Prompt Text */}
              <div className="space-y-2">
                <Label>Prompt / Question *</Label>
                <Textarea
                  value={formData.prompt_text}
                  onChange={(e) => setFormData(prev => ({ ...prev, prompt_text: e.target.value }))}
                  placeholder="Enter the prompt or question text"
                  rows={3}
                />
              </div>

              {/* Passage Text (for Read Aloud, Summarize Written Text, etc.) */}
              {config.hasPassage && (
                <div className="space-y-2">
                  <Label>Passage Text</Label>
                  <Textarea
                    value={formData.passage_text}
                    onChange={(e) => setFormData(prev => ({ ...prev, passage_text: e.target.value }))}
                    placeholder="Enter the passage text for reading or summarizing"
                    rows={6}
                  />
                </div>
              )}

              {/* Image Upload (for Describe Image, Retell Lecture) */}
              {config.hasImage && (
                <div className="space-y-2">
                  <Label>Image</Label>
                  <div className="flex items-center gap-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, 'image')}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Upload Image
                    </Button>
                    {imagePreview && (
                      <div className="relative">
                        <img src={imagePreview} alt="Preview" className="h-20 w-20 object-cover rounded" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Audio Upload (for Repeat Sentence, Retell Lecture, etc.) */}
              {config.hasAudio && (
                <div className="space-y-2">
                  <Label>Audio</Label>
                  <div className="flex items-center gap-4">
                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={(e) => handleFileSelect(e, 'audio')}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => audioInputRef.current?.click()}
                    >
                      <Volume2 className="w-4 h-4 mr-2" />
                      Upload Audio
                    </Button>
                    {audioFile && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{audioFile.name}</Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setAudioFile(null)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sample Answer */}
              <div className="space-y-2">
                <Label>Sample Answer (Optional)</Label>
                <Textarea
                  value={formData.sample_answer}
                  onChange={(e) => setFormData(prev => ({ ...prev, sample_answer: e.target.value }))}
                  placeholder="Enter a sample answer for reference"
                  rows={4}
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
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : editingId ? 'Update' : 'Save'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button 
            onClick={() => setShowAddForm(true)}
            className="bg-violet-600 hover:bg-violet-700"
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
                <p className="text-muted-foreground mb-4">No {config.name} items created yet</p>
                <Button onClick={() => setShowAddForm(true)} className="bg-violet-600 hover:bg-violet-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First {config.name} Item
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
                            Passage: {item.passage_text}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          {item.image_url && (
                            <img 
                              src={item.image_url} 
                              alt="Preview" 
                              className="h-12 w-12 object-cover rounded"
                            />
                          )}
                          {item.audio_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleAudio(item.id, item.audio_url!)}
                            >
                              {isPlaying === item.id ? (
                                <Pause className="w-3 h-3 mr-1" />
                              ) : (
                                <Play className="w-3 h-3 mr-1" />
                              )}
                              Audio
                            </Button>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Created: {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
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

export default AdminPTESpeakingWriting;

