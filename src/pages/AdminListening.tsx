import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAdminContent } from '@/hooks/useAdminContent';
import CSVImport from "@/components/CSVImport";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Upload, Eye, FileText, ChevronDown, ChevronRight, Search, BookOpen, Volume2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

const AdminListening = () => {
  const { listContent, createContent, deleteContent, updateContent, uploadAudio, loading } = useAdminContent();
  const { toast } = useToast();
  
  // Cambridge books structure
  const [cambridgeBooks, setCambridgeBooks] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [openBooks, setOpenBooks] = useState<Set<number>>(new Set());
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadBookNumber, setUploadBookNumber] = useState<number>(20);
  const [uploadSectionNumber, setUploadSectionNumber] = useState<number>(1);
  const [uploadPartNumber, setUploadPartNumber] = useState<number>(1);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [sectionTitle, setSectionTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [transcript, setTranscript] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCambridgeStructure();
  }, []);

  const loadCambridgeStructure = async () => {
    try {
      // Load sections and questions
      const [sectionsResult, questionsResult] = await Promise.all([
        listContent('listening_sections'),
        listContent('listening_questions')
      ]);

      const sections = sectionsResult.data || [];
      const questions = questionsResult.data || [];

      // Initialize Cambridge books structure
      const structure: any = {};
      
      // Initialize all books (1-20) with 4 sections each, 4 parts per section
      for (let book = 1; book <= 20; book++) {
        structure[book] = {
          number: book,
          sections: {}
        };
        
        for (let section = 1; section <= 4; section++) {
          structure[book].sections[section] = {
            number: section,
            parts: {},
            hasContent: false
          };
          
          // Each section has 4 parts for listening
          for (let part = 1; part <= 4; part++) {
            structure[book].sections[section].parts[part] = {
              number: part,
              section: null,
              questions: [],
              hasContent: false
            };
          }
        }
      }

      // Populate with existing data
      sections.forEach((section: any) => {
        const bookMatch = section.cambridge_book?.match(/\d+/);
        const bookNum = bookMatch ? parseInt(bookMatch[0]) : 1;
        const sectionNum = section.section_number || 1;
        const partNum = section.part_number || 1;
        
        if (structure[bookNum] && structure[bookNum].sections[sectionNum] && structure[bookNum].sections[sectionNum].parts[partNum]) {
          structure[bookNum].sections[sectionNum].parts[partNum].section = section;
          structure[bookNum].sections[sectionNum].parts[partNum].hasContent = true;
          structure[bookNum].sections[sectionNum].hasContent = true;
        }
      });

      questions.forEach((question: any) => {
        if (question.section_id) {
          const relatedSection = sections.find((s: any) => s.id === question.section_id);
          if (relatedSection) {
            const bookMatch = relatedSection.cambridge_book?.match(/\d+/);
            const bookNum = bookMatch ? parseInt(bookMatch[0]) : 1;
            const sectionNum = relatedSection.section_number || 1;
            const partNum = relatedSection.part_number || 1;
            if (structure[bookNum] && structure[bookNum].sections[sectionNum] && structure[bookNum].sections[sectionNum].parts[partNum]) {
              structure[bookNum].sections[sectionNum].parts[partNum].questions.push(question);
              structure[bookNum].sections[sectionNum].parts[partNum].hasContent = true;
              structure[bookNum].sections[sectionNum].hasContent = true;
            }
          }
        } else if (question.cambridge_book && question.section_number) {
          // Handle questions with book/section/part info but no section_id
          const bookMatch = question.cambridge_book.match(/\d+/);
          const bookNum = bookMatch ? parseInt(bookMatch[0]) : 1;
          const sectionNum = question.section_number;
          const partNum = question.part_number || 1;
          
          if (structure[bookNum] && structure[bookNum].sections[sectionNum] && structure[bookNum].sections[sectionNum].parts[partNum]) {
            structure[bookNum].sections[sectionNum].parts[partNum].questions.push(question);
            structure[bookNum].sections[sectionNum].parts[partNum].hasContent = true;
            structure[bookNum].sections[sectionNum].hasContent = true;
          }
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

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAudio(true);
    try {
      const result = await uploadAudio(file);
      setAudioUrl(result.url);
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

  const handleCSVUpload = async (questions: any[]) => {
    try {
      if (!sectionTitle || !instructions) {
        toast({
          title: "Error",
          description: "Please provide section title and instructions",
          variant: "destructive"
        });
        return;
      }

      const sectionData = {
        title: sectionTitle,
        instructions: instructions,
        transcript: transcript,
        audio_url: audioUrl,
        section_number: uploadSectionNumber,
        test_number: uploadBookNumber,
        cambridge_book: `C${uploadBookNumber}`,
        difficulty_level: "academic"
      };

      // Create section first
      const sectionResult = await createContent('listening_sections', sectionData);
      const sectionId = sectionResult.data.id;

      // Create questions linked to the section
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const questionData = {
          question_number: question.question_number || (i + 1),
          question_type: question.question_type || 'multiple_choice',
          question_text: question.question_text || '',
          correct_answer: question.correct_answer || '',
          explanation: question.explanation || '',
          options: question.options || null,
          section_id: sectionId
        };
        
        await createContent('listening_questions', questionData);
      }

      toast({
        title: "Success",
        description: `Listening section uploaded to Cambridge ${uploadBookNumber}, Section ${uploadSectionNumber}`,
      });

      // Reset form and close dialog
      setSectionTitle("");
      setInstructions("");
      setTranscript("");
      setAudioUrl("");
      setShowUploadDialog(false);
      loadCambridgeStructure();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload section",
        variant: "destructive"
      });
    }
  };

  const deleteSection = async (bookNumber: number, sectionNumber: number) => {
    if (!confirm(`Are you sure you want to delete all content from Cambridge ${bookNumber}, Section ${sectionNumber}?`)) {
      return;
    }

    try {
      const section = cambridgeBooks[bookNumber]?.sections[sectionNumber];
      if (!section) return;

      // Delete all questions in the section
      for (const question of section.questions) {
        await deleteContent('listening_questions', question.id);
      }

      // Delete the section if it exists
      if (section.section) {
        await deleteContent('listening_sections', section.section.id);
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
      // Update section if it exists
      if (editingSection.section) {
        await updateContent('listening_sections', {
          id: editingSection.section.id,
          title: editingSection.section.title,
          instructions: editingSection.section.instructions,
          transcript: editingSection.section.transcript
        });
      }

      // Update questions
      for (const question of editingSection.questions) {
        await updateContent('listening_questions', {
          id: question.id,
          question_text: question.question_text,
          correct_answer: question.correct_answer,
          explanation: question.explanation,
          options: question.options
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
               section.section?.title?.toLowerCase().includes(searchLower)
             );
    })
    .sort((a: any, b: any) => b.number - a.number); // Sort descending (20 to 1)

  return (
    <AdminLayout title="Cambridge IELTS Listening">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-georgia font-bold text-foreground mb-2">
              Cambridge IELTS Listening
            </h1>
            <p className="text-warm-gray">
              Manage listening content organized by Cambridge books 1-20
            </p>
          </div>
          <Button
            onClick={() => setShowUploadDialog(true)}
            className="rounded-xl"
            style={{ background: 'var(--gradient-button)', border: 'none' }}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Content
          </Button>
        </div>

        {/* Search */}
        <Card className="mb-6 rounded-2xl border-light-border" style={{ background: 'var(--gradient-card)' }}>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-warm-gray w-4 h-4" />
              <Input
                placeholder="Search books or sections..."
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
                        <Volume2 className="w-5 h-5" />
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
                            S{section.number}
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
                                <Volume2 className="w-4 h-4" />
                                <h4 className="font-medium">Section {section.number}</h4>
                                {section.hasContent && (
                                  <Badge variant="outline" className="text-xs">
                                    {(Object.values(section.parts) as any[]).reduce((total: number, part: any) => total + part.questions.length, 0)} questions
                                  </Badge>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setUploadBookNumber(book.number);
                                    setUploadSectionNumber(section.number);
                                    setUploadPartNumber(1);
                                    setShowUploadDialog(true);
                                  }}
                                  className="rounded-xl"
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {Object.values(section.parts).map((part: any) => (
                                <Card key={part.number} className="border-light-border bg-gray-50">
                                  <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <h5 className="text-sm font-medium">Part {part.number}</h5>
                                        {part.hasContent && (
                                          <Badge variant="outline" className="text-xs">
                                            {part.questions.length} questions
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex gap-2">
                                         {part.hasContent && (
                                           <Dialog>
                                             <DialogTrigger asChild>
                                               <Button size="sm" variant="outline" className="rounded-xl h-6 px-2">
                                                 <Eye className="w-3 h-3" />
                                               </Button>
                                             </DialogTrigger>
                                             <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                               <DialogHeader>
                                                 <DialogTitle>
                                                   Cambridge {book.number} - Section {section.number} - Part {part.number}
                                                 </DialogTitle>
                                               </DialogHeader>
                                               <div className="space-y-6">
                                                 {part.section && (
                                                   <Card className="p-4">
                                                     <h5 className="font-medium mb-3">Listening Section</h5>
                                                     <div className="space-y-4">
                                                       <div>
                                                         <h6 className="font-medium mb-2">Instructions</h6>
                                                         <p className="text-sm">{part.section.instructions}</p>
                                                       </div>
                                                       {part.section.audio_url && (
                                                         <div>
                                                           <h6 className="font-medium mb-2">Audio</h6>
                                                           <audio controls className="w-full">
                                                             <source src={part.section.audio_url} type="audio/mpeg" />
                                                           </audio>
                                                         </div>
                                                       )}
                                                       {part.section.transcript && (
                                                         <div>
                                                           <h6 className="font-medium mb-2">Transcript</h6>
                                                           <div className="text-sm bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                                                             {part.section.transcript}
                                                           </div>
                                                         </div>
                                                       )}
                                                     </div>
                                                   </Card>
                                                 )}
                                                 
                                                 <Card className="p-4">
                                                   <h5 className="font-medium mb-3">Questions ({part.questions.length})</h5>
                                                   <div className="space-y-4">
                                                     {part.questions
                                                       .sort((a: any, b: any) => parseInt(a.question_number) - parseInt(b.question_number))
                                                       .map((question: any) => (
                                                         <div key={question.id} className="border-b border-light-border pb-4 last:border-b-0">
                                                           <div className="flex items-start gap-3">
                                                             <Badge variant="outline">{question.question_number}</Badge>
                                                             <div className="flex-1">
                                                               <p className="font-medium mb-2">{question.question_text}</p>
                                                               {question.options && (
                                                                 <div className="text-sm space-y-1 mb-2">
                                                                   {Array.isArray(question.options) 
                                                                     ? question.options.map((option: string, idx: number) => (
                                                                         <div key={idx} className={`p-2 rounded ${option === question.correct_answer ? 'bg-green-50 text-green-800 font-medium' : 'bg-gray-50'}`}>
                                                                           {String.fromCharCode(65 + idx)}. {option}
                                                                         </div>
                                                                       ))
                                                                     : <div className="bg-green-50 text-green-800 font-medium p-2 rounded">
                                                                         Answer: {question.correct_answer}
                                                                       </div>
                                                                   }
                                                                 </div>
                                                               )}
                                                               <p className="text-sm text-warm-gray">
                                                                 <span className="font-medium">Explanation:</span> {question.explanation}
                                                               </p>
                                                             </div>
                                                           </div>
                                                         </div>
                                                       ))}
                                                   </div>
                                                 </Card>
                                               </div>
                                             </DialogContent>
                                           </Dialog>
                                         )}
                                       </div>
                                     </div>
                                   </CardHeader>
                                   <CardContent className="pt-0">
                                     {part.hasContent ? (
                                       <div className="text-sm text-warm-gray">
                                         {part.section ? (
                                           <p>Section: {part.section.title}</p>
                                         ) : (
                                           <p>Questions without section</p>
                                         )}
                                       </div>
                                     ) : (
                                       <div className="text-center py-4 text-warm-gray">
                                         <Volume2 className="w-6 h-6 mx-auto mb-2 opacity-50" />
                                         <p className="text-xs">No content yet</p>
                                       </div>
                                     )}
                                   </CardContent>
                                 </Card>
                               ))}
                             </div>
                           </CardContent>
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
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upload Content to Cambridge {uploadBookNumber}, Section {uploadSectionNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Book and Section Selection */}
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
                  <label className="text-sm font-medium mb-2 block">Section</label>
                  <Select value={uploadSectionNumber.toString()} onValueChange={(value) => setUploadSectionNumber(parseInt(value))}>
                    <SelectTrigger className="rounded-xl border-light-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-light-border bg-card">
                      {Array.from({length: 4}, (_, i) => i + 1).map(num => (
                        <SelectItem key={num} value={num.toString()}>Section {num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Listening Section Input */}
              <Card className="rounded-2xl border-light-border" style={{ background: 'white' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Volume2 className="w-5 h-5" />
                    Listening Section
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Section Title (e.g., 'University Lecture - Climate Change')"
                    value={sectionTitle}
                    onChange={(e) => setSectionTitle(e.target.value)}
                    className="rounded-xl border-light-border"
                  />
                  
                  <Textarea
                    placeholder="Instructions for students (e.g., 'Listen to the lecture and answer questions 1-10')"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={3}
                    className="rounded-xl border-light-border"
                  />

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
                      {audioUrl && (
                        <span className="text-sm text-green-600 font-medium">Audio uploaded ✓</span>
                      )}
                    </div>
                    {audioUrl && (
                      <audio controls className="w-full mt-2">
                        <source src={audioUrl} type="audio/mpeg" />
                      </audio>
                    )}
                  </div>
                  
                  <Textarea
                    placeholder="Audio transcript (optional, for admin reference)"
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    rows={6}
                    className="rounded-xl border-light-border font-mono text-sm"
                  />
                </CardContent>
              </Card>
              
              {/* CSV Upload for Questions */}
              <CSVImport onImport={handleCSVUpload} type="listening" />
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Section Dialog */}
        {editingSection && (
          <Dialog open={!!editingSection} onOpenChange={() => setEditingSection(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Edit Cambridge {editingSection.bookNumber} - Section {editingSection.number}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {editingSection.section && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Section Title</label>
                    <Input
                      value={editingSection.section.title}
                      onChange={(e) => setEditingSection({
                        ...editingSection,
                        section: { ...editingSection.section, title: e.target.value }
                      })}
                      className="mb-4"
                    />
                    <label className="text-sm font-medium mb-2 block">Instructions</label>
                    <Textarea
                      value={editingSection.section.instructions}
                      onChange={(e) => setEditingSection({
                        ...editingSection,
                        section: { ...editingSection.section, instructions: e.target.value }
                      })}
                      rows={3}
                      className="mb-4"
                    />
                    <label className="text-sm font-medium mb-2 block">Transcript</label>
                    <Textarea
                      value={editingSection.section.transcript}
                      onChange={(e) => setEditingSection({
                        ...editingSection,
                        section: { ...editingSection.section, transcript: e.target.value }
                      })}
                      rows={6}
                      className="mb-4"
                    />
                  </div>
                )}

                <div>
                  <h5 className="font-medium mb-4">Questions</h5>
                  {editingSection.questions.map((question: any, index: number) => (
                    <Card key={question.id} className="p-4 mb-4">
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium">Question Text</label>
                          <Textarea
                            value={question.question_text}
                            onChange={(e) => {
                              const updated = { ...editingSection };
                              updated.questions[index].question_text = e.target.value;
                              setEditingSection(updated);
                            }}
                            className="mt-1"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Correct Answer</label>
                            <Input
                              value={question.correct_answer}
                              onChange={(e) => {
                                const updated = { ...editingSection };
                                updated.questions[index].correct_answer = e.target.value;
                                setEditingSection(updated);
                              }}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Question Type</label>
                            <Select
                              value={question.question_type}
                              onValueChange={(value) => {
                                const updated = { ...editingSection };
                                updated.questions[index].question_type = value;
                                setEditingSection(updated);
                              }}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                <SelectItem value="fill_in_blank">Fill in the Blank</SelectItem>
                                <SelectItem value="true_false">True/False</SelectItem>
                                <SelectItem value="matching">Matching</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Explanation</label>
                          <Textarea
                            value={question.explanation}
                            onChange={(e) => {
                              const updated = { ...editingSection };
                              updated.questions[index].explanation = e.target.value;
                              setEditingSection(updated);
                            }}
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

export default AdminListening;