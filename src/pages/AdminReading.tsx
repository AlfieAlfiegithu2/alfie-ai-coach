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
import { supabase } from '@/integrations/supabase/client';

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

      // Populate with existing data - fix book numbering mismatch
      passages.forEach((passage: any) => {
        // Extract book number from cambridge_book field (e.g., "C19" -> 19)
        let bookNum = passage.book_number || 1;
        if (passage.cambridge_book) {
          const match = passage.cambridge_book.match(/\d+/);
          if (match) {
            bookNum = parseInt(match[0]);
          }
        }
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

  // Calculate starting question number for continuous numbering across parts
  const calculateStartingQuestionNumber = async (bookNumber: number, sectionNumber: number, partNumber: number) => {
    try {
      const { data: existingQuestions, error } = await supabase
        .from('reading_questions')
        .select('question_number, part_number')
        .eq('cambridge_book', `C${bookNumber}`)
        .eq('section_number', sectionNumber)
        .order('part_number')
        .order('question_number');

      if (error) throw error;

      let startingNumber = 1;

      // Find the highest question number from previous parts
      if (existingQuestions && existingQuestions.length > 0) {
        // Find questions from previous parts only
        const previousPartsQuestions = existingQuestions.filter(q => q.part_number < partNumber);
        if (previousPartsQuestions.length > 0) {
          const maxNumber = Math.max(...previousPartsQuestions.map(q => q.question_number));
          startingNumber = maxNumber + 1;
        }
      }

      console.log(`📊 Continuous Numbering: Part ${partNumber} will start at question ${startingNumber}`);
      return startingNumber;
    } catch (error) {
      console.error('Error calculating starting question number:', error);
      return 1; // Fallback to 1 if error
    }
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
      
      console.log('🔧 Admin Numbering Fix: Starting continuous numbering import for', {
        book: uploadBookNumber,
        section: uploadSectionNumber,
        part: uploadPartNumber,
        questionsCount: pendingQuestions.length
      });

      // Calculate the starting question number for continuous numbering
      const startingQuestionNumber = await calculateStartingQuestionNumber(uploadBookNumber, uploadSectionNumber, uploadPartNumber);

      const passageData = {
        title: finalTitle,
        content: finalContent,
        book_number: uploadBookNumber,
        section_number: uploadSectionNumber,
        part_number: uploadPartNumber,
        cambridge_book: `C${uploadBookNumber}`,
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

      // Create questions with continuous numbering across parts
      for (let i = 0; i < pendingQuestions.length; i++) {
        const question = pendingQuestions[i];
        const questionNumber = startingQuestionNumber + i; // Continuous numbering
        const questionData = {
          question_number: questionNumber,
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
        
        console.log(`📊 Continuous Numbering: Creating question ${questionNumber} for Part ${uploadPartNumber}:`, questionData);
        await createContent('reading_questions', questionData);
      }

      toast({
        title: "Success",
        description: `${pendingQuestions.length} questions uploaded to Cambridge ${uploadBookNumber}, Section ${uploadSectionNumber}, Part ${uploadPartNumber} with continuous numbering`,
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
                                  onClick={() => setSelectedSection({ ...section, bookNumber: book.number })}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingSection({ ...section, bookNumber: book.number })}
                                >
                                  <Edit className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => deleteSection(book.number, section.number)}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          
                          {/* Show parts breakdown */}
                          <CardContent className="pt-0">
                            <div className="grid grid-cols-3 gap-2">
                              {Object.values(section.parts).map((part: any) => (
                                <div key={part.number} className="text-center p-2 border rounded">
                                  <div className="text-sm font-medium">Part {part.number}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {part.questions.length} questions
                                  </div>
                                  {part.hasContent && (
                                    <Badge variant="outline" className="text-xs mt-1">
                                      Q{part.questions.length > 0 ? Math.min(...part.questions.map((q: any) => q.question_number)) : 0}-
                                      {part.questions.length > 0 ? Math.max(...part.questions.map((q: any) => q.question_number)) : 0}
                                    </Badge>
                                  )}
                                </div>
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
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Upload Content to Cambridge IELTS</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Target Selection */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Book Number</label>
                  <Select value={uploadBookNumber.toString()} onValueChange={(value) => setUploadBookNumber(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 20 }, (_, i) => 20 - i).map(book => (
                        <SelectItem key={book} value={book.toString()}>
                          Cambridge {book}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Section Number</label>
                  <Select value={uploadSectionNumber.toString()} onValueChange={(value) => setUploadSectionNumber(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map(section => (
                        <SelectItem key={section} value={section.toString()}>
                          Section {section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Part Number</label>
                  <Select value={uploadPartNumber.toString()} onValueChange={(value) => setUploadPartNumber(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3].map(part => (
                        <SelectItem key={part} value={part.toString()}>
                          Part {part}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Passage Information */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Passage Title</label>
                  <Input
                    value={passageTitle}
                    onChange={(e) => setPassageTitle(e.target.value)}
                    placeholder="Enter passage title (optional for CSV)"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Passage Content</label>
                  <Textarea
                    value={passageContent}
                    onChange={(e) => setPassageContent(e.target.value)}
                    placeholder="Enter passage content (optional for CSV)"
                    rows={4}
                  />
                </div>
              </div>

              {/* CSV Import Component */}
              <div>
                <h3 className="font-medium mb-2">Upload Questions (CSV)</h3>
                <CSVImport 
                  onImport={handleConfirmImport}
                  onQuestionsPreview={handleCSVPreview}
                  type="reading"
                  cambridgeBook={`C${uploadBookNumber}`}
                  testNumber={uploadBookNumber}
                  sectionNumber={uploadSectionNumber}
                  partNumber={uploadPartNumber}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Import Confirmation Dialog */}
        <Dialog open={showImportConfirm} onOpenChange={setShowImportConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Question Import</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <p>
                You are about to import <strong>{pendingQuestions.length} questions</strong> to:
              </p>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p><strong>Book:</strong> Cambridge {uploadBookNumber}</p>
                <p><strong>Section:</strong> {uploadSectionNumber}</p>
                <p><strong>Part:</strong> {uploadPartNumber}</p>
                <p><strong>Passage Title:</strong> {passageTitle || `Default title for C${uploadBookNumber} S${uploadSectionNumber} P${uploadPartNumber}`}</p>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleCancelImport}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmImport} disabled={isImporting}>
                  {isImporting ? "Importing..." : "Confirm Import"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Section View Dialog */}
        <Dialog open={!!selectedSection} onOpenChange={(open) => !open && setSelectedSection(null)}>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Cambridge {selectedSection?.bookNumber} - Section {selectedSection?.number}
              </DialogTitle>
            </DialogHeader>
            
            {selectedSection && (
              <div className="space-y-6">
                {Object.values(selectedSection.parts).map((part: any) => (
                  <div key={part.number}>
                    <h3 className="text-lg font-semibold mb-3">Part {part.number}</h3>
                    
                    {part.passage && (
                      <Card className="mb-4">
                        <CardHeader>
                          <CardTitle className="text-base">{part.passage.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">
                            {part.passage.content}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                    
                    {part.questions.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Questions ({part.questions.length})</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-16">Q#</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Question</TableHead>
                              <TableHead>Answer</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {part.questions
                              .sort((a: any, b: any) => a.question_number - b.question_number)
                              .map((question: any) => (
                              <TableRow key={question.id}>
                                <TableCell className="font-medium">
                                  {question.question_number}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {question.question_type}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-md">
                                  <p className="text-sm truncate" title={question.question_text}>
                                    {question.question_text}
                                  </p>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm font-medium text-green-600">
                                    {question.correct_answer}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Section Edit Dialog */}
        <Dialog open={!!editingSection} onOpenChange={(open) => !open && setEditingSection(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Edit Cambridge {editingSection?.bookNumber} - Section {editingSection?.number}
              </DialogTitle>
            </DialogHeader>
            
            {editingSection && (
              <div className="space-y-6">
                {Object.values(editingSection.parts).map((part: any) => (
                  <div key={part.number}>
                    <h3 className="text-lg font-semibold mb-3">Part {part.number}</h3>
                    
                    {part.passage && (
                      <div className="space-y-4 mb-6">
                        <div>
                          <label className="block text-sm font-medium mb-2">Passage Title</label>
                          <Input
                            value={part.passage.title}
                            onChange={(e) => {
                              setEditingSection((prev: any) => ({
                                ...prev,
                                parts: {
                                  ...prev.parts,
                                  [part.number]: {
                                    ...part,
                                    passage: { ...part.passage, title: e.target.value }
                                  }
                                }
                              }));
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Passage Content</label>
                          <Textarea
                            value={part.passage.content}
                            onChange={(e) => {
                              setEditingSection((prev: any) => ({
                                ...prev,
                                parts: {
                                  ...prev.parts,
                                  [part.number]: {
                                    ...part,
                                    passage: { ...part.passage, content: e.target.value }
                                  }
                                }
                              }));
                            }}
                            rows={6}
                          />
                        </div>
                      </div>
                    )}
                    
                    {part.questions.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="font-medium">Questions</h4>
                        {part.questions
                          .sort((a: any, b: any) => a.question_number - b.question_number)
                          .map((question: any, index: number) => (
                          <Card key={question.id} className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center gap-4">
                                <span className="font-medium">Q{question.question_number}</span>
                                <Select
                                  value={question.question_type}
                                  onValueChange={(value) => {
                                    setEditingSection((prev: any) => ({
                                      ...prev,
                                      parts: {
                                        ...prev.parts,
                                        [part.number]: {
                                          ...part,
                                          questions: part.questions.map((q: any, i: number) =>
                                            i === index ? { ...q, question_type: value } : q
                                          )
                                        }
                                      }
                                    }));
                                  }}
                                >
                                  <SelectTrigger className="w-48">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Multiple Choice">Multiple Choice</SelectItem>
                                    <SelectItem value="True/False/Not Given">True/False/Not Given</SelectItem>
                                    <SelectItem value="Fill in the Gap">Fill in the Gap</SelectItem>
                                    <SelectItem value="Matching">Matching</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium mb-1">Question Text</label>
                                <Textarea
                                  value={question.question_text}
                                  onChange={(e) => {
                                    setEditingSection((prev: any) => ({
                                      ...prev,
                                      parts: {
                                        ...prev.parts,
                                        [part.number]: {
                                          ...part,
                                          questions: part.questions.map((q: any, i: number) =>
                                            i === index ? { ...q, question_text: e.target.value } : q
                                          )
                                        }
                                      }
                                    }));
                                  }}
                                  rows={2}
                                />
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium mb-1">Correct Answer</label>
                                  <Input
                                    value={question.correct_answer}
                                    onChange={(e) => {
                                      setEditingSection((prev: any) => ({
                                        ...prev,
                                        parts: {
                                          ...prev.parts,
                                          [part.number]: {
                                            ...part,
                                            questions: part.questions.map((q: any, i: number) =>
                                              i === index ? { ...q, correct_answer: e.target.value } : q
                                            )
                                          }
                                        }
                                      }));
                                    }}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Explanation</label>
                                  <Input
                                    value={question.explanation}
                                    onChange={(e) => {
                                      setEditingSection((prev: any) => ({
                                        ...prev,
                                        parts: {
                                          ...prev.parts,
                                          [part.number]: {
                                            ...part,
                                            questions: part.questions.map((q: any, i: number) =>
                                              i === index ? { ...q, explanation: e.target.value } : q
                                            )
                                          }
                                        }
                                      }));
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setEditingSection(null)}>
                    Cancel
                  </Button>
                  <Button onClick={saveEditingSection}>
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminReading;