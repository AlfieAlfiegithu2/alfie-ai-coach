import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAdminContent } from "@/hooks/useAdminContent";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Upload, Eye, FileText, ChevronDown, ChevronRight, Search, BookOpen, PenTool } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

const AdminWriting = () => {
  const { listContent, createContent, deleteContent, updateContent, uploadAudio, loading } = useAdminContent();
  const { toast } = useToast();
  
  // Cambridge books structure
  const [cambridgeBooks, setCambridgeBooks] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [openBooks, setOpenBooks] = useState<Set<number>>(new Set());
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadBookNumber, setUploadBookNumber] = useState<number>(20);
  const [uploadSectionNumber, setUploadSectionNumber] = useState<number>(1);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [promptTitle, setPromptTitle] = useState("");
  const [promptText, setPromptText] = useState("");
  const [taskType, setTaskType] = useState("task1");
  const [taskNumber, setTaskNumber] = useState(1);
  const [wordLimit, setWordLimit] = useState(250);
  const [timeLimit, setTimeLimit] = useState(20);
  const [sampleAnswer, setSampleAnswer] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    loadCambridgeStructure();
  }, []);

  const loadCambridgeStructure = async () => {
    try {
      // Load writing prompts
      const promptsResult = await listContent('writing_prompts');
      const prompts = promptsResult.data || [];

      // Initialize Cambridge books structure
      const structure: any = {};
      
      // Initialize all books (1-20) with 4 sections each
      for (let book = 1; book <= 20; book++) {
        structure[book] = {
          number: book,
          sections: {}
        };
        
        for (let section = 1; section <= 4; section++) {
          structure[book].sections[section] = {
            number: section,
            prompts: [],
            hasContent: false
          };
        }
      }

      // Populate with existing data
      prompts.forEach((prompt: any) => {
        const bookMatch = prompt.cambridge_book?.match(/\d+/);
        const bookNum = bookMatch ? parseInt(bookMatch[0]) : 1;
        const sectionNum = prompt.test_number || 1;
        
        if (structure[bookNum] && structure[bookNum].sections[sectionNum]) {
          structure[bookNum].sections[sectionNum].prompts.push(prompt);
          structure[bookNum].sections[sectionNum].hasContent = true;
        }
      });

      setCambridgeBooks(structure);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load Cambridge books structure",
        variant: "destructive"
      });
    }
  };

  const toggleBook = (bookNumber: number) => {
    const newOpen = new Set(openBooks);
    if (newOpen.has(bookNumber)) {
      newOpen.delete(bookNumber);
    } else {
      newOpen.add(bookNumber);
    }
    setOpenBooks(newOpen);
  };

  const handleUpload = async () => {
    try {
      if (!promptTitle || !promptText) {
        toast({
          title: "Error",
          description: "Please provide prompt title and text",
          variant: "destructive"
        });
        return;
      }

      let finalImageUrl = imageUrl;

      // Upload image if provided (for Task 1)
      if (imageFile && taskType === "task1") {
        console.log('📸 Uploading Task 1 image...', imageFile.name);
        try {
          const uploadResult = await uploadAudio(imageFile); // Reusing upload function for images
          if (uploadResult.success) {
            finalImageUrl = uploadResult.url;
            console.log('✅ Task 1 image uploaded successfully:', finalImageUrl);
          } else {
            toast({
              title: "Image Upload Failed",
              description: "Failed to upload Task 1 image. Continuing without image.",
              variant: "destructive"
            });
          }
        } catch (uploadError) {
          console.error('❌ Image upload error:', uploadError);
          toast({
            title: "Image Upload Error",
            description: "Error uploading image. Continuing without image.",
            variant: "destructive"
          });
        }
      }

      const promptData = {
        title: promptTitle,
        prompt_text: promptText,
        task_type: taskType,
        task_number: taskNumber,
        word_limit: wordLimit,
        time_limit: timeLimit,
        sample_answer: sampleAnswer,
        test_number: uploadSectionNumber,
        cambridge_book: `C${uploadBookNumber}`,
        image_url: finalImageUrl || null
      };

      await createContent('writing_prompts', promptData);

      toast({
        title: "Success",
        description: `Writing prompt uploaded to Cambridge ${uploadBookNumber}, Test ${uploadSectionNumber}${finalImageUrl ? ' with image' : ''}`,
      });

      // Reset form and close dialog
      setPromptTitle("");
      setPromptText("");
      setTaskType("task1");
      setTaskNumber(1);
      setWordLimit(250);
      setTimeLimit(20);
      setSampleAnswer("");
      setImageFile(null);
      setImageUrl("");
      setShowUploadDialog(false);
      loadCambridgeStructure();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload prompt",
        variant: "destructive"
      });
    }
  };

  const deleteSection = async (bookNumber: number, sectionNumber: number) => {
    if (!confirm(`Are you sure you want to delete all content from Cambridge ${bookNumber}, Test ${sectionNumber}?`)) {
      return;
    }

    try {
      const section = cambridgeBooks[bookNumber]?.sections[sectionNumber];
      if (!section) return;

      // Delete all prompts in the section
      for (const prompt of section.prompts) {
        await deleteContent('writing_prompts', prompt.id);
      }

      toast({
        title: "Success",
        description: "Section content deleted successfully"
      });

      loadCambridgeStructure();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete section content",
        variant: "destructive"
      });
    }
  };

  const saveEditingSection = async () => {
    if (!editingSection) return;

    try {
      // Update prompts
      for (const prompt of editingSection.prompts) {
        await updateContent('writing_prompts', {
          id: prompt.id,
          title: prompt.title,
          prompt_text: prompt.prompt_text,
          sample_answer: prompt.sample_answer,
          word_limit: prompt.word_limit,
          time_limit: prompt.time_limit
        });
      }

      toast({
        title: "Success",
        description: "Section updated successfully"
      });

      setEditingSection(null);
      loadCambridgeStructure();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update section",
        variant: "destructive"
      });
    }
  };

  const filteredBooks = Object.values(cambridgeBooks)
    .filter((book: any) => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return `cambridge ${book.number}`.includes(searchLower) ||
             Object.values(book.sections).some((section: any) => 
               section.prompts.some((prompt: any) => prompt.title?.toLowerCase().includes(searchLower))
             );
    })
    .sort((a: any, b: any) => b.number - a.number); // Sort descending (20 to 1)

  return (
    <AdminLayout title="Cambridge IELTS Writing">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-georgia font-bold text-foreground mb-2">
              Cambridge IELTS Writing
            </h1>
            <p className="text-warm-gray">
              Manage writing prompts organized by Cambridge books 1-20
            </p>
          </div>
          <Button
            onClick={() => setShowUploadDialog(true)}
            className="rounded-xl"
            style={{ background: 'var(--gradient-button)', border: 'none' }}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Prompt
          </Button>
        </div>

        {/* Search */}
        <Card className="mb-6 rounded-2xl border-light-border" style={{ background: 'var(--gradient-card)' }}>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-warm-gray w-4 h-4" />
              <Input
                placeholder="Search books or prompts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl border-light-border"
              />
            </div>
          </CardContent>
        </Card>

        {/* Cambridge Books List */}
        <div className="space-y-4">
          {filteredBooks.map((book: any) => (
            <Card key={book.number} className="rounded-2xl border-light-border shadow-soft" style={{ background: 'var(--gradient-card)' }}>
              <Collapsible open={openBooks.has(book.number)} onOpenChange={() => toggleBook(book.number)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-white/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {openBooks.has(book.number) ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                        <PenTool className="w-5 h-5" />
                        <CardTitle className="text-xl font-georgia">
                          Cambridge IELTS {book.number}
                        </CardTitle>
                      </div>
                      <div className="flex gap-2">
                        {Object.values(book.sections).map((section: any) => (
                          <Badge
                            key={section.number}
                            variant={section.hasContent ? "default" : "outline"}
                            className="text-xs"
                          >
                            T{section.number}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="grid gap-4">
                      {Object.values(book.sections).map((section: any) => (
                        <Card key={section.number} className="border-light-border bg-white">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <PenTool className="w-4 h-4" />
                                <h4 className="font-medium">Test {section.number}</h4>
                                {section.hasContent && (
                                  <Badge variant="outline" className="text-xs">
                                    {section.prompts.length} prompts
                                  </Badge>
                                )}
                              </div>
                              <div className="flex gap-2">
                                {section.hasContent && (
                                  <>
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button size="sm" variant="outline" className="rounded-xl">
                                          <Eye className="w-4 h-4" />
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                        <DialogHeader>
                                          <DialogTitle>
                                            Cambridge {book.number} - Test {section.number}
                                          </DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-6">
                                          <Card className="p-4">
                                            <h5 className="font-medium mb-3">Writing Prompts ({section.prompts.length})</h5>
                                            <div className="space-y-4">
                                              {section.prompts.map((prompt: any) => (
                                                <div key={prompt.id} className="border-b border-light-border pb-4 last:border-b-0">
                                                  <div className="flex items-start gap-3">
                                                    <Badge variant="outline">{prompt.task_type}</Badge>
                                                    <div className="flex-1">
                                                      <p className="font-medium mb-2">{prompt.title}</p>
                                                      <div className="text-sm bg-gray-50 p-3 rounded-lg mb-2">
                                                        {prompt.prompt_text}
                                                      </div>
                                                      <div className="flex gap-4 text-xs text-warm-gray mb-2">
                                                        <span>Words: {prompt.word_limit}</span>
                                                        <span>Time: {prompt.time_limit}min</span>
                                                        <span>Task: {prompt.task_number}</span>
                                                      </div>
                                                      {prompt.sample_answer && (
                                                        <div>
                                                          <p className="text-sm font-medium mb-1">Sample Answer:</p>
                                                          <div className="text-sm bg-green-50 p-3 rounded-lg">
                                                            {prompt.sample_answer.substring(0, 200)}...
                                                          </div>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </Card>
                                        </div>
                                      </DialogContent>
                                    </Dialog>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingSection({ ...section, bookNumber: book.number })}
                                      className="rounded-xl"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => deleteSection(book.number, section.number)}
                                      className="rounded-xl"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          
                          {section.hasContent ? (
                            <CardContent className="pt-0">
                              <div className="text-sm text-warm-gray">
                                <p>Prompts: {section.prompts.length}</p>
                                <p>Last updated: {new Date(section.prompts[0]?.updated_at || section.prompts[0]?.created_at).toLocaleDateString()}</p>
                              </div>
                            </CardContent>
                          ) : (
                            <CardContent className="pt-0">
                              <div className="text-center py-6 text-warm-gray">
                                <PenTool className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No content yet</p>
                                <p className="text-xs">Upload prompts to add content</p>
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>

        {/* Upload Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upload Prompt to Cambridge {uploadBookNumber}, Test {uploadSectionNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Book and Test Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Cambridge Book</label>
                  <Select value={uploadBookNumber.toString()} onValueChange={(value) => setUploadBookNumber(parseInt(value))}>
                    <SelectTrigger className="rounded-xl border-light-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-light-border bg-card">
                      {Array.from({length: 20}, (_, i) => 20 - i).map(num => (
                        <SelectItem key={num} value={num.toString()}>Cambridge {num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Test</label>
                  <Select value={uploadSectionNumber.toString()} onValueChange={(value) => setUploadSectionNumber(parseInt(value))}>
                    <SelectTrigger className="rounded-xl border-light-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-light-border bg-card">
                      {Array.from({length: 4}, (_, i) => i + 1).map(num => (
                        <SelectItem key={num} value={num.toString()}>Test {num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Writing Prompt Input */}
              <Card className="rounded-2xl border-light-border" style={{ background: 'white' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <PenTool className="w-5 h-5" />
                    Writing Prompt
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Prompt Title (e.g., 'Task 1: Bar Chart Analysis')"
                    value={promptTitle}
                    onChange={(e) => setPromptTitle(e.target.value)}
                    className="rounded-xl border-light-border"
                  />
                  
                  <div className="grid grid-cols-3 gap-4">
                    <Select value={taskType} onValueChange={setTaskType}>
                      <SelectTrigger className="rounded-xl border-light-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="task1">Task 1</SelectItem>
                        <SelectItem value="task2">Task 2</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Input
                      type="number"
                      placeholder="Task Number"
                      value={taskNumber}
                      onChange={(e) => setTaskNumber(parseInt(e.target.value))}
                      className="rounded-xl border-light-border"
                    />
                    
                    <Input
                      type="number"
                      placeholder="Word Limit"
                      value={wordLimit}
                      onChange={(e) => setWordLimit(parseInt(e.target.value))}
                      className="rounded-xl border-light-border"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      placeholder="Time Limit (minutes)"
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                      className="rounded-xl border-light-border"
                    />
                  </div>
                  
                  <Textarea
                    placeholder="Writing prompt text..."
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    rows={6}
                    className="rounded-xl border-light-border"
                  />

                  {/* Task 1 Image Upload */}
                  {taskType === "task1" && (
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Task 1 Image (Graph/Chart/Map)
                      </label>
                      <div className="flex items-center gap-4">
                        <Button
                          type="button"
                          variant="default"
                          onClick={() => document.getElementById('task1-image-upload')?.click()}
                          className="rounded-xl h-12 px-6 text-sm bg-gradient-to-r from-gentle-blue to-warm-coral text-white font-medium hover:shadow-lg transition-all"
                        >
                          <Upload className="w-5 h-5 mr-2" />
                          {imageFile ? 'Change Image' : 'Upload Task 1 Image'}
                        </Button>
                        {imageFile && (
                          <span className="text-sm text-green-600 font-medium">
                            ✅ {imageFile.name}
                          </span>
                        )}
                      </div>
                      <input
                        id="task1-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setImageFile(file);
                            console.log('📸 Task 1 image selected:', file.name);
                          }
                        }}
                        className="rounded-xl border-light-border"
                      />
                      {imageFile && (
                        <p className="text-xs text-warm-gray mt-1">
                          Selected: {imageFile.name}
                        </p>
                      )}
                      <Input
                        placeholder="Or enter image URL"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="rounded-xl border-light-border mt-2"
                      />
                    </div>
                  )}
                  
                  <Textarea
                    placeholder="Sample answer (optional)"
                    value={sampleAnswer}
                    onChange={(e) => setSampleAnswer(e.target.value)}
                    rows={8}
                    className="rounded-xl border-light-border"
                  />
                </CardContent>
              </Card>
              
              <div className="flex gap-3">
                <Button
                  onClick={handleUpload}
                  disabled={loading}
                  className="rounded-xl flex-1"
                  style={{ background: 'var(--gradient-button)', border: 'none' }}
                >
                  Upload Prompt
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowUploadDialog(false)}
                  className="rounded-xl flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Section Dialog */}
        {editingSection && (
          <Dialog open={!!editingSection} onOpenChange={() => setEditingSection(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Edit Cambridge {editingSection.bookNumber} - Test {editingSection.number}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div>
                  <h5 className="font-medium mb-4">Prompts</h5>
                  {editingSection.prompts.map((prompt: any, index: number) => (
                    <Card key={prompt.id} className="p-4 mb-4">
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium">Title</label>
                          <Input
                            value={prompt.title}
                            onChange={(e) => {
                              const updated = { ...editingSection };
                              updated.prompts[index].title = e.target.value;
                              setEditingSection(updated);
                            }}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Prompt Text</label>
                          <Textarea
                            value={prompt.prompt_text}
                            onChange={(e) => {
                              const updated = { ...editingSection };
                              updated.prompts[index].prompt_text = e.target.value;
                              setEditingSection(updated);
                            }}
                            rows={4}
                            className="mt-1"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Word Limit</label>
                            <Input
                              type="number"
                              value={prompt.word_limit}
                              onChange={(e) => {
                                const updated = { ...editingSection };
                                updated.prompts[index].word_limit = parseInt(e.target.value);
                                setEditingSection(updated);
                              }}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Time Limit (minutes)</label>
                            <Input
                              type="number"
                              value={prompt.time_limit}
                              onChange={(e) => {
                                const updated = { ...editingSection };
                                updated.prompts[index].time_limit = parseInt(e.target.value);
                                setEditingSection(updated);
                              }}
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Sample Answer</label>
                          <Textarea
                            value={prompt.sample_answer}
                            onChange={(e) => {
                              const updated = { ...editingSection };
                              updated.prompts[index].sample_answer = e.target.value;
                              setEditingSection(updated);
                            }}
                            rows={6}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={saveEditingSection}
                    disabled={loading}
                    className="rounded-xl"
                    style={{ background: 'var(--gradient-button)', border: 'none' }}
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditingSection(null)}
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

export default AdminWriting;