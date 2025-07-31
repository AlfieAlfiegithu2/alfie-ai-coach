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
  // Part 1 fields
  const [part1Title, setPart1Title] = useState("");
  const [part1Text, setPart1Text] = useState("");
  const [part1Answer, setPart1Answer] = useState("");
  const [part1ImageFile, setPart1ImageFile] = useState<File | null>(null);
  const [part1ImageUrl, setPart1ImageUrl] = useState("");

  // Part 2 fields
  const [part2Title, setPart2Title] = useState("");
  const [part2Text, setPart2Text] = useState("");
  const [part2Answer, setPart2Answer] = useState("");

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
      if (!part1Title || !part1Text || !part2Title || !part2Text) {
        toast({
          title: "Error",
          description: "Please provide titles and texts for both Part 1 and Part 2",
          variant: "destructive"
        });
        return;
      }

      let part1FinalImageUrl = part1ImageUrl;

      // Upload image for Part 1 if provided
      if (part1ImageFile) {
        console.log('📸 Uploading Part 1 image...', part1ImageFile.name);
        try {
          const uploadResult = await uploadAudio(part1ImageFile); // Reusing upload function for images
          if (uploadResult.success) {
            part1FinalImageUrl = uploadResult.url;
            console.log('✅ Part 1 image uploaded successfully:', part1FinalImageUrl);
          } else {
            toast({
              title: "Image Upload Failed",
              description: "Failed to upload Part 1 image. Continuing without image.",
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

      // Create Part 1 prompt
      const part1Data = {
        title: part1Title,
        prompt_text: part1Text,
        task_type: "Task 1",
        task_number: 1,
        word_limit: null, // No word limit
        time_limit: 60, // 60 minutes total for both parts
        sample_answer: part1Answer,
        test_number: uploadSectionNumber,
        cambridge_book: `C${uploadBookNumber}`,
        image_url: part1FinalImageUrl || null
      };

      // Create Part 2 prompt
      const part2Data = {
        title: part2Title,
        prompt_text: part2Text,
        task_type: "Task 2",
        task_number: 2,
        word_limit: null, // No word limit
        time_limit: 60, // 60 minutes total for both parts
        sample_answer: part2Answer,
        test_number: uploadSectionNumber,
        cambridge_book: `C${uploadBookNumber}`,
        image_url: null
      };

      console.log('📝 Creating writing prompts:', { part1Data, part2Data });

      // Create both parts
      await createContent('writing_prompts', part1Data);
      await createContent('writing_prompts', part2Data);

      toast({
        title: "Success",
        description: `Writing test created with Part 1${part1FinalImageUrl ? ' (with image)' : ''} and Part 2 for Cambridge ${uploadBookNumber}, Test ${uploadSectionNumber}`,
      });

      // Reset form and close dialog
      setPart1Title("");
      setPart1Text("");
      setPart1Answer("");
      setPart1ImageFile(null);
      setPart1ImageUrl("");
      setPart2Title("");
      setPart2Text("");
      setPart2Answer("");
      setShowUploadDialog(false);
      loadCambridgeStructure();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload prompts",
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
            Create Writing Test
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
              <DialogTitle>Create Writing Test - Cambridge {uploadBookNumber}, Test {uploadSectionNumber}</DialogTitle>
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

              {/* Part 1 Input */}
              <Card className="rounded-2xl border-light-border" style={{ background: 'white' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <PenTool className="w-5 h-5" />
                    Part 1 (Visual Task)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Part 1 Title (e.g., 'Task 1: Bar Chart Analysis')"
                    value={part1Title}
                    onChange={(e) => setPart1Title(e.target.value)}
                    className="rounded-xl border-light-border"
                  />
                  
                  <Textarea
                    placeholder="Part 1 prompt text..."
                    value={part1Text}
                    onChange={(e) => setPart1Text(e.target.value)}
                    rows={4}
                    className="rounded-xl border-light-border"
                  />

                  {/* Part 1 Image Upload */}
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-foreground">
                      Part 1 Image Upload (PNG, JPG, JPEG only)
                    </label>
                    
                    <div className="border-2 border-dashed border-light-border rounded-xl p-6 hover:border-primary/50 transition-colors">
                      <div className="text-center">
                        <Button
                          type="button"
                          variant="default"
                          onClick={() => document.getElementById('part1-image-upload')?.click()}
                          className="rounded-xl h-14 px-8 text-sm font-semibold"
                          style={{ background: 'var(--gradient-button)', border: 'none' }}
                        >
                          <Upload className="w-5 h-5 mr-2" />
                          {part1ImageFile ? 'Change Image' : 'Upload Chart/Graph Image'}
                        </Button>
                        
                        <p className="text-xs text-warm-gray mt-2">
                          PNG, JPG, JPEG only • Max 10MB • No PDF files
                        </p>
                      </div>
                    </div>
                    
                    <input
                      id="part1-image-upload"
                      type="file"
                      accept="image/png,image/jpg,image/jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const validTypes = ['image/png', 'image/jpg', 'image/jpeg'];
                          if (!validTypes.includes(file.type)) {
                            toast({
                              title: "Invalid File Type",
                              description: "Please upload PNG, JPG, or JPEG images only.",
                              variant: "destructive"
                            });
                            e.target.value = '';
                            return;
                          }
                          
                          if (file.size > 10 * 1024 * 1024) {
                            toast({
                              title: "File Too Large",
                              description: "Please upload an image smaller than 10MB.",
                              variant: "destructive"
                            });
                            e.target.value = '';
                            return;
                          }
                          
                          setPart1ImageFile(file);
                          setPart1ImageUrl('');
                          
                          toast({
                            title: "Image Selected",
                            description: `${file.name} ready for upload`,
                          });
                        }
                      }}
                      className="hidden"
                    />
                    
                    {/* Image Preview */}
                    {part1ImageFile && (
                      <div className="bg-white border border-light-border rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-foreground">
                            Image Preview:
                          </span>
                          <span className="text-xs text-green-600 font-medium">
                            ✅ {part1ImageFile.name} ({(part1ImageFile.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <img 
                          src={URL.createObjectURL(part1ImageFile)} 
                          alt="Part 1 preview" 
                          className="max-w-full max-h-48 object-contain border border-gray-200 rounded-lg shadow-sm mx-auto"
                        />
                      </div>
                    )}
                    
                    <div className="text-center text-sm text-warm-gray">
                      <span className="font-medium">OR</span>
                    </div>
                    
                    <Input
                      placeholder="Enter image URL (alternative to file upload)"
                      value={part1ImageUrl}
                      onChange={(e) => {
                        setPart1ImageUrl(e.target.value);
                        if (e.target.value) {
                          setPart1ImageFile(null);
                        }
                      }}
                      className="rounded-xl border-light-border"
                    />
                    
                    {part1ImageUrl && !part1ImageFile && (
                      <div className="bg-white border border-light-border rounded-xl p-4">
                        <p className="text-sm font-medium text-foreground mb-2">URL Preview:</p>
                        <img 
                          src={part1ImageUrl} 
                          alt="Part 1 URL preview" 
                          className="max-w-full max-h-48 object-contain border border-gray-200 rounded-lg shadow-sm mx-auto"
                          onError={() => {
                            toast({
                              title: "Invalid Image URL",
                              description: "Please check the image URL and try again.",
                              variant: "destructive"
                            });
                          }}
                        />
                      </div>
                    )}
                  </div>
                  
                  <Textarea
                    placeholder="Band 9 model answer for Part 1"
                    value={part1Answer}
                    onChange={(e) => setPart1Answer(e.target.value)}
                    rows={6}
                    className="rounded-xl border-light-border"
                  />
                </CardContent>
              </Card>

              {/* Part 2 Input */}
              <Card className="rounded-2xl border-light-border" style={{ background: 'white' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <PenTool className="w-5 h-5" />
                    Part 2 (Essay Task)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Part 2 Title (e.g., 'Task 2: Opinion Essay')"
                    value={part2Title}
                    onChange={(e) => setPart2Title(e.target.value)}
                    className="rounded-xl border-light-border"
                  />
                  
                  <Textarea
                    placeholder="Part 2 prompt text..."
                    value={part2Text}
                    onChange={(e) => setPart2Text(e.target.value)}
                    rows={4}
                    className="rounded-xl border-light-border"
                  />
                  
                  <Textarea
                    placeholder="Band 9 model answer for Part 2"
                    value={part2Answer}
                    onChange={(e) => setPart2Answer(e.target.value)}
                    rows={8}
                    className="rounded-xl border-light-border"
                  />
                </CardContent>
              </Card>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-medium text-blue-900 mb-2">Test Configuration</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>• Total time: 60 minutes for both parts</p>
                  <p>• No word limit restrictions</p>
                  <p>• Part 1: Visual data analysis task</p>
                  <p>• Part 2: Academic essay task</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={handleUpload}
                  disabled={loading}
                  className="rounded-xl flex-1"
                  style={{ background: 'var(--gradient-button)', border: 'none' }}
                >
                  Create Writing Test
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
                            <label className="text-sm font-medium">Minimum Word Count</label>
                            <Input
                              type="number"
                              value={prompt.word_limit}
                              onChange={(e) => {
                                const updated = { ...editingSection };
                                updated.prompts[index].word_limit = parseInt(e.target.value);
                                setEditingSection(updated);
                              }}
                              placeholder={prompt.task_type === 'task1' ? '150' : '250'}
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