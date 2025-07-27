import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAdminContent } from "@/hooks/useAdminContent";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Eye, FileText, ChevronDown, ChevronRight, Search, BookOpen, Upload } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import CSVImport from "@/components/CSVImport";

const AdminReading = () => {
  const { listContent, createContent, deleteContent, updateContent, loading } = useAdminContent();
  const { toast } = useToast();
  
  // Cambridge books structure
  const [cambridgeBooks, setCambridgeBooks] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [openBooks, setOpenBooks] = useState<Set<number>>(new Set());
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadBookNumber, setUploadBookNumber] = useState<number>(20);
  const [uploadSectionNumber, setUploadSectionNumber] = useState<number>(1);
  const [uploadPartNumber, setUploadPartNumber] = useState<number>(1);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [passageTitle, setPassageTitle] = useState("");
  const [passageContent, setPassageContent] = useState("");
  const [pendingQuestions, setPendingQuestions] = useState<any[]>([]);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    loadCambridgeStructure();
  }, []);

  const loadCambridgeStructure = async () => {
    try {
      // Load passages and questions
      const [passagesResult, questionsResult] = await Promise.all([
        listContent('reading_passages'),
        listContent('reading_questions')
      ]);

      const passages = passagesResult.data || [];
      const questions = questionsResult.data || [];

      // Initialize Cambridge books structure
      const structure: any = {};
      
      // Initialize all books (1-20) with 4 sections each, 3 parts per section
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
          
          // Each section has 3 parts
          for (let part = 1; part <= 3; part++) {
            structure[book].sections[section].parts[part] = {
              number: part,
              passage: null,
              questions: [],
              hasContent: false
            };
          }
        }
      }

      // Populate with existing data
      passages.forEach((passage: any) => {
        const bookNum = passage.book_number || 1;
        const sectionNum = passage.section_number || 1;
        const partNum = passage.part_number || 1;
        
        if (structure[bookNum] && structure[bookNum].sections[sectionNum] && structure[bookNum].sections[sectionNum].parts[partNum]) {
          structure[bookNum].sections[sectionNum].parts[partNum].passage = passage;
          structure[bookNum].sections[sectionNum].parts[partNum].hasContent = true;
          structure[bookNum].sections[sectionNum].hasContent = true;
        }
      });

      questions.forEach((question: any) => {
        // Try to match by passage_id first
        if (question.passage_id) {
          const relatedPassage = passages.find((p: any) => p.id === question.passage_id);
          if (relatedPassage) {
            const bookNum = relatedPassage.book_number || 1;
            const sectionNum = relatedPassage.section_number || 1;
            const partNum = relatedPassage.part_number || 1;
            if (structure[bookNum] && structure[bookNum].sections[sectionNum] && structure[bookNum].sections[sectionNum].parts[partNum]) {
              structure[bookNum].sections[sectionNum].parts[partNum].questions.push(question);
              structure[bookNum].sections[sectionNum].parts[partNum].hasContent = true;
              structure[bookNum].sections[sectionNum].hasContent = true;
            }
          }
        } else if (question.cambridge_book && question.section_number) {
          // Use cambridge_book, section_number, and part_number from question
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

  // Step 1: Preview and validate questions (called by CSVImport component)
  const handleCSVPreview = (questions: any[]) => {
    // Basic validation - CSVImport component already handles type validation
    const validQuestions = questions.filter(q => 
      q.question_text && q.correct_answer && q.question_type
    );
    
    if (validQuestions.length === 0) {
      toast({
        title: "Error",
        description: "No valid questions found in CSV",
        variant: "destructive"
      });
      return;
    }

    // Store questions for import
    setPendingQuestions(validQuestions);
    setShowImportConfirm(true);
  };

  // Step 2: Actually import/save the questions (called after user confirmation)
  const handleConfirmImport = async () => {
    try {
      setIsImporting(true);
      
      // Set default title and content if not provided for CSV imports
      const finalTitle = passageTitle || `Passage for Cambridge ${uploadBookNumber} Section ${uploadSectionNumber} Part ${uploadPartNumber}`;
      const finalContent = passageContent || "Passage content will be added later.";
      
      console.log('Import validation passed - proceeding with:', {
        title: finalTitle,
        contentLength: finalContent.length,
        questionsCount: pendingQuestions.length
      });

      console.log('Starting import process...', {
        bookNumber: uploadBookNumber,
        sectionNumber: uploadSectionNumber,
        partNumber: uploadPartNumber,
        questionsCount: pendingQuestions.length,
        passageTitle
      });

      const passageData = {
        title: finalTitle,
        content: finalContent,
        book_number: uploadBookNumber,
        section_number: uploadSectionNumber,
        part_number: uploadPartNumber,
        cambridge_book: `C${uploadBookNumber}`,
        difficulty_level: "intermediate",
        passage_type: "academic"
      };

      console.log('Creating passage with data:', passageData);

      // Create passage first
      const passageResult = await createContent('reading_passages', passageData);
      
      if (!passageResult?.data?.id) {
        throw new Error('Failed to create passage - no ID returned');
      }
      
      const passageId = passageResult.data.id;
      console.log('Passage created with ID:', passageId);

      // Create questions linked to the passage
      for (let i = 0; i < pendingQuestions.length; i++) {
        const question = pendingQuestions[i];
        const questionData = {
          question_number: question.question_number || (i + 1),
          question_type: question.question_type || 'Multiple Choice',
          question_text: question.question_text || '',
          correct_answer: question.correct_answer || '',
          explanation: question.explanation || '',
          options: question.options || null,
          passage_id: passageId,
          cambridge_book: `C${uploadBookNumber}`,
          section_number: uploadSectionNumber,
          part_number: uploadPartNumber
        };
        
        console.log(`Creating question ${i + 1}:`, questionData);
        await createContent('reading_questions', questionData);
      }

      toast({
        title: "Success",
        description: `${pendingQuestions.length} questions uploaded to Cambridge ${uploadBookNumber}, Section ${uploadSectionNumber}, Part ${uploadPartNumber}`,
      });

      // Reset form and close dialogs
      setPassageTitle("");
      setPassageContent("");
      setPendingQuestions([]);
      setShowImportConfirm(false);
      setShowUploadDialog(false);
      loadCambridgeStructure();
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload questions",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Cancel import flow
  const handleCancelImport = () => {
    setPendingQuestions([]);
    setShowImportConfirm(false);
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
        await deleteContent('reading_questions', question.id);
      }

      // Delete the passage if it exists
      if (section.passage) {
        await deleteContent('reading_passages', section.passage.id);
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
      // Update passage if it exists
      if (editingSection.passage) {
        await updateContent('reading_passages', {
          id: editingSection.passage.id,
          title: editingSection.passage.title,
          content: editingSection.passage.content
        });
      }

      // Update questions
      for (const question of editingSection.questions) {
        await updateContent('reading_questions', {
          id: question.id,
          question_text: question.question_text,
          question_type: question.question_type,
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
               section.passage?.title?.toLowerCase().includes(searchLower)
             );
    })
    .sort((a: any, b: any) => b.number - a.number); // Sort descending (20 to 1)

  return (
    <AdminLayout title="Cambridge IELTS Reading">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-georgia font-bold text-foreground mb-2">
              Cambridge IELTS Reading
            </h1>
            <p className="text-warm-gray">
              Manage reading content organized by Cambridge books 1-20
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
                placeholder="Search books or passages..."
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
                        <BookOpen className="w-5 h-5" />
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
                            {(Object.values(section.parts) as any[]).filter((part: any) => part.hasContent).length > 0 && 
                              ` (${(Object.values(section.parts) as any[]).filter((part: any) => part.hasContent).length}/3)`
                            }
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
                                <FileText className="w-4 h-4" />
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
                                {section.hasContent && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
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
                          
                          {/* Parts within Section */}
                          <CardContent className="pt-0">
                            <div className="grid gap-3">
                              {(Object.values(section.parts) as any[]).map((part: any) => (
                                <Card key={part.number} className="border-light-border bg-gray-50">
                                  <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs flex items-center justify-center font-medium">
                                          {part.number}
                                        </div>
                                        <h5 className="font-medium text-sm">Part {part.number}</h5>
                                        {part.hasContent && (
                                          <Badge variant="secondary" className="text-xs">
                                            {part.questions.length} questions
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex gap-2">
                                        {!part.hasContent ? (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setUploadBookNumber(book.number);
                                              setUploadSectionNumber(section.number);
                                              setUploadPartNumber(part.number);
                                              setShowUploadDialog(true);
                                            }}
                                            className="rounded-xl text-xs"
                                          >
                                            <Plus className="w-3 h-3 mr-1" />
                                            Add
                                          </Button>
                                        ) : (
                                          <>
                                            <Dialog>
                                              <DialogTrigger asChild>
                                                <Button size="sm" variant="outline" className="rounded-xl">
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
                                                  {part.passage && (
                                                    <Card className="p-4">
                                                      <h5 className="font-medium mb-3">Reading Passage</h5>
                                                      <div className="prose max-w-none text-sm">
                                                        {part.passage.content.split('\n\n').map((paragraph: string, idx: number) => (
                                                          <p key={idx} className="mb-3">{paragraph}</p>
                                                        ))}
                                                      </div>
                                                    </Card>
                                                  )}
                                                  
                                                  <Card className="p-4">
                                                    <h5 className="font-medium mb-3">Questions ({part.questions.length})</h5>
                                                    <div className="space-y-4">
                                                      {part.questions.map((question: any) => (
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

                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => setEditingSection({ 
                                                ...part, 
                                                bookNumber: book.number, 
                                                sectionNumber: section.number,
                                                partNumber: part.number 
                                              })}
                                              className="rounded-xl"
                                            >
                                              <Edit className="w-3 h-3" />
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </CardHeader>
                                  
                                  {part.hasContent && (
                                    <CardContent className="pt-0 pb-3">
                                      <div className="text-xs text-warm-gray">
                                        {part.passage?.title || 'No title'}
                                        {part.questions.length > 0 && ` • ${part.questions.length} questions`}
                                      </div>
                                    </CardContent>
                                  )}
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
              <DialogTitle>Upload Content to Cambridge {uploadBookNumber}, Section {uploadSectionNumber}, Part {uploadPartNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Book, Section, and Part Selection */}
              <div className="grid grid-cols-3 gap-4">
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
                <div>
                  <label className="text-sm font-medium mb-2 block">Part</label>
                  <Select value={uploadPartNumber.toString()} onValueChange={(value) => setUploadPartNumber(parseInt(value))}>
                    <SelectTrigger className="rounded-xl border-light-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-light-border bg-card">
                      {Array.from({length: 3}, (_, i) => i + 1).map(num => (
                        <SelectItem key={num} value={num.toString()}>Part {num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Reading Passage Input */}
              <Card className="rounded-2xl border-light-border" style={{ background: 'white' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <FileText className="w-5 h-5" />
                    Reading Passage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Passage Title (e.g., 'Tennis Equipment Research')"
                    value={passageTitle}
                    onChange={(e) => setPassageTitle(e.target.value)}
                    className="rounded-xl border-light-border"
                  />
                  <Textarea
                    placeholder="Paste the complete reading passage text here..."
                    value={passageContent}
                    onChange={(e) => setPassageContent(e.target.value)}
                    rows={12}
                    className="rounded-xl border-light-border font-mono text-sm"
                  />
                </CardContent>
              </Card>
              
              {/* CSV Upload for Questions */}
              <CSVImport 
                onImport={handleCSVPreview} 
                type="reading" 
                cambridgeBook={`C${uploadBookNumber}`}
                testNumber={null}
                sectionNumber={uploadSectionNumber}
                partNumber={uploadPartNumber}
              />
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
                {editingSection.passage && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Passage Title</label>
                    <Input
                      value={editingSection.passage.title}
                      onChange={(e) => setEditingSection({
                        ...editingSection,
                        passage: { ...editingSection.passage, title: e.target.value }
                      })}
                      className="mb-4"
                    />
                    <label className="text-sm font-medium mb-2 block">Passage Content</label>
                    <Textarea
                      value={editingSection.passage.content}
                      onChange={(e) => setEditingSection({
                        ...editingSection,
                        passage: { ...editingSection.passage, content: e.target.value }
                      })}
                      rows={10}
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
                            <label className="text-sm font-medium">Question Type</label>
                            <select
                              value={question.question_type}
                              onChange={(e) => {
                                const updated = { ...editingSection };
                                updated.questions[index].question_type = e.target.value;
                                setEditingSection(updated);
                              }}
                              className="w-full p-2 border border-gray-300 rounded-md mt-1"
                            >
                              <option value="True/False/Not Given">True/False/Not Given</option>
                              <option value="Yes/No/Not Given">Yes/No/Not Given</option>
                              <option value="Multiple Choice">Multiple Choice</option>
                              <option value="Summary Completion">Summary Completion</option>
                              <option value="Sentence Completion">Sentence Completion</option>
                              <option value="Table Completion">Table Completion</option>
                              <option value="Matching Headings">Matching Headings</option>
                              <option value="Matching Features">Matching Features</option>
                              <option value="Short-answer Questions">Short-answer Questions</option>
                            </select>
                          </div>
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

        {/* Import Confirmation Dialog (Step 2) */}
        <Dialog open={showImportConfirm} onOpenChange={setShowImportConfirm}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Confirm Import - {pendingQuestions.length} Questions
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-medium text-blue-800 mb-2">Import Summary</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>• Book: Cambridge {uploadBookNumber}</p>
                  <p>• Section: {uploadSectionNumber}</p>
                  <p>• Part: {uploadPartNumber}</p>
                  <p>• Passage: {passageTitle || "Untitled"}</p>
                  <p>• Questions: {pendingQuestions.length}</p>
                </div>
              </div>

              {/* Preview Questions */}
              <Card className="p-4">
                <h5 className="font-medium mb-4">Questions Preview</h5>
                <div className="max-h-64 overflow-y-auto space-y-3">
                  {pendingQuestions.map((question, index) => (
                    <div key={index} className="border border-light-border rounded-lg p-3 bg-white">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">{question.question_number || index + 1}</Badge>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="text-xs">{question.question_type}</Badge>
                            <span className="text-xs text-warm-gray">Answer: {question.correct_answer}</span>
                          </div>
                          <p className="text-sm font-medium mb-1">{question.question_text}</p>
                          {question.options && question.options.length > 0 && (
                            <div className="text-xs text-warm-gray">
                              Options: {question.options.join(' | ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="flex gap-3">
                <Button
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  className="rounded-xl flex-1"
                  style={{ background: 'var(--gradient-button)', border: 'none' }}
                >
                  {isImporting ? 'Importing...' : 'Confirm Import'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelImport}
                  disabled={isImporting}
                  className="rounded-xl flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminReading;